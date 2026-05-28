import random
import string
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.message import Message
from app.models.notification import Notification
from app.models.order import Deliverable, Order
from app.models.package import Package, PackageAddon
from app.models.user import User
from app.schemas.order import OrderCreateRequest, OrderResponse

router = APIRouter(prefix="/orders", tags=["orders"])

PLATFORM_FEE_PCT = 0.05


def _generate_order_ref(db: Session) -> str:
    """Generate a unique RCH-XXXX order reference."""
    while True:
        suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        ref = f"RCH-{suffix}"
        if not db.query(Order).filter(Order.order_ref == ref).first():
            return ref


def _order_to_response(order: Order) -> dict:
    return {
        "id": str(order.id),
        "order_ref": order.order_ref,
        "creator_id": str(order.creator_id),
        "brand_id": str(order.brand_id),
        "package_id": str(order.package_id),
        "addons": order.addons or [],
        "brief": order.brief,
        "amount": order.amount,
        "platform_fee": order.platform_fee,
        "creator_payout": order.creator_payout,
        "status": order.status,
        "deliverables": [
            {
                "id": str(d.id),
                "name": d.name,
                "description": d.description,
                "status": d.status,
                "sort_order": d.sort_order,
            }
            for d in sorted(order.deliverables, key=lambda x: x.sort_order)
        ],
        "created_at": order.created_at.isoformat() if order.created_at else "",
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_order(
    body: OrderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Brand creates an order by booking a creator's package."""
    # Look up creator by handle
    creator = db.query(User).filter(User.handle == body.creator_handle).first()
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")

    # Prevent self-booking
    if str(creator.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot book your own profile")

    # Look up package
    package = db.query(Package).filter(
        Package.id == body.package_id,
        Package.creator_id == creator.id,
        Package.is_active == True,
    ).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    # Resolve add-ons
    selected_addons = []
    addon_total = 0
    for key in body.addon_keys:
        addon = db.query(PackageAddon).filter(
            PackageAddon.creator_id == creator.id,
            PackageAddon.key == key,
            PackageAddon.is_active == True,
        ).first()
        if addon:
            selected_addons.append({"key": addon.key, "label": addon.label, "price": addon.price})
            addon_total += addon.price

    # Calculate amounts (in paise)
    amount = package.price + addon_total
    platform_fee = int(amount * PLATFORM_FEE_PCT)
    creator_payout = amount - platform_fee

    # Create order
    order = Order(
        order_ref=_generate_order_ref(db),
        creator_id=creator.id,
        brand_id=current_user.id,
        package_id=package.id,
        addons=selected_addons,
        brief=body.brief,
        amount=amount,
        platform_fee=platform_fee,
        creator_payout=creator_payout,
        status="pending_payment",
    )
    db.add(order)
    db.flush()  # get order.id before creating deliverables

    # Create deliverables from package
    for i, deliverable_name in enumerate(package.deliverables):
        db.add(Deliverable(
            order_id=order.id,
            name=deliverable_name,
            status="todo",
            sort_order=i,
        ))

    # Create opening system message in chat thread
    db.add(Message(
        order_id=order.id,
        sender_id=None,
        kind="system",
        content=f"Order {order.order_ref} created. Chat here to align on brief and scope — fund escrow when you're both ready to proceed.",
    ))

    db.commit()
    db.refresh(order)
    return _order_to_response(order)


@router.get("")
def list_orders(
    order_status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List orders for the current user (creator or brand)."""
    query = db.query(Order).filter(
        (Order.creator_id == current_user.id) | (Order.brand_id == current_user.id)
    )
    if order_status:
        query = query.filter(Order.status == order_status)
    orders = query.order_by(Order.created_at.desc()).all()
    return [_order_to_response(o) for o in orders]


@router.get("/{order_id}")
def get_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full order detail."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.creator_id) != str(current_user.id) and str(order.brand_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    return _order_to_response(order)


@router.patch("/{order_id}/deliverables")
def update_deliverable(
    order_id: str,
    deliverable_id: str,
    new_status: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creator cycles a deliverable: todo → in_review → done."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.creator_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the creator can update deliverables")

    valid_statuses = ("todo", "in_review", "done")
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")

    deliverable = db.query(Deliverable).filter(
        Deliverable.id == deliverable_id,
        Deliverable.order_id == order_id,
    ).first()
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")

    deliverable.status = new_status

    # System message when marked in_review
    if new_status == "in_review":
        db.add(Message(
            order_id=order.id,
            sender_id=None,
            kind="system",
            content=f'Deliverable "{deliverable.name}" is ready for review.',
        ))

    db.commit()
    return {"id": str(deliverable.id), "status": deliverable.status}


@router.post("/{order_id}/signoff")
def request_signoff(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creator requests sign-off — starts 48h auto-release timer."""
    from datetime import timedelta

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.creator_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the creator can request sign-off")
    if order.status not in ("escrow_funded", "in_progress"):
        raise HTTPException(status_code=400, detail="Order is not in a state that allows sign-off")

    now = datetime.now(timezone.utc)
    order.status = "awaiting_signoff"
    order.signoff_requested_at = now
    order.auto_release_at = now + timedelta(hours=48)

    db.add(Message(
        order_id=order.id,
        sender_id=None,
        kind="system",
        content="Creator has requested sign-off. Brand has 48 hours to confirm delivery.",
    ))
    db.add(Notification(
        user_id=order.brand_id,
        kind="signoff_requested",
        title="Sign-off requested",
        body=f"The creator has completed order {order.order_ref} and is requesting your sign-off.",
        link=f"/brand/orders/{order.id}",
    ))

    db.commit()
    return {"status": order.status}


@router.post("/{order_id}/confirm")
def confirm_delivery(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Brand confirms delivery — releases escrow (MVP: simulated)."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.brand_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the brand can confirm delivery")
    if order.status != "awaiting_signoff":
        raise HTTPException(status_code=400, detail="Order is not awaiting sign-off")

    order.status = "released"

    db.add(Message(
        order_id=order.id,
        sender_id=None,
        kind="system",
        content="Brand confirmed delivery. Escrow released to creator.",
    ))
    db.add(Notification(
        user_id=order.creator_id,
        kind="escrow_released",
        title="Payment released",
        body=f"Brand confirmed delivery for order {order.order_ref}. ₹{order.creator_payout // 100:,} has been released.",
        link=f"/dashboard/orders/{order.id}",
    ))

    db.commit()
    return {"status": order.status}


@router.post("/{order_id}/dispute")
def raise_dispute(
    order_id: str,
    reason: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Raise a dispute — freezes escrow."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.brand_id) != str(current_user.id) and str(order.creator_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    order.status = "disputed"
    order.dispute_reason = reason

    db.add(Message(
        order_id=order.id,
        sender_id=None,
        kind="system",
        content=f"A dispute has been raised: {reason}. Escrow is frozen pending resolution.",
    ))

    db.commit()
    return {"status": order.status}


@router.post("/{order_id}/mock-pay")
def mock_pay(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """MVP: simulate payment — sets order to escrow_funded."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.brand_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the brand can pay")
    if order.status != "pending_payment":
        raise HTTPException(status_code=400, detail="Order is not pending payment")

    order.status = "escrow_funded"

    db.add(Message(
        order_id=order.id,
        sender_id=None,
        kind="system",
        content=f"Payment confirmed. ₹{order.amount // 100:,} is held in escrow. Work can begin.",
    ))
    db.add(Notification(
        user_id=order.creator_id,
        kind="escrow_funded",
        title="Funds secured",
        body=f"Payment for order {order.order_ref} is in escrow. You can start work.",
        link=f"/dashboard/orders/{order.id}",
    ))

    db.commit()
    return {"status": order.status}

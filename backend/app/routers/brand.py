from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import get_current_brand
from app.core.database import get_db
from app.models.order import Order
from app.models.user import User

router = APIRouter(prefix="/brand", tags=["brand"])


@router.get("/dashboard")
def get_brand_dashboard(
    current_user: User = Depends(get_current_brand),
    db: Session = Depends(get_db),
):
    active_campaigns = db.query(Order).filter(
        Order.brand_id == current_user.id,
        Order.status.in_(["escrow_funded", "in_progress"]),
    ).count()

    pending_signoffs = db.query(Order).filter(
        Order.brand_id == current_user.id,
        Order.status == "awaiting_signoff",
    ).count()

    total_spend = db.query(func.sum(Order.amount)).filter(
        Order.brand_id == current_user.id,
        Order.status == "released",
    ).scalar() or 0

    recent_orders = (
        db.query(Order)
        .filter(Order.brand_id == current_user.id)
        .order_by(Order.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "active_campaigns": active_campaigns,
        "pending_signoffs": pending_signoffs,
        "total_spend": total_spend,
        "recent_orders": [
            {
                "id": str(o.id),
                "order_ref": o.order_ref,
                "status": o.status,
                "amount": o.amount,
                "created_at": o.created_at.isoformat() if o.created_at else "",
            }
            for o in recent_orders
        ],
    }

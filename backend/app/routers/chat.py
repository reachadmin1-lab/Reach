import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.message import Message
from app.models.order import Order
from app.models.user import User
from app.schemas.chat import MessageCreate, MessageResponse, ThreadResponse

router = APIRouter(prefix="/chat", tags=["chat"])

PAGE_SIZE = 50


def _msg_to_response(msg: Message) -> dict:
    return {
        "id": str(msg.id),
        "order_id": str(msg.order_id),
        "sender_id": str(msg.sender_id) if msg.sender_id else None,
        "kind": msg.kind,
        "content": msg.content,
        "file_url": msg.file_url,
        "file_name": msg.file_name,
        "file_size": msg.file_size,
        "is_read": msg.is_read,
        "created_at": msg.created_at.isoformat() if msg.created_at else "",
    }


async def _broadcast_to_realtime(order_id: str, message: dict) -> None:
    """Broadcast a message to the Supabase Realtime channel for this order."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.supabase_url}/realtime/v1/api/broadcast",
                json={
                    "messages": [
                        {
                            "topic": f"order:{order_id}",
                            "event": "message",
                            "payload": message,
                        }
                    ]
                },
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "Content-Type": "application/json",
                },
                timeout=5,
            )
    except Exception:
        pass  # Non-critical — message is persisted to DB regardless


@router.get("/threads", response_model=list[ThreadResponse])
def list_threads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all order chat threads for the current user."""
    orders = db.query(Order).filter(
        (Order.creator_id == current_user.id) | (Order.brand_id == current_user.id)
    ).order_by(Order.created_at.desc()).all()

    threads = []
    for order in orders:
        # Determine the other party
        other_id = order.brand_id if str(order.creator_id) == str(current_user.id) else order.creator_id
        other_user = db.query(User).filter(User.id == other_id).first()
        other_name = other_user.display_name or other_user.handle or "Unknown" if other_user else "Unknown"

        # Last message
        last_msg = (
            db.query(Message)
            .filter(Message.order_id == order.id)
            .order_by(Message.created_at.desc())
            .first()
        )

        # Unread count
        unread = (
            db.query(Message)
            .filter(
                Message.order_id == order.id,
                Message.sender_id != current_user.id,
                Message.is_read == False,
            )
            .count()
        )

        threads.append(ThreadResponse(
            order_id=str(order.id),
            order_ref=order.order_ref,
            other_party_name=other_name,
            last_message=last_msg.content if last_msg else None,
            last_message_at=last_msg.created_at.isoformat() if last_msg and last_msg.created_at else None,
            unread_count=unread,
        ))

    return threads


@router.get("/threads/{order_id}", response_model=list[MessageResponse])
def get_messages(
    order_id: str,
    page: int = 1,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get paginated message history for an order thread."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.creator_id) != str(current_user.id) and str(order.brand_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    messages = (
        db.query(Message)
        .filter(Message.order_id == order_id)
        .order_by(Message.created_at.asc())
        .offset((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .all()
    )
    return [_msg_to_response(m) for m in messages]


@router.post("/threads/{order_id}", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    order_id: str,
    body: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a text message and broadcast to Supabase Realtime."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.creator_id) != str(current_user.id) and str(order.brand_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    msg = Message(
        order_id=order_id,
        sender_id=current_user.id,
        kind="text",
        content=body.content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    response = _msg_to_response(msg)
    await _broadcast_to_realtime(order_id, response)
    return response


@router.post("/threads/{order_id}/files", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_file(
    order_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a file attachment and send as a file message."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.creator_id) != str(current_user.id) and str(order.brand_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    content = await file.read()
    file_size = len(content)

    # Upload to Supabase Storage
    file_url = f"/uploads/chat/{order_id}/{file.filename}"
    if settings.supabase_url and settings.supabase_service_role_key:
        import uuid as _uuid
        filename = f"chat/{order_id}/{_uuid.uuid4()}_{file.filename}"
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.supabase_url}/storage/v1/object/attachments/{filename}",
                content=content,
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "Content-Type": file.content_type or "application/octet-stream",
                },
            )
            if resp.status_code in (200, 201):
                file_url = f"{settings.supabase_url}/storage/v1/object/public/attachments/{filename}"

    msg = Message(
        order_id=order_id,
        sender_id=current_user.id,
        kind="file",
        file_url=file_url,
        file_name=file.filename,
        file_size=file_size,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    response = _msg_to_response(msg)
    await _broadcast_to_realtime(order_id, response)
    return response


@router.patch("/threads/{order_id}/read", status_code=status.HTTP_200_OK)
def mark_read(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all messages in a thread as read for the current user."""
    db.query(Message).filter(
        Message.order_id == order_id,
        Message.sender_id != current_user.id,
        Message.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}

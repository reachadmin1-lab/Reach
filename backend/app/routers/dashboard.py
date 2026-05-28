from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import get_current_creator
from app.core.database import get_db
from app.models.notification import Notification
from app.models.order import Order
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    # Active orders
    active_orders = db.query(Order).filter(
        Order.creator_id == current_user.id,
        Order.status.in_(["escrow_funded", "in_progress", "awaiting_signoff"]),
    ).count()

    # Pending requests (pending_payment)
    pending_requests = db.query(Order).filter(
        Order.creator_id == current_user.id,
        Order.status == "pending_payment",
    ).count()

    # Lifetime earnings (released orders)
    lifetime_result = db.query(func.sum(Order.creator_payout)).filter(
        Order.creator_id == current_user.id,
        Order.status == "released",
    ).scalar()
    lifetime_earnings = lifetime_result or 0

    # In-escrow balance
    escrow_result = db.query(func.sum(Order.creator_payout)).filter(
        Order.creator_id == current_user.id,
        Order.status.in_(["escrow_funded", "in_progress", "awaiting_signoff"]),
    ).scalar()
    escrow_balance = escrow_result or 0

    # Month gross
    month_result = db.query(func.sum(Order.creator_payout)).filter(
        Order.creator_id == current_user.id,
        Order.status == "released",
        Order.updated_at >= month_start,
    ).scalar()
    month_gross = month_result or 0

    # Profile views (7d) — from creator_profile
    from app.models.creator_profile import CreatorProfile
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == current_user.id).first()
    profile_views_7d = profile.profile_views if profile else 0

    # Earnings chart — last 12 months
    earnings_chart = []
    for i in range(11, -1, -1):
        month_dt = now - timedelta(days=30 * i)
        m_start = month_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        m_end = (m_start + timedelta(days=32)).replace(day=1)
        result = db.query(func.sum(Order.creator_payout)).filter(
            Order.creator_id == current_user.id,
            Order.status == "released",
            Order.updated_at >= m_start,
            Order.updated_at < m_end,
        ).scalar()
        earnings_chart.append({
            "month": m_start.strftime("%b"),
            "amount": result or 0,
        })

    # Recent notifications (activity feed)
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(10)
        .all()
    )
    activity = [
        {
            "id": str(n.id),
            "kind": n.kind,
            "title": n.title,
            "body": n.body,
            "link": n.link,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else "",
        }
        for n in notifications
    ]

    return {
        "active_orders": active_orders,
        "pending_requests": pending_requests,
        "profile_views_7d": profile_views_7d,
        "lifetime_earnings": lifetime_earnings,
        "available_balance": lifetime_earnings,  # simplified for MVP
        "escrow_balance": escrow_balance,
        "month_gross": month_gross,
        "earnings_chart": earnings_chart,
        "activity": activity,
    }

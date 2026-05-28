import uuid
from sqlalchemy import (
    Column, String, Text, Integer, DateTime,
    Enum as SAEnum, ForeignKey, func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_ref = Column(String, unique=True, nullable=False)  # RCH-XXXX
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id"), nullable=False)
    addons = Column(JSONB, nullable=False, default=list)
    brief = Column(Text, nullable=True)
    amount = Column(Integer, nullable=False)          # total in paise
    platform_fee = Column(Integer, nullable=False)    # 5% in paise
    creator_payout = Column(Integer, nullable=False)  # amount - fee in paise
    status = Column(
        SAEnum(
            "pending_payment",
            "escrow_funded",
            "in_progress",
            "awaiting_signoff",
            "delivered",
            "released",
            "disputed",
            "cancelled",
            "payment_failed",
            name="order_status",
            create_type=False,
        ),
        nullable=False,
        default="pending_payment",
    )
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    razorpay_route_id = Column(String, nullable=True)
    signoff_requested_at = Column(DateTime(timezone=True), nullable=True)
    auto_release_at = Column(DateTime(timezone=True), nullable=True)
    dispute_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    creator = relationship("User", foreign_keys=[creator_id], back_populates="creator_orders")
    brand = relationship("User", foreign_keys=[brand_id], back_populates="brand_orders")
    package = relationship("Package")
    deliverables = relationship("Deliverable", back_populates="order", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="order", cascade="all, delete-orphan")


class Deliverable(Base):
    __tablename__ = "deliverables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        SAEnum("todo", "in_review", "done", name="deliverable_status", create_type=False),
        nullable=False,
        default="todo",
    )
    sort_order = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    order = relationship("Order", back_populates="deliverables")

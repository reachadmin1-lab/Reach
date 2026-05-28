import uuid
from sqlalchemy import Column, String, DateTime, Enum as SAEnum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(SAEnum("creator", "brand", "admin", name="user_role", create_type=False), nullable=False)
    handle = Column(String, unique=True, nullable=True)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    creator_profile = relationship("CreatorProfile", back_populates="user", uselist=False)
    packages = relationship("Package", back_populates="creator", foreign_keys="Package.creator_id")
    package_addons = relationship("PackageAddon", back_populates="creator", foreign_keys="PackageAddon.creator_id")
    portfolio_items = relationship("PortfolioItem", back_populates="creator", foreign_keys="PortfolioItem.creator_id")
    creator_orders = relationship("Order", back_populates="creator", foreign_keys="Order.creator_id")
    brand_orders = relationship("Order", back_populates="brand", foreign_keys="Order.brand_id")
    notifications = relationship("Notification", back_populates="user")

import uuid
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime,
    Enum as SAEnum, ForeignKey, func, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base


class Package(Base):
    __tablename__ = "packages"
    __table_args__ = (UniqueConstraint("creator_id", "tier", name="uq_package_creator_tier"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    tier = Column(
        SAEnum("basic", "standard", "premium", "campaign", name="package_tier", create_type=False),
        nullable=False,
    )
    name = Column(String, nullable=False)
    price = Column(Integer, nullable=False)  # in paise
    deliverables = Column(ARRAY(String), nullable=False, default=list)
    revisions = Column(Integer, nullable=False, default=1)
    delivery_days = Column(Integer, nullable=False)
    usage_rights = Column(
        SAEnum("personal", "commercial", name="usage_rights_type", create_type=False),
        nullable=False,
        default="personal",
    )
    analytics = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    creator = relationship("User", back_populates="packages")


class PackageAddon(Base):
    __tablename__ = "package_addons"
    __table_args__ = (UniqueConstraint("creator_id", "key", name="uq_addon_creator_key"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    key = Column(String, nullable=False)   # 'commercial', 'revision', 'rush', 'exclusivity'
    label = Column(String, nullable=False)
    price = Column(Integer, nullable=False)  # in paise
    is_active = Column(Boolean, nullable=False, default=True)

    creator = relationship("User", back_populates="package_addons")

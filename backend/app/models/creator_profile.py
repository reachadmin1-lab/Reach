import uuid
from sqlalchemy import (
    Column, String, Text, Integer, Boolean, DateTime,
    Enum as SAEnum, ForeignKey, func, DECIMAL
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class CreatorProfile(Base):
    __tablename__ = "creator_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    bio = Column(Text, nullable=True)
    cover_url = Column(String, nullable=True)
    status = Column(
        SAEnum("draft", "under_review", "active", "rejected", "suspended", name="creator_status", create_type=False),
        nullable=False,
        default="draft",
    )
    location = Column(String, nullable=True)
    languages = Column(ARRAY(String), nullable=False, default=list)
    genres = Column(ARRAY(String), nullable=False, default=list)
    platforms = Column(JSONB, nullable=False, default=dict)
    total_reach = Column(Integer, nullable=True)
    avg_engagement = Column(DECIMAL(5, 2), nullable=True)
    on_time_rate = Column(DECIMAL(5, 2), nullable=True)
    brands_count = Column(Integer, nullable=False, default=0)
    profile_views = Column(Integer, nullable=False, default=0)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="creator_profile")

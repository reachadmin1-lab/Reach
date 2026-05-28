import uuid
from sqlalchemy import Column, String, Integer, DateTime, Enum as SAEnum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    kind = Column(
        SAEnum("image", "video", "link", "pdf", name="portfolio_kind", create_type=False),
        nullable=False,
    )
    url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    meta = Column(String, nullable=True)  # e.g. "0:32 · MP4 · 38MB"
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", back_populates="portfolio_items")

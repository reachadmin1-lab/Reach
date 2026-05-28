"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-26 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    bind = op.get_bind()

    # Drop any orphaned enums from previous failed runs so SQLAlchemy can recreate them
    for t in ["user_role", "creator_status", "package_tier", "usage_rights_type",
              "portfolio_kind", "order_status", "deliverable_status", "message_kind"]:
        bind.execute(sa.text(f"DROP TYPE IF EXISTS {t} CASCADE"))

    # SQLAlchemy will create the enum types automatically via _on_table_create events
    # when op.create_table is called below (driven by the ORM model definitions)

    # Use sa.Text for all enum columns to avoid SQLAlchemy auto-create behaviour.
    # The actual DB column type is set via server_default / raw SQL after table creation.
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(), unique=True, nullable=False),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("handle", sa.String(), unique=True, nullable=True),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    bind.execute(sa.text("CREATE TYPE user_role AS ENUM ('creator', 'brand', 'admin')"))
    bind.execute(sa.text("ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role"))
    op.create_index("ix_users_handle", "users", ["handle"])

    op.create_table(
        "creator_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), unique=True, nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("cover_url", sa.String(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("languages", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("genres", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("platforms", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("total_reach", sa.Integer(), nullable=True),
        sa.Column("avg_engagement", sa.Numeric(5, 2), nullable=True),
        sa.Column("on_time_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("brands_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("profile_views", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    bind.execute(sa.text("CREATE TYPE creator_status AS ENUM ('draft', 'under_review', 'active', 'rejected', 'suspended')"))
    bind.execute(sa.text("ALTER TABLE creator_profiles ALTER COLUMN status DROP DEFAULT"))
    bind.execute(sa.text("ALTER TABLE creator_profiles ALTER COLUMN status TYPE creator_status USING status::creator_status"))
    bind.execute(sa.text("ALTER TABLE creator_profiles ALTER COLUMN status SET DEFAULT 'draft'"))

    op.create_table(
        "packages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("tier", sa.Text(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("deliverables", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("revisions", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("delivery_days", sa.Integer(), nullable=False),
        sa.Column("usage_rights", sa.Text(), nullable=False, server_default="personal"),
        sa.Column("analytics", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("creator_id", "tier", name="uq_package_creator_tier"),
    )
    bind.execute(sa.text("CREATE TYPE package_tier AS ENUM ('basic', 'standard', 'premium', 'campaign')"))
    bind.execute(sa.text("ALTER TABLE packages ALTER COLUMN tier TYPE package_tier USING tier::package_tier"))
    bind.execute(sa.text("CREATE TYPE usage_rights_type AS ENUM ('personal', 'commercial')"))
    bind.execute(sa.text("ALTER TABLE packages ALTER COLUMN usage_rights DROP DEFAULT"))
    bind.execute(sa.text("ALTER TABLE packages ALTER COLUMN usage_rights TYPE usage_rights_type USING usage_rights::usage_rights_type"))
    bind.execute(sa.text("ALTER TABLE packages ALTER COLUMN usage_rights SET DEFAULT 'personal'"))
    op.create_index("ix_packages_creator_id", "packages", ["creator_id"])

    op.create_table(
        "package_addons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.UniqueConstraint("creator_id", "key", name="uq_addon_creator_key"),
    )

    op.create_table(
        "portfolio_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("thumbnail_url", sa.String(), nullable=True),
        sa.Column("meta", sa.String(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    bind.execute(sa.text("CREATE TYPE portfolio_kind AS ENUM ('image', 'video', 'link', 'pdf')"))
    bind.execute(sa.text("ALTER TABLE portfolio_items ALTER COLUMN kind TYPE portfolio_kind USING kind::portfolio_kind"))
    op.create_index("ix_portfolio_items_creator_id", "portfolio_items", ["creator_id"])

    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_ref", sa.String(), unique=True, nullable=False),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("brand_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("package_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("packages.id"), nullable=False),
        sa.Column("addons", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("brief", sa.Text(), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("platform_fee", sa.Integer(), nullable=False),
        sa.Column("creator_payout", sa.Integer(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending_payment"),
        sa.Column("razorpay_order_id", sa.String(), nullable=True),
        sa.Column("razorpay_payment_id", sa.String(), nullable=True),
        sa.Column("razorpay_route_id", sa.String(), nullable=True),
        sa.Column("signoff_requested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("auto_release_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dispute_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    bind.execute(sa.text("CREATE TYPE order_status AS ENUM ('pending_payment', 'escrow_funded', 'in_progress', 'awaiting_signoff', 'delivered', 'released', 'disputed', 'cancelled', 'payment_failed')"))
    bind.execute(sa.text("ALTER TABLE orders ALTER COLUMN status DROP DEFAULT"))
    bind.execute(sa.text("ALTER TABLE orders ALTER COLUMN status TYPE order_status USING status::order_status"))
    bind.execute(sa.text("ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending_payment'"))
    op.create_index("ix_orders_creator_id", "orders", ["creator_id"])
    op.create_index("ix_orders_brand_id", "orders", ["brand_id"])
    op.create_index("ix_orders_status", "orders", ["status"])

    op.create_table(
        "deliverables",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="todo"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    bind.execute(sa.text("CREATE TYPE deliverable_status AS ENUM ('todo', 'in_review', 'done')"))
    bind.execute(sa.text("ALTER TABLE deliverables ALTER COLUMN status DROP DEFAULT"))
    bind.execute(sa.text("ALTER TABLE deliverables ALTER COLUMN status TYPE deliverable_status USING status::deliverable_status"))
    bind.execute(sa.text("ALTER TABLE deliverables ALTER COLUMN status SET DEFAULT 'todo'"))
    op.create_index("ix_deliverables_order_id", "deliverables", ["order_id"])

    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("kind", sa.Text(), nullable=False, server_default="text"),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("file_url", sa.String(), nullable=True),
        sa.Column("file_name", sa.String(), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    bind.execute(sa.text("CREATE TYPE message_kind AS ENUM ('text', 'file', 'system')"))
    bind.execute(sa.text("ALTER TABLE messages ALTER COLUMN kind DROP DEFAULT"))
    bind.execute(sa.text("ALTER TABLE messages ALTER COLUMN kind TYPE message_kind USING kind::message_kind"))
    bind.execute(sa.text("ALTER TABLE messages ALTER COLUMN kind SET DEFAULT 'text'"))
    op.create_index("ix_messages_order_id", "messages", ["order_id"])
    op.create_index("ix_messages_created_at", "messages", ["created_at"])

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("link", sa.String(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"])


def downgrade():
    op.drop_table("notifications")
    op.drop_table("messages")
    op.drop_table("deliverables")
    op.drop_table("orders")
    op.drop_table("portfolio_items")
    op.drop_table("package_addons")
    op.drop_table("packages")
    op.drop_table("creator_profiles")
    op.drop_table("users")
    bind = op.get_bind()
    for t in ["message_kind", "deliverable_status", "order_status", "portfolio_kind",
              "usage_rights_type", "package_tier", "creator_status", "user_role"]:
        bind.execute(sa.text(f"DROP TYPE IF EXISTS {t}"))

"""initial platform schema

Revision ID: 0001
Revises:
Create Date: 2026-08-03
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS platform")

    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False, unique=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("contact_phone", sa.String(64), nullable=True),
        sa.Column("contact_telegram", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        schema="platform",
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("org_id", sa.Integer, sa.ForeignKey("platform.organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("username", sa.String(128), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="admin"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("org_id", "username", name="uq_users_org_username"),
        schema="platform",
    )

    op.create_table(
        "registration_requests",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("org_name", sa.String(255), nullable=False),
        sa.Column("admin_name", sa.String(255), nullable=False),
        sa.Column("contact_phone", sa.String(64), nullable=True),
        sa.Column("contact_telegram", sa.String(128), nullable=True),
        sa.Column("username", sa.String(128), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processed_by", sa.Integer, sa.ForeignKey("platform.users.id"), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        schema="platform",
    )

    op.create_table(
        "platform_settings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("gemini_api_key", sa.Text, nullable=True),
        sa.Column("gemini_model", sa.String(128), nullable=True, server_default="gemini-2.0-flash"),
        sa.Column("telegram_api_id", sa.String(64), nullable=True),
        sa.Column("telegram_api_hash", sa.String(128), nullable=True),
        sa.Column("telegram_storage_channel_id", sa.String(64), nullable=True),
        schema="platform",
    )
    op.execute("INSERT INTO platform.platform_settings (id) VALUES (1) ON CONFLICT DO NOTHING")


def downgrade() -> None:
    op.drop_table("platform_settings", schema="platform")
    op.drop_table("registration_requests", schema="platform")
    op.drop_table("users", schema="platform")
    op.drop_table("organizations", schema="platform")

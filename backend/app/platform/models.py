from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text,
    UniqueConstraint, func,
)
from sqlalchemy.orm import relationship

from ..db import Base


class Organization(Base):
    __tablename__ = "organizations"
    __table_args__ = {"schema": "platform"}

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, unique=True)
    status = Column(String(20), nullable=False, default="pending")
    contact_phone = Column(String(64))
    contact_telegram = Column(String(128))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    activated_at = Column(DateTime(timezone=True))

    users = relationship("User", back_populates="org", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("org_id", "username", name="uq_users_org_username"),
        {"schema": "platform"},
    )

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("platform.organizations.id", ondelete="CASCADE"), nullable=False)
    username = Column(String(128), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="admin")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True))

    org = relationship("Organization", back_populates="users")


class RegistrationRequest(Base):
    __tablename__ = "registration_requests"
    __table_args__ = {"schema": "platform"}

    id = Column(Integer, primary_key=True)
    org_name = Column(String(255), nullable=False)
    admin_name = Column(String(255), nullable=False)
    contact_phone = Column(String(64))
    contact_telegram = Column(String(128))
    username = Column(String(128), nullable=False)
    password_hash = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    processed_by = Column(Integer, ForeignKey("platform.users.id"))
    notes = Column(Text)


class PlatformSettings(Base):
    __tablename__ = "platform_settings"
    __table_args__ = {"schema": "platform"}

    id = Column(Integer, primary_key=True, default=1)
    gemini_api_key = Column(Text)
    gemini_model = Column(String(128), default="gemini-2.0-flash")
    telegram_api_id = Column(String(64))
    telegram_api_hash = Column(String(128))
    telegram_storage_channel_id = Column(String(64))


class OrgBilling(Base):
    __tablename__ = "org_billing"
    __table_args__ = ({"schema": "platform"},)

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("platform.organizations.id", ondelete="CASCADE"), unique=True, nullable=False)
    balance_usd = Column(Numeric(12, 4), nullable=False, default=0)
    monthly_fee_usd = Column(Numeric(12, 2), nullable=False, default=0)
    subscription_active = Column(Boolean, nullable=False, default=True)
    tariff = Column(String(16), nullable=False, default="paid")  # free | paid
    subscription_until = Column(DateTime(timezone=True))
    total_input_tokens = Column(BigInteger, nullable=False, default=0)
    total_output_tokens = Column(BigInteger, nullable=False, default=0)
    total_spent_usd = Column(Numeric(14, 6), nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class BillingLedger(Base):
    __tablename__ = "billing_ledger"
    __table_args__ = ({"schema": "platform"},)

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("platform.organizations.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String(24), nullable=False)  # topup | token_usage | subscription | manual_adjust
    amount_usd = Column(Numeric(14, 6), nullable=False)  # positive = credit, negative = debit
    balance_after = Column(Numeric(14, 6), nullable=False)
    note = Column(String(500), nullable=False, default="")
    input_tokens = Column(BigInteger, nullable=False, default=0)
    output_tokens = Column(BigInteger, nullable=False, default=0)
    model = Column(String(64), nullable=False, default="")
    created_by_user_id = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

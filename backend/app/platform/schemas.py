from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class RegisterIn(BaseModel):
    org_name: str
    admin_name: str
    username: str = Field(min_length=3, max_length=128)
    password: str = Field(min_length=6)
    contact_phone: Optional[str] = None
    contact_telegram: Optional[str] = None


class RegisterOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    org_id: int
    username: str


class LoginIn(BaseModel):
    username: str
    password: str


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    org_id: int
    username: str


class MeOut(BaseModel):
    id: int
    username: str
    role: str
    org_id: int
    org_name: str
    org_status: str


class OrgOut(BaseModel):
    id: int
    name: str
    slug: str
    status: str
    contact_phone: Optional[str]
    contact_telegram: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class RegistrationRequestOut(BaseModel):
    id: int
    org_name: str
    admin_name: str
    contact_phone: Optional[str]
    contact_telegram: Optional[str]
    username: str
    status: str
    requested_at: Optional[datetime]
    processed_at: Optional[datetime]

    class Config:
        from_attributes = True


class TenantOut(BaseModel):
    id: int
    name: str
    slug: str
    status: str
    user_count: int
    product_count: int
    created_at: Optional[datetime]


class SystemStatsOut(BaseModel):
    orgs_total: int
    orgs_pending: int
    users_total: int
    products_total: int


class PlatformSettingsIn(BaseModel):
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    telegram_api_id: Optional[str] = None
    telegram_api_hash: Optional[str] = None
    telegram_storage_channel_id: Optional[str] = None


class PlatformSettingsOut(PlatformSettingsIn):
    id: int

    class Config:
        from_attributes = True

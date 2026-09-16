from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


class CategoryIn(BaseModel):
    name: str


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProductImageOut(BaseModel):
    id: int
    url: str
    telegram_file_id: Optional[str] = None
    position: int = 0

    class Config:
        from_attributes = True


class ProductIn(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    sku: Optional[str] = None
    price: Decimal = Decimal("0")
    currency: str = "UZS"
    in_stock: bool = True
    stock_qty: Optional[int] = None
    is_active: bool = True


class ProductPatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    sku: Optional[str] = None
    price: Optional[Decimal] = None
    currency: Optional[str] = None
    in_stock: Optional[bool] = None
    stock_qty: Optional[int] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    sku: Optional[str] = None
    price: Decimal
    currency: str
    in_stock: bool
    stock_qty: Optional[int] = None
    is_active: bool
    source: str
    images: List[ProductImageOut] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ProductsPage(BaseModel):
    items: List[ProductOut]
    total: int
    page: int
    per_page: int


class TriggerIn(BaseModel):
    name: str
    keywords: list[str] = []
    response_text: str
    is_active: bool = True
    priority: int = 100
    required_channel_ids: list[int] = []


class TriggerOut(BaseModel):
    id: int
    name: str
    keywords: list[str]
    response_text: str
    is_active: bool
    priority: int
    required_channel_ids: list[int]

    class Config:
        from_attributes = True

    @classmethod
    def from_row(cls, row):
        kws = [k.strip() for k in (row.keywords or "").split(",") if k.strip()]
        ch_ids = [int(x) for x in (row.required_channel_ids or "").split(",") if x.strip().isdigit()]
        return cls(id=row.id, name=row.name, keywords=kws,
                   response_text=row.response_text, is_active=row.is_active, priority=row.priority,
                   required_channel_ids=ch_ids)


class ChannelIn(BaseModel):
    username: str
    title: str = ""
    invite_url: str = ""
    is_active: bool = True
    priority: int = 100


class ChannelOut(BaseModel):
    id: int
    username: str
    title: str
    invite_url: str
    is_active: bool
    priority: int
    class Config:
        from_attributes = True


class KnowledgeIn(BaseModel):
    name: str
    kind: str = "text"
    content: str = ""
    url: str = ""
    is_active: bool = True


class KnowledgeOut(BaseModel):
    id: int
    name: str
    kind: str
    content: str
    url: str
    chunks_count: int
    is_active: bool
    class Config:
        from_attributes = True


class KnowledgeAsk(BaseModel):
    question: str
    source_ids: list[int] = []


class LeadIn(BaseModel):
    name: str = ""
    phone: str = ""
    telegram_id: int | None = None
    telegram_username: str = ""
    source: str = "manual"
    status: str = "new"
    assigned_manager_id: int | None = None
    notes: str = ""
    sale_value: float = 0


class LeadOut(BaseModel):
    id: int
    name: str
    phone: str
    telegram_id: int | None
    telegram_username: str
    source: str
    status: str
    assigned_manager_id: int | None
    notes: str
    sale_value: float
    last_message: str
    last_activity_at: str | None
    created_at: str

    class Config:
        from_attributes = True


class LeadMessageIn(BaseModel):
    role: str = "manager"
    kind: str = "text"
    content: str
    media_url: str = ""


class LeadMessageOut(BaseModel):
    id: int
    role: str
    kind: str
    content: str
    media_url: str
    created_at: str

    class Config:
        from_attributes = True


class LeadStatusUpdate(BaseModel):
    status: str

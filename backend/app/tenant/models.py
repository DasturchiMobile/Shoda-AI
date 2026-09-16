from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, BigInteger,
    func,
)
from sqlalchemy.orm import relationship

from ..db import Base


# NOTE: these tables live inside per-org schemas (org_<id>).
# Since search_path is set per request, we do NOT hard-code a schema here.
class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"))
    sku = Column(String(128))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(Numeric(12, 2), nullable=False, default=0)
    currency = Column(String(3), nullable=False, default="UZS")
    in_stock = Column(Boolean, nullable=False, default=True)
    stock_qty = Column(Integer)
    is_active = Column(Boolean, nullable=False, default=True)
    source = Column(String(32), nullable=False, default="manual")
    source_channel = Column(String(255))
    source_msg_id = Column(BigInteger)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    images = relationship("ProductImage", back_populates="product",
                          cascade="all, delete-orphan", order_by="ProductImage.position")
    category = relationship("Category")


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    url = Column(Text, nullable=False)
    telegram_file_id = Column(String(255))
    telegram_msg_id = Column(BigInteger)
    width = Column(Integer)
    height = Column(Integer)
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="images")


class Trigger(Base):
    __tablename__ = "triggers"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    keywords = Column(Text, nullable=False, default="")  # comma-separated
    response_text = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    priority = Column(Integer, nullable=False, default=100)
    required_channel_ids = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RequiredChannel(Base):
    __tablename__ = "required_channels"

    id = Column(Integer, primary_key=True)
    username = Column(String(255), nullable=False)   # @channel_name
    title = Column(String(255), nullable=False, default="")
    invite_url = Column(Text, nullable=False, default="")
    is_active = Column(Boolean, nullable=False, default=True)
    priority = Column(Integer, nullable=False, default=100)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    kind = Column(String(32), nullable=False, default="text")  # text | url | file | telegram
    content = Column(Text, nullable=False, default="")
    url = Column(Text, nullable=False, default="")
    chunks_count = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, default="")
    phone = Column(String(64), nullable=False, default="")
    telegram_id = Column(BigInteger)
    telegram_username = Column(String(128), nullable=False, default="")
    source = Column(String(64), nullable=False, default="manual")
    status = Column(String(32), nullable=False, default="new")
    assigned_manager_id = Column(Integer)
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="SET NULL"))
    stage_id = Column(Integer, ForeignKey("board_stages.id", ondelete="SET NULL"))
    position = Column(Integer, nullable=False, default=100)
    notes = Column(Text, nullable=False, default="")
    sale_value = Column(Numeric(12, 2), nullable=False, default=0)
    last_message = Column(Text, nullable=False, default="")
    last_activity_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    messages = relationship("LeadMessage", back_populates="lead",
                            cascade="all, delete-orphan", order_by="LeadMessage.created_at")


class LeadMessage(Base):
    __tablename__ = "lead_messages"

    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(16), nullable=False, default="user")  # user | ai | manager
    kind = Column(String(16), nullable=False, default="text")
    content = Column(Text, nullable=False, default="")
    media_url = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lead = relationship("Lead", back_populates="messages")


class LeadCost(Base):
    """Per-lead AI usage cost tracking (usage-based billing)."""
    __tablename__ = "lead_costs"

    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(32), nullable=False, default="")
    model = Column(String(64), nullable=False, default="")
    prompt_tokens = Column(Integer, nullable=False, default=0)
    completion_tokens = Column(Integer, nullable=False, default=0)
    cost_usd = Column(Numeric(14, 6), nullable=False, default=0)
    used_platform_key = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    is_default = Column(Boolean, nullable=False, default=False)
    position = Column(Integer, nullable=False, default=100)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    stages = relationship("BoardStage", back_populates="board",
                          cascade="all, delete-orphan", order_by="BoardStage.position")


class BoardStage(Base):
    __tablename__ = "board_stages"

    id = Column(Integer, primary_key=True)
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    color = Column(String(16), nullable=False, default="slate")
    position = Column(Integer, nullable=False, default=100)
    is_won = Column(Boolean, nullable=False, default=False)
    is_lost = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    board = relationship("Board", back_populates="stages")


def default_board_stage(db):
    """Yangi lead uchun default board_id, stage_id qaytaradi (Kanban'da ko'rinishi uchun)."""
    board = db.query(Board).filter(Board.is_default == True).order_by(Board.position.asc()).first()  # noqa: E712
    if not board:
        board = db.query(Board).order_by(Board.position.asc(), Board.id.asc()).first()
    if not board:
        return None, None
    stage = (
        db.query(BoardStage)
        .filter(BoardStage.board_id == board.id, BoardStage.is_won == False, BoardStage.is_lost == False)  # noqa: E712
        .order_by(BoardStage.position.asc())
        .first()
    )
    if not stage:
        stage = db.query(BoardStage).filter(BoardStage.board_id == board.id).order_by(BoardStage.position.asc()).first()
    return board.id, (stage.id if stage else None)


class TelegramSession(Base):
    __tablename__ = "telegram_sessions"

    id = Column(Integer, primary_key=True)
    phone = Column(String(64), nullable=False, default="")
    api_id = Column(String(32), nullable=False, default="")
    api_hash = Column(String(64), nullable=False, default="")
    session_string = Column(Text, nullable=False, default="")
    is_connected = Column(Boolean, nullable=False, default=False)
    username = Column(String(128), nullable=False, default="")
    display_name = Column(String(255), nullable=False, default="")
    last_error = Column(Text, nullable=False, default="")
    connected_at = Column(DateTime(timezone=True))
    disconnected_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TelegramLoginFlow(Base):
    __tablename__ = "telegram_login_flows"

    id = Column(Integer, primary_key=True)
    phone = Column(String(64), nullable=False, default="")
    phone_code_hash = Column(String(128), nullable=False, default="")
    session_string = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))


class AppSetting(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True)
    system_prompt = Column(Text, nullable=False, default="Sen do'stona sotuv assistantsan. O'zbek tilida qisqa va aniq javob ber.")
    ai_enabled = Column(Boolean, nullable=False, default=False)
    welcome_message = Column(Text, nullable=False, default="")
    fallback_message = Column(Text, nullable=False, default="")
    manager_username = Column(String(128), nullable=False, default="")
    gemini_api_key = Column(Text, nullable=False, default="")
    gemini_model = Column(String(64), nullable=False, default="")
    ai_provider = Column(String(32), nullable=False, default="gemini")
    groq_api_key = Column(Text, nullable=False, default="")
    groq_model = Column(String(64), nullable=False, default="llama3-8b-8192")
    openai_api_key = Column(Text, nullable=False, default="")
    openai_model = Column(String(64), nullable=False, default="")
    claude_api_key = Column(Text, nullable=False, default="")
    claude_model = Column(String(64), nullable=False, default="")
    ai_model = Column(String(64), nullable=False, default="")

    # Persona
    persona_name = Column(String(64), nullable=False, default="")
    persona_tone = Column(String(16), nullable=False, default="friendly")   # friendly | formal | energetic
    persona_short = Column(Boolean, nullable=False, default=True)
    persona_we_form = Column(Boolean, nullable=False, default=False)
    persona_emoji = Column(Boolean, nullable=False, default=True)
    language = Column(String(8), nullable=False, default="uz")              # uz | ru | en

    # Sales behavior
    sales_aggressiveness = Column(Integer, nullable=False, default=5)       # 1..10
    payment_mention = Column(String(16), nullable=False, default="if_asked") # never | if_asked | always
    mention_discount = Column(Boolean, nullable=False, default=False)
    block_installment = Column(Boolean, nullable=False, default=False)      # "nasiya" so'zlarni yashirish
    push_leave_number = Column(Boolean, nullable=False, default=True)

    # Data collection
    collect_name = Column(Boolean, nullable=False, default=True)
    collect_phone = Column(Boolean, nullable=False, default=True)
    collect_business = Column(Boolean, nullable=False, default=False)
    collect_budget = Column(Boolean, nullable=False, default=False)

    # Business hours
    work_hours_enabled = Column(Boolean, nullable=False, default=False)
    work_hours_start = Column(String(5), nullable=False, default="09:00")
    work_hours_end = Column(String(5), nullable=False, default="21:00")
    after_hours_message = Column(Text, nullable=False, default="")

    # JSON lists
    banned_words = Column(Text, nullable=False, default="[]")               # ["so'z1", "so'z2"]
    objections = Column(Text, nullable=False, default="[]")                 # [{key,label,enabled,response}]
    special_situations = Column(Text, nullable=False, default="[]")         # [{trigger,response}]

    voice_reply_mode = Column(String(16), nullable=False, default="text")   # text | mixed | voice
    uzbekvoice_api_key = Column(Text, nullable=False, default="")

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class InstagramSession(Base):
    __tablename__ = "instagram_sessions"

    id = Column(Integer, primary_key=True)
    username = Column(String(128), nullable=False, default="")
    password_hash = Column(String(255), nullable=False, default="")  # optional stored (encrypted-lite)
    session_json = Column(Text, nullable=False, default="")  # instagrapi settings dump
    is_connected = Column(Boolean, nullable=False, default=False)
    display_name = Column(String(255), nullable=False, default="")
    last_error = Column(Text, nullable=False, default="")
    last_check_at = Column(DateTime(timezone=True))
    poll_cursor = Column(String(64), nullable=False, default="")  # last-seen message timestamp/id
    connected_at = Column(DateTime(timezone=True))
    disconnected_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

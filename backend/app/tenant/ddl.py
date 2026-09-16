"""DDL statements for a fresh tenant schema (org_<id>)."""

TENANT_DDL = [
    """
    CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        sku VARCHAR(128),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(12,2) NOT NULL DEFAULT 0,
        currency VARCHAR(3) NOT NULL DEFAULT 'UZS',
        in_stock BOOLEAN NOT NULL DEFAULT TRUE,
        stock_qty INTEGER,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        source VARCHAR(32) NOT NULL DEFAULT 'manual',
        source_channel VARCHAR(255),
        source_msg_id BIGINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        telegram_file_id VARCHAR(255),
        telegram_msg_id BIGINT,
        width INTEGER,
        height INTEGER,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)",
    "CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)",
    "CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id)",
    """
    CREATE TABLE IF NOT EXISTS triggers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        keywords TEXT NOT NULL DEFAULT '',
        response_text TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        priority INTEGER NOT NULL DEFAULT 100,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS required_channels (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT '',
        invite_url TEXT NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        priority INTEGER NOT NULL DEFAULT 100,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    ALTER TABLE IF EXISTS triggers ADD COLUMN IF NOT EXISTS required_channel_ids TEXT NOT NULL DEFAULT ''
    """,
    """
    CREATE TABLE IF NOT EXISTS knowledge_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        kind VARCHAR(32) NOT NULL DEFAULT 'text',
        content TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL DEFAULT '',
        meta JSONB NOT NULL DEFAULT '{}',
        chunks_count INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL DEFAULT '',
        phone VARCHAR(64) NOT NULL DEFAULT '',
        telegram_id BIGINT,
        telegram_username VARCHAR(128) NOT NULL DEFAULT '',
        source VARCHAR(64) NOT NULL DEFAULT 'manual',
        status VARCHAR(32) NOT NULL DEFAULT 'new',
        assigned_manager_id INTEGER,
        notes TEXT NOT NULL DEFAULT '',
        sale_value NUMERIC(12,2) NOT NULL DEFAULT 0,
        last_message TEXT NOT NULL DEFAULT '',
        last_activity_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_leads_telegram_id ON leads(telegram_id)
    """,
    """
    CREATE TABLE IF NOT EXISTS lead_messages (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        role VARCHAR(16) NOT NULL DEFAULT 'user',
        kind VARCHAR(16) NOT NULL DEFAULT 'text',
        content TEXT NOT NULL DEFAULT '',
        media_url TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_lead_messages_lead_id ON lead_messages(lead_id, created_at)
    """,
    """
    CREATE TABLE IF NOT EXISTS lead_costs (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        provider VARCHAR(32) NOT NULL DEFAULT '',
        model VARCHAR(64) NOT NULL DEFAULT '',
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd NUMERIC(14,6) NOT NULL DEFAULT 0,
        used_platform_key BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_lead_costs_lead_id ON lead_costs(lead_id, created_at)",
    """
    CREATE TABLE IF NOT EXISTS boards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        position INTEGER NOT NULL DEFAULT 100,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS board_stages (
        id SERIAL PRIMARY KEY,
        board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(16) NOT NULL DEFAULT 'slate',
        position INTEGER NOT NULL DEFAULT 100,
        is_won BOOLEAN NOT NULL DEFAULT FALSE,
        is_lost BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_board_stages_board_id ON board_stages(board_id, position)
    """,
    """
    ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS board_id INTEGER REFERENCES boards(id) ON DELETE SET NULL
    """,
    """
    ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS stage_id INTEGER REFERENCES board_stages(id) ON DELETE SET NULL
    """,
    """
    ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 100
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage_id, position)
    """,
    """
    WITH def_board AS (
        SELECT id FROM boards ORDER BY is_default DESC, position ASC, id ASC LIMIT 1
    ), def_stage AS (
        SELECT bs.id FROM board_stages bs, def_board db
        WHERE bs.board_id = db.id AND bs.is_won = FALSE AND bs.is_lost = FALSE
        ORDER BY bs.position ASC LIMIT 1
    )
    UPDATE leads SET board_id = (SELECT id FROM def_board), stage_id = (SELECT id FROM def_stage)
    WHERE board_id IS NULL AND EXISTS (SELECT 1 FROM def_board)
    """,
    """
    CREATE TABLE IF NOT EXISTS telegram_sessions (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(64) NOT NULL DEFAULT '',
        api_id VARCHAR(32) NOT NULL DEFAULT '',
        api_hash VARCHAR(64) NOT NULL DEFAULT '',
        session_string TEXT NOT NULL DEFAULT '',
        is_connected BOOLEAN NOT NULL DEFAULT FALSE,
        username VARCHAR(128) NOT NULL DEFAULT '',
        display_name VARCHAR(255) NOT NULL DEFAULT '',
        last_error TEXT NOT NULL DEFAULT '',
        connected_at TIMESTAMPTZ,
        disconnected_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS telegram_login_flows (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(64) NOT NULL DEFAULT '',
        phone_code_hash VARCHAR(128) NOT NULL DEFAULT '',
        session_string TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        system_prompt TEXT NOT NULL DEFAULT 'Sen do''stona sotuv assistantsan. O''zbek tilida qisqa va aniq javob ber.',
        ai_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        welcome_message TEXT NOT NULL DEFAULT '',
        fallback_message TEXT NOT NULL DEFAULT '',
        manager_username VARCHAR(128) NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
        "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS persona_name VARCHAR(64) NOT NULL DEFAULT ''",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS persona_tone VARCHAR(16) NOT NULL DEFAULT 'friendly'",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS persona_short BOOLEAN NOT NULL DEFAULT TRUE",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS persona_we_form BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS persona_emoji BOOLEAN NOT NULL DEFAULT TRUE",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS language VARCHAR(8) NOT NULL DEFAULT 'uz'",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS sales_aggressiveness INTEGER NOT NULL DEFAULT 5",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS payment_mention VARCHAR(16) NOT NULL DEFAULT 'if_asked'",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS mention_discount BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS block_installment BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS push_leave_number BOOLEAN NOT NULL DEFAULT TRUE",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS collect_name BOOLEAN NOT NULL DEFAULT TRUE",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS collect_phone BOOLEAN NOT NULL DEFAULT TRUE",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS collect_business BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS collect_budget BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS work_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS work_hours_start VARCHAR(5) NOT NULL DEFAULT '09:00'",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS work_hours_end VARCHAR(5) NOT NULL DEFAULT '21:00'",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS after_hours_message TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS banned_words TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS objections TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS special_situations TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS gemini_api_key TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS gemini_model VARCHAR(64) NOT NULL DEFAULT ''",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(32) NOT NULL DEFAULT 'gemini'",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS groq_api_key TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS groq_model VARCHAR(64) NOT NULL DEFAULT 'llama3-8b-8192'",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS voice_reply_mode VARCHAR(16) NOT NULL DEFAULT 'text'",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS uzbekvoice_api_key TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS openai_api_key TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS openai_model VARCHAR(64) NOT NULL DEFAULT ''",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS claude_api_key TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS claude_model VARCHAR(64) NOT NULL DEFAULT ''",
    "ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS ai_model VARCHAR(64) NOT NULL DEFAULT ''",
        """
    CREATE TABLE IF NOT EXISTS instagram_sessions (
        id SERIAL PRIMARY KEY,
        username VARCHAR(128) NOT NULL DEFAULT '',
        password_hash VARCHAR(255) NOT NULL DEFAULT '',
        session_json TEXT NOT NULL DEFAULT '',
        is_connected BOOLEAN NOT NULL DEFAULT FALSE,
        display_name VARCHAR(255) NOT NULL DEFAULT '',
        last_error TEXT NOT NULL DEFAULT '',
        last_check_at TIMESTAMPTZ,
        poll_cursor VARCHAR(64) NOT NULL DEFAULT '',
        connected_at TIMESTAMPTZ,
        disconnected_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
]

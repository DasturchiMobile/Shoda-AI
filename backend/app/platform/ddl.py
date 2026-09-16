"""Platform-schema DDL for tables added after initial migration (billing etc)."""
from sqlalchemy import text
from ..db import engine

_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS platform.org_billing (
        id SERIAL PRIMARY KEY,
        org_id INTEGER NOT NULL UNIQUE REFERENCES platform.organizations(id) ON DELETE CASCADE,
        balance_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
        monthly_fee_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
        subscription_active BOOLEAN NOT NULL DEFAULT TRUE,
        subscription_until TIMESTAMPTZ,
        total_input_tokens BIGINT NOT NULL DEFAULT 0,
        total_output_tokens BIGINT NOT NULL DEFAULT 0,
        total_spent_usd NUMERIC(14,6) NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS platform.billing_ledger (
        id SERIAL PRIMARY KEY,
        org_id INTEGER NOT NULL REFERENCES platform.organizations(id) ON DELETE CASCADE,
        kind VARCHAR(24) NOT NULL,
        amount_usd NUMERIC(14,6) NOT NULL,
        balance_after NUMERIC(14,6) NOT NULL,
        note VARCHAR(500) NOT NULL DEFAULT '',
        input_tokens BIGINT NOT NULL DEFAULT 0,
        output_tokens BIGINT NOT NULL DEFAULT 0,
        model VARCHAR(64) NOT NULL DEFAULT '',
        created_by_user_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "ALTER TABLE platform.org_billing ADD COLUMN IF NOT EXISTS tariff VARCHAR(16) NOT NULL DEFAULT 'paid'",
    "CREATE INDEX IF NOT EXISTS idx_billing_ledger_org ON platform.billing_ledger(org_id, created_at DESC)",
]


def run_platform_ddl():
    for stmt in _STATEMENTS:
        try:
            with engine.begin() as conn:
                conn.execute(text(stmt))
        except Exception as e:
            print(f"[platform-ddl] xato: {e}")

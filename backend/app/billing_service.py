"""Usage-based billing: per-token costs + per-lead cost tracking.

No monthly fee / tariff gating: `can_use_ai` always allows.
Org balance is deducted ONLY when the platform key was used (org has no own key).
Usage rows (billing ledger + per-tenant `lead_costs`) are recorded in all cases.
"""
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy.orm import Session

# Prices per 1M tokens (USD), no markup. Unknown model -> per-provider fallback.
PRICES = {
    # OpenAI
    "gpt-4o-mini": {"in": Decimal("0.15"), "out": Decimal("0.60")},
    # Anthropic
    "claude-3-5-haiku": {"in": Decimal("0.80"), "out": Decimal("4.00")},
    # Google
    "gemini-2.5-flash": {"in": Decimal("0.30"), "out": Decimal("2.50")},
    "gemini-1.5-flash": {"in": Decimal("0.075"), "out": Decimal("0.30")},
    # Groq
    "llama-3.3-70b-versatile": {"in": Decimal("0.59"), "out": Decimal("0.79")},
}

PROVIDER_FALLBACK_PRICES = {
    "openai":  {"in": Decimal("0.15"), "out": Decimal("0.60")},
    "claude":  {"in": Decimal("0.80"), "out": Decimal("4.00")},
    "gemini":  {"in": Decimal("0.075"), "out": Decimal("0.30")},
    "groq":    {"in": Decimal("0.59"), "out": Decimal("0.79")},
}
DEFAULT_PRICES = PROVIDER_FALLBACK_PRICES["gemini"]

# Kept for backwards compatibility with older imports.
GEMINI_PRICES = {
    "gemini-1.5-flash": PRICES["gemini-1.5-flash"],
    "gemini-1.5-flash-8b": {"in": Decimal("0.0375"), "out": Decimal("0.15")},
    "gemini-1.5-pro": {"in": Decimal("1.25"), "out": Decimal("5.00")},
    "gemini-2.0-flash": {"in": Decimal("0.10"), "out": Decimal("0.40")},
    "gemini-2.0-flash-lite": {"in": Decimal("0.075"), "out": Decimal("0.30")},
    "gemini-2.5-flash": PRICES["gemini-2.5-flash"],
}


def cost_usd(model: str, in_tokens: int, out_tokens: int, provider: str = "") -> Decimal:
    """Cost of a request. Explicit model price first, then per-provider fallback."""
    p = PRICES.get(model)
    if p is None:
        for known, prices in PRICES.items():
            if model and model.startswith(known):
                p = prices
                break
    if p is None:
        p = PROVIDER_FALLBACK_PRICES.get(provider, DEFAULT_PRICES)
    raw = (p["in"] * Decimal(int(in_tokens)) + p["out"] * Decimal(int(out_tokens))) / Decimal(1_000_000)
    return raw.quantize(Decimal("0.000001"))


def get_or_create_billing(db: Session, org_id: int):
    from .platform.models import OrgBilling
    row = db.query(OrgBilling).filter(OrgBilling.org_id == org_id).first()
    if not row:
        row = OrgBilling(org_id=org_id, balance_usd=Decimal("0"))
        db.add(row); db.commit(); db.refresh(row)
    return row


def can_use_ai(db: Session, org_id: int) -> tuple[bool, str]:
    """Usage-based only: always allow. No subscription/tariff/monthly-fee gating.
    (Signature kept for ai_service compatibility.)"""
    try:
        get_or_create_billing(db, org_id)
    except Exception:
        pass
    return True, ""


def charge_tokens(db: Session, org_id: int, model: str, in_tokens: int, out_tokens: int,
                  note: str = "", provider: str = "", used_platform_key: bool = True):
    """Deduct token cost from org balance (platform key usage only) and log to ledger.
    Ledger row is written even when used_platform_key is False (amount 0, own key)."""
    from .platform.models import BillingLedger
    b = get_or_create_billing(db, org_id)
    amount = cost_usd(model, in_tokens, out_tokens, provider=provider)

    if used_platform_key:
        b.balance_usd = (Decimal(b.balance_usd) - amount).quantize(Decimal("0.0001"))
        b.total_spent_usd = (Decimal(b.total_spent_usd) + amount).quantize(Decimal("0.000001"))
        ledger_amount = -amount
    else:
        ledger_amount = Decimal("0")

    b.total_input_tokens = int(b.total_input_tokens) + int(in_tokens)
    b.total_output_tokens = int(b.total_output_tokens) + int(out_tokens)
    db.add(BillingLedger(
        org_id=org_id, kind="token_usage", amount_usd=ledger_amount, balance_after=b.balance_usd,
        note=note or f"{provider or 'ai'}/{model} {in_tokens}+{out_tokens}"
                      + ("" if used_platform_key else " (own key)"),
        input_tokens=in_tokens, output_tokens=out_tokens, model=model,
    ))
    db.commit()
    return amount


def record_ai_usage(db: Session, org_id: int, lead_id: int | None, provider: str, model: str,
                    prompt_tokens: int, completion_tokens: int, used_platform_key: bool) -> Decimal:
    """Record one AI call:

    1. tenant `lead_costs` row (per-lead cost tracking) -- written in all cases;
    2. billing ledger usage row; org balance is deducted ONLY when
       used_platform_key=True (org has no own key and the platform key was used).

    Robust: a failure writing the tenant row never breaks the platform ledger
    (and vice versa). Returns the computed cost in USD.
    """
    prompt_tokens = int(prompt_tokens or 0)
    completion_tokens = int(completion_tokens or 0)
    amount = cost_usd(model, prompt_tokens, completion_tokens, provider=provider)

    # 1) tenant lead_costs row (own session against org schema, caller's db may be platform-scoped)
    try:
        from .db import SessionLocal, current_schema
        tdb = SessionLocal()
        try:
            current_schema.set(f"org_{org_id}")
            from .tenant.models import LeadCost
            tdb.add(LeadCost(
                lead_id=lead_id, provider=provider or "", model=model or "",
                prompt_tokens=prompt_tokens, completion_tokens=completion_tokens,
                cost_usd=amount, used_platform_key=bool(used_platform_key),
            ))
            tdb.commit()
        finally:
            current_schema.set(None)
            tdb.close()
    except Exception as e:
        print(f"[billing] lead_costs yozishda xato (org={org_id}, lead={lead_id}): {e}")

    # 2) platform ledger + balance (deduct only for platform key usage)
    try:
        charge_tokens(db, org_id, model, prompt_tokens, completion_tokens,
                      note=f"ai reply (lead={lead_id}, provider={provider})",
                      provider=provider, used_platform_key=used_platform_key)
    except Exception as e:
        print(f"[billing] ledger yozishda xato (org={org_id}): {e}")
        try:
            db.rollback()
        except Exception:
            pass

    return amount


def topup(db: Session, org_id: int, amount_usd: Decimal, by_user_id: int | None = None, note: str = "Superadmin topup"):
    from .platform.models import BillingLedger
    b = get_or_create_billing(db, org_id)
    b.balance_usd = (Decimal(b.balance_usd) + Decimal(amount_usd)).quantize(Decimal("0.0001"))
    db.add(BillingLedger(
        org_id=org_id, kind="topup", amount_usd=Decimal(amount_usd), balance_after=b.balance_usd,
        note=note, created_by_user_id=by_user_id,
    ))
    db.commit()
    return b.balance_usd

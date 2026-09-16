"""Billing endpoints. Superadmin manages, admin reads own org.

Usage-based only: no tariff/monthly-fee gating. Balance is deducted only for
platform-key usage; own-key usage is recorded but not charged.
"""
from decimal import Decimal
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from ..db import get_db, current_schema
from ..deps import require_superadmin, require_admin, get_current_user
from ..platform.models import Organization, OrgBilling, BillingLedger
from ..billing_service import get_or_create_billing, topup
from .models import Lead, LeadCost

router = APIRouter(prefix="/api", tags=["billing"])


def _serialize_billing(b: OrgBilling, org: Organization | None = None) -> dict:
    return {
        "org_id": b.org_id,
        "org_name": org.name if org else "",
        "balance_usd": float(b.balance_usd or 0),
        "monthly_fee_usd": float(b.monthly_fee_usd or 0),
        "subscription_active": b.subscription_active,
        "tariff": getattr(b, "tariff", "paid") or "paid",
        "subscription_until": b.subscription_until.isoformat() if b.subscription_until else None,
        "total_input_tokens": int(b.total_input_tokens or 0),
        "total_output_tokens": int(b.total_output_tokens or 0),
        "total_spent_usd": float(b.total_spent_usd or 0),
    }


# ---------- Superadmin ----------
@router.get("/superadmin/billing")
def sa_list_billing(_=Depends(require_superadmin), db: Session = Depends(get_db)):
    current_schema.set(None)
    orgs = db.query(Organization).filter(Organization.slug != "platform").order_by(Organization.id.asc()).all()
    out = []
    for o in orgs:
        b = get_or_create_billing(db, o.id)
        out.append(_serialize_billing(b, o))
    return out


class TopupIn(BaseModel):
    amount_usd: float
    note: str = ""


@router.post("/superadmin/billing/{org_id}/topup")
def sa_topup(org_id: int, payload: TopupIn, current=Depends(require_superadmin), db: Session = Depends(get_db)):
    current_schema.set(None)
    if payload.amount_usd == 0:
        raise HTTPException(400, "Miqdor 0 bo'lmasin")
    new_bal = topup(db, org_id, Decimal(str(payload.amount_usd)), by_user_id=current.id, note=payload.note or "Superadmin topup")
    return {"ok": True, "balance_usd": float(new_bal)}


class SubIn(BaseModel):
    monthly_fee_usd: float | None = None
    subscription_active: bool | None = None
    tariff: str | None = None


@router.put("/superadmin/billing/{org_id}/subscription")
def sa_update_sub(org_id: int, payload: SubIn, _=Depends(require_superadmin), db: Session = Depends(get_db)):
    current_schema.set(None)
    b = get_or_create_billing(db, org_id)
    if payload.monthly_fee_usd is not None:
        b.monthly_fee_usd = Decimal(str(payload.monthly_fee_usd))
    if payload.subscription_active is not None:
        b.subscription_active = payload.subscription_active
    if payload.tariff in ("free","paid"):
        b.tariff = payload.tariff
    db.commit()
    return {"ok": True}


@router.get("/superadmin/billing/{org_id}/ledger")
def sa_ledger(org_id: int, _=Depends(require_superadmin), db: Session = Depends(get_db)):
    current_schema.set(None)
    rows = db.query(BillingLedger).filter(BillingLedger.org_id == org_id).order_by(BillingLedger.id.desc()).limit(200).all()
    return [{
        "id": r.id, "kind": r.kind, "amount_usd": float(r.amount_usd),
        "balance_after": float(r.balance_after), "note": r.note,
        "input_tokens": int(r.input_tokens), "output_tokens": int(r.output_tokens),
        "model": r.model, "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in rows]


# ---------- Admin (own org) ----------
@router.get("/billing")
def my_billing(current=Depends(require_admin), db: Session = Depends(get_db)):
    current_schema.set(None)
    b = get_or_create_billing(db, current.org_id)
    org = db.query(Organization).filter(Organization.id == current.org_id).first()
    return _serialize_billing(b, org)


@router.get("/billing/ledger")
def my_ledger(current=Depends(require_admin), db: Session = Depends(get_db)):
    current_schema.set(None)
    rows = db.query(BillingLedger).filter(BillingLedger.org_id == current.org_id).order_by(BillingLedger.id.desc()).limit(100).all()
    return [{
        "id": r.id, "kind": r.kind, "amount_usd": float(r.amount_usd),
        "balance_after": float(r.balance_after), "note": r.note,
        "input_tokens": int(r.input_tokens), "output_tokens": int(r.output_tokens),
        "model": r.model, "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in rows]


@router.get("/billing/usage")
def my_usage(current=Depends(require_admin), db: Session = Depends(get_db)):
    """AI usage totals for today and this month, grouped by provider/model."""
    current_schema.set(f"org_{current.org_id}")
    now = datetime.now(timezone.utc)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def _totals(since):
        q = db.query(
            LeadCost.provider, LeadCost.model,
            sql_func.coalesce(sql_func.sum(LeadCost.prompt_tokens), 0),
            sql_func.coalesce(sql_func.sum(LeadCost.completion_tokens), 0),
            sql_func.coalesce(sql_func.sum(LeadCost.cost_usd), 0),
            sql_func.count(LeadCost.id),
        ).filter(LeadCost.created_at >= since).group_by(LeadCost.provider, LeadCost.model).all()
        return [{
            "provider": r[0] or "", "model": r[1] or "",
            "prompt_tokens": int(r[2]), "completion_tokens": int(r[3]),
            "cost_usd": float(r[4]), "calls": int(r[5]),
        } for r in q]

    def _sum(rows):
        return {
            "prompt_tokens": sum(r["prompt_tokens"] for r in rows),
            "completion_tokens": sum(r["completion_tokens"] for r in rows),
            "cost_usd": round(sum(r["cost_usd"] for r in rows), 6),
            "calls": sum(r["calls"] for r in rows),
        }

    today, month = _totals(day_start), _totals(month_start)
    current_schema.set(None)
    return {"today": {"totals": _sum(today), "by_model": today},
            "month": {"totals": _sum(month), "by_model": month}}


@router.get("/billing/lead-costs")
def my_lead_costs(current=Depends(require_admin), db: Session = Depends(get_db),
                  limit: int = 100):
    """Recent per-lead AI cost rows (with lead name)."""
    current_schema.set(f"org_{current.org_id}")
    limit = max(1, min(limit, 500))
    rows = (
        db.query(LeadCost, Lead.name)
        .outerjoin(Lead, Lead.id == LeadCost.lead_id)
        .order_by(LeadCost.id.desc())
        .limit(limit).all()
    )
    current_schema.set(None)
    return [{
        "id": c.id, "lead_id": c.lead_id, "lead_name": name or "",
        "provider": c.provider, "model": c.model,
        "prompt_tokens": int(c.prompt_tokens or 0), "completion_tokens": int(c.completion_tokens or 0),
        "cost_usd": float(c.cost_usd or 0), "used_platform_key": bool(c.used_platform_key),
        "created_at": c.created_at.isoformat() if c.created_at else None,
    } for c, name in rows]

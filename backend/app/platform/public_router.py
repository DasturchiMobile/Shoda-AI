"""Ochiq (autentifikatsiyasiz) endpointlar — landing page uchun."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..db import get_db, current_schema
from .models import Organization

router = APIRouter(prefix="/api/public", tags=["public"])

# Namangan ofisi ochilishi munosabati bilan bepul beriladigan joylar soni
PROMO_TOTAL_SLOTS = 50


@router.get("/promo")
def promo_stats(db: Session = Depends(get_db)):
    """Landing page hisoblagichi: nechta tadbirkor ro'yxatdan o'tgan va nechta joy qolgan."""
    current_schema.set(None)
    try:
        taken = db.query(func.count(Organization.id)).scalar() or 0
    except Exception:
        taken = 0
    taken = min(int(taken), PROMO_TOTAL_SLOTS)
    return {
        "total": PROMO_TOTAL_SLOTS,
        "taken": taken,
        "left": max(0, PROMO_TOTAL_SLOTS - taken),
        "monthly_price_usd": 10,
    }

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func as sql_func
from pydantic import BaseModel

from ..db import get_db
from ..deps import require_admin
from .models import Lead, LeadMessage, LeadCost, default_board_stage
from .schemas import LeadIn, LeadOut, LeadMessageIn, LeadMessageOut, LeadStatusUpdate

router = APIRouter(prefix="/api/leads", tags=["leads"])

ALLOWED_STATUS = {"new", "contacted", "qualified", "won", "lost"}


def _lead_cost_and_count(db: Session, lead_ids: list[int]) -> dict[int, tuple[float, int]]:
    """lead_id -> (total_cost_usd, message_count)."""
    if not lead_ids:
        return {}
    costs = dict(
        db.query(LeadCost.lead_id, sql_func.coalesce(sql_func.sum(LeadCost.cost_usd), 0))
        .filter(LeadCost.lead_id.in_(lead_ids)).group_by(LeadCost.lead_id).all()
    )
    counts = dict(
        db.query(LeadMessage.lead_id, sql_func.count(LeadMessage.id))
        .filter(LeadMessage.lead_id.in_(lead_ids)).group_by(LeadMessage.lead_id).all()
    )
    return {lid: (float(costs.get(lid, 0) or 0), int(counts.get(lid, 0))) for lid in lead_ids}


def _serialize(l: Lead, stats: tuple[float, int] = (0.0, 0)) -> dict:
    total_cost, msg_count = stats
    return {
        "id": l.id, "name": l.name, "phone": l.phone,
        "telegram_id": l.telegram_id, "telegram_username": l.telegram_username,
        "source": l.source, "status": l.status,
        "assigned_manager_id": l.assigned_manager_id,
        "notes": l.notes, "sale_value": float(l.sale_value or 0),
        "last_message": l.last_message,
        "last_activity_at": l.last_activity_at.isoformat() if l.last_activity_at else None,
        "created_at": l.created_at.isoformat() if l.created_at else None,
        "board_id": l.board_id, "stage_id": l.stage_id, "position": l.position,
        "total_cost_usd": total_cost,
        "message_count": msg_count,
    }


def _serialize_many(db: Session, leads: list[Lead]) -> list[dict]:
    stats = _lead_cost_and_count(db, [l.id for l in leads])
    return [_serialize(l, stats.get(l.id, (0.0, 0))) for l in leads]


@router.get("")
def list_leads(
    board_id: int | None = None,
    stage_id: int | None = None,
    status: str | None = None,
    search: str | None = None,
    _=Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(Lead)
    if board_id:
        q = q.filter(Lead.board_id == board_id)
    if stage_id:
        q = q.filter(Lead.stage_id == stage_id)
    if status:
        q = q.filter(Lead.status == status)
    if search:
        s = f"%{search.lower()}%"
        q = q.filter(or_(sql_func.lower(Lead.name).like(s), Lead.phone.like(s), sql_func.lower(Lead.telegram_username).like(s)))
    rows = q.order_by(Lead.updated_at.desc()).limit(500).all()
    return _serialize_many(db, rows)


@router.get("/stats")
def lead_stats(_=Depends(require_admin), db: Session = Depends(get_db)):
    counts = dict(db.query(Lead.status, sql_func.count(Lead.id)).group_by(Lead.status).all())
    return {s: counts.get(s, 0) for s in ALLOWED_STATUS}


@router.post("", response_model=None)
def create_lead(payload: LeadIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    if payload.status not in ALLOWED_STATUS:
        raise HTTPException(400, "status noto'g'ri")
    b_id, s_id = default_board_stage(db)
    l = Lead(
        name=payload.name, phone=payload.phone,
        telegram_id=payload.telegram_id, telegram_username=payload.telegram_username,
        source=payload.source, status=payload.status,
        assigned_manager_id=payload.assigned_manager_id,
        notes=payload.notes, sale_value=payload.sale_value,
        board_id=b_id, stage_id=s_id,
    )
    db.add(l); db.commit(); db.refresh(l)
    return _serialize(l, _lead_cost_and_count(db, [l.id]).get(l.id, (0.0, 0)))


@router.get("/{lid}")
def get_lead(lid: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    l = db.query(Lead).filter(Lead.id == lid).first()
    if not l: raise HTTPException(404, "Topilmadi")
    return _serialize(l, _lead_cost_and_count(db, [l.id]).get(l.id, (0.0, 0)))


@router.patch("/{lid}")
def update_lead(lid: int, payload: LeadIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    l = db.query(Lead).filter(Lead.id == lid).first()
    if not l: raise HTTPException(404, "Topilmadi")
    if payload.status not in ALLOWED_STATUS:
        raise HTTPException(400, "status noto'g'ri")
    l.name = payload.name; l.phone = payload.phone
    l.telegram_id = payload.telegram_id; l.telegram_username = payload.telegram_username
    l.source = payload.source; l.status = payload.status
    l.assigned_manager_id = payload.assigned_manager_id
    l.notes = payload.notes; l.sale_value = payload.sale_value
    db.commit(); db.refresh(l)
    return _serialize(l)


@router.patch("/{lid}/status")
def change_status(lid: int, payload: LeadStatusUpdate, _=Depends(require_admin), db: Session = Depends(get_db)):
    l = db.query(Lead).filter(Lead.id == lid).first()
    if not l: raise HTTPException(404, "Topilmadi")
    if payload.status not in ALLOWED_STATUS:
        raise HTTPException(400, "status noto'g'ri")
    l.status = payload.status
    db.commit(); db.refresh(l)
    return _serialize(l)


@router.delete("/{lid}")
def delete_lead(lid: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    l = db.query(Lead).filter(Lead.id == lid).first()
    if not l: raise HTTPException(404, "Topilmadi")
    db.delete(l); db.commit()
    return {"ok": True}


@router.get("/{lid}/messages")
def list_messages(lid: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(LeadMessage).filter(LeadMessage.lead_id == lid).order_by(LeadMessage.created_at).all()
    return [{"id": m.id, "role": m.role, "kind": m.kind, "content": m.content,
             "media_url": m.media_url, "created_at": m.created_at.isoformat()} for m in rows]


@router.get("/{lid}/costs")
def lead_cost_history(lid: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    """AI usage cost history for one lead."""
    l = db.query(Lead).filter(Lead.id == lid).first()
    if not l: raise HTTPException(404, "Topilmadi")
    rows = db.query(LeadCost).filter(LeadCost.lead_id == lid).order_by(LeadCost.created_at.desc()).limit(500).all()
    total = sum(float(r.cost_usd or 0) for r in rows)
    return {
        "lead_id": lid,
        "total_cost_usd": round(total, 6),
        "items": [{
            "id": r.id, "provider": r.provider, "model": r.model,
            "prompt_tokens": int(r.prompt_tokens or 0), "completion_tokens": int(r.completion_tokens or 0),
            "cost_usd": float(r.cost_usd or 0), "used_platform_key": bool(r.used_platform_key),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in rows],
    }


@router.post("/{lid}/messages")
def add_message(lid: int, payload: LeadMessageIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    l = db.query(Lead).filter(Lead.id == lid).first()
    if not l: raise HTTPException(404, "Lid topilmadi")
    m = LeadMessage(lead_id=lid, role=payload.role, kind=payload.kind,
                    content=payload.content, media_url=payload.media_url)
    db.add(m)
    l.last_message = payload.content[:500]
    l.last_activity_at = sql_func.now()
    db.commit(); db.refresh(m)
    return {"id": m.id, "role": m.role, "kind": m.kind, "content": m.content,
            "media_url": m.media_url, "created_at": m.created_at.isoformat()}



class MoveIn(BaseModel):
    stage_id: int
    position: int = 100


@router.patch("/{lid}/move")
def move_lead(lid: int, payload: 'MoveIn', _=Depends(require_admin), db: Session = Depends(get_db)):
    l = db.query(Lead).filter(Lead.id == lid).first()
    if not l: raise HTTPException(404, "Topilmadi")
    l.stage_id = payload.stage_id
    l.position = payload.position
    db.commit(); db.refresh(l)
    return _serialize(l)


class ReplyIn(BaseModel):
    text: str


@router.post("/{lid}/reply")
async def reply_to_lead(lid: int, payload: ReplyIn, current=Depends(require_admin), db: Session = Depends(get_db)):
    """Send a Telegram message to a lead from the connected account (manager reply)."""
    from fastapi import HTTPException
    from datetime import datetime, timezone
    lead = db.query(Lead).filter(Lead.id == lid).first()
    if not lead:
        raise HTTPException(404, "Lead topilmadi")
    if not lead.telegram_id:
        raise HTTPException(400, "Lidda Telegram ID yo'q")
    text_msg = (payload.text or "").strip()
    if not text_msg:
        raise HTTPException(400, "Xabar bo'sh")

    from .telegram_service import telegram_manager
    org_id = current.org_id
    client_wrap = telegram_manager.clients.get(org_id)
    if not client_wrap or not client_wrap.client:
        raise HTTPException(400, "Telegram ulanmagan. Integratsiyalar bo'limidan ulang.")
    try:
        await client_wrap.client.send_message(int(lead.telegram_id), text_msg)
    except Exception as e:
        raise HTTPException(500, f"Yuborishda xato: {str(e)[:200]}")

    lead.last_message = text_msg[:500]
    lead.last_activity_at = datetime.now(timezone.utc)
    db.add(LeadMessage(lead_id=lead.id, role="manager", kind="text", content=text_msg))
    db.commit()
    return {"ok": True}

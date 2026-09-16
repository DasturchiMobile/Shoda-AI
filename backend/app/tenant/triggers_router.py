from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_admin
from .models import Trigger
from .schemas import TriggerIn, TriggerOut

router = APIRouter(prefix="/api/triggers", tags=["triggers"])


def _kws_to_str(lst):
    return ",".join([k.strip() for k in (lst or []) if k.strip()])


def _ids_to_str(lst):
    return ",".join(str(i) for i in (lst or []) if isinstance(i, int))


@router.get("", response_model=list[TriggerOut])
def list_triggers(_=Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(Trigger).order_by(Trigger.priority.asc(), Trigger.id.asc()).all()
    return [TriggerOut.from_row(r) for r in rows]


@router.post("", response_model=TriggerOut)
def create_trigger(payload: TriggerIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(400, "Nomi bo'sh")
    if not payload.response_text.strip():
        raise HTTPException(400, "Javob matni bo'sh")
    t = Trigger(
        name=payload.name.strip(),
        keywords=_kws_to_str(payload.keywords),
        response_text=payload.response_text,
        is_active=payload.is_active,
        priority=payload.priority,
        required_channel_ids=_ids_to_str(payload.required_channel_ids),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return TriggerOut.from_row(t)


@router.patch("/{tid}", response_model=TriggerOut)
def update_trigger(tid: int, payload: TriggerIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    t = db.query(Trigger).filter(Trigger.id == tid).first()
    if not t:
        raise HTTPException(404, "Topilmadi")
    t.name = payload.name.strip()
    t.keywords = _kws_to_str(payload.keywords)
    t.response_text = payload.response_text
    t.is_active = payload.is_active
    t.priority = payload.priority
    t.required_channel_ids = _ids_to_str(payload.required_channel_ids)
    db.commit()
    db.refresh(t)
    return TriggerOut.from_row(t)


@router.delete("/{tid}")
def delete_trigger(tid: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    t = db.query(Trigger).filter(Trigger.id == tid).first()
    if not t:
        raise HTTPException(404, "Topilmadi")
    db.delete(t)
    db.commit()
    return {"ok": True}

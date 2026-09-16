from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_admin
from .models import RequiredChannel
from .schemas import ChannelIn, ChannelOut

router = APIRouter(prefix="/api/required-channels", tags=["required-channels"])


def _normalize_username(u: str) -> str:
    u = u.strip()
    if u.startswith("https://t.me/"):
        u = u.replace("https://t.me/", "")
    if u.startswith("t.me/"):
        u = u.replace("t.me/", "")
    if not u.startswith("@"):
        u = "@" + u
    return u


@router.get("", response_model=list[ChannelOut])
def list_channels(_=Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(RequiredChannel).order_by(RequiredChannel.priority.asc(), RequiredChannel.id.asc()).all()


@router.post("", response_model=ChannelOut)
def create_channel(payload: ChannelIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    if not payload.username.strip():
        raise HTTPException(400, "Kanal username bo'sh")
    username = _normalize_username(payload.username)
    invite = payload.invite_url.strip() or f"https://t.me/{username.lstrip('@')}"
    c = RequiredChannel(username=username, title=payload.title.strip() or username,
                        invite_url=invite, is_active=payload.is_active, priority=payload.priority)
    db.add(c); db.commit(); db.refresh(c)
    return c


@router.patch("/{cid}", response_model=ChannelOut)
def update_channel(cid: int, payload: ChannelIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    c = db.query(RequiredChannel).filter(RequiredChannel.id == cid).first()
    if not c: raise HTTPException(404, "Topilmadi")
    c.username = _normalize_username(payload.username)
    c.title = payload.title.strip() or c.username
    c.invite_url = payload.invite_url.strip() or f"https://t.me/{c.username.lstrip('@')}"
    c.is_active = payload.is_active
    c.priority = payload.priority
    db.commit(); db.refresh(c)
    return c


@router.delete("/{cid}")
def delete_channel(cid: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    c = db.query(RequiredChannel).filter(RequiredChannel.id == cid).first()
    if not c: raise HTTPException(404, "Topilmadi")
    db.delete(c); db.commit()
    return {"ok": True}

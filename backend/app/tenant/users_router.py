"""Admin can manage manager users within their org."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db, current_schema
from ..deps import require_admin
from ..platform.models import User
from ..security import hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


class UserIn(BaseModel):
    username: str
    password: str | None = None
    role: str = "manager"
    is_active: bool = True


@router.get("")
def list_users(current=Depends(require_admin), db: Session = Depends(get_db)):
    current_schema.set(None)  # users live in platform schema
    rows = db.query(User).filter(User.org_id == current.org_id).order_by(User.id.asc()).all()
    return [{"id": u.id, "username": u.username, "role": u.role, "is_active": u.is_active} for u in rows]


@router.post("")
def create_user(payload: UserIn, current=Depends(require_admin), db: Session = Depends(get_db)):
    current_schema.set(None)
    if payload.role not in ("admin", "manager"):
        raise HTTPException(400, "Rol admin yoki manager bo'lishi kerak")
    if not payload.password:
        raise HTTPException(400, "Parol kerak")
    exists = db.query(User).filter(User.org_id == current.org_id, User.username == payload.username).first()
    if exists:
        raise HTTPException(400, "Bu username band")
    u = User(
        org_id=current.org_id,
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(u); db.commit(); db.refresh(u)
    return {"id": u.id, "username": u.username, "role": u.role}


@router.put("/{uid}")
def update_user(uid: int, payload: UserIn, current=Depends(require_admin), db: Session = Depends(get_db)):
    current_schema.set(None)
    u = db.query(User).filter(User.id == uid, User.org_id == current.org_id).first()
    if not u:
        raise HTTPException(404, "Topilmadi")
    u.username = payload.username
    if payload.role in ("admin", "manager"):
        u.role = payload.role
    u.is_active = payload.is_active
    if payload.password:
        u.password_hash = hash_password(payload.password)
    db.commit()
    return {"ok": True}


@router.delete("/{uid}")
def delete_user(uid: int, current=Depends(require_admin), db: Session = Depends(get_db)):
    current_schema.set(None)
    if uid == current.id:
        raise HTTPException(400, "O'zingizni o'chira olmaysiz")
    u = db.query(User).filter(User.id == uid, User.org_id == current.org_id).first()
    if not u:
        raise HTTPException(404, "Topilmadi")
    db.delete(u); db.commit()
    return {"ok": True}

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..db import get_db
from ..deps import require_admin
from .models import Board, BoardStage, Lead

router = APIRouter(prefix="/api/boards", tags=["boards"])

ALLOWED_COLORS = {"slate", "cyan", "amber", "violet", "green", "red", "blue", "pink", "orange"}


class StageIn(BaseModel):
    name: str
    color: str = "slate"
    position: int = 100
    is_won: bool = False
    is_lost: bool = False


class BoardIn(BaseModel):
    name: str
    is_default: bool = False


def _stage(s: BoardStage) -> dict:
    return {"id": s.id, "name": s.name, "color": s.color, "position": s.position,
            "is_won": s.is_won, "is_lost": s.is_lost, "board_id": s.board_id}


def _board(b: Board) -> dict:
    return {"id": b.id, "name": b.name, "is_default": b.is_default, "position": b.position,
            "stages": [_stage(s) for s in sorted(b.stages, key=lambda x: x.position)]}


@router.get("")
def list_boards(_=Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(Board).order_by(Board.position.asc(), Board.id.asc()).all()
    return [_board(b) for b in rows]


@router.post("")
def create_board(payload: BoardIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    b = Board(name=payload.name.strip() or "Yangi board", is_default=payload.is_default,
              position=(db.query(Board).count() + 1) * 100)
    db.add(b); db.commit(); db.refresh(b)
    # Default stages
    defaults = [
        ("Yangi", "slate", 100, False, False),
        ("Jarayonda", "cyan", 200, False, False),
        ("Yutildi", "green", 300, True, False),
        ("Yo'qotildi", "red", 400, False, True),
    ]
    for name, color, pos, w, l in defaults:
        db.add(BoardStage(board_id=b.id, name=name, color=color, position=pos, is_won=w, is_lost=l))
    db.commit(); db.refresh(b)
    return _board(b)


@router.patch("/{bid}")
def update_board(bid: int, payload: BoardIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    b = db.query(Board).filter(Board.id == bid).first()
    if not b: raise HTTPException(404, "Topilmadi")
    b.name = payload.name.strip() or b.name
    b.is_default = payload.is_default
    db.commit(); db.refresh(b)
    return _board(b)


@router.delete("/{bid}")
def delete_board(bid: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    b = db.query(Board).filter(Board.id == bid).first()
    if not b: raise HTTPException(404, "Topilmadi")
    if db.query(Board).count() <= 1:
        raise HTTPException(400, "Kamida bitta board qolishi kerak")
    db.delete(b); db.commit()
    return {"ok": True}


# ---- Stages ----

@router.post("/{bid}/stages")
def create_stage(bid: int, payload: StageIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    if payload.color not in ALLOWED_COLORS:
        payload.color = "slate"
    s = BoardStage(board_id=bid, name=payload.name.strip() or "Yangi",
                   color=payload.color, position=payload.position,
                   is_won=payload.is_won, is_lost=payload.is_lost)
    db.add(s); db.commit(); db.refresh(s)
    return _stage(s)


@router.patch("/stages/{sid}")
def update_stage(sid: int, payload: StageIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    s = db.query(BoardStage).filter(BoardStage.id == sid).first()
    if not s: raise HTTPException(404, "Topilmadi")
    s.name = payload.name.strip() or s.name
    if payload.color in ALLOWED_COLORS: s.color = payload.color
    s.position = payload.position
    s.is_won = payload.is_won; s.is_lost = payload.is_lost
    db.commit(); db.refresh(s)
    return _stage(s)


@router.delete("/stages/{sid}")
def delete_stage(sid: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    s = db.query(BoardStage).filter(BoardStage.id == sid).first()
    if not s: raise HTTPException(404, "Topilmadi")
    # Move leads in this stage to nothing (stage_id becomes NULL via FK ON DELETE SET NULL)
    db.delete(s); db.commit()
    return {"ok": True}


class ReorderIn(BaseModel):
    stage_ids: list[int]


@router.patch("/{bid}/reorder")
def reorder_stages(bid: int, payload: ReorderIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    for i, sid in enumerate(payload.stage_ids):
        s = db.query(BoardStage).filter(BoardStage.id == sid, BoardStage.board_id == bid).first()
        if s: s.position = (i + 1) * 100
    db.commit()
    return {"ok": True}

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from slugify import slugify

from ..db import get_db
from ..deps import require_admin
from .models import Category
from .schemas import CategoryIn, CategoryOut

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(_=Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name.asc()).all()


@router.post("", response_model=CategoryOut)
def create_category(payload: CategoryIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nomi bo'sh")
    base = slugify(name) or "kategoriya"
    slug = base
    i = 1
    while db.query(Category).filter(Category.slug == slug).first():
        i += 1
        slug = f"{base}-{i}"
    cat = Category(name=name, slug=slug)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{cat_id}")
def delete_category(cat_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Topilmadi")
    db.delete(cat)
    db.commit()
    return {"ok": True}

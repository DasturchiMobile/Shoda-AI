from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_admin
from ..storage.local import save_upload
from .models import Category, Product, ProductImage
from .schemas import ProductIn, ProductPatch, ProductOut, ProductsPage, ProductImageOut

router = APIRouter(prefix="/api/products", tags=["products"])


def _to_out(p: Product) -> ProductOut:
    return ProductOut(
        id=p.id, name=p.name, description=p.description,
        category_id=p.category_id,
        category_name=p.category.name if p.category else None,
        sku=p.sku, price=p.price, currency=p.currency,
        in_stock=p.in_stock, stock_qty=p.stock_qty,
        is_active=p.is_active, source=p.source,
        images=[ProductImageOut.model_validate(i) for i in p.images],
        created_at=p.created_at, updated_at=p.updated_at,
    )


@router.get("", response_model=ProductsPage)
def list_products(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    in_stock: Optional[bool] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=200),
    _=Depends(require_admin), db: Session = Depends(get_db),
):
    q = db.query(Product)
    if category_id is not None:
        q = q.filter(Product.category_id == category_id)
    if in_stock is not None:
        q = q.filter(Product.in_stock == in_stock)
    if search:
        like = f"%{search.lower()}%"
        q = q.filter((Product.name.ilike(like)) | (Product.sku.ilike(like)))
    total = q.count()
    items = q.order_by(Product.created_at.desc()) \
             .offset((page - 1) * per_page).limit(per_page).all()
    return ProductsPage(
        items=[_to_out(p) for p in items],
        total=total, page=page, per_page=per_page,
    )


@router.post("", response_model=ProductOut)
def create_product(payload: ProductIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    if payload.category_id:
        cat = db.query(Category).filter(Category.id == payload.category_id).first()
        if not cat:
            raise HTTPException(status_code=400, detail="Kategoriya topilmadi")
    p = Product(**payload.model_dump())
    db.add(p)
    db.flush()

    db.commit()
    db.refresh(p)
    return _to_out(p)


@router.get("/{pid}", response_model=ProductOut)
def get_product(pid: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="Topilmadi")
    return _to_out(p)


@router.patch("/{pid}", response_model=ProductOut)
def update_product(pid: int, payload: ProductPatch,
                   _=Depends(require_admin), db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="Topilmadi")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.flush()

    db.commit()
    db.refresh(p)
    return _to_out(p)


@router.delete("/{pid}")
def delete_product(pid: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="Topilmadi")
    db.delete(p)

    db.commit()
    return {"ok": True}


@router.post("/{pid}/images", response_model=ProductImageOut)
def upload_image(pid: int, file: UploadFile = File(...),
                 _=Depends(require_admin), db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="Topilmadi")
    rel_url = save_upload(file)
    pos = (db.query(ProductImage).filter(ProductImage.product_id == pid).count())
    img = ProductImage(product_id=pid, url=rel_url, position=pos)
    db.add(img)
    db.flush()

    db.commit()
    return img


@router.delete("/{pid}/images/{img_id}")
def delete_image(pid: int, img_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    img = db.query(ProductImage).filter(
        ProductImage.id == img_id, ProductImage.product_id == pid
    ).first()
    if not img:
        raise HTTPException(status_code=404, detail="Topilmadi")
    db.delete(img)

    db.commit()
    return {"ok": True}

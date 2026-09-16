from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from slugify import slugify

from ..db import get_db, engine, current_schema
from ..deps import require_superadmin
from ..multitenancy import create_org_schema, schema_for
from .models import Organization, RegistrationRequest, User, PlatformSettings
from .schemas import (
    RegistrationRequestOut, TenantOut, SystemStatsOut,
    PlatformSettingsIn, PlatformSettingsOut,
)

router = APIRouter(prefix="/api/superadmin", tags=["superadmin"])


@router.get("/registrations", response_model=list[RegistrationRequestOut])
def list_registrations(status: str = "pending", _: User = Depends(require_superadmin),
                       db: Session = Depends(get_db)):
    q = db.query(RegistrationRequest)
    if status:
        q = q.filter(RegistrationRequest.status == status)
    return q.order_by(RegistrationRequest.requested_at.desc()).all()


@router.post("/registrations/{req_id}/activate")
def activate(req_id: int, user: User = Depends(require_superadmin),
             db: Session = Depends(get_db)):
    current_schema.set(None)
    req = db.query(RegistrationRequest).filter(RegistrationRequest.id == req_id).first()
    if not req or req.status != "pending":
        raise HTTPException(status_code=404, detail="Ariza topilmadi yoki allaqachon ishlangan")

    base_slug = slugify(req.org_name) or f"org-{req.id}"
    slug = base_slug
    i = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        i += 1
        slug = f"{base_slug}-{i}"

    org = Organization(
        name=req.org_name, slug=slug, status="active",
        contact_phone=req.contact_phone, contact_telegram=req.contact_telegram,
        activated_at=datetime.now(timezone.utc),
    )
    db.add(org)
    db.flush()

    admin = User(
        org_id=org.id, username=req.username, password_hash=req.password_hash,
        role="admin", is_active=True,
    )
    db.add(admin)
    db.flush()

    create_org_schema(db, org.id)

    # Auto-assign tariff: first 50 orgs (excluding "platform") get free
    from .models import OrgBilling
    FREE_TIER_LIMIT = 50
    real_orgs_count = db.query(Organization).filter(Organization.slug != "platform").count()
    tariff = "free" if real_orgs_count <= FREE_TIER_LIMIT else "paid"
    billing = OrgBilling(org_id=org.id, tariff=tariff)
    db.add(billing)
    db.flush()

    req.status = "activated"
    req.processed_at = datetime.now(timezone.utc)
    req.processed_by = user.id
    return {"ok": True, "org_id": org.id, "user_id": admin.id}


@router.post("/registrations/{req_id}/reject")
def reject(req_id: int, user: User = Depends(require_superadmin),
           db: Session = Depends(get_db)):
    req = db.query(RegistrationRequest).filter(RegistrationRequest.id == req_id).first()
    if not req or req.status != "pending":
        raise HTTPException(status_code=404, detail="Ariza topilmadi")
    req.status = "rejected"
    req.processed_at = datetime.now(timezone.utc)
    req.processed_by = user.id
    return {"ok": True}


@router.get("/tenants", response_model=list[TenantOut])
def list_tenants(_: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    orgs = db.query(Organization).order_by(Organization.created_at.desc()).all()
    out: list[TenantOut] = []
    for o in orgs:
        user_count = db.query(User).filter(User.org_id == o.id).count()
        product_count = 0
        if o.status == "active" and o.slug != "platform":
            try:
                with engine.connect() as c2:
                    r = c2.exec_driver_sql(f'SELECT COUNT(*) FROM "{schema_for(o.id)}".products')
                    product_count = int(r.scalar() or 0)
            except Exception:
                product_count = 0
        out.append(TenantOut(
            id=o.id, name=o.name, slug=o.slug, status=o.status,
            user_count=user_count, product_count=product_count,
            created_at=o.created_at,
        ))
    return out


@router.get("/system-stats", response_model=SystemStatsOut)
def system_stats(_: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    orgs_total = db.query(Organization).count()
    orgs_pending = db.query(RegistrationRequest).filter(
        RegistrationRequest.status == "pending"
    ).count()
    users_total = db.query(User).count()
    products_total = 0
    for o in db.query(Organization).filter(Organization.status == "active", Organization.slug != "platform").all():
        try:
            with engine.connect() as c2:
                r = c2.exec_driver_sql(f'SELECT COUNT(*) FROM "{schema_for(o.id)}".products')
                products_total += int(r.scalar() or 0)
        except Exception:
            pass
    return SystemStatsOut(
        orgs_total=orgs_total, orgs_pending=orgs_pending,
        users_total=users_total, products_total=products_total,
    )


@router.get("/platform-settings", response_model=PlatformSettingsOut)
def get_settings(_: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    s = db.query(PlatformSettings).filter(PlatformSettings.id == 1).first()
    if not s:
        s = PlatformSettings(id=1)
        db.add(s)
        db.flush()
    return s


@router.put("/platform-settings", response_model=PlatformSettingsOut)
def put_settings(payload: PlatformSettingsIn,
                 _: User = Depends(require_superadmin),
                 db: Session = Depends(get_db)):
    s = db.query(PlatformSettings).filter(PlatformSettings.id == 1).first()
    if not s:
        s = PlatformSettings(id=1)
        db.add(s)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.flush()
    return s

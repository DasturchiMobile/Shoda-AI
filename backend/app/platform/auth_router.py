from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from slugify import slugify
from sqlalchemy.orm import Session

from ..db import get_db, current_schema
from ..multitenancy import create_org_schema
from ..security import hash_password, verify_password, create_access_token
from .models import Organization, RegistrationRequest, User
from .schemas import RegisterIn, RegisterOut, LoginIn, LoginOut, MeOut
from ..deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=RegisterOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    current_schema.set(None)

    # Username is global (login looks up users globally) — must be unique.
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Bu username allaqachon band")

    # Keep the registration request row for superadmin visibility.
    req = RegistrationRequest(
        org_name=payload.org_name,
        admin_name=payload.admin_name,
        contact_phone=payload.contact_phone,
        contact_telegram=payload.contact_telegram,
        username=payload.username,
        password_hash=hash_password(payload.password),
        status="approved",
        requested_at=datetime.now(timezone.utc),
        processed_at=datetime.now(timezone.utc),
    )
    db.add(req)
    db.flush()

    # Unique slug (same pattern as superadmin activate endpoint).
    base_slug = slugify(payload.org_name) or f"org-{req.id}"
    slug = base_slug
    i = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        i += 1
        slug = f"{base_slug}-{i}"

    org = Organization(
        name=payload.org_name, slug=slug, status="active",
        contact_phone=payload.contact_phone,
        contact_telegram=payload.contact_telegram,
        activated_at=datetime.now(timezone.utc),
    )
    db.add(org)
    db.flush()

    admin = User(
        org_id=org.id, username=payload.username,
        password_hash=req.password_hash,
        role="admin", is_active=True,
    )
    db.add(admin)
    db.flush()

    # Provision tenant schema + tables (same as activation flow).
    create_org_schema(db, org.id)

    req.status = "activated"
    db.commit()

    token = create_access_token({
        "sub": str(admin.id),
        "username": admin.username,
        "role": admin.role,
        "org_id": admin.org_id,
    })
    return RegisterOut(
        access_token=token,
        token_type="bearer",
        role=admin.role,
        org_id=admin.org_id,
        username=admin.username,
    )


@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    current_schema.set(None)
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Login yoki parol noto'g'ri")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Foydalanuvchi faol emas")

    if user.role != "superadmin":
        org = db.query(Organization).filter(Organization.id == user.org_id).first()
        if not org or org.status != "active":
            raise HTTPException(status_code=403, detail="Tashkilot faol emas")

    user.last_login_at = datetime.now(timezone.utc)
    token = create_access_token({
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "org_id": user.org_id,
    })
    return LoginOut(
        access_token=token,
        role=user.role,
        org_id=user.org_id,
        username=user.username,
    )


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_schema.set(None)
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    return MeOut(
        id=user.id, username=user.username, role=user.role,
        org_id=user.org_id,
        org_name=org.name if org else "",
        org_status=org.status if org else "",
    )

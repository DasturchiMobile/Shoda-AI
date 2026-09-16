from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from .db import get_db, current_schema
from .security import decode_token
from .platform.models import User, Organization
from .multitenancy import schema_for


def _extract_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return authorization.split(" ", 1)[1].strip()


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    token = _extract_token(authorization)
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # while resolving the user, look in platform
    current_schema.set(None)
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_admin(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if user.role not in ("admin", "manager", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin only")
    if user.role != "superadmin":
        org = db.query(Organization).filter(Organization.id == user.org_id).first()
        if not org or org.status != "active":
            raise HTTPException(status_code=403, detail="Organization not active")
        current_schema.set(schema_for(user.org_id))
    else:
        current_schema.set(None)
    return user


def require_superadmin(user: User = Depends(get_current_user)) -> User:
    if user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin only")
    current_schema.set(None)
    return user

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db, current_schema
from ..deps import require_admin
from .models import Organization, User
from .schemas import OrgOut

router = APIRouter(prefix="/api/orgs", tags=["orgs"])


@router.get("/current", response_model=OrgOut)
def current(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    current_schema.set(None)
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    return org

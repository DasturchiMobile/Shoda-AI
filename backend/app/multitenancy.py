from sqlalchemy import text
from sqlalchemy.orm import Session

from .tenant.ddl import TENANT_DDL


def schema_for(org_id: int) -> str:
    return f"org_{org_id}"


def create_org_schema(db: Session, org_id: int) -> str:
    schema = schema_for(org_id)
    db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))
    # Apply DDL inside this schema
    db.execute(text(f'SET LOCAL search_path TO "{schema}"'))
    for stmt in TENANT_DDL:
        db.execute(text(stmt))
    db.execute(text("SET LOCAL search_path TO platform, public"))
    return schema

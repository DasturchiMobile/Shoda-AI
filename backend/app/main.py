from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import SessionLocal, current_schema
from .security import hash_password
from .platform.models import Organization, User
from .platform.auth_router import router as auth_router
from .platform.org_router import router as org_router
from .platform.superadmin_router import router as superadmin_router
from .platform.public_router import router as public_router
from .tenant.categories_router import router as categories_router
from .tenant.products_router import router as products_router
from .tenant.boards_router import router as boards_router
from .tenant.telegram_router import router as telegram_router
from .tenant.instagram_router import router as instagram_router
from .tenant.billing_router import router as billing_router
from .platform.ddl import run_platform_ddl
from .tenant.settings_router import router as settings_router
from .tenant.users_router import router as users_router
from .tenant.leads_router import router as leads_router
from .tenant.knowledge_router import router as knowledge_router
from .tenant.channels_router import router as channels_router
from .tenant.triggers_router import router as triggers_router


def bootstrap_superadmin() -> None:
    db = SessionLocal()
    try:
        current_schema.set(None)
        db.begin()
        existing = db.query(User).filter(User.role == "superadmin").first()
        if existing:
            db.commit()
            return
        org = db.query(Organization).filter(Organization.slug == "platform").first()
        if not org:
            org = Organization(name="Platform", slug="platform", status="active")
            db.add(org)
            db.flush()
        su = User(
            org_id=org.id,
            username=settings.BOOTSTRAP_SUPERADMIN_USERNAME,
            password_hash=hash_password(settings.BOOTSTRAP_SUPERADMIN_PASSWORD),
            role="superadmin", is_active=True,
        )
        db.add(su)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


_background_tasks = set()


def _spawn(coro) -> None:
    import asyncio
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        try:
            run_platform_ddl()
            from .tenant.telegram_service import telegram_manager
            _spawn(telegram_manager.start_all())
            from .tenant.instagram_service import instagram_manager as _igm
            _spawn(_igm.start_all())
        except Exception as e:
            print("[tg] auto-start scheduling failed:", e)
        try:
            bootstrap_superadmin()
        except Exception as e:
            print("[bootstrap] failed:", e)
        # Auto-migration: run tenant DDL on every existing org schema
        # (idempotent — CREATE TABLE IF NOT EXISTS)
        try:
            from sqlalchemy import text
            from .db import engine
            from .tenant.ddl import TENANT_DDL
            with engine.begin() as conn:
                rows = conn.execute(text(
                    "SELECT schema_name FROM information_schema.schemata "
                    "WHERE schema_name LIKE 'org_%'"
                )).fetchall()
                for (schema,) in rows:
                    conn.execute(text(f'SET LOCAL search_path TO "{schema}", public'))
                    for ddl in TENANT_DDL:
                        conn.execute(text(ddl))
                    print(f"[auto-migrate] {schema}: DDL applied")
        except Exception as e:
            print("[auto-migrate] failed:", e)
        yield

    app = FastAPI(title="Shoda AI API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(public_router)
    app.include_router(auth_router)
    app.include_router(org_router)
    app.include_router(superadmin_router)
    app.include_router(categories_router)
    app.include_router(products_router)
    app.include_router(boards_router)
    app.include_router(telegram_router)
    app.include_router(instagram_router)
    app.include_router(billing_router)
    app.include_router(settings_router)
    app.include_router(users_router)
    app.include_router(leads_router)
    app.include_router(knowledge_router)
    app.include_router(channels_router)
    app.include_router(triggers_router)

    # static files (uploaded product images)
    files_dir = Path(settings.STORAGE_LOCAL_DIR)
    files_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/api/files", StaticFiles(directory=str(files_dir)), name="files")

    @app.get("/api/health")
    def health():
        return {"ok": True}

    return app


app = create_app()

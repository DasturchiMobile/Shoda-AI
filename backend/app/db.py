from contextvars import ContextVar
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()

current_schema: ContextVar[str | None] = ContextVar("current_schema", default=None)


@event.listens_for(Engine, "before_cursor_execute")
def _set_search_path(conn, cursor, statement, params, context, executemany):
    schema = current_schema.get()
    if schema:
        cursor.execute(f'SET LOCAL search_path TO "{schema}", platform, public')
    else:
        # superadmin / platform-only queries
        cursor.execute('SET LOCAL search_path TO platform, public')


def get_db():
    db = SessionLocal()
    try:
        # ensure a transaction is open so SET LOCAL sticks
        db.begin()
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

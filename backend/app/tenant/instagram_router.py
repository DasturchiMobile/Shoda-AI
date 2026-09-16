"""Instagram DM integration via instagrapi (unofficial).

Auth flow:
  1. POST /connect  {username, password}
     → instagrapi login()
     → OK  → session saved, polling starts
     → ChallengeRequired → challenge_resolve() called (code sent to phone/email)
                         → {challenge_required: true} returned to frontend
  2. POST /verify-challenge {code}
     → challenge_send_security_code(code)
     → session saved, polling starts
"""
from __future__ import annotations

import asyncio
import json as _json
import traceback
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_admin
from .models import InstagramSession

# ── Optional instagrapi import (graceful degradation if not installed) ────────
try:
    from instagrapi import Client as IgClient
    from instagrapi.exceptions import (
        BadPassword,
        ChallengeRequired,
        LoginRequired,
        TwoFactorRequired,
    )
    _IG_AVAILABLE = True
except ImportError:
    _IG_AVAILABLE = False
    IgClient = None  # type: ignore[assignment,misc]
    BadPassword = Exception  # type: ignore[assignment,misc]
    ChallengeRequired = Exception  # type: ignore[assignment,misc]
    LoginRequired = Exception  # type: ignore[assignment,misc]
    TwoFactorRequired = Exception  # type: ignore[assignment,misc]

router = APIRouter(prefix="/api/instagram", tags=["instagram"])

# ── In-memory challenge state (short-lived, keyed by org_id) ─────────────────
# Stored as: org_id -> {"client": IgClient, "username": str}
_pending_challenges: dict[int, dict[str, Any]] = {}

# Background polling tasks after manual challenge approval
# org_id -> asyncio.Task
_poll_tasks: dict[int, "asyncio.Task[None]"] = {}


# ── Schemas ───────────────────────────────────────────────────────────────────

class LoginIn(BaseModel):
    username: str
    password: str


class ChallengeIn(BaseModel):
    code: str


class SendIn(BaseModel):
    username: str   # instagram username to send to
    text: str


class SessionIn(BaseModel):
    session_json: str   # raw JSON string from cl.get_settings()
    username: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_create(db: Session) -> InstagramSession:
    row = db.query(InstagramSession).order_by(InstagramSession.id.asc()).first()
    if not row:
        row = InstagramSession(id=1)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


async def _reload_ig_manager():
    """Reload instagram manager (runs in background)."""
    try:
        from .instagram_service import instagram_manager
        await instagram_manager.reload_all()
    except Exception as e:
        print(f"[ig] reload xato: {e}")


def _save_session(db: Session, cl: Any, username: str, display_name: str = "") -> InstagramSession:
    """Persist a successfully logged-in instagrapi Client to DB."""
    import json
    settings = cl.get_settings()
    row = _get_or_create(db)
    row.username = username
    row.session_json = json.dumps(settings)
    row.is_connected = True
    row.display_name = display_name
    row.last_error = ""
    row.connected_at = datetime.now(timezone.utc)
    db.commit()
    return row


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/status")
def status(_: Any = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.query(InstagramSession).order_by(InstagramSession.id.asc()).first()
    if not row:
        return {"connected": False, "username": "", "display_name": "", "last_error": ""}
    return {
        "connected": bool(row.is_connected),
        "username": row.username,
        "display_name": row.display_name,
        "last_error": row.last_error,
        "connected_at": row.connected_at.isoformat() if row.connected_at else None,
    }


@router.post("/connect")
def connect(
    payload: LoginIn,
    background_tasks: BackgroundTasks,
    current: Any = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Step-1 of login: sends credentials once.
    If 2FA / Login Approval requested by Instagram, stores state in memory
    and returns {"manual_challenge": true} without looping or spamming.
    """
    if not _IG_AVAILABLE:
        raise HTTPException(500, "instagrapi o'rnatilmagan")

    org_id: int = current.org_id

    cl = IgClient()
    cl.delay_range = [1, 3]

    # Reuse existing device fingerprint if available
    existing_row = db.query(InstagramSession).order_by(InstagramSession.id.asc()).first()
    if existing_row and existing_row.session_json:
        try:
            saved = _json.loads(existing_row.session_json)
            device_keys = [
                "uuids", "device_settings", "user_agent",
                "country", "country_code", "locale", "timezone_offset",
            ]
            device_settings = {k: saved[k] for k in device_keys if k in saved}
            if device_settings:
                cl.set_settings(device_settings)
                print(f"[ig#{org_id}] Mavjud device fingerprint tiklandi")
        except Exception as fe:
            print(f"[ig#{org_id}] device settings tiklashda xato: {fe}")

    try:
        cl.login(payload.username, payload.password)

    except (TwoFactorRequired, ChallengeRequired) as e:
        print(f"[ig connect] Challenge/2FA requested: {type(e).__name__} - {e}", flush=True)

        try:
            partial_settings = _json.dumps(cl.get_settings())
            row = _get_or_create(db)
            if not row.session_json:
                row.session_json = partial_settings
                db.commit()
        except Exception:
            pass

        _pending_challenges[org_id] = {
            "client": cl,
            "username": payload.username,
            "password": payload.password,
        }

        return {
            "manual_challenge": True,
            "message": "Telefonga so'rov yuborildi. So'rovni tasdiqlang va 'Tasdiqladim' tugmasini bosing.",
        }

    except BadPassword as e:
        print(f"[ig connect] BadPassword: {e}", flush=True)
        raise HTTPException(
            400,
            "Username yoki parol noto'g'ri. "
            "Eslatma: Instagram yangi IP/qurilmadan kirishda bloklashi mumkin — "
            "Instagram ilovasida hisobingizni tekshirib, so'ng qaytadan urinib ko'ring.",
        )

    except LoginRequired as e:
        raise HTTPException(400, f"Kirish talab qilindi: {str(e)[:200]}")

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(400, f"Login xatosi ({type(e).__name__}): {str(e)[:300]}")

    # ── Successful login immediately ───────────────────────────────────────────
    display_name = ""
    try:
        me = cl.account_info()
        display_name = (me.full_name or "") if me else ""
    except Exception:
        pass

    _save_session(db, cl, payload.username, display_name)
    _pending_challenges.pop(org_id, None)

    background_tasks.add_task(_reload_ig_manager)
    return {"ok": True, "username": payload.username, "display_name": display_name}


@router.post("/check-approval")
def check_approval(
    background_tasks: BackgroundTasks,
    current: Any = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Check if the user approved the login request on their phone.
    Uses a fresh client with the saved device fingerprint.
    """
    org_id: int = current.org_id
    pending = _pending_challenges.get(org_id)
    if not pending:
        raise HTTPException(400, "Faol so'rov yo'q. Qaytadan login qiling.")

    username = pending["username"]
    password = pending.get("password")

    if not _IG_AVAILABLE:
        raise HTTPException(500, "instagrapi o'rnatilmagan")

    # Reuse the exact device fingerprint generated during connect
    cl = IgClient()
    cl.delay_range = [1, 2]
    row = db.query(InstagramSession).order_by(InstagramSession.id.asc()).first()
    if row and row.session_json:
        try:
            saved = _json.loads(row.session_json)
            device_keys = [
                "uuids", "device_settings", "user_agent",
                "country", "country_code", "locale", "timezone_offset",
            ]
            device_settings = {k: saved[k] for k in device_keys if k in saved}
            if device_settings:
                cl.set_settings(device_settings)
        except Exception:
            pass

    try:
        res = cl.login(username, password)
        if not res:
            raise HTTPException(400, "Hali tasdiqlanmadi. Telefondagi so'rovni tasdiqlang va qayta bosing.")
    except (TwoFactorRequired, ChallengeRequired) as e:
        print(f"[check-approval] still pending approval: {e}", flush=True)
        raise HTTPException(
            400,
            "Hali tasdiqlanmadi. Telefoningizdagi Instagram bildirishnomasidan 'Approve / Bu men' tugmasini bosing va keyin 'Tasdiqladim'ni bosing."
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(400, f"Tekshirish xatosi ({type(e).__name__}): {str(e)[:250]}")

    display_name = ""
    try:
        me = cl.account_info()
        display_name = (me.full_name or "") if me else ""
    except Exception:
        pass

    _save_session(db, cl, username, display_name)
    _pending_challenges.pop(org_id, None)

    background_tasks.add_task(_reload_ig_manager)
    return {"ok": True, "username": username, "display_name": display_name}




@router.post("/verify-challenge")
def verify_challenge(
    payload: ChallengeIn,
    background_tasks: BackgroundTasks,
    current: Any = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Step-2: optional verification code submission (SMS / TOTP code).
    """
    org_id: int = current.org_id
    pending = _pending_challenges.get(org_id)
    if not pending:
        raise HTTPException(400, "Faol challenge yo'q. Avval /connect orqali kirishni boshlang.")

    cl = pending["client"]
    username = pending["username"]
    password = pending.get("password")

    if not _IG_AVAILABLE:
        raise HTTPException(500, "instagrapi o'rnatilmagan")

    code = payload.code.strip()
    logged = False
    try:
        if password:
            logged = cl.login(username, password, verification_code=code)
        if not logged:
            cl.challenge_send_security_code(code)
            logged = True
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(400, f"Kod tekshirishda xato: {str(e)[:300]}")

    # ── Success ───────────────────────────────────────────────────────────────
    display_name = ""
    try:
        me = cl.account_info()
        display_name = (me.full_name or "") if me else ""
    except Exception:
        pass

    _save_session(db, cl, username, display_name)
    _pending_challenges.pop(org_id, None)
    old_task = _poll_tasks.pop(org_id, None)
    if old_task and not old_task.done():
        old_task.cancel()

    background_tasks.add_task(_reload_ig_manager)
    return {"ok": True, "username": username, "display_name": display_name}


@router.post("/upload-session")
def upload_session(
    payload: SessionIn,
    background_tasks: BackgroundTasks,
    current: Any = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Import an existing instagrapi session JSON directly.

    How to get the session JSON on your local machine:

        pip install instagrapi
        python3 -c "
        from instagrapi import Client
        cl = Client()
        cl.login('YOUR_USERNAME', 'YOUR_PASSWORD')
        import json; print(json.dumps(cl.get_settings()))
        "

    Copy the printed JSON and paste it into this endpoint.
    This skips the device-challenge because the session was
    created on a device Instagram already trusts.
    """
    import json as _json_mod

    if not _IG_AVAILABLE:
        raise HTTPException(500, "instagrapi o'rnatilmagan")

    # Validate the JSON
    try:
        settings = _json_mod.loads(payload.session_json)
    except Exception:
        raise HTTPException(400, "session_json noto'g'ri JSON format")

    # Restore session into a client and verify it works
    cl = IgClient()
    try:
        cl.set_settings(settings)
        cl.get_timeline_feed()  # lightweight check — raises if session is invalid
    except Exception as e:
        raise HTTPException(400, f"Session yaroqsiz yoki muddati o'tgan: {str(e)[:200]}")

    # Fetch display name
    display_name = ""
    try:
        me = cl.account_info()
        display_name = (me.full_name or "") if me else ""
    except Exception:
        pass

    _save_session(db, cl, payload.username, display_name)
    background_tasks.add_task(_reload_ig_manager)
    return {"ok": True, "username": payload.username, "display_name": display_name}


@router.post("/disconnect")
def disconnect(
    background_tasks: BackgroundTasks,
    current: Any = Depends(require_admin),
    db: Session = Depends(get_db),
):
    org_id: int = current.org_id
    _pending_challenges.pop(org_id, None)
    row = _get_or_create(db)
    row.is_connected = False
    row.disconnected_at = datetime.now(timezone.utc)
    db.commit()
    background_tasks.add_task(_reload_ig_manager)
    return {"ok": True}


@router.post("/send")
def send_msg(
    payload: SendIn,
    _: Any = Depends(require_admin),
    db: Session = Depends(get_db),
):
    import json

    row = db.query(InstagramSession).order_by(InstagramSession.id.asc()).first()
    if not row or not row.is_connected or not row.session_json:
        raise HTTPException(400, "Instagram ulanmagan")
    if not _IG_AVAILABLE:
        raise HTTPException(500, "instagrapi o'rnatilmagan")

    cl = IgClient()
    cl.set_settings(_json.loads(row.session_json))
    try:
        user_id = cl.user_id_from_username(payload.username)
        cl.direct_send(payload.text, user_ids=[user_id])
    except Exception as e:
        raise HTTPException(500, f"Yuborishda xato: {str(e)[:200]}")
    return {"ok": True}

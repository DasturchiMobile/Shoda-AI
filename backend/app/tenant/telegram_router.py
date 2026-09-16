from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_admin
from ..config import settings as app_settings
from .models import TelegramSession, TelegramLoginFlow

router = APIRouter(prefix="/api/telegram", tags=["telegram"])


def _get_credentials():
    """Return (api_id:int, api_hash:str) or raise 400."""
    api_id = (app_settings.TG_API_ID or "").strip()
    api_hash = (app_settings.TG_API_HASH or "").strip()
    if not api_id or not api_hash:
        raise HTTPException(400, "Telegram App credentials (TG_API_ID/TG_API_HASH) sozlanmagan. Superadmin panelda kiriting yoki backend .env ga qo'shing.")
    try:
        return int(api_id), api_hash
    except ValueError:
        raise HTTPException(400, "TG_API_ID raqam bo'lishi kerak")


def _get_or_create_session(db: Session) -> TelegramSession:
    row = db.query(TelegramSession).order_by(TelegramSession.id.asc()).first()
    if row is None:
        row = TelegramSession(id=1)
        db.add(row); db.commit(); db.refresh(row)
    return row


@router.get("/status")
async def status(_=Depends(require_admin), db: Session = Depends(get_db)):
    row = db.query(TelegramSession).order_by(TelegramSession.id.asc()).first()
    if row is None:
        return {"connected": False, "phone": "", "username": "", "display_name": "",
                "last_error": "", "connected_at": None}
                
    if row.is_connected and row.session_string:
        try:
            from telethon import TelegramClient
            from telethon.sessions import StringSession
            api_id, api_hash = _get_credentials()
            client = TelegramClient(StringSession(row.session_string), api_id, api_hash)
            await client.connect()
            if not await client.is_user_authorized():
                row.is_connected = False
                row.last_error = "Sessiya muddati tugagan yoki uzilgan"
                db.commit()
            await client.disconnect()
        except Exception as e:
            row.is_connected = False
            row.last_error = f"Ulanishda xatolik: {str(e)[:100]}"
            db.commit()

    return {
        "connected": bool(row.is_connected),
        "phone": row.phone,
        "username": row.username,
        "display_name": row.display_name,
        "last_error": row.last_error,
        "connected_at": row.connected_at.isoformat() if row.connected_at else None,
    }


class ConnectStartIn(BaseModel):
    phone: str


@router.post("/connect/start")
async def connect_start(payload: ConnectStartIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    api_id, api_hash = _get_credentials()
    phone = payload.phone.strip()
    if not phone.startswith("+") or len(phone) < 10:
        raise HTTPException(400, "Telefon raqam +998... shaklida bo'lishi kerak")

    try:
        from telethon import TelegramClient
        from telethon.sessions import StringSession
    except ImportError:
        raise HTTPException(500, "telethon paketi o'rnatilmagan. requirements.txt tekshiring.")

    client = TelegramClient(StringSession(), api_id, api_hash)
    try:
        await client.connect()
        sent = await client.send_code_request(phone)
        session_string = client.session.save()
    except Exception as e:
        try: await client.disconnect()
        except: pass
        raise HTTPException(400, f"Kod yuborishda xato: {str(e)[:200]}")
    try: await client.disconnect()
    except: pass

    # Clear old flows and insert new
    db.query(TelegramLoginFlow).delete()
    flow = TelegramLoginFlow(phone=phone, phone_code_hash=sent.phone_code_hash, session_string=session_string, expires_at=datetime.now(timezone.utc) + timedelta(minutes=10))
    db.add(flow); db.commit()

    return {"ok": True, "message": "Kod yuborildi. Telegram ilovangizni tekshiring."}


class ConnectVerifyIn(BaseModel):
    code: str
    password: str | None = None


@router.post("/connect/verify")
async def connect_verify(payload: ConnectVerifyIn, user=Depends(require_admin), db: Session = Depends(get_db)):
    api_id, api_hash = _get_credentials()
    flow = db.query(TelegramLoginFlow).order_by(TelegramLoginFlow.id.desc()).first()
    if not flow:
        raise HTTPException(400, "Login jarayoni topilmadi. Qaytadan telefon raqamni kiriting.")

    try:
        from telethon import TelegramClient
        from telethon.sessions import StringSession
        from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError, PhoneCodeExpiredError
    except ImportError:
        raise HTTPException(500, "telethon paketi o'rnatilmagan")

    client = TelegramClient(StringSession(flow.session_string), api_id, api_hash)
    try:
        await client.connect()
        try:
            await client.sign_in(flow.phone, code=payload.code.strip(), phone_code_hash=flow.phone_code_hash)
        except SessionPasswordNeededError:
            if not payload.password:
                await client.disconnect()
                raise HTTPException(status_code=400, detail={"detail": "2FA parol kerak", "requires_password": True})
            await client.sign_in(password=payload.password)
        except (PhoneCodeInvalidError, PhoneCodeExpiredError) as e:
            await client.disconnect()
            raise HTTPException(400, f"Kod noto'g'ri yoki eskirgan: {e}")

        me = await client.get_me()
        final_session = client.session.save()
        await client.disconnect()

        row = _get_or_create_session(db)
        row.phone = flow.phone
        row.api_id = str(api_id)
        row.api_hash = api_hash
        row.session_string = final_session
        row.is_connected = True
        row.username = me.username or ""
        row.display_name = f"{me.first_name or ''} {me.last_name or ''}".strip()
        row.last_error = ""
        row.connected_at = datetime.now(timezone.utc)
        row.disconnected_at = None
        db.query(TelegramLoginFlow).delete()
        db.commit()

        # Start runtime client (best-effort)
        try:
            from .telegram_service import telegram_manager
            org_id = user.org_id
            if org_id:
                await telegram_manager.start_for_org(org_id, api_id, api_hash, final_session)
        except Exception as e:
            print(f"[telegram] runtime start failed: {e}")

        return {"ok": True, "username": row.username, "display_name": row.display_name, "phone": row.phone}
    except HTTPException:
        try: await client.disconnect()
        except: pass
        raise
    except Exception as e:
        try: await client.disconnect()
        except: pass
        raise HTTPException(400, f"Verify xato: {str(e)[:200]}")


@router.post("/disconnect")
async def disconnect(user=Depends(require_admin), db: Session = Depends(get_db)):
    row = db.query(TelegramSession).first()
    if not row:
        return {"ok": True}
    row.is_connected = False
    row.disconnected_at = datetime.now(timezone.utc)
    db.commit()
    try:
        from .telegram_service import telegram_manager
        org_id = user.org_id
        if org_id:
            await telegram_manager.stop_for_org(org_id)
    except Exception as e:
        print(f"[telegram] runtime stop failed: {e}")
    return {"ok": True}


@router.get("/test")
async def send_test(_=Depends(require_admin), db: Session = Depends(get_db)):
    row = db.query(TelegramSession).first()
    if not row or not row.is_connected:
        raise HTTPException(400, "Telegram ulanmagan")

    try:
        from telethon import TelegramClient
        from telethon.sessions import StringSession
    except ImportError:
        raise HTTPException(500, "telethon yo'q")

    client = TelegramClient(StringSession(row.session_string), int(row.api_id), row.api_hash)
    try:
        await client.connect()
        await client.send_message("me", "Shoda AI: sinov xabari ✓")
        await client.disconnect()
        return {"ok": True, "message": "Saqlangan xabarlarga yuborildi"}
    except Exception as e:
        raise HTTPException(400, f"Xato: {str(e)[:200]}")

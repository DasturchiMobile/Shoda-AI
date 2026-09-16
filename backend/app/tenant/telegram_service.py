"""Runtime Telegram session manager + trigger-based auto-reply handler.

Bosqich A (avtomatlashtirish, AI yo'q):
  - Kelayotgan xabarga trigger keywords bo'yicha mos javob yuboriladi
  - Trigger required_channels bo'lsa — foydalanuvchi kanallarga obuna bo'lganini tekshiradi
  - Suhbat lead_messages jadvaliga yoziladi (Lead upsert by telegram_id)
"""
from __future__ import annotations
import asyncio
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import text
from ..db import engine, SessionLocal, current_schema
from .models import Trigger, RequiredChannel, Lead, LeadMessage, default_board_stage


def _record_ai_usage_sync(org_id: int, lead_id, ai_result: dict):
    """Record AI usage in billing (platform ledger + lead_costs). Runs in a thread."""
    from ..billing_service import record_ai_usage
    token = current_schema.set(None)
    try:
        db = SessionLocal()
        try:
            record_ai_usage(
                db, org_id, lead_id,
                provider=ai_result.get("provider") or "",
                model=ai_result.get("model") or "",
                prompt_tokens=ai_result.get("prompt_tokens") or 0,
                completion_tokens=ai_result.get("completion_tokens") or 0,
                used_platform_key=bool(ai_result.get("used_platform_key")),
            )
        finally:
            db.close()
    finally:
        current_schema.reset(token)


def _match_trigger(user_text: str, trg: Trigger) -> bool:
    if not user_text or not trg.is_active:
        return False
    kws = [k.strip().lower() for k in (trg.keywords or "").split(",") if k.strip()]
    if not kws:
        return False
    low = user_text.lower()
    return any(kw in low for kw in kws)


def _load_triggers_and_channels(org_id: int):
    """Return (triggers sorted, {channel_id: RequiredChannel})."""
    token = current_schema.set(f"org_{org_id}")
    try:
        db = SessionLocal()
        db.begin()
        try:
            triggers = db.query(Trigger).filter(Trigger.is_active).order_by(Trigger.priority.asc()).all()
            channels = {c.id: c for c in db.query(RequiredChannel).filter(RequiredChannel.is_active).all()}
            
            from .models import AppSetting
            app_set = db.query(AppSetting).first()
            voice_reply_mode = app_set.voice_reply_mode if app_set else "text"
            voice_api_key = app_set.uzbekvoice_api_key if app_set else None
            ai_enabled = app_set.ai_enabled if app_set else False
            fallback_msg = app_set.fallback_message if app_set else ""
            
            # detach from session
            for t in triggers: db.expunge(t)
            for c in channels.values(): db.expunge(c)
            db.commit()
            return triggers, channels, voice_reply_mode, voice_api_key, ai_enabled, fallback_msg
        finally:
            db.close()
    finally:
        current_schema.reset(token)


def _upsert_lead_and_log(org_id: int, tg_user, user_text: str, ai_reply: str, kind: str = "text"):
    token = current_schema.set(f"org_{org_id}")
    try:
        db = SessionLocal()
        db.begin()
        try:
            lead = db.query(Lead).filter(Lead.telegram_id == tg_user.id).first()
            if not lead:
                display = " ".join(filter(None, [getattr(tg_user, "first_name", ""), getattr(tg_user, "last_name", "")])).strip()
                b_id, s_id = default_board_stage(db)
                lead = Lead(
                    name=display or (getattr(tg_user, "username", "") or f"tg_{tg_user.id}"),
                    telegram_id=tg_user.id,
                    telegram_username=getattr(tg_user, "username", "") or "",
                    source="telegram",
                    board_id=b_id,
                    stage_id=s_id,
                )
                db.add(lead); db.flush()
            lead.last_message = user_text[:500]
            lead.last_activity_at = datetime.now(timezone.utc)
            db.add(LeadMessage(lead_id=lead.id, role="user", kind=kind, content=user_text))
            if ai_reply:
                db.add(LeadMessage(lead_id=lead.id, role="ai", kind="text", content=ai_reply))
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"[tg#{org_id}] lead log xato: {e}")
        finally:
            db.close()
    finally:
        current_schema.reset(token)


async def _check_subscribed(client, channel_username: str, user_id: int) -> bool:
    """True — foydalanuvchi kanalga obuna. False — obuna emas yoki tekshirib bo'lmadi."""
    if not channel_username:
        return True
    try:
        from telethon.errors import UserNotParticipantError
        uname = channel_username.lstrip("@").strip()
        if not uname:
            return True
        try:
            await client.get_permissions(uname, user_id)
            return True
        except UserNotParticipantError:
            return False
        except Exception:
            # Bot kanalga a'zo emas yoki private → obuna deb belgilamaymiz
            return False
    except Exception:
        return False


class OrgTelegramClient:
    def __init__(self, org_id: int, api_id: int, api_hash: str, session_string: str):
        self.org_id = org_id
        self.api_id = api_id
        self.api_hash = api_hash
        self.session_string = session_string
        self.client = None

    async def start(self):
        try:
            from telethon import TelegramClient, events
            from telethon.sessions import StringSession
        except ImportError:
            print(f"[tg#{self.org_id}] telethon yo'q, o'tkazib yuborildi")
            return
        self.client = TelegramClient(StringSession(self.session_string), self.api_id, self.api_hash)
        await self.client.connect()
        if not await self.client.is_user_authorized():
            print(f"[tg#{self.org_id}] session valid emas")
            return

        me = await self.client.get_me()

        @self.client.on(events.NewMessage(incoming=True))
        async def _handler(event):
            print(f"[tg#{self.org_id}] event: private={event.is_private} text={(event.raw_text or '')[:60]!r}", flush=True)
            try:
                # Faqat shaxsiy chat (guruh emas, kanal emas)
                if not event.is_private:
                    return
                sender = await event.get_sender()
                if not sender or getattr(sender, "bot", False):
                    return
                # O'zining xabarlarini o'tkazib yuborish (masalan Saved Messages)
                if sender.id == me.id:
                    return

                # Xabarni o'qilgan deb belgilash (jo'natuvchi tarafida "nuqtacha" yo'qolishi uchun)
                try:
                    await self.client.send_read_acknowledge(event.chat_id, max_id=event.message.id)
                except Exception as e:
                    print(f"[tg#{self.org_id}] o'qilgan deb belgilashda xato: {e}")

                triggers, channels, voice_reply_mode, voice_api_key, ai_enabled, fallback_msg = await asyncio.to_thread(
                    _load_triggers_and_channels, self.org_id
                )
                user_text = (event.raw_text or "").strip()
                is_voice = False
                
                if getattr(event.message, 'sticker', None):
                    emoji = getattr(event.message.file, 'emoji', None) or ""
                    user_text = f"[Stiker: {emoji.strip()}]" if emoji.strip() else "[Stiker]"

                
                if getattr(event.message, 'voice', None):
                    is_voice = True
                    try:
                        import tempfile
                        import os
                        from ..voice_service import UzbekVoiceService
                        # Download voice message
                        fd, path = tempfile.mkstemp(suffix=".ogg")
                        os.close(fd)
                        await event.message.download_media(file=path)
                        stt_res = await UzbekVoiceService.stt(path, api_key=voice_api_key)
                        os.remove(path)
                        if isinstance(stt_res, dict) and "result" in stt_res:
                            user_text = stt_res["result"].get("text", "")
                        print(f"[tg#{self.org_id}] Ovozli xabar matnga o'girildi: {user_text}")
                    except Exception as e:
                        print(f"[tg#{self.org_id}] Ovozli xabarni o'qishda xato: {e}")
                        if not user_text:
                            user_text = "[Ovozli xabar (Tizimda ovozni aniqlash xatosi yuz berdi yoki API kalit noto'g'ri)]"
                
                if not user_text:
                    # Matn ham, ovoz ham bo'lmasa o'tkazib yuboramiz
                    return

                matched = next((t for t in triggers if _match_trigger(user_text, t)), None)

                reply_text: Optional[str] = None
                if matched:
                    # Required channels check
                    req_ids = [int(x) for x in (matched.required_channel_ids or "").split(",") if x.strip().isdigit()]
                    missing = []
                    for cid in req_ids:
                        ch = channels.get(cid)
                        if not ch:
                            continue
                        ok = await _check_subscribed(self.client, ch.username, sender.id)
                        if not ok:
                            missing.append(ch)
                    if missing:
                        lines = ["Javobni ko'rish uchun quyidagi kanallarga obuna bo'ling:", ""]
                        for ch in missing:
                            link = ch.invite_url or (f"https://t.me/{ch.username.lstrip('@')}" if ch.username else "")
                            lines.append(f"• {ch.title or ch.username}  {link}".rstrip())
                        lines.append("")
                        lines.append("Obuna bo'lgach xabaringizni qayta yuboring.")
                        reply_text = "\n".join(lines)
                    else:
                        reply_text = matched.response_text

                # If no trigger matched — try AI
                if not reply_text:
                    if not ai_enabled:
                        reply_text = fallback_msg or "Kechirasiz, men bu savolga javob bera olmayman. Iltimos operatorga murojaat qiling."
                    else:
                        from ..ai_service import generate_reply_ex
                        # Upsert lead first to get lead_id for context
                        lead_id_holder = {"id": None}
                        def _upsert_first():
                            from ..db import SessionLocal, current_schema
                            from .models import Lead
                            from datetime import datetime as _dt, timezone as _tz
                            tok = current_schema.set(f"org_{self.org_id}")
                            try:
                                db = SessionLocal(); db.begin()
                                try:
                                    lead = db.query(Lead).filter(Lead.telegram_id == sender.id).first()
                                    if not lead:
                                        disp = " ".join(filter(None, [getattr(sender,"first_name",""), getattr(sender,"last_name","")])).strip()
                                        b_id, s_id = default_board_stage(db)
                                        lead = Lead(name=disp or (getattr(sender,"username","") or f"tg_{sender.id}"),
                                                    telegram_id=sender.id,
                                                    telegram_username=getattr(sender,"username","") or "",
                                                    source="telegram",
                                                    board_id=b_id,
                                                    stage_id=s_id)
                                        db.add(lead); db.flush()
                                    lead_id_holder["id"] = lead.id
                                    db.commit()
                                finally:
                                    db.close()
                            finally:
                                current_schema.reset(tok)
                        await asyncio.to_thread(_upsert_first)
                        ai_result = await asyncio.to_thread(generate_reply_ex, self.org_id, lead_id_holder["id"], user_text)
                        ai_reply, ai_err = ai_result.get("text"), ai_result.get("error", "")
                        if ai_reply:
                            reply_text = ai_reply
                            # Record usage (billing failures must never break sending)
                            try:
                                await asyncio.to_thread(
                                    _record_ai_usage_sync, self.org_id, lead_id_holder["id"], ai_result
                                )
                            except Exception as _b_e:
                                print(f"[tg#{self.org_id}] billing record xato: {_b_e}")
                        elif ai_err:
                            print(f"[tg#{self.org_id}] AI o'chirilgan/xato: {ai_err}")
                            reply_text = fallback_msg or "AI tizimida vaqtincha xatolik yuz berdi."

                if reply_text:
                    send_as_voice = False
                    if is_voice:
                        if voice_reply_mode == "voice":
                            send_as_voice = True
                        elif voice_reply_mode == "mixed":
                            import random
                            send_as_voice = random.choice([True, False])
                            
                    if send_as_voice:
                        try:
                            from ..voice_service import UzbekVoiceService
                            import tempfile, os, subprocess

                            audio_bytes = await UzbekVoiceService.tts(reply_text, api_key=voice_api_key)
                            if not audio_bytes or len(audio_bytes) < 200:
                                raise ValueError(
                                    f"UzbekVoice TTS bo'sh/juda kichik audio qaytardi "
                                    f"({len(audio_bytes or b'')} bayt): {(audio_bytes or b'')[:300]!r}"
                                )
                            if audio_bytes[:1] in (b"{", b"["):
                                raise ValueError(f"UzbekVoice TTS audio o'rniga JSON qaytardi: {audio_bytes[:200]!r}")

                            fd_raw, raw_path = tempfile.mkstemp(suffix=".src")
                            os.close(fd_raw)
                            with open(raw_path, "wb") as f:
                                f.write(audio_bytes)

                            fd_ogg, ogg_path = tempfile.mkstemp(suffix=".ogg")
                            os.close(fd_ogg)

                            # UzbekVoice qaysi formatda audio qaytarishidan qat'i nazar,
                            # Telegram voice-note uchun to'g'ri OGG/Opus formatga o'giramiz
                            # (aks holda Telegram klientida 00:00 / bo'sh waveform ko'rinadi)
                            proc = subprocess.run(
                                [
                                    "ffmpeg", "-y", "-i", raw_path,
                                    "-c:a", "libopus", "-b:a", "32k", "-ac", "1", "-ar", "48000",
                                    ogg_path,
                                ],
                                capture_output=True, timeout=30,
                            )
                            if proc.returncode != 0 or not os.path.exists(ogg_path) or os.path.getsize(ogg_path) < 100:
                                raise RuntimeError(f"ffmpeg konvertatsiya xato: {proc.stderr.decode(errors='ignore')[:300]}")

                            # Duration'ni ffprobe orqali aniq hisoblaymiz (hachoir yo'q/ishlamasa ham
                            # Telegram'da 00:00 ko'rinmasligi uchun to'g'ridan-to'g'ri beramiz)
                            duration = 0
                            try:
                                probe = subprocess.run(
                                    [
                                        "ffprobe", "-v", "error", "-show_entries", "format=duration",
                                        "-of", "default=noprint_wrappers=1:nokey=1", ogg_path,
                                    ],
                                    capture_output=True, timeout=15,
                                )
                                duration = int(float(probe.stdout.decode().strip() or 0))
                            except Exception as pe:
                                print(f"[tg#{self.org_id}] ffprobe xato: {pe}")

                            from telethon.tl.types import DocumentAttributeAudio

                            await self.client.send_file(
                                event.chat_id,
                                ogg_path,
                                voice_note=True,
                                reply_to=event.message.id,
                                attributes=[DocumentAttributeAudio(duration=duration, voice=True)],
                            )
                            os.remove(raw_path)
                            os.remove(ogg_path)
                        except Exception as e:
                            print(f"[tg#{self.org_id}] TTS yuborishda xato: {e}")
                            await event.reply(reply_text)
                    else:
                        await event.reply(reply_text)

                # Log (blocking DB in event loop — o'rtacha yuk uchun yetadi)
                await asyncio.to_thread(_upsert_lead_and_log, self.org_id, sender, user_text, reply_text or "")
            except Exception as e:
                print(f"[tg#{self.org_id}] handler xato: {e}")

        print(f"[tg#{self.org_id}] ulandi va tinglayapti ({me.username or me.phone})")

    async def stop(self):
        if self.client:
            try:
                await self.client.disconnect()
            except: pass
            self.client = None


class TelegramManager:
    def __init__(self):
        self.clients: dict[int, OrgTelegramClient] = {}

    async def start_all(self):
        try:
            with engine.connect() as conn:
                schemas = conn.execute(text(
                    "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'org_%'"
                )).fetchall()
            for (schema,) in schemas:
                try:
                    org_id = int(schema.replace("org_", ""))
                    with engine.begin() as conn:
                        conn.execute(text(f'SET LOCAL search_path TO "{schema}", public'))
                        row = conn.execute(text(
                            "SELECT api_id, api_hash, session_string, is_connected "
                            "FROM telegram_sessions WHERE is_connected=TRUE AND session_string != '' LIMIT 1"
                        )).fetchone()
                    if row:
                        api_id, api_hash, session_string, _ = row
                        try:
                            await self.start_for_org(org_id, int(api_id), api_hash, session_string)
                        except Exception as e:
                            print(f"[tg#{org_id}] auto-start xato: {e}")
                except Exception as e:
                    print(f"[{schema}] tg scan xato: {e}")
        except Exception as e:
            print(f"[telegram] start_all failed: {e}")

    async def start_for_org(self, org_id: int, api_id: int, api_hash: str, session_string: str):
        if org_id in self.clients:
            await self.stop_for_org(org_id)
        c = OrgTelegramClient(org_id, api_id, api_hash, session_string)
        await c.start()
        self.clients[org_id] = c

    async def stop_for_org(self, org_id: int):
        c = self.clients.pop(org_id, None)
        if c:
            await c.stop()


telegram_manager = TelegramManager()

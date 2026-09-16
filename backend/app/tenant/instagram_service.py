"""Instagram DM polling loop + trigger + AI reply integration.

instagrapi doesn't push events — we poll direct_threads() every N seconds
for each connected org. On new incoming messages, run trigger match, then AI.

Deduplication: each processed message is stored in lead_messages with
media_url = "ig:<msg_id>" so we never handle the same message twice.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

from sqlalchemy import text

from ..db import engine, SessionLocal, current_schema

POLL_INTERVAL_SEC = 20  # ~1x/20s per org — instagram rate-limit friendly


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


class OrgInstagramClient:
    def __init__(self, org_id: int, username: str, session_json: str):
        self.org_id = org_id
        self.username = username
        self.session_json = session_json
        self.client = None
        self.me_id = None
        self.running = False
        self.task: asyncio.Task | None = None

    def _make_client(self):
        try:
            from instagrapi import Client
        except ImportError:
            return None
        cl = Client()
        cl.delay_range = [1, 3]
        try:
            cl.set_settings(json.loads(self.session_json))
        except Exception as e:
            print(f"[ig#{self.org_id}] settings xato: {e}")
            return None
        return cl

    # ── Deduplication helpers ──────────────────────────────────────────────

    def _is_seen(self, msg_id: str) -> bool:
        """Return True if this Instagram message_id is already stored in DB."""
        from .models import LeadMessage
        tok = current_schema.set(f"org_{self.org_id}")
        try:
            db = SessionLocal()
            db.begin()
            try:
                sentinel = f"ig:{msg_id}"
                r = db.query(LeadMessage).filter(
                    LeadMessage.media_url == sentinel
                ).first()
                return r is not None
            finally:
                db.close()
        finally:
            current_schema.reset(tok)

    # ── Thread processing ──────────────────────────────────────────────────

    async def _process_thread(self, thread):
        """Process a single DM thread — react to unread incoming messages."""
        try:
            # thread.messages is list, newest first
            for m in reversed(list(thread.messages or [])):
                # skip our own outgoing
                if str(m.user_id) == str(self.me_id):
                    continue
                # Determine message type and extract text/voice
                text_body = getattr(m, "text", None) or ""
                is_voice = False
                
                # Check for voice media
                voice_media = getattr(m, "voice_media", None) or getattr(m, "audio", None)
                if not text_body and getattr(m, "item_type", "") == "voice_media" and self.client:
                    is_voice = True
                    try:
                        import tempfile, os
                        from ..voice_service import UzbekVoiceService
                        # Attempt to download voice media (instagrapi uses clip/voice_media url)
                        # We might need to use client.video_download or get url directly.
                        # For simplicity, if voice_media has a url, we download it using httpx
                        url = None
                        if hasattr(m, 'clip') and hasattr(m.clip, 'video_url'):
                            url = m.clip.video_url
                        elif hasattr(voice_media, 'media') and hasattr(voice_media.media, 'video_url'):
                            url = voice_media.media.video_url
                        if url:
                            import httpx
                            async with httpx.AsyncClient() as hc:
                                r = await hc.get(url)
                                fd, path = tempfile.mkstemp(suffix=".mp4")
                                os.close(fd)
                                with open(path, "wb") as f:
                                    f.write(r.content)
                                # Fetch API key for STT
                                from ..db import SessionLocal, current_schema
                                tok = current_schema.set(f"org_{self.org_id}")
                                try:
                                    db = SessionLocal()
                                    try:
                                        from .models import AppSetting
                                        app_set = db.query(AppSetting).first()
                                        vk = app_set.uzbekvoice_api_key if app_set else None
                                    finally:
                                        db.close()
                                finally:
                                    current_schema.reset(tok)
                                    
                                stt_res = await UzbekVoiceService.stt(path, api_key=vk)
                                os.remove(path)
                                if isinstance(stt_res, dict) and "result" in stt_res:
                                    text_body = stt_res["result"].get("text", "")
                                print(f"[ig#{self.org_id}] Ovozli xabar o'qildi: {text_body}")
                    except Exception as e:
                        print(f"[ig#{self.org_id}] Ovozli xabarni o'qishda xato: {e}")
                
                if not text_body:
                    continue

                msg_id = str(m.id)

                # ── Deduplication: skip if already processed ───────────────
                if await asyncio.to_thread(self._is_seen, msg_id):
                    continue

                # Resolve sender username
                sender_username = ""
                sender_id = m.user_id
                try:
                    for u in thread.users:
                        if str(u.pk) == str(sender_id):
                            sender_username = u.username
                            break
                except Exception:
                    pass

                await self._handle_message(
                    msg_id, sender_id, sender_username, text_body, thread, is_voice
                )
        except Exception as e:
            print(f"[ig#{self.org_id}] thread xato: {e}")

    async def _handle_message(
        self,
        msg_id: str,
        sender_id,
        sender_username: str,
        text_body: str,
        thread,
        is_voice: bool = False,
    ):
        """Trigger match + AI fallback + send reply + persist to DB."""
        from .models import Trigger, Lead, LeadMessage, default_board_stage

        sentinel = f"ig:{msg_id}"  # dedup marker stored in media_url

        tok = current_schema.set(f"org_{self.org_id}")
        try:
            db = SessionLocal()
            db.begin()
            try:
                from .models import AppSetting
                app_set = db.query(AppSetting).first()
                voice_reply_mode = app_set.voice_reply_mode if app_set else "text"
                voice_api_key = app_set.uzbekvoice_api_key if app_set else None
                ai_enabled = app_set.ai_enabled if app_set else False
                fallback_msg = app_set.fallback_message if app_set else ""
                
                # ── Trigger matching ───────────────────────────────────────
                trigs = (
                    db.query(Trigger)
                    .filter(Trigger.is_active)
                    .order_by(Trigger.priority.asc())
                    .all()
                )
                reply_text = None
                low = text_body.lower()
                for t in trigs:
                    kws = [
                        k.strip().lower()
                        for k in (t.keywords or "").split(",")
                        if k.strip()
                    ]
                    if kws and any(k in low for k in kws):
                        reply_text = t.response_text
                        break

                # ── Upsert Lead ────────────────────────────────────────────
                lead = (
                    db.query(Lead)
                    .filter(
                        Lead.telegram_username == sender_username,
                        Lead.source == "instagram",
                    )
                    .first()
                )
                if not lead:
                    b_id, s_id = default_board_stage(db)
                    lead = Lead(
                        name=sender_username or f"ig_{sender_id}",
                        telegram_username=sender_username or "",
                        source="instagram",
                        board_id=b_id,
                        stage_id=s_id,
                    )
                    db.add(lead)
                    db.flush()

                lead.last_message = text_body[:500]
                lead.last_activity_at = datetime.now(timezone.utc)

                # ── Persist incoming message with dedup sentinel ────────────
                db.add(
                    LeadMessage(
                        lead_id=lead.id,
                        role="user",
                        kind="text",
                        content=text_body,
                        media_url=sentinel,  # ← dedup key: "ig:<msg_id>"
                    )
                )
                db.commit()
                lead_id = lead.id
            finally:
                db.close()
        finally:
            current_schema.reset(tok)

        # ── AI fallback ────────────────────────────────────────────────────
        if not reply_text:
            if not ai_enabled:
                reply_text = fallback_msg or "Kechirasiz, men bu savolga javob bera olmayman."
            else:
                try:
                    from ..ai_service import generate_reply_ex
                    ai_result = await asyncio.to_thread(
                        generate_reply_ex, self.org_id, lead_id, text_body
                    )
                    reply_text_ai, err = ai_result.get("text"), ai_result.get("error", "")
                    if reply_text_ai:
                        reply_text = reply_text_ai
                        # Record usage (billing failures must never break sending)
                        try:
                            await asyncio.to_thread(
                                _record_ai_usage_sync, self.org_id, lead_id, ai_result
                            )
                        except Exception as _b_e:
                            print(f"[ig#{self.org_id}] billing record xato: {_b_e}")
                    elif err:
                        print(f"[ig#{self.org_id}] AI xato: {err}")
                        reply_text = fallback_msg or "AI tizimida xatolik yuz berdi."
                except Exception as e:
                    print(f"[ig#{self.org_id}] AI chaqirish xato: {e}")
                    reply_text = fallback_msg or "Xatolik yuz berdi."

        # ── Send reply via instagrapi + persist AI message ─────────────────
        if reply_text and self.client:
            try:
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
                        import tempfile, os
                        audio_bytes = await UzbekVoiceService.tts(reply_text, api_key=voice_api_key)
                        fd, path = tempfile.mkstemp(suffix=".mp4")
                        os.close(fd)
                        with open(path, "wb") as f:
                            f.write(audio_bytes)
                        # NOTE: direct_send_voice is available in newer instagrapi or direct_send_file
                        if hasattr(self.client, 'direct_send_voice'):
                            await asyncio.to_thread(self.client.direct_send_voice, path, [thread.id])
                        else:
                            await asyncio.to_thread(self.client.direct_send, reply_text, [], [thread.id])
                        os.remove(path)
                    except Exception as e:
                        print(f"[ig#{self.org_id}] TTS xato, matn yuborilmoqda: {e}")
                        await asyncio.to_thread(self.client.direct_send, reply_text, [], [thread.id])
                else:
                    await asyncio.to_thread(
                        self.client.direct_send, reply_text, [], [thread.id]
                    )
                    
                # Persist AI reply
                tok = current_schema.set(f"org_{self.org_id}")
                try:
                    db = SessionLocal()
                    db.begin()
                    try:
                        db.add(
                            LeadMessage(
                                lead_id=lead_id,
                                role="ai",
                                kind="text",
                                content=reply_text,
                                media_url="",
                            )
                        )
                        db.commit()
                    finally:
                        db.close()
                finally:
                    current_schema.reset(tok)
            except Exception as e:
                print(f"[ig#{self.org_id}] send xato: {e}")

    # ── Lifecycle ──────────────────────────────────────────────────────────

    async def start(self):
        self.client = await asyncio.to_thread(self._make_client)
        if not self.client:
            print(f"[ig#{self.org_id}] client yaratilmadi")
            return
        try:
            me = await asyncio.to_thread(self.client.account_info)
            self.me_id = me.pk
            print(f"[ig#{self.org_id}] ulandi ({self.username})")
        except Exception as e:
            print(f"[ig#{self.org_id}] account_info xato: {e}")
            return
        self.running = True
        self.task = asyncio.create_task(self._poll_loop())

    async def _poll_loop(self):
        while self.running:
            try:
                threads = await asyncio.to_thread(self.client.direct_threads, 20)
                for th in threads:
                    await self._process_thread(th)
            except Exception as e:
                print(f"[ig#{self.org_id}] poll xato: {e}")
            await asyncio.sleep(POLL_INTERVAL_SEC)

    async def stop(self):
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except Exception:
                pass
        self.client = None


class InstagramManager:
    def __init__(self):
        self.clients: dict[int, OrgInstagramClient] = {}

    async def start_all(self):
        try:
            with engine.connect() as conn:
                schemas = conn.execute(
                    text(
                        "SELECT schema_name FROM information_schema.schemata "
                        "WHERE schema_name LIKE 'org_%'"
                    )
                ).fetchall()
            for (schema,) in schemas:
                try:
                    org_id = int(schema.replace("org_", ""))
                    with engine.begin() as conn:
                        conn.execute(
                            text(f'SET LOCAL search_path TO "{schema}", public')
                        )
                        row = conn.execute(
                            text(
                                "SELECT username, session_json FROM instagram_sessions "
                                "WHERE is_connected=TRUE AND session_json != '' LIMIT 1"
                            )
                        ).fetchone()
                    if row:
                        await self.start_for_org(org_id, row[0], row[1])
                except Exception as e:
                    print(f"[{schema}] ig scan xato: {e}")
        except Exception as e:
            print(f"[instagram] start_all failed: {e}")

    async def reload_all(self):
        for oid in list(self.clients.keys()):
            await self.stop_for_org(oid)
        await self.start_all()

    async def start_for_org(self, org_id: int, username: str, session_json: str):
        if org_id in self.clients:
            await self.stop_for_org(org_id)
        c = OrgInstagramClient(org_id, username, session_json)
        await c.start()
        self.clients[org_id] = c

    async def stop_for_org(self, org_id: int):
        c = self.clients.pop(org_id, None)
        if c:
            await c.stop()


instagram_manager = InstagramManager()

import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import require_admin
from .models import AppSetting

router = APIRouter(prefix="/api/settings", tags=["settings"])


class Objection(BaseModel):
    key: str = ""
    label: str = ""
    enabled: bool = True
    response: str = ""


class SpecialSituation(BaseModel):
    trigger: str = ""
    response: str = ""


class SettingsIn(BaseModel):
    system_prompt: str | None = None
    ai_enabled: bool | None = None
    welcome_message: str | None = None
    fallback_message: str | None = None
    manager_username: str | None = None
    
    # Optional fields (could be empty initially)
    gemini_api_key: str | None = None
    gemini_model: str | None = None
    ai_provider: str | None = None          # openai | claude | gemini | groq
    groq_api_key: str | None = None
    groq_model: str | None = None
    openai_api_key: str | None = None
    openai_model: str | None = None
    claude_api_key: str | None = None
    claude_model: str | None = None
    ai_model: str | None = None             # umumiy model override (barcha providerlar uchun)

    persona_name: str | None = None
    persona_tone: str | None = None
    persona_short: bool | None = None
    persona_we_form: bool | None = None
    persona_emoji: bool | None = None
    language: str | None = None

    sales_aggressiveness: int | None = None
    payment_mention: str | None = None
    mention_discount: bool | None = None
    block_installment: bool | None = None
    push_leave_number: bool | None = None

    collect_name: bool | None = None
    collect_phone: bool | None = None
    collect_business: bool | None = None
    collect_budget: bool | None = None

    work_hours_enabled: bool | None = None
    work_hours_start: str | None = None
    work_hours_end: str | None = None
    after_hours_message: str | None = None

    banned_words: list[str] | None = None
    objections: list[dict] | None = None
    special_situations: list[dict] | None = None

    voice_reply_mode: str | None = None
    uzbekvoice_api_key: str | None = None


def _get_or_create(db: Session) -> AppSetting:
    row = db.query(AppSetting).order_by(AppSetting.id.asc()).first()
    if not row:
        row = AppSetting(id=1)
        db.add(row); db.commit(); db.refresh(row)
    return row


def _load_json(text: str, default):
    try:
        return json.loads(text) if text else default
    except Exception:
        return default


def _serialize(s: AppSetting) -> dict:
    return {
        "system_prompt": s.system_prompt,
        "ai_enabled": bool(s.ai_enabled),
        "welcome_message": s.welcome_message,
        "fallback_message": s.fallback_message,
        "manager_username": s.manager_username,

        "gemini_api_key_set": bool((getattr(s, "gemini_api_key", "") or "").strip()),
        "gemini_model": getattr(s, "gemini_model", "") or "",
        "ai_provider": getattr(s, "ai_provider", "") or "gemini",
        "groq_api_key_set": bool((getattr(s, "groq_api_key", "") or "").strip()),
        "groq_model": getattr(s, "groq_model", "") or "",
        "openai_api_key_set": bool((getattr(s, "openai_api_key", "") or "").strip()),
        "openai_model": getattr(s, "openai_model", "") or "",
        "claude_api_key_set": bool((getattr(s, "claude_api_key", "") or "").strip()),
        "claude_model": getattr(s, "claude_model", "") or "",
        "ai_model": getattr(s, "ai_model", "") or "",

        "persona_name": s.persona_name,
        "persona_tone": s.persona_tone,
        "persona_short": bool(s.persona_short),
        "persona_we_form": bool(s.persona_we_form),
        "persona_emoji": bool(s.persona_emoji),
        "language": s.language,

        "sales_aggressiveness": s.sales_aggressiveness,
        "payment_mention": s.payment_mention,
        "mention_discount": bool(s.mention_discount),
        "block_installment": bool(s.block_installment),
        "push_leave_number": bool(s.push_leave_number),

        "collect_name": bool(s.collect_name),
        "collect_phone": bool(s.collect_phone),
        "collect_business": bool(s.collect_business),
        "collect_budget": bool(s.collect_budget),

        "work_hours_enabled": bool(s.work_hours_enabled),
        "work_hours_start": s.work_hours_start,
        "work_hours_end": s.work_hours_end,
        "after_hours_message": s.after_hours_message,

        "banned_words": json.loads(s.banned_words or "[]"),
        "objections": json.loads(s.objections or "[]"),
        "special_situations": json.loads(s.special_situations or "[]"),

        "voice_reply_mode": s.voice_reply_mode,
        "uzbekvoice_api_key_set": bool((s.uzbekvoice_api_key or "").strip()),
    }


@router.get("")
def get_settings(_=Depends(require_admin), db: Session = Depends(get_db)):
    return _serialize(_get_or_create(db))


@router.put("")
def update_settings(payload: SettingsIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    s = _get_or_create(db)
    data = payload.model_dump(exclude_none=True)
    for k, v in data.items():
        if not hasattr(s, k):
            # ORM modelda bu ustun yo'q (migratsiya talab qiladi) — tinch o'tkazib yuboramiz
            continue
        if k in ("banned_words", "objections", "special_situations"):
            setattr(s, k, json.dumps(v, ensure_ascii=False))
        else:
            setattr(s, k, v)
    db.commit(); db.refresh(s)
    return {"ok": True}

class TestGeminiPayload(BaseModel):
    api_key: str | None = None
    model: str | None = None

@router.post("/test-gemini")
def test_gemini(payload: TestGeminiPayload, _=Depends(require_admin), db: Session = Depends(get_db)):
    s = _get_or_create(db)
    api_key = (payload.api_key or s.gemini_api_key or "").strip()
    model_name = (payload.model or s.gemini_model or "gemini-1.5-flash").strip()
    
    if not api_key:
        return {"ok": False, "error": "API kalit kiritilmagan"}
    
    try:
        import requests
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        data = {
            "contents": [{"role": "user", "parts": [{"text": "Say exactly the word OK"}]}]
        }
        res = requests.post(url, json=data, timeout=30)
        if res.status_code != 200:
            err = res.text
            try: err = res.json().get("error", {}).get("message", res.text)
            except: pass
            return {"ok": False, "error": f"HTTP {res.status_code}: {err}"}
        
        resp_json = res.json()
        text = resp_json["candidates"][0]["content"]["parts"][0]["text"]
        return {"ok": True, "result": text}
    except Exception as e:
        return {"ok": False, "error": str(e)}

class TestGroqPayload(BaseModel):
    api_key: str | None = None
    model: str | None = None

@router.post("/test-groq")
def test_groq(payload: TestGroqPayload, _=Depends(require_admin), db: Session = Depends(get_db)):
    try:
        from groq import Groq
    except ImportError:
        return {"ok": False, "error": "groq kutubxonasi o'rnatilmagan"}
    
    s = _get_or_create(db)
    api_key = (payload.api_key or s.groq_api_key or "").strip()
    model_name = (payload.model or s.groq_model or "llama-3.1-8b-instant").strip()
    
    if not api_key:
        return {"ok": False, "error": "Groq API kalit kiritilmagan"}
    
    try:
        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            messages=[{"role": "user", "content": "Say exactly the word OK"}],
            model=model_name,
            max_tokens=10
        )
        return {"ok": True, "result": resp.choices[0].message.content}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.get("/groq-models")
def list_groq_models(_=Depends(require_admin), db: Session = Depends(get_db)):
    """Groq API'dan shu org kaliti uchun haqiqatda mavjud (faol) modellar ro'yxatini oladi."""
    s = _get_or_create(db)
    api_key = (s.groq_api_key or "").strip()
    if not api_key:
        return {"ok": False, "error": "Groq API kalit kiritilmagan", "models": []}
    try:
        import httpx
        resp = httpx.get(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])
        # faqat matn/chat modellarini ko'rsatamiz (whisper/tts/guard kabi maxsus modellarni chiqarib tashlaymiz)
        EXCLUDE_SUBSTR = ("whisper", "tts", "guard", "orpheus")
        models = sorted(
            [
                m["id"] for m in data
                if m.get("active", True) and not any(x in m["id"].lower() for x in EXCLUDE_SUBSTR)
            ]
        )
        return {"ok": True, "models": models}
    except Exception as e:
        return {"ok": False, "error": str(e)[:300], "models": []}


class TestOpenAIPayload(BaseModel):
    api_key: str | None = None
    model: str | None = None

@router.post("/test-openai")
def test_openai(payload: TestOpenAIPayload, _=Depends(require_admin), db: Session = Depends(get_db)):
    s = _get_or_create(db)
    api_key = (payload.api_key or getattr(s, "openai_api_key", "") or "").strip()
    model_name = (payload.model or getattr(s, "openai_model", "") or "gpt-4o-mini").strip()

    if not api_key:
        return {"ok": False, "error": "OpenAI API kalit kiritilmagan"}

    try:
        import requests
        res = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model_name, "messages": [{"role": "user", "content": "Say exactly the word OK"}], "max_tokens": 10},
            timeout=30,
        )
        if res.status_code != 200:
            err = res.text
            try: err = res.json().get("error", {}).get("message", res.text)
            except Exception: pass
            return {"ok": False, "error": f"HTTP {res.status_code}: {err}"}
        return {"ok": True, "result": res.json()["choices"][0]["message"]["content"]}
    except Exception as e:
        return {"ok": False, "error": str(e)}


class TestClaudePayload(BaseModel):
    api_key: str | None = None
    model: str | None = None

@router.post("/test-claude")
def test_claude(payload: TestClaudePayload, _=Depends(require_admin), db: Session = Depends(get_db)):
    s = _get_or_create(db)
    api_key = (payload.api_key or getattr(s, "claude_api_key", "") or "").strip()
    model_name = (payload.model or getattr(s, "claude_model", "") or "claude-3-5-haiku-latest").strip()

    if not api_key:
        return {"ok": False, "error": "Anthropic API kalit kiritilmagan"}

    try:
        import requests
        res = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={"model": model_name, "max_tokens": 10, "messages": [{"role": "user", "content": "Say exactly the word OK"}]},
            timeout=30,
        )
        if res.status_code != 200:
            err = res.text
            try: err = res.json().get("error", {}).get("message", res.text)
            except Exception: pass
            return {"ok": False, "error": f"HTTP {res.status_code}: {err}"}
        text = "".join(p.get("text", "") for p in res.json().get("content", []) if p.get("type") == "text")
        return {"ok": True, "result": text}
    except Exception as e:
        return {"ok": False, "error": str(e)}


class TestVoicePayload(BaseModel):
    api_key: str | None = None

@router.post("/test-voice")
async def test_voice(payload: TestVoicePayload, _=Depends(require_admin), db: Session = Depends(get_db)):
    s = _get_or_create(db)
    api_key = (payload.api_key or s.uzbekvoice_api_key or "").strip()
    
    if not api_key:
        return {"ok": False, "error": "API kalit kiritilmagan"}
        
    try:
        from ..voice_service import UzbekVoiceService
        # TTS is faster and simpler to test than STT since it just returns audio bytes
        res = await UzbekVoiceService.tts("Salom", api_key=api_key)
        if isinstance(res, bytes) and len(res) > 0:
            return {"ok": True}
        else:
            return {"ok": False, "error": "Noma'lum xatolik yoki audio bo'sh"}
    except Exception as e:
        return {"ok": False, "error": str(e)}

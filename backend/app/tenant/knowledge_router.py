from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import io

from ..db import get_db
from ..deps import require_admin
from .models import KnowledgeSource
from .schemas import KnowledgeIn, KnowledgeOut, KnowledgeAsk

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


def _chunk_count(text: str) -> int:
    # Approx: 800-char chunks
    if not text:
        return 0
    return max(1, (len(text) + 799) // 800)


@router.get("", response_model=list[KnowledgeOut])
def list_sources(_=Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(KnowledgeSource).order_by(KnowledgeSource.created_at.desc()).all()


@router.post("", response_model=KnowledgeOut)
def create_source(payload: KnowledgeIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(400, "Nomi bo'sh")
    if payload.kind not in ("text", "url", "file", "telegram"):
        raise HTTPException(400, "kind noto'g'ri")
    ks = KnowledgeSource(
        name=payload.name.strip(),
        kind=payload.kind,
        content=payload.content,
        url=payload.url.strip(),
        chunks_count=_chunk_count(payload.content),
        is_active=payload.is_active,
    )
    db.add(ks); db.commit(); db.refresh(ks)
    return ks


@router.patch("/{sid}", response_model=KnowledgeOut)
def update_source(sid: int, payload: KnowledgeIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    ks = db.query(KnowledgeSource).filter(KnowledgeSource.id == sid).first()
    if not ks: raise HTTPException(404, "Topilmadi")
    ks.name = payload.name.strip()
    ks.kind = payload.kind
    ks.content = payload.content
    ks.url = payload.url.strip()
    ks.chunks_count = _chunk_count(payload.content)
    ks.is_active = payload.is_active
    db.commit(); db.refresh(ks)
    return ks


@router.delete("/{sid}")
def delete_source(sid: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    ks = db.query(KnowledgeSource).filter(KnowledgeSource.id == sid).first()
    if not ks: raise HTTPException(404, "Topilmadi")
    db.delete(ks); db.commit()
    return {"ok": True}


@router.post("/upload", response_model=KnowledgeOut)
async def upload_file(
    file: UploadFile = File(...),
    _=Depends(require_admin),
    db: Session = Depends(get_db),
):
    data = await file.read()
    text = ""
    name = file.filename or "fayl"
    lower = name.lower()
    try:
        if lower.endswith(".pdf"):
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(data))
                text = "\n".join(page.extract_text() or "" for page in reader.pages)
            except ImportError:
                text = "[PDF]: pypdf o'rnatilmagan"
        elif lower.endswith(".docx"):
            try:
                from docx import Document
                doc = Document(io.BytesIO(data))
                text = "\n".join(p.text for p in doc.paragraphs)
            except ImportError:
                text = "[DOCX]: python-docx o'rnatilmagan"
        else:
            text = data.decode("utf-8", errors="ignore")
    except Exception as e:
        raise HTTPException(400, f"Faylni o'qib bo'lmadi: {e}")

    ks = KnowledgeSource(
        name=name, kind="file", content=text[:200_000],
        url="", chunks_count=_chunk_count(text), is_active=True,
    )
    db.add(ks); db.commit(); db.refresh(ks)
    return ks


@router.post("/ask")
def ask(payload: KnowledgeAsk, _=Depends(require_admin), db: Session = Depends(get_db)):
    """Simple retrieval: concat active sources (optionally filtered), return top chunks + fake AI answer.
    Real integration with Gemini goes via n8n later."""
    q = db.query(KnowledgeSource).filter(KnowledgeSource.is_active == True)
    if payload.source_ids:
        q = q.filter(KnowledgeSource.id.in_(payload.source_ids))
    srcs = q.all()
    if not srcs:
        return {"answer": "Faol manba yo'q. Chap tomondan manbalarni tanlang.", "citations": []}
    # Naive keyword scoring
    ql = payload.question.lower()
    hits = []
    for s in srcs:
        text = (s.content or "")
        score = sum(text.lower().count(w) for w in ql.split() if len(w) > 2)
        if score > 0:
            snippet = text[:400]
            hits.append({"source_id": s.id, "name": s.name, "snippet": snippet, "score": score})
    hits.sort(key=lambda x: -x["score"])
    hits = hits[:3]
    if not hits:
        return {"answer": "Bilim bazasida bu haqda ma'lumot topilmadi.", "citations": []}
    answer = f"Topilgan ma'lumotlar asosida javob:\n\n" + "\n\n".join(
        f"[{h['name']}]: {h['snippet']}" for h in hits
    ) + f"\n\n(Gemini bilan real javob n8n orqali qo'shiladi.)"
    return {"answer": answer, "citations": hits}

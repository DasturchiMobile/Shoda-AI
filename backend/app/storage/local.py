import hashlib
import os
from pathlib import Path
from fastapi import UploadFile

from ..config import settings


def _ext(filename: str) -> str:
    if "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


def save_upload(file: UploadFile) -> str:
    """Save an uploaded file to STORAGE_LOCAL_DIR and return a relative URL
    like /api/files/<hash>.<ext> that nginx/backend can serve."""
    base = Path(settings.STORAGE_LOCAL_DIR)
    base.mkdir(parents=True, exist_ok=True)

    hasher = hashlib.sha256()
    tmp_path = base / f"_tmp_{os.getpid()}_{file.filename}"
    with open(tmp_path, "wb") as f:
        while True:
            chunk = file.file.read(1024 * 64)
            if not chunk:
                break
            hasher.update(chunk)
            f.write(chunk)
    digest = hasher.hexdigest()[:32]
    ext = _ext(file.filename or "")
    final = base / f"{digest}{ext}"
    if final.exists():
        tmp_path.unlink(missing_ok=True)
    else:
        tmp_path.rename(final)
    return f"/api/files/{final.name}"

import httpx
from .config import settings
import mimetypes
import os

class UzbekVoiceService:
    BASE_URL = "https://uzbekvoice.ai/api/v1"
    
    @classmethod
    async def stt(cls, file_path: str, api_key: str = None, model: str = "general", language: str = "uz") -> dict:
        """
        Convert speech to text using uzbekvoice.ai
        """
        key = api_key or settings.UZBEKVOICE_API_KEY
        if not key:
            raise ValueError("UzbekVoice API kaliti kiritilmagan")
            
        url = f"{cls.BASE_URL}/stt"
        headers = {
            "Authorization": f"{key}"
        }
        
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = "audio/mpeg"  # Default to mp3/mpeg
            
        filename = os.path.basename(file_path)
        
        with open(file_path, "rb") as f:
            files = {
                "file": (filename, f, mime_type)
            }
            data = {
                "return_offsets": "false",
                "run_diarization": "false",
                "language": language,
                "model": model,
                "blocking": "true"
            }
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, headers=headers, data=data, files=files)
                response.raise_for_status()
                return response.json()

    @classmethod
    async def tts(cls, text: str, api_key: str = None, model: str = "shoira") -> bytes:
        """
        Convert text to speech using uzbekvoice.ai.
        Returns the raw audio binary data.

        uzbekvoice.ai "blocking": true doesn't always return the audio bytes
        immediately — it can return a JSON job object like:
            {"id": "tts/<uuid>/<uuid>", "status": "PROGRESS", ...}
        In that case we poll the job's own URL (BASE_URL + "/" + id) until
        it finishes and returns the actual audio.
        """
        key = api_key or settings.UZBEKVOICE_API_KEY
        if not key:
            raise ValueError("UzbekVoice API kaliti kiritilmagan")

        url = f"{cls.BASE_URL}/tts"
        headers = {
            "Authorization": f"{key}",
            "Content-Type": "application/json"
        }

        data = {
            "text": text,
            "model": model,
            "blocking": True
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, headers=headers, json=data)
            response.raise_for_status()

            content_type = response.headers.get("content-type", "")
            if "application/json" not in content_type:
                # Audio to'g'ridan-to'g'ri qaytdi
                return response.content

            job = response.json()
            audio = await cls._poll_job(client, job, {"Authorization": f"{key}"})
            if audio is not None:
                return audio
            raise RuntimeError(f"UzbekVoice TTS job yakunlanmadi: {job}")

    @classmethod
    async def _poll_job(cls, client: "httpx.AsyncClient", job: dict, headers: dict, max_tries: int = 40, delay: float = 1.5):
        """
        uzbekvoice.ai rasmiy 'Task polling' endpointi:
            GET /api/v1/tasks?id=<task_id>
            -> {"id": "...", "result": {...}, "state": "..."}
        (POST /tts javobida holat maydoni "status" deb, polling javobida esa
        "state" deb kelishi mumkin — ikkalasini ham tekshiramiz.)
        """
        job_id = job.get("id")
        if not job_id:
            return None

        def _state_of(j: dict) -> str:
            return str(j.get("state") or j.get("status") or "").upper()

        FAIL_STATES = {"FAILURE", "FAILED", "ERROR"}
        DONE_STATES = {"SUCCESS", "DONE", "COMPLETE", "COMPLETED", "FINISHED"}

        state = _state_of(job)
        tasks_url = f"{cls.BASE_URL}/tasks"

        for _ in range(max_tries):
            if state in DONE_STATES:
                break
            if state in FAIL_STATES:
                raise RuntimeError(f"UzbekVoice TTS job xato bilan tugadi: {job}")

            import asyncio
            await asyncio.sleep(delay)

            poll_resp = await client.get(tasks_url, params={"id": job_id}, headers=headers)
            poll_resp.raise_for_status()
            content_type = poll_resp.headers.get("content-type", "")
            if "application/json" not in content_type:
                return poll_resp.content

            job = poll_resp.json()
            state = _state_of(job)

        if state not in DONE_STATES:
            return None

        result = job.get("result") or {}

        # Natija to'g'ridan-to'g'ri audio URL yoki base64 bo'lishi mumkin
        for container in (result, job):
            for key_name in ("audio_url", "url", "result_url", "output_url"):
                result_url = container.get(key_name)
                if isinstance(result_url, str) and result_url:
                    dl = await client.get(result_url, headers=headers)
                    dl.raise_for_status()
                    return dl.content

        import base64
        for container in (result, job):
            for key_name in ("audio_base64", "audio", "data"):
                b64 = container.get(key_name)
                if isinstance(b64, str) and len(b64) > 100:
                    try:
                        return base64.b64decode(b64)
                    except Exception:
                        pass

        return None

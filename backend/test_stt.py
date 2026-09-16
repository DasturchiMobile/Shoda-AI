import asyncio
import httpx
import tempfile
import os

async def test():
    api_key = os.environ.get("UZBEKVOICE_API_KEY", "")
    
    fd, path = tempfile.mkstemp(suffix=".ogg")
    os.write(fd, b"fake audio data just for testing")
    os.close(fd)
    
    try:
        url = "https://uzbekvoice.ai/api/v1/stt"
        headers = {"Authorization": f"Bearer {api_key}"}
        with open(path, "rb") as f:
            files = {"file": ("test.ogg", f, "audio/ogg")}
            data = {"blocking": "true"}
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, headers=headers, data=data, files=files)
                print("STATUS:", resp.status_code)
                print("TEXT:", resp.text)
    finally:
        os.remove(path)

asyncio.run(test())

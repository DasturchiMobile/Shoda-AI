import asyncio
import httpx
import base64
import os

async def test():
    api_key = os.environ.get("UZBEKVOICE_API_KEY", "")
    encoded = base64.b64encode(api_key.encode('utf-8')).decode('utf-8')
    
    url = "https://uzbekvoice.ai/api/v1/tts"
    headers = {"Authorization": f"Basic {encoded}", "Content-Type": "application/json"}
    data = {"text": "Salom dunyo", "model": "shoira", "blocking": True}
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=data)
        print("STATUS:", resp.status_code)
        if resp.status_code != 200:
            print("TEXT:", resp.text)
        else:
            print("SUCCESS, audio bytes length:", len(resp.content))

asyncio.run(test())

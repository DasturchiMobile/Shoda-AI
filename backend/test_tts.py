import asyncio
import httpx
import os

async def test():
    api_key = os.environ.get("UZBEKVOICE_API_KEY", "")
    
    url = "https://uzbekvoice.ai/api/v1/tts"
    headers = {"Authorization": api_key.strip(), "Content-Type": "application/json"}
    data = {"text": "Salom dunyo", "model": "shoira", "blocking": True}
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=data)
        print("STATUS:", resp.status_code)
        if resp.status_code != 200:
            print("TEXT:", resp.text)
        else:
            print("SUCCESS, audio bytes received")

asyncio.run(test())

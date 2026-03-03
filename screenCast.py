import asyncio
import base64
import cv2
import numpy as np
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page(viewport={"width": 1280, "height": 720})
        await page.goto("https://example.com")

        # Create CDP session
        client = await page.context.new_cdp_session(page)

        # Enable Page domain
        await client.send("Page.enable")

        # Start screencast
        await client.send("Page.startScreencast", {
            "format": "jpeg",      # jpeg is faster than png
            "quality": 70,
            "maxWidth": 1280,
            "maxHeight": 720,
            "everyNthFrame": 1
        })

        async def handle_frame(params):
            # Decode base64 image
            img_bytes = base64.b64decode(params["data"])
            img_array = np.frombuffer(img_bytes, dtype=np.uint8)
            frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

            cv2.imshow("CDP Screencast", frame)

            # Acknowledge frame (IMPORTANT or stream stops)
            await client.send("Page.screencastFrameAck", {
                "sessionId": params["sessionId"]
            })

        client.on("Page.screencastFrame", handle_frame)

        # Keep event loop alive
        while True:
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
            await asyncio.sleep(0.01)

        cv2.destroyAllWindows()
        await browser.close()

asyncio.run(run())
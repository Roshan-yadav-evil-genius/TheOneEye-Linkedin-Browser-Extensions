import asyncio
import base64
import cv2
import numpy as np
from playwright.async_api import async_playwright

# Config: URLs to open (one tab per URL)
URLS = [
    "https://www.arduino.cc/",
    "https://www.google.com/",
]
VIEWPORT = {"width": 1280, "height": 720}
SCREENCAST_OPTS = {
    "format": "jpeg",
    "quality": 70,
    "maxWidth": 1280,
    "maxHeight": 720,
    "everyNthFrame": 1,
}
WINDOW_NAME = "CDP Screencast"


async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(viewport=VIEWPORT)

        pages = []
        for url in URLS:
            page = await context.new_page()
            await page.goto(url)
            pages.append(page)

        clients = []
        for page in pages:
            client = await context.new_cdp_session(page)
            await client.send("Page.enable")
            clients.append(client)

        active_index = 0
        current_client_ref = [clients[0]]
        active_index_ref = [0]

        async def start_screencast(client):
            await client.send("Page.startScreencast", SCREENCAST_OPTS)

        async def stop_screencast(client):
            await client.send("Page.stopScreencast")

        num_pages = len(pages)

        def make_handle_frame(client, active_ref, idx_ref):
            async def handle_frame(params):
                await client.send(
                    "Page.screencastFrameAck", {"sessionId": params["sessionId"]}
                )
                if client is not active_ref[0]:
                    return
                img_bytes = base64.b64decode(params["data"])
                img_array = np.frombuffer(img_bytes, dtype=np.uint8)
                frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                if frame is not None:
                    overlay = f"Tab {idx_ref[0] + 1}/{num_pages}"
                    cv2.putText(
                        frame,
                        overlay,
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 255, 0),
                        2,
                    )
                    cv2.imshow(WINDOW_NAME, frame)
            return handle_frame

        for client in clients:
            client.on(
                "Page.screencastFrame",
                make_handle_frame(client, current_client_ref, active_index_ref),
            )

        await start_screencast(clients[active_index])

        async def switch_to_page(new_index):
            nonlocal active_index
            await stop_screencast(clients[active_index])
            active_index = new_index
            active_index_ref[0] = active_index
            current_client_ref[0] = clients[active_index]
            await pages[active_index].bring_to_front()
            await start_screencast(clients[active_index])

        while True:
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if len(pages) > 1:
                if key == ord("n"):
                    new_index = (active_index + 1) % len(pages)
                    if new_index != active_index:
                        await switch_to_page(new_index)
                elif key == ord("p"):
                    new_index = (active_index - 1) % len(pages)
                    if new_index != active_index:
                        await switch_to_page(new_index)
                elif ord("1") <= key <= ord("9"):
                    idx = key - ord("1")
                    if idx < len(pages) and idx != active_index:
                        await switch_to_page(idx)
            await asyncio.sleep(0.01)

        await stop_screencast(clients[active_index])
        cv2.destroyAllWindows()
        await browser.close()


asyncio.run(run())
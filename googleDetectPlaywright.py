# async playwright script navigate to google.com and wait for close event timeout 0
import asyncio
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

STORAGE_STATE_PATH = "google_storage_state.json"

# https://source.chromium.org/
# https://peter.sh/experiments/chromium-command-line-switches/
# https://www.chrome-flags.com/

chromium_args_reason = {
    "--disable-blink-features=AutomationControlled":
        "Disables the Blink 'AutomationControlled' feature, preventing Chromium from setting navigator.webdriver=true and exposing WebDriver-related automation markers in the JavaScript runtime.",

    "--disable-background-timer-throttling":
        "Prevents Chromium from throttling JavaScript timers (setTimeout, setInterval, requestAnimationFrame) in background tabs, allowing normal timer execution frequency.",

    "--disable-backgrounding-occluded-windows":
        "Stops Chromium from marking occluded or minimized windows as backgrounded, preventing reduced resource allocation due to window visibility state.",

    "--disable-renderer-backgrounding":
        "Prevents lowering of renderer process CPU scheduling priority when a tab is in the background, keeping it at normal foreground priority.",

    "--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling,PageLifecycleFreeze":
        "Disables native window occlusion, intensive wake-up throttling, and Page Lifecycle freeze so background/occluded tabs are not throttled or frozen."
}

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=list(chromium_args_reason.keys()),
        )
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        await Stealth.apply_stealth_async(page_or_context=context)
        page = await context.new_page()
        await page.goto("https://accounts.google.com")
        email = "roshanyadavonwork@gmail.com"
        await page.fill("input[name='identifier']", email)
        await page.click("button:has-text('Next')")
        # Wait indefinitely until browser is closed manually
        await page.wait_for_timeout(5000)
        await page.screenshot(path="google.png")
        # Save the updated storage state
        await context.storage_state(path=STORAGE_STATE_PATH)
        await browser.close()


asyncio.run(main())

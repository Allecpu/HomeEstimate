"""
Test Playwright scraping standalone
"""
import asyncio
from playwright.async_api import async_playwright

async def test_fetch():
    url = "https://www.idealista.it/immobile/32970155/"
    print(f"Testing fetch of: {url}")

    async with async_playwright() as p:
        print("Launching browser...")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            locale='it-IT',
        )

        page = await context.new_page()

        print(f"Navigating to {url}...")
        await page.goto(url, wait_until='networkidle', timeout=30000)

        print("Getting page content...")
        html = await page.content()

        print(f"HTML length: {len(html)} characters")
        print("First 500 characters:")
        print(html[:500])

        await browser.close()
        print("✓ Success!")

if __name__ == "__main__":
    asyncio.run(test_fetch())

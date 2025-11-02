import asyncio
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path('backend/.env'))

from backend.app.valuation.photo_condition import analyze_photo_condition

async def main():
    photos = [
        str(Path('backend/storage/photos/www-idealista-it-immobile-26635525/photo_000.jpg').resolve()),
        str(Path('backend/storage/photos/www-idealista-it-immobile-26635525/photo_001.jpg').resolve()),
        str(Path('backend/storage/photos/www-idealista-it-immobile-26635525/photo_002.jpg').resolve())
    ]
    result = await analyze_photo_condition(photos)
    print(result)

asyncio.run(main())

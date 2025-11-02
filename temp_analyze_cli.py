import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path('backend').resolve()
sys.path.insert(0, str(backend_dir))
load_dotenv(backend_dir / '.env')

from app.valuation.photo_condition import analyze_photo_condition

async def main():
    photos = [
        str((backend_dir / 'storage' / 'photos' / 'www-idealista-it-immobile-33312678' / 'photo_000.jpg').resolve())
    ]
    result = await analyze_photo_condition(photos)
    print(result)

asyncio.run(main())

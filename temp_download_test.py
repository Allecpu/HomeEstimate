import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path('backend').resolve()
sys.path.insert(0, str(backend_dir))
load_dotenv(backend_dir / '.env')

from app.api.photo_analysis import download_photos_for_analysis

async def main():
    paths = await download_photos_for_analysis([
        'https://img4.idealista.it/blur/WEB_DETAIL_TOP-L-L/0/id.pro.it.image.master/64/00/56/719535099.jpg'
    ], listing_id='www-idealista-it-immobile-33312678', referer='https://www.idealista.it/immobile/33312678/')
    print(paths)

asyncio.run(main())

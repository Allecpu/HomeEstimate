import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path('backend').resolve()
sys.path.insert(0, str(backend_dir))
load_dotenv(backend_dir / '.env')

from app.api.photo_analysis import evaluate_photo_condition_with_download, PhotoAnalysisWithDownloadRequest

async def main():
    req = PhotoAnalysisWithDownloadRequest(
        photos=['https://www.schueco.com/resource/blob/3655256/e2245b3f0c7e3d524af98f70b2d729a7/4065a42-data.jpg'],
        listing_id='schueco-test',
        locale='it'
    )
    try:
        result = await evaluate_photo_condition_with_download(req)
        print('SUCCESS:', result)
    except Exception as exc:
        import traceback
        print('ERROR:', exc)
        traceback.print_exc()

asyncio.run(main())

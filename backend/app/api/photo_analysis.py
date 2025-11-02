import hashlib
import logging
from pathlib import Path
from typing import List, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl

from app.valuation.photo_condition import (
    PhotoConditionResult,
    PhotoConditionServiceError,
    analyze_photo_condition,
)

router = APIRouter()
logger = logging.getLogger(__name__)


class PhotoAnalysisRequest(BaseModel):
    photos: List[HttpUrl]
    locale: Optional[str] = "it"


class PhotoAnalysisWithDownloadRequest(BaseModel):
    photos: List[HttpUrl]
    listing_id: Optional[str] = None
    locale: Optional[str] = "it"


async def download_photos_for_analysis(photo_urls: List[str], listing_id: Optional[str] = None) -> List[str]:
    """
    Download photos from URLs to local storage for analysis.
    Returns list of local file paths.

    Args:
        photo_urls: List of photo URLs to download
        listing_id: Optional unique ID for this listing (will be generated if not provided)

    Returns:
        List of local file paths where photos were saved
    """
    # Create unique ID if not provided
    if not listing_id:
        listing_id = hashlib.md5(''.join(photo_urls).encode()).hexdigest()[:12]

    # Create photos directory if it doesn't exist
    photos_dir = Path("storage/photos") / listing_id
    photos_dir.mkdir(parents=True, exist_ok=True)

    local_paths = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for idx, photo_url in enumerate(photo_urls):
            try:
                # Download photo
                logger.info(f"Downloading photo {idx + 1}/{len(photo_urls)}: {photo_url}")
                response = await client.get(photo_url)
                response.raise_for_status()

                # Determine file extension from URL or content-type
                ext = 'jpg'
                if '.' in photo_url:
                    url_ext = photo_url.split('.')[-1].split('?')[0].lower()
                    if url_ext in ['jpg', 'jpeg', 'png', 'webp']:
                        ext = url_ext

                # Save to local file
                filename = f"photo_{idx:03d}.{ext}"
                filepath = photos_dir / filename

                with open(filepath, 'wb') as f:
                    f.write(response.content)

                local_paths.append(str(filepath))
                logger.info(f"Saved photo to: {filepath}")

            except Exception as e:
                logger.warning(f"Failed to download photo {photo_url}: {e}")
                continue

    return local_paths


@router.post("/photo-condition", response_model=PhotoConditionResult)
async def evaluate_photo_condition(request: PhotoAnalysisRequest) -> PhotoConditionResult:
    """
    Analyze photos directly from URLs (photos must be publicly accessible).
    """
    try:
        result = await analyze_photo_condition(
            [str(url) for url in request.photos],
            locale=request.locale or "it",
        )
    except PhotoConditionServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Nessuna foto valida fornita oppure analisi non disponibile.",
        )

    return result


@router.post("/photo-condition-with-download", response_model=PhotoConditionResult)
async def evaluate_photo_condition_with_download(request: PhotoAnalysisWithDownloadRequest) -> PhotoConditionResult:
    """
    Download photos locally first, then analyze them with OpenAI Vision API.
    Useful when photos are from sites that block direct API access.
    """
    if not request.photos:
        raise HTTPException(
            status_code=400,
            detail="Nessuna foto fornita.",
        )

    try:
        # Download photos locally
        logger.info(f"Downloading {len(request.photos)} photos...")
        local_paths = await download_photos_for_analysis(
            [str(url) for url in request.photos],
            listing_id=request.listing_id
        )

        if not local_paths:
            raise HTTPException(
                status_code=400,
                detail="Impossibile scaricare le foto. Verifica che gli URL siano validi.",
            )

        logger.info(f"Successfully downloaded {len(local_paths)} photos. Analyzing...")

        # Analyze downloaded photos (will be converted to base64)
        result = await analyze_photo_condition(
            local_paths,
            locale=request.locale or "it",
        )

    except PhotoConditionServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error during photo analysis with download")
        raise HTTPException(
            status_code=500,
            detail=f"Errore durante l'analisi delle foto: {str(exc)}"
        ) from exc

    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Analisi non disponibile. Verifica che OPENAI_API_KEY sia configurata.",
        )

    return result

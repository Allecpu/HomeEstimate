import base64
import binascii
import hashlib
import logging
import re
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
    referer: Optional[HttpUrl] = None
    locale: Optional[str] = "it"


class PhotoAnalysisBase64Request(BaseModel):
    photos: List[str]  # Base64 data URLs
    listing_id: Optional[str] = None
    locale: Optional[str] = "it"


class PhotoStorageUploadRequest(BaseModel):
    photos: List[str]  # Base64 data URLs
    listing_id: Optional[str] = None


class PhotoAnalysisFromStorageRequest(BaseModel):
    listing_id: str
    locale: Optional[str] = "it"


def _build_storage_identifier(raw_identifier: Optional[str], photo_urls: List[str]) -> str:
    base = (raw_identifier or '').strip()
    if base:
        slug = re.sub(r'[^a-zA-Z0-9_-]+', '-', base).strip('-').lower()
        if slug:
            base = slug[:64]
    if not base:
        base = hashlib.md5(''.join(photo_urls).encode()).hexdigest()[:12]
    return base


async def download_photos_for_analysis(photo_urls: List[str], listing_id: Optional[str] = None, referer: Optional[str] = None) -> List[str]:
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
    safe_listing_id = _build_storage_identifier(listing_id, photo_urls)

    # Create photos directory if it doesn't exist
    photos_dir = Path("storage/photos") / safe_listing_id
    photos_dir.mkdir(parents=True, exist_ok=True)

    local_paths = []

    default_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    }
    if referer:
        default_headers["Referer"] = str(referer)
    elif listing_id and str(listing_id).startswith("http"):
        default_headers["Referer"] = str(listing_id)

    async with httpx.AsyncClient(timeout=30.0, headers=default_headers) as client:
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


def _save_base64_photos(photo_data: List[str], listing_id: Optional[str] = None) -> tuple[str, List[str]]:
    if not photo_data:
        raise ValueError("Nessuna foto fornita.")

    safe_listing_id = _build_storage_identifier(listing_id, photo_data)
    photos_dir = Path("storage/photos") / safe_listing_id
    photos_dir.mkdir(parents=True, exist_ok=True)

    # Clean previous files to avoid stale photos
    for existing in photos_dir.glob("photo_*.*"):
        try:
            existing.unlink()
        except Exception as exc:  # noqa: BLE001
            logger.debug("Unable to remove existing photo %s: %s", existing, exc)

    mime_to_ext = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
    }

    saved_paths: List[str] = []

    for idx, item in enumerate(photo_data):
        if not item:
            continue

        if item.startswith("data:"):
            header, _, encoded = item.partition(",")
            mime_match = re.match(r"data:(.*?);base64", header, re.IGNORECASE)
            mime_type = mime_match.group(1).lower() if mime_match else "image/jpeg"
        else:
            encoded = item
            mime_type = "image/jpeg"

        try:
            binary = base64.b64decode(encoded, validate=True)
        except (binascii.Error, ValueError) as exc:
            logger.warning("Failed to decode base64 photo #%s: %s", idx, exc)
            continue

        if len(binary) < 256:
            logger.debug("Skipping photo #%s because decoded content seems invalid (size=%s bytes)", idx, len(binary))
            continue

        ext = mime_to_ext.get(mime_type, "jpg")
        filename = photos_dir / f"photo_{idx:03d}.{ext}"

        try:
            with open(filename, "wb") as file:
                file.write(binary)
        except OSError as exc:  # noqa: BLE001
            logger.warning("Unable to persist photo #%s to %s: %s", idx, filename, exc)
            continue

        saved_paths.append(str(filename))
        logger.info("Stored base64 photo #%s in %s", idx + 1, filename)

    if not saved_paths:
        raise ValueError("Impossibile salvare le foto fornite.")

    return safe_listing_id, saved_paths


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
            listing_id=request.listing_id,
            referer=str(request.referer) if request.referer else str(request.listing_id) if request.listing_id else None,
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


@router.post("/photo-condition-base64", response_model=PhotoConditionResult)
async def evaluate_photo_condition_base64(request: PhotoAnalysisBase64Request) -> PhotoConditionResult:
    """
    Analyze photos from base64 data URLs (from browser extension).
    Photos are already downloaded by the browser extension.
    """
    if not request.photos:
        raise HTTPException(
            status_code=400,
            detail="Nessuna foto fornita.",
        )

    try:
        logger.info(f"Analyzing {len(request.photos)} photos from base64...")

        # Pass base64 data URLs directly to analyze_photo_condition
        result = await analyze_photo_condition(
            request.photos,
            locale=request.locale or "it",
        )

    except PhotoConditionServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error during photo analysis from base64")
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


@router.post("/photo-storage/upload-base64")
async def upload_photo_storage_base64(request: PhotoStorageUploadRequest) -> dict:
    if not request.photos:
        raise HTTPException(
            status_code=400,
            detail="Nessuna foto fornita.",
        )

    try:
        listing_id, saved_paths = _save_base64_photos(request.photos, request.listing_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error while saving base64 photos")
        raise HTTPException(
            status_code=500,
            detail=f"Errore durante il salvataggio delle foto: {str(exc)}",
        ) from exc

    return {
        "listing_id": listing_id,
        "saved": len(saved_paths),
    }


@router.post("/photo-condition-from-storage", response_model=PhotoConditionResult)
async def evaluate_photo_condition_from_storage(request: PhotoAnalysisFromStorageRequest) -> PhotoConditionResult:
    safe_listing_id = _build_storage_identifier(request.listing_id, [])
    photos_dir = Path("storage/photos") / safe_listing_id

    if not photos_dir.exists() or not photos_dir.is_dir():
        raise HTTPException(
            status_code=404,
            detail="Nessuna foto trovata per questo annuncio.",
        )

    photo_paths = sorted(
        str(path)
        for path in photos_dir.iterdir()
        if path.is_file()
    )

    if not photo_paths:
        raise HTTPException(
            status_code=400,
            detail="Nessuna foto disponibile per l'analisi.",
        )

    try:
        result = await analyze_photo_condition(
            photo_paths,
            locale=request.locale or "it",
        )
    except PhotoConditionServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected error during photo analysis from storage")
        raise HTTPException(
            status_code=500,
            detail=f"Errore durante l'analisi delle foto archiviate: {str(exc)}"
        ) from exc

    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Analisi non disponibile. Verifica che OPENAI_API_KEY sia configurata.",
        )

    return result

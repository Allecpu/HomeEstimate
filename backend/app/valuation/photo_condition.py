import base64
import json
import logging
import os
from pathlib import Path
from typing import Iterable, List, Optional

import httpx
from pydantic import BaseModel, Field, HttpUrl, field_validator

logger = logging.getLogger(__name__)

PHOTO_CONDITION_LABELS = ("da_ristrutturare", "discreto", "buono", "ottimo")


class PhotoConditionPerPhoto(BaseModel):
    url: HttpUrl
    summary: str
    issues: Optional[str] = None


class PhotoConditionResult(BaseModel):
    label: str
    score: float
    confidence: float
    reasoning: str
    per_photo: List[PhotoConditionPerPhoto] = Field(default_factory=list)

    @field_validator("label")
    @classmethod
    def validate_label(cls, value: str) -> str:
        lowered = value.lower().strip()
        if lowered not in PHOTO_CONDITION_LABELS:
            raise ValueError(f"label must be one of {PHOTO_CONDITION_LABELS}")
        return lowered

    @field_validator("score")
    @classmethod
    def validate_score(cls, value: float) -> float:
        if value < 0 or value > 100:
            raise ValueError("score must be between 0 and 100")
        return float(value)

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, value: float) -> float:
        if value < 0 or value > 1:
            raise ValueError("confidence must be between 0 and 1")
        return float(value)


def _clean_json_text(raw: str) -> str:
    text = raw.strip()

    if text.startswith("```"):
        parts = text.split("```")
        for part in parts:
            candidate = part.strip()
            if candidate and not candidate.startswith(("{", "[")):
                continue
            if candidate:
                text = candidate
                break

    return text.strip()


def _encode_image_to_base64(image_path: str) -> str:
    """Encode a local image file to base64 string."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


def _get_image_mime_type(file_path: str) -> str:
    """Get MIME type from file extension."""
    ext = Path(file_path).suffix.lower()
    mime_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
    }
    return mime_types.get(ext, 'image/jpeg')


def _build_messages(photo_urls: Iterable[str], locale: str) -> List[dict]:
    description = (
        "Analizza le foto fornite di un immobile residenziale italiano. "
        "Classifica lo stato generale dell'appartamento scegliendo solo tra: "
        "'da_ristrutturare', 'discreto', 'buono', 'ottimo'. "
        "Includi una breve motivazione sfruttando finiture, impianti, infissi e qualita percepita. "
        "Se non vedi abbastanza ambienti interni spiega il limite."
    )

    schema_hint = (
        "Rispondi esclusivamente con JSON valido compatibile con questo schema:\n"
        "{\n"
        '  "condition_label": "da_ristrutturare | discreto | buono | ottimo",\n'
        '  "condition_score": number // 0-100, valore piu alto indica condizioni migliori,\n'
        '  "confidence": number // 0-1, stima della sicurezza,\n'
        '  "reasoning": string,\n'
        '  "per_photo": [\n'
        '    {\n'
        '      "url": string,\n'
        '      "summary": string,\n'
        '      "issues": string | null\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "Scrivi testo e motivazioni in italiano."
    )

    message_content = [
        {"type": "text", "text": f"{description}\n\n{schema_hint}"},
    ]
    for url in photo_urls:
        # Check if it's a local file path
        if url.startswith('file:///') or (os.path.exists(url) and Path(url).is_file()):
            # Convert file:/// URL to local path if needed
            file_path = url.replace('file:///', '') if url.startswith('file:///') else url
            file_path = file_path.replace('/', os.sep)  # Fix path separators

            try:
                # Encode image to base64
                base64_image = _encode_image_to_base64(file_path)
                mime_type = _get_image_mime_type(file_path)

                # Add as base64 data URL
                message_content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{base64_image}"
                    }
                })
                logger.debug(f"Encoded local image: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to encode local image {file_path}: {e}")
                continue
        else:
            # Regular HTTP/HTTPS URL
            message_content.append(
                {"type": "image_url", "image_url": {"url": url}}
            )

    return [
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": "Sei un valutatore immobiliare esperto di mercato italiano. "
                            "Segui sempre le istruzioni e restituisci JSON valido.",
                }
            ],
        },
        {"role": "user", "content": message_content},
    ]


class PhotoConditionServiceError(Exception):
    """Raised when the AI photo analysis cannot be completed."""


def _get_openai_api_key() -> Optional[str]:
    return os.getenv("OPENAI_API_KEY")


async def analyze_photo_condition(
    photo_urls: Iterable[str],
    *,
    locale: str = "it",
    timeout_seconds: float = 30.0,
) -> Optional[PhotoConditionResult]:
    urls = [url for url in photo_urls if url]
    if not urls:
        return None

    api_key = _get_openai_api_key()
    if not api_key:
        logger.info("OPENAI_API_KEY not configured; skipping photo condition analysis.")
        return None

    messages = _build_messages(urls[:8], locale)
    request_payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "temperature": 0.2,
        "max_completion_tokens": 600,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=request_payload,
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("HTTP error while contacting OpenAI for photo analysis: %s", exc)
        raise PhotoConditionServiceError("Errore nel contattare il servizio di analisi immagini.") from exc

    data = response.json()

    raw_content = data.get("choices", [{}])[0].get("message", {}).get("content")
    if raw_content is None:
        logger.warning("Unexpected OpenAI response structure: %s", data)
        raise PhotoConditionServiceError("Risposta inattesa dal servizio di analisi immagini.")

    if isinstance(raw_content, list):
        content_text = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in raw_content
        )
    else:
        content_text = str(raw_content)

    try:
        parsed = json.loads(_clean_json_text(content_text))
    except json.JSONDecodeError as exc:
        logger.warning("Failed to parse JSON from photo analysis response: %s", content_text)
        raise PhotoConditionServiceError("Formato risposta non valido dal servizio di analisi immagini.") from exc

    if "per_photo" not in parsed:
        parsed["per_photo"] = []

    per_photo: List[PhotoConditionPerPhoto] = []
    for item in parsed["per_photo"]:
        if not isinstance(item, dict):
            continue
        url = item.get("url")
        summary = item.get("summary") or item.get("description") or ""
        issues = item.get("issues")
        try:
            per_photo.append(PhotoConditionPerPhoto(url=url, summary=summary, issues=issues))
        except Exception as exc:
            logger.debug("Skipping photo entry due to validation error: %s", exc)

    try:
        result = PhotoConditionResult(
            label=parsed.get("condition_label", ""),
            score=float(parsed.get("condition_score", 0)),
            confidence=float(parsed.get("confidence", 0)),
            reasoning=parsed.get("reasoning", ""),
            per_photo=per_photo,
        )
    except Exception as exc:
        logger.warning("Failed to validate photo condition result: %s | parsed=%s", exc, parsed)
        raise PhotoConditionServiceError("Risultato analisi immagini non valido.") from exc

    return result

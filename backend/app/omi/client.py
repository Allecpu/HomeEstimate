"""Client per le API OMI (Osservatorio del Mercato Immobiliare)."""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional, Set, Tuple, Union

import httpx
from pydantic import BaseModel, Field

from app.omi.cadastral_codes import get_cadastral_code
from app.omi.property_types import PropertyType


logger = logging.getLogger(__name__)

PROPERTY_TYPE_VALUES = {prop_type.value for prop_type in PropertyType}


class OMIServiceError(RuntimeError):
    """Errore generato dal servizio di quotazioni OMI esterno."""


class OMIQuotation(BaseModel):
    """Quotazione OMI per un tipo di immobile in una zona."""

    zona_omi: str = Field(description="Codice zona OMI (es. B12, C1)")
    property_type: str = Field(description="Tipo di immobile")
    stato_conservazione: Optional[str] = Field(
        None,
        description="Stato di conservazione mediano: normale, ottimo, scadente"
    )
    prezzo_acquisto_min: Optional[float] = Field(None, description="Prezzo minimo acquisto in € totali")
    prezzo_acquisto_max: Optional[float] = Field(None, description="Prezzo massimo acquisto in € totali")
    prezzo_acquisto_medio: Optional[float] = Field(None, description="Prezzo medio acquisto in € totali")
    prezzo_affitto_min: Optional[float] = Field(None, description="Canone minimo affitto in € mensili")
    prezzo_affitto_max: Optional[float] = Field(None, description="Canone massimo affitto in € mensili")
    prezzo_affitto_medio: Optional[float] = Field(None, description="Canone medio affitto in € mensili")

    @property
    def prezzo_acquisto_mq_min(self) -> Optional[float]:
        """Calcola prezzo minimo al mq (assumendo 1 mq se non specificato)."""
        return self.prezzo_acquisto_min

    @property
    def prezzo_acquisto_mq_medio(self) -> Optional[float]:
        """Calcola prezzo medio al mq."""
        return self.prezzo_acquisto_medio

    @property
    def prezzo_acquisto_mq_max(self) -> Optional[float]:
        """Calcola prezzo massimo al mq."""
        return self.prezzo_acquisto_max


class OMIResponse(BaseModel):
    """Risposta completa dalle API OMI."""

    codice_comune: str
    comune: str
    metri_quadri: float
    zona_omi_filter: Optional[str] = None  # Filtro zona applicato
    quotations: List[OMIQuotation] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.now)
    zone_count: int = Field(default=0, description="Numero di zone OMI trovate")


class OMICache:
    """Cache semplice per ridurre le chiamate API."""

    def __init__(self, ttl_seconds: int = 3600):
        self._cache: Dict[str, tuple[OMIResponse, datetime]] = {}
        self._ttl = timedelta(seconds=ttl_seconds)

    def get(self, key: str) -> Optional[OMIResponse]:
        """Recupera un valore dalla cache se non scaduto."""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if datetime.now() - timestamp < self._ttl:
                return value
            else:
                del self._cache[key]
        return None

    def set(self, key: str, value: OMIResponse) -> None:
        """Salva un valore nella cache."""
        self._cache[key] = (value, datetime.now())

    def clear(self) -> None:
        """Pulisce la cache."""
        self._cache.clear()


class OMIClient:
    """Client per interrogare le API OMI."""

    BASE_URL = "https://3eurotools.it/api-quotazioni-immobiliari-omi/ricerca"

    def __init__(self, cache_ttl: int = 3600):
        """
        Inizializza il client OMI.

        Args:
            cache_ttl: Durata della cache in secondi (default: 1 ora)
        """
        self._cache = OMICache(ttl_seconds=cache_ttl)
        self._client: Optional[httpx.AsyncClient] = None
        self._rate_limit_delay = 3.0  # secondi tra le richieste
        self._last_request_time: Optional[datetime] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Ottiene o crea il client HTTP."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def _wait_for_rate_limit(self) -> None:
        """Attende per rispettare il rate limiting."""
        if self._last_request_time:
            elapsed = (datetime.now() - self._last_request_time).total_seconds()
            if elapsed < self._rate_limit_delay:
                await asyncio.sleep(self._rate_limit_delay - elapsed)
        self._last_request_time = datetime.now()

    def _generate_cache_key(
        self,
        codice_comune: str,
        metri_quadri: float,
        operazione: Optional[str],
        zona_omi: Optional[str],
        tipo_immobile: Optional[PropertyType],
    ) -> str:
        """Genera una chiave univoca per la cache."""
        parts = [
            codice_comune,
            str(metri_quadri),
            operazione or "all",
            zona_omi or "all",
            tipo_immobile.value if tipo_immobile else "all",
        ]
        return "|".join(parts)

    def _extract_data_container(self, payload: Union[Dict, List]) -> Union[Dict, List]:
        """Estrae la sezione dati dalla risposta gestendo vari wrapper."""

        current: Union[Dict, List, None] = payload
        while isinstance(current, dict):
            # Verifica errori espliciti nella risposta
            if current.get("success") is False:
                message = (
                    current.get("message")
                    or current.get("detail")
                    or current.get("error")
                    or "Servizio OMI ha restituito un errore"
                )
                raise OMIServiceError(str(message))

            for key in ("error", "errors"):
                if key in current and current[key]:
                    raise OMIServiceError(str(current[key]))

            # Naviga nei wrapper comuni
            for key in ("data", "result", "results", "payload", "response"):
                nested = current.get(key)
                if isinstance(nested, (dict, list)):
                    current = nested
                    break
            else:
                return current

        if current is None:
            raise OMIServiceError("Risposta vuota dal servizio OMI")

        return current

    def _extract_error_message(self, response: httpx.Response) -> Optional[str]:
        """Estrae un messaggio d'errore significativo dalla risposta HTTP."""

        text_snippet: Optional[str] = None
        try:
            data = response.json()
        except ValueError:
            text_snippet = response.text.strip()
        else:
            if isinstance(data, dict):
                for key in ("detail", "message", "error", "errors", "reason"):
                    value = data.get(key)
                    if value:
                        return str(value)
            text_snippet = response.text.strip()

        return text_snippet[:200] if text_snippet else None

    @staticmethod
    def _to_float(value: Union[str, int, float, None]) -> Optional[float]:
        """Converte un valore numerico generico in float."""

        if value is None:
            return None

        if isinstance(value, (int, float)):
            try:
                return float(value)
            except (TypeError, ValueError):
                return None

        if isinstance(value, str):
            cleaned = value.replace(".", "").replace(",", ".").strip()
            if not cleaned:
                return None
            try:
                return float(cleaned)
            except ValueError:
                return None

        return None

    @staticmethod
    def _normalise_property_type(raw_value: Optional[str], fallback: Optional[str] = None) -> Optional[str]:
        """Normalizza il valore del tipo immobile in snake_case."""

        if not raw_value:
            return fallback

        candidate = raw_value.strip()
        if not candidate:
            return fallback

        slug = candidate.lower().replace(" ", "_")
        if slug in PROPERTY_TYPE_VALUES:
            return slug

        # Alcune risposte usano maiuscole/misti o includono caratteri extra
        slug = "".join(ch if ch.isalnum() else "_" for ch in candidate).lower()
        while "__" in slug:
            slug = slug.replace("__", "_")
        slug = slug.strip("_")
        return slug or fallback

    def _parse_price_block(self, block: Dict[str, Union[str, int, float, Dict]]) -> Dict[str, Optional[float]]:
        """Estrae valori min/medio/max da un blocco di prezzo annidato."""

        target = block
        for key in ("values", "value", "range", "dati"):
            nested = target.get(key)
            if isinstance(nested, dict):
                target = nested
                break

        return {
            "min": self._to_float(
                target.get("min")
                or target.get("minimo")
                or target.get("minimum")
                or target.get("prezzo_min")
                or target.get("valore_min")
            ),
            "max": self._to_float(
                target.get("max")
                or target.get("massimo")
                or target.get("maximum")
                or target.get("prezzo_max")
                or target.get("valore_max")
            ),
            "medio": self._to_float(
                target.get("medio")
                or target.get("mediano")
                or target.get("mean")
                or target.get("media")
                or target.get("valore_medio")
            ),
        }

    def _extract_price_fields(self, payload: Dict[str, object]) -> Optional[Dict[str, Optional[float]]]:
        """Identifica i campi di prezzo all'interno di un dizionario."""

        price_data: Dict[str, Optional[float]] = {}
        has_values = False

        direct_fields = {
            "prezzo_acquisto_min": "prezzo_acquisto_min",
            "prezzo_acquisto_max": "prezzo_acquisto_max",
            "prezzo_acquisto_medio": "prezzo_acquisto_medio",
            "prezzo_affitto_min": "prezzo_affitto_min",
            "prezzo_affitto_max": "prezzo_affitto_max",
            "prezzo_affitto_medio": "prezzo_affitto_medio",
        }

        for key, output_key in direct_fields.items():
            if key in payload and payload[key] is not None:
                price_data[output_key] = self._to_float(payload[key])
                has_values = True

        def first_dict(keys: Iterable[str]) -> Optional[Dict]:
            for key in keys:
                value = payload.get(key)
                if isinstance(value, dict):
                    return value
            return None

        if not has_values:
            acquisto_block = first_dict(
                (
                    "prezzo_acquisto",
                    "prezzoAcquisto",
                    "acquisto",
                    "vendita",
                    "purchase",
                    "compravenita",
                )
            )
            if acquisto_block:
                block_values = self._parse_price_block(acquisto_block)
                price_data["prezzo_acquisto_min"] = block_values.get("min")
                price_data["prezzo_acquisto_max"] = block_values.get("max")
                price_data["prezzo_acquisto_medio"] = block_values.get("medio")
                has_values = has_values or any(block_values.values())

        affitto_block = first_dict(("prezzo_affitto", "affitto", "locazione", "rent", "rental"))
        if affitto_block:
            block_values = self._parse_price_block(affitto_block)
            price_data["prezzo_affitto_min"] = block_values.get("min")
            price_data["prezzo_affitto_max"] = block_values.get("max")
            price_data["prezzo_affitto_medio"] = block_values.get("medio")
            has_values = True if any(block_values.values()) else has_values

        if not has_values:
            prezzo_block = first_dict(("prezzo", "prices", "valori"))
            if prezzo_block:
                acquisto = None
                affitto = None
                if isinstance(prezzo_block, dict):
                    acquisto = prezzo_block.get("acquisto") or prezzo_block.get("vendita") or prezzo_block.get("purchase")
                    affitto = prezzo_block.get("affitto") or prezzo_block.get("locazione") or prezzo_block.get("rental")

                if isinstance(acquisto, dict):
                    block_values = self._parse_price_block(acquisto)
                    price_data["prezzo_acquisto_min"] = block_values.get("min")
                    price_data["prezzo_acquisto_max"] = block_values.get("max")
                    price_data["prezzo_acquisto_medio"] = block_values.get("medio")
                    has_values = has_values or any(block_values.values())

                if isinstance(affitto, dict):
                    block_values = self._parse_price_block(affitto)
                    price_data["prezzo_affitto_min"] = block_values.get("min")
                    price_data["prezzo_affitto_max"] = block_values.get("max")
                    price_data["prezzo_affitto_medio"] = block_values.get("medio")
                    has_values = True if any(block_values.values()) else has_values

        if not has_values:
            return None

        price_data["stato"] = (
            payload.get("stato_di_conservazione_mediano_della_zona")
            or payload.get("stato_di_conservazione")
            or payload.get("stato_conservazione")
            or payload.get("conservazione")
            or payload.get("condition")
            or payload.get("stato")
        )
        return price_data

    def _collect_quotations(
        self,
        payload: Union[Dict, List],
        zona_omi_filter: Optional[str],
        tipo_immobile_filter: Optional[PropertyType],
    ) -> Tuple[List[OMIQuotation], Set[str]]:
        """Estrae le quotazioni dalla struttura JSON dell'API."""

        quotations: List[OMIQuotation] = []
        zones_found: Set[str] = set()
        visited: Set[int] = set()

        def visit(node: Union[Dict, List, str, int, float, None], zone: Optional[str], prop_type: Optional[str]) -> None:
            if node is None or isinstance(node, (str, int, float)):
                return

            node_id = id(node)
            if node_id in visited:
                return
            visited.add(node_id)

            current_zone = zone
            current_type = prop_type

            if isinstance(node, dict):
                for key in ("zona_omi", "zona", "zonaOMI", "zonaOmi", "zone", "codice_zona", "codiceZona"):
                    value = node.get(key)
                    if isinstance(value, str) and value.strip():
                        current_zone = value.strip()
                        break

                for key in ("property_type", "tipo", "categoria", "category", "destinazione"):
                    value = node.get(key)
                    if isinstance(value, str) and value.strip():
                        current_type = self._normalise_property_type(value, current_type)
                        break

                price_fields = self._extract_price_fields(node)
                if price_fields and current_zone:
                    zones_found.add(current_zone)
                    normalized_type = self._normalise_property_type(current_type, current_type)
                    quotation = OMIQuotation(
                        zona_omi=current_zone,
                        property_type=normalized_type or "sconosciuto",
                        stato_conservazione=price_fields.get("stato"),
                        prezzo_acquisto_min=price_fields.get("prezzo_acquisto_min"),
                        prezzo_acquisto_max=price_fields.get("prezzo_acquisto_max"),
                        prezzo_acquisto_medio=price_fields.get("prezzo_acquisto_medio"),
                        prezzo_affitto_min=price_fields.get("prezzo_affitto_min"),
                        prezzo_affitto_max=price_fields.get("prezzo_affitto_max"),
                        prezzo_affitto_medio=price_fields.get("prezzo_affitto_medio"),
                    )
                    quotations.append(quotation)

                for key, value in node.items():
                    if key in {
                        "zona_omi",
                        "zona",
                        "zonaOMI",
                        "zonaOmi",
                        "zone",
                        "codice_zona",
                        "codiceZona",
                        "property_type",
                        "tipo",
                        "categoria",
                        "category",
                        "destinazione",
                    }:
                        continue
                    visit(value, current_zone, current_type)

            elif isinstance(node, list):
                for item in node:
                    visit(item, current_zone, current_type)

        visit(payload, None, None)

        if zona_omi_filter:
            quotations = [q for q in quotations if q.zona_omi == zona_omi_filter]
        if tipo_immobile_filter:
            quotations = [q for q in quotations if q.property_type == tipo_immobile_filter.value]

        return quotations, zones_found

    def _parse_api_response(
        self,
        data: Union[Dict, List],
        codice_comune: str,
        comune: str,
        metri_quadri: float,
        zona_omi_filter: Optional[str],
        tipo_immobile_filter: Optional[PropertyType],
    ) -> OMIResponse:
        """Parsa la risposta API in un oggetto ``OMIResponse``."""

        cleaned_payload = self._extract_data_container(data)
        quotations, zones_found = self._collect_quotations(
            cleaned_payload, zona_omi_filter, tipo_immobile_filter
        )

        return OMIResponse(
            codice_comune=codice_comune,
            comune=comune,
            metri_quadri=metri_quadri,
            zona_omi_filter=zona_omi_filter,
            quotations=quotations,
            zone_count=len(zones_found) if zones_found else len({q.zona_omi for q in quotations}),
        )

    async def query(
        self,
        city: str,
        metri_quadri: float = 1.0,
        operazione: Optional[str] = None,
        zona_omi: Optional[str] = None,
        tipo_immobile: Optional[PropertyType] = None,
        use_cache: bool = True,
    ) -> OMIResponse:
        """
        Interroga le API OMI per ottenere le quotazioni immobiliari.

        Args:
            city: Nome del comune italiano
            metri_quadri: Metri quadri commerciali (default: 1 per ottenere prezzi al mq)
            operazione: "acquisto", "affitto" o None per entrambi
            zona_omi: Zona OMI specifica (opzionale)
            tipo_immobile: Tipo di immobile (opzionale)
            use_cache: Usa la cache se disponibile

        Returns:
            OMIResponse con le quotazioni

        Raises:
            ValueError: Se il comune non è trovato
            OMIServiceError: Se il servizio OMI restituisce un errore
        """
        codice_comune = get_cadastral_code(city)
        if not codice_comune:
            raise ValueError(f"Codice catastale non trovato per il comune: {city}")

        # Controlla la cache
        if use_cache:
            cache_key = self._generate_cache_key(
                codice_comune, metri_quadri, operazione, zona_omi, tipo_immobile
            )
            cached = self._cache.get(cache_key)
            if cached:
                return cached

        # Prepara i parametri della richiesta
        params = {
            "codice_comune": codice_comune,
            "metri_quadri": metri_quadri,
        }

        if operazione:
            params["operazione"] = operazione
        if zona_omi:
            params["zona_omi"] = zona_omi
        if tipo_immobile:
            params["tipo_immobile"] = tipo_immobile.value

        try:
            # Rispetta il rate limiting
            await self._wait_for_rate_limit()

            client = await self._get_client()
            response = await client.get(self.BASE_URL, params=params)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            message = self._extract_error_message(exc.response)
            logger.warning(
                "Errore HTTP dal servizio OMI (%s): %s",
                exc.response.status_code,
                message,
            )
            raise OMIServiceError(
                message or f"Errore HTTP {exc.response.status_code} dal servizio OMI"
            ) from exc
        except httpx.HTTPError as exc:
            logger.warning("Errore di rete verso il servizio OMI: %s", exc)
            raise OMIServiceError(str(exc)) from exc

        try:
            data = response.json()
        except ValueError as exc:
            text = response.text.strip()
            logger.error("Risposta non valida dal servizio OMI: %s", text[:200])
            raise OMIServiceError("Risposta non valida dal servizio OMI") from exc

        omi_response = self._parse_api_response(
            data=data,
            codice_comune=codice_comune,
            comune=city.title(),
            metri_quadri=metri_quadri,
            zona_omi_filter=zona_omi,
            tipo_immobile_filter=tipo_immobile,
        )

        if not omi_response.quotations:
            raise OMIServiceError(
                "Nessuna quotazione disponibile per i parametri richiesti"
            )

        if use_cache:
            self._cache.set(cache_key, omi_response)

        return omi_response

    async def get_purchase_price(
        self,
        city: str,
        metri_quadri: float,
        tipo_immobile: Optional[PropertyType] = None,
        zona_omi: Optional[str] = None,
    ) -> Optional[Dict[str, float]]:
        """
        Ottiene i prezzi di acquisto per un immobile.

        Args:
            city: Nome del comune
            metri_quadri: Metri quadri
            tipo_immobile: Tipo di immobile (opzionale)
            zona_omi: Zona OMI (opzionale)

        Returns:
            Dict con min, max, medio in €/mq o None
        """
        # Richiedi con 1 mq per ottenere prezzi al mq
        response = await self.query(
            city=city,
            metri_quadri=1.0,
            operazione="acquisto",
            zona_omi=zona_omi,
            tipo_immobile=tipo_immobile,
        )

        if not response.quotations:
            raise OMIServiceError(
                "Quotazioni di acquisto non disponibili per i parametri indicati"
            )

        # Cerca la quotazione per il tipo richiesto o prendi la prima disponibile
        quotation = response.quotations[0]
        if tipo_immobile:
            for q in response.quotations:
                if q.property_type == tipo_immobile.value:
                    quotation = q
                    break

        if not any(
            (
                quotation.prezzo_acquisto_min,
                quotation.prezzo_acquisto_medio,
                quotation.prezzo_acquisto_max,
            )
        ):
            raise OMIServiceError(
                "Il servizio OMI non ha restituito valori di acquisto per i parametri indicati"
            )

        # Converti in prezzi al mq totali per i metri quadri richiesti
        return {
            "min": (quotation.prezzo_acquisto_min or 0) * metri_quadri,
            "max": (quotation.prezzo_acquisto_max or 0) * metri_quadri,
            "medio": (quotation.prezzo_acquisto_medio or 0) * metri_quadri,
            "min_mq": quotation.prezzo_acquisto_min or 0,
            "max_mq": quotation.prezzo_acquisto_max or 0,
            "medio_mq": quotation.prezzo_acquisto_medio or 0,
        }

    async def get_rental_price(
        self,
        city: str,
        metri_quadri: float,
        tipo_immobile: Optional[PropertyType] = None,
        zona_omi: Optional[str] = None,
    ) -> Optional[Dict[str, float]]:
        """
        Ottiene i prezzi di affitto per un immobile.

        Args:
            city: Nome del comune
            metri_quadri: Metri quadri
            tipo_immobile: Tipo di immobile (opzionale)
            zona_omi: Zona OMI (opzionale)

        Returns:
            Dict con min, max, medio in €/mq/mese o None
        """
        # Richiedi con 1 mq per ottenere prezzi al mq
        response = await self.query(
            city=city,
            metri_quadri=1.0,
            operazione="affitto",
            zona_omi=zona_omi,
            tipo_immobile=tipo_immobile,
        )

        if not response.quotations:
            raise OMIServiceError(
                "Quotazioni di affitto non disponibili per i parametri indicati"
            )

        # Cerca la quotazione per il tipo richiesto o prendi la prima disponibile
        quotation = response.quotations[0]
        if tipo_immobile:
            for q in response.quotations:
                if q.property_type == tipo_immobile.value:
                    quotation = q
                    break

        if not any(
            (
                quotation.prezzo_affitto_min,
                quotation.prezzo_affitto_medio,
                quotation.prezzo_affitto_max,
            )
        ):
            raise OMIServiceError(
                "Il servizio OMI non ha restituito valori di affitto per i parametri indicati"
            )

        # Converti in canoni mensili totali per i metri quadri richiesti
        return {
            "min": (quotation.prezzo_affitto_min or 0) * metri_quadri,
            "max": (quotation.prezzo_affitto_max or 0) * metri_quadri,
            "medio": (quotation.prezzo_affitto_medio or 0) * metri_quadri,
            "min_mq": quotation.prezzo_affitto_min or 0,
            "max_mq": quotation.prezzo_affitto_max or 0,
            "medio_mq": quotation.prezzo_affitto_medio or 0,
        }

    async def close(self) -> None:
        """Chiude il client HTTP."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self):
        """Context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        await self.close()


# Istanza singleton del client
_omi_client: Optional[OMIClient] = None


def get_omi_client() -> OMIClient:
    """
    Ottiene l'istanza singleton del client OMI.

    Returns:
        Istanza del client OMI
    """
    global _omi_client
    if _omi_client is None:
        _omi_client = OMIClient()
    return _omi_client

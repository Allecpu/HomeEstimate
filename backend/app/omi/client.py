"""
Client per le API OMI (Osservatorio del Mercato Immobiliare).
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import httpx
from pydantic import BaseModel, Field

from app.omi.cadastral_codes import get_cadastral_code
from app.omi.property_types import PropertyType


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

    def _parse_api_response(
        self,
        data: Dict,
        codice_comune: str,
        comune: str,
        metri_quadri: float,
        zona_omi_filter: Optional[str],
        tipo_immobile_filter: Optional[PropertyType],
    ) -> OMIResponse:
        """
        Parsa la risposta API nel formato corretto.

        La struttura dell'API è:
        {
            "B12": {
                "abitazioni_civili": {...},
                "negozi": {...},
                ...
            },
            "B13": {...},
            ...
        }
        """
        quotations = []

        for zona_code, zone_data in data.items():
            # Se è specificato un filtro zona, salta le altre zone
            if zona_omi_filter and zona_code != zona_omi_filter:
                continue

            if isinstance(zone_data, dict):
                for prop_type, prop_data in zone_data.items():
                    # Se è specificato un filtro tipo, salta gli altri tipi
                    if tipo_immobile_filter and prop_type != tipo_immobile_filter.value:
                        continue

                    if isinstance(prop_data, dict):
                        quotation = OMIQuotation(
                            zona_omi=zona_code,
                            property_type=prop_type,
                            stato_conservazione=prop_data.get("stato_di_conservazione_mediano_della_zona"),
                            prezzo_acquisto_min=prop_data.get("prezzo_acquisto_min"),
                            prezzo_acquisto_max=prop_data.get("prezzo_acquisto_max"),
                            prezzo_acquisto_medio=prop_data.get("prezzo_acquisto_medio"),
                            prezzo_affitto_min=prop_data.get("prezzo_affitto_min"),
                            prezzo_affitto_max=prop_data.get("prezzo_affitto_max"),
                            prezzo_affitto_medio=prop_data.get("prezzo_affitto_medio"),
                        )
                        quotations.append(quotation)

        return OMIResponse(
            codice_comune=codice_comune,
            comune=comune,
            metri_quadri=metri_quadri,
            zona_omi_filter=zona_omi_filter,
            quotations=quotations,
            zone_count=len(data),
        )

    async def query(
        self,
        city: str,
        metri_quadri: float = 1.0,
        operazione: Optional[str] = None,
        zona_omi: Optional[str] = None,
        tipo_immobile: Optional[PropertyType] = None,
        use_cache: bool = True,
    ) -> Optional[OMIResponse]:
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
            OMIResponse con le quotazioni o None se errore

        Raises:
            ValueError: Se il comune non è trovato
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

            # Esegui la richiesta
            client = await self._get_client()
            response = await client.get(self.BASE_URL, params=params)
            response.raise_for_status()

            # Parsa la risposta
            data = response.json()

            # Crea la risposta parsata
            omi_response = self._parse_api_response(
                data=data,
                codice_comune=codice_comune,
                comune=city.title(),
                metri_quadri=metri_quadri,
                zona_omi_filter=zona_omi,
                tipo_immobile_filter=tipo_immobile,
            )

            # Salva in cache
            if use_cache:
                self._cache.set(cache_key, omi_response)

            return omi_response

        except httpx.HTTPError as e:
            print(f"Errore HTTP durante la richiesta OMI: {e}")
            return None
        except Exception as e:
            print(f"Errore imprevisto durante la richiesta OMI: {e}")
            return None

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

        if not response or not response.quotations:
            return None

        # Cerca la quotazione per il tipo richiesto o prendi la prima disponibile
        quotation = response.quotations[0]
        if tipo_immobile:
            for q in response.quotations:
                if q.property_type == tipo_immobile.value:
                    quotation = q
                    break

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

        if not response or not response.quotations:
            return None

        # Cerca la quotazione per il tipo richiesto o prendi la prima disponibile
        quotation = response.quotations[0]
        if tipo_immobile:
            for q in response.quotations:
                if q.property_type == tipo_immobile.value:
                    quotation = q
                    break

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

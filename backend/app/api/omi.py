"""
API endpoints per l'interrogazione diretta dei dati OMI.
"""

from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.omi import (
    OMIQuotation,
    OMIResponse,
    PropertyType,
    get_all_cities,
    get_cadastral_code,
    get_omi_client,
    get_property_type,
    get_property_type_display_name,
)

router = APIRouter()


class OMIQueryRequest(BaseModel):
    """Richiesta per interrogare le API OMI."""

    city: str = Field(..., description="Nome del comune italiano")
    metri_quadri: float = Field(default=1.0, ge=1, description="Metri quadri commerciali")
    operazione: Optional[str] = Field(
        None,
        description="Tipo operazione: 'acquisto', 'affitto', o null per entrambi"
    )
    zona_omi: Optional[str] = Field(None, description="Zona OMI specifica (es. B1, C2)")
    tipo_immobile: Optional[str] = Field(
        None,
        description="Tipo di immobile (es. 'appartamento', 'villa', 'negozio')"
    )


class PropertyTypeInfo(BaseModel):
    """Informazioni su un tipo di immobile."""

    value: str
    display_name: str


class CadastralCodeInfo(BaseModel):
    """Informazioni codice catastale."""

    city: str
    code: str


@router.post("/query", response_model=OMIResponse)
async def query_omi(request: OMIQueryRequest):
    """
    Interroga direttamente le API OMI per ottenere quotazioni immobiliari.

    Args:
        request: Parametri della query OMI

    Returns:
        Dati OMI completi con tutte le quotazioni disponibili

    Raises:
        HTTPException: Se il comune non è trovato o si verifica un errore
    """
    omi_client = get_omi_client()

    # Valida l'operazione se specificata
    if request.operazione and request.operazione not in ["acquisto", "affitto"]:
        raise HTTPException(
            status_code=400,
            detail="Operazione non valida. Usa 'acquisto', 'affitto' o null."
        )

    # Converti il tipo di immobile se specificato
    property_type = None
    if request.tipo_immobile:
        property_type = get_property_type(request.tipo_immobile)

    try:
        # Esegui la query
        response = await omi_client.query(
            city=request.city,
            metri_quadri=request.metri_quadri,
            operazione=request.operazione,
            zona_omi=request.zona_omi,
            tipo_immobile=property_type,
        )

        if not response:
            raise HTTPException(
                status_code=404,
                detail=f"Dati OMI non trovati per il comune: {request.city}"
            )

        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Errore durante la query OMI: {str(e)}"
        )


@router.get("/purchase-price")
async def get_purchase_price(
    city: str = Query(..., description="Nome del comune"),
    metri_quadri: float = Query(..., ge=1, description="Metri quadri"),
    tipo_immobile: Optional[str] = Query(None, description="Tipo di immobile"),
    zona_omi: Optional[str] = Query(None, description="Zona OMI"),
) -> Dict[str, float]:
    """
    Ottiene i prezzi di acquisto (min, max, medio) per un immobile.

    Args:
        city: Nome del comune
        metri_quadri: Metri quadri
        tipo_immobile: Tipo di immobile (opzionale)
        zona_omi: Zona OMI (opzionale)

    Returns:
        Dizionario con min, max, medio in €/mq
    """
    omi_client = get_omi_client()

    property_type = None
    if tipo_immobile:
        property_type = get_property_type(tipo_immobile)

    try:
        prices = await omi_client.get_purchase_price(
            city=city,
            metri_quadri=metri_quadri,
            tipo_immobile=property_type,
            zona_omi=zona_omi,
        )

        if not prices:
            raise HTTPException(
                status_code=404,
                detail=f"Prezzi di acquisto non trovati per {city}"
            )

        return prices

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Errore: {str(e)}"
        )


@router.get("/rental-price")
async def get_rental_price(
    city: str = Query(..., description="Nome del comune"),
    metri_quadri: float = Query(..., ge=1, description="Metri quadri"),
    tipo_immobile: Optional[str] = Query(None, description="Tipo di immobile"),
    zona_omi: Optional[str] = Query(None, description="Zona OMI"),
) -> Dict[str, float]:
    """
    Ottiene i prezzi di affitto (min, max, medio) per un immobile.

    Args:
        city: Nome del comune
        metri_quadri: Metri quadri
        tipo_immobile: Tipo di immobile (opzionale)
        zona_omi: Zona OMI (opzionale)

    Returns:
        Dizionario con min, max, medio in €/mq/mese
    """
    omi_client = get_omi_client()

    property_type = None
    if tipo_immobile:
        property_type = get_property_type(tipo_immobile)

    try:
        prices = await omi_client.get_rental_price(
            city=city,
            metri_quadri=metri_quadri,
            tipo_immobile=property_type,
            zona_omi=zona_omi,
        )

        if not prices:
            raise HTTPException(
                status_code=404,
                detail=f"Prezzi di affitto non trovati per {city}"
            )

        return prices

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Errore: {str(e)}"
        )


@router.get("/property-types", response_model=List[PropertyTypeInfo])
async def get_property_types():
    """
    Restituisce tutti i tipi di immobile supportati dalle API OMI.

    Returns:
        Lista di tipi di immobile con valori e nomi visualizzabili
    """
    types = []
    for prop_type in PropertyType:
        types.append(
            PropertyTypeInfo(
                value=prop_type.value,
                display_name=get_property_type_display_name(prop_type)
            )
        )
    return types


@router.get("/cadastral-code")
async def get_city_cadastral_code(city: str = Query(..., description="Nome del comune")):
    """
    Ottiene il codice catastale di un comune italiano.

    Args:
        city: Nome del comune

    Returns:
        Codice catastale del comune

    Raises:
        HTTPException: Se il comune non è trovato
    """
    code = get_cadastral_code(city)
    if not code:
        raise HTTPException(
            status_code=404,
            detail=f"Codice catastale non trovato per il comune: {city}"
        )

    return {"city": city.title(), "code": code}


@router.get("/cities", response_model=List[CadastralCodeInfo])
async def get_supported_cities():
    """
    Restituisce tutti i comuni supportati con i loro codici catastali.

    Returns:
        Lista di comuni con codici catastali
    """
    cities = get_all_cities()
    return [
        CadastralCodeInfo(city=city.title(), code=code)
        for city, code in sorted(cities.items())
    ]


@router.get("/health")
async def health():
    """Health check per il servizio OMI."""
    return {
        "status": "healthy",
        "service": "omi",
        "api_endpoint": "https://3eurotools.it/api-quotazioni-immobiliari-omi/ricerca"
    }

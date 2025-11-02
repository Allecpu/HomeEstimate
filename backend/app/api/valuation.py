from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.omi import get_omi_client, PropertyType, get_property_type

router = APIRouter()

OMI_FONTE_URL = "https://www.agenziaentrate.gov.it/portale/omi"


def _normalize(text: Optional[str]) -> str:
    return text.strip().lower() if text else ""


def _city_base_price(city: Optional[str], province: Optional[str]) -> float:
    city_prices = {
        "milano": 4700,
        "roma": 4200,
        "napoli": 3200,
        "torino": 2600,
        "bologna": 3400,
        "firenze": 3800,
        "genova": 2300,
        "palermo": 2100,
        "bari": 2300,
        "verona": 2900,
        "brescia": 2400,
        "bergamo": 2500,
        "como": 3100,
        "monza": 3000,
        "lesa": 2800,
    }

    province_prices = {
        "mi": 3600,
        "rm": 3400,
        "na": 2500,
        "to": 2200,
        "bg": 2000,
        "va": 2400,
        "no": 2200,
        "vb": 2100,
    }

    default_price = 2200

    city_key = _normalize(city)
    if city_key in city_prices:
        return city_prices[city_key]

    province_key = _normalize(province)
    if province_key in province_prices:
        return province_prices[province_key]

    return default_price


def _adjust_price_per_sqm(property_data: "PropertyInput") -> float:
    base_price = _city_base_price(property_data.city, property_data.province)
    surface = max(property_data.surface, 1)

    if surface < 55:
        base_price *= 1.12
    elif surface < 85:
        base_price *= 1.05
    elif surface > 150:
        base_price *= 0.92
    elif surface > 200:
        base_price *= 0.85

    if property_data.floor is not None:
        if property_data.floor <= 0:
            base_price *= 0.97
        elif property_data.floor >= 4:
            base_price *= 1.05

    if property_data.rooms and surface:
        density = property_data.rooms / surface
        if density > 0.045:
            base_price *= 1.03
        elif density < 0.02:
            base_price *= 0.96

    if property_data.bedrooms and property_data.rooms:
        bedroom_ratio = property_data.bedrooms / property_data.rooms
        if bedroom_ratio >= 0.75:
            base_price *= 1.02

    if property_data.bathrooms:
        if property_data.bathrooms >= 2:
            base_price *= 1.04
        if property_data.bathrooms >= 3:
            base_price *= 1.02

    if property_data.price:
        listed_price_per_sqm = max(property_data.price / surface, 500)
        ratio = min(max(listed_price_per_sqm / base_price, 0.6), 1.6)
        weight = 0.45 + (0.15 * (1 - abs(1 - ratio)))
        base_price = base_price * (1 - weight) + listed_price_per_sqm * weight

    return base_price


def _calculate_confidence(property_data: "PropertyInput") -> int:
    score = 58
    if property_data.price:
        score += 10
    if property_data.rooms:
        score += 5
    if property_data.bedrooms:
        score += 4
    if property_data.bathrooms:
        score += 4
    if property_data.floor is not None:
        score += 3
    if property_data.latitude and property_data.longitude:
        score += 4
    score = max(45, min(score, 92))
    return int(round(score))


def _build_comparables(property_data: "PropertyInput", price_per_sqm: float) -> List["Comparable"]:
    surface = max(property_data.surface, 40)
    base_address = property_data.city or property_data.address or "Immobile"
    variations = [
        (-0.07, -0.05, 0.88),
        (-0.01, 0.0, 1.0),
        (0.06, 0.04, 1.12),
    ]

    comparables: List[Comparable] = []
    for idx, (price_offset, surface_offset, distance_factor) in enumerate(variations, start=1):
        comp_surface = max(surface * (1 + surface_offset), 35)
        comp_price_m2 = price_per_sqm * (1 + price_offset)
        comp_price = comp_surface * comp_price_m2
        similarity = 85 - abs(price_offset) * 100 * 0.8 - abs(surface_offset) * 160
        comparables.append(
            Comparable(
                id=f"comp_{idx}",
                address=f"{base_address} - comparabile {idx}",
                distance=round(120 * distance_factor + idx * 35, 1),
                price=round(comp_price),
                priceM2=round(comp_price_m2),
                surface=round(comp_surface, 1),
                similarityScore=round(max(62, min(92, similarity)), 1),
                includedInEstimate=True,
            )
        )
    return comparables


def _build_market_position(estimated_value: float, listed_price: Optional[float]) -> str:
    if not listed_price:
        return "in_linea"
    deviation = ((listed_price - estimated_value) / estimated_value) * 100
    if deviation <= -7:
        return "sotto_mercato"
    if deviation >= 7:
        return "sopra_mercato"
    return "in_linea"


class PropertyInput(BaseModel):
    address: str
    city: str
    province: Optional[str] = None
    surface: float
    price: Optional[float] = None
    rooms: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    floor: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    property_type: Optional[str] = None  # Tipo di immobile (es. "appartamento", "villa", ecc.)
    zona_omi: Optional[str] = None  # Zona OMI specifica


class Comparable(BaseModel):
    id: str
    address: str
    distance: float
    price: float
    priceM2: float
    surface: float
    similarityScore: float
    includedInEstimate: bool = True


class OMIData(BaseModel):
    comune: str
    zona: Optional[str] = None
    valoreMin: float
    valoreMax: float
    valoreNormale: float
    semestre: str
    stato_conservazione: Optional[str] = None
    fonte: str = "OMI"  # Fonte dei dati
    property_type: Optional[str] = None
    prezzoAffittoMin: Optional[float] = None
    prezzoAffittoMax: Optional[float] = None
    prezzoAffittoMedio: Optional[float] = None
    fonteUrl: Optional[str] = None
    quotationsRaw: Optional[List[Dict[str, Any]]] = None


class ValuationResponse(BaseModel):
    id: str
    estimatedValue: float
    estimatedValueMin: float
    estimatedValueMax: float
    priceM2: float
    confidenceScore: float
    qualityScore: float
    deviation: Optional[float] = None
    marketPosition: str
    omiData: Optional[OMIData] = None
    comparables: List[Comparable] = Field(default_factory=list)
    createdAt: datetime


@router.post("/evaluate", response_model=ValuationResponse)
async def evaluate_property(property_data: PropertyInput):
    """
    Valuta un immobile utilizzando dati OMI reali e algoritmi proprietari.

    Args:
        property_data: Dati dell'immobile da valutare

    Returns:
        Stima completa del valore con dati OMI
    """
    # Calcola il prezzo base con l'algoritmo proprietario
    price_per_sqm_base = _adjust_price_per_sqm(property_data)

    # Prova a ottenere dati OMI reali
    omi_client = get_omi_client()
    omi_data_model = None
    price_per_sqm_omi = None
    quotations_raw: List[Dict[str, Any]] = []

    try:
        # Determina il tipo di immobile OMI
        property_type_omi = None
        if property_data.property_type:
            property_type_omi = get_property_type(property_data.property_type)

        # Interroga le API OMI con 1 mq per ottenere il prezzo al mq
        omi_response = await omi_client.query(
            city=property_data.city,
            metri_quadri=1.0,  # Richiedi per 1 mq per ottenere prezzo al mq
            operazione="acquisto",
            zona_omi=property_data.zona_omi,
            tipo_immobile=property_type_omi,
        )

        if omi_response and omi_response.quotations:
            # Usa la prima quotazione disponibile (o quella del tipo specificato)
            quotation = omi_response.quotations[0]
            quotations_raw = [q.dict(exclude_none=True) for q in omi_response.quotations]

            # Cerca la quotazione migliore per il tipo specificato
            if property_type_omi:
                for q in omi_response.quotations:
                    if q.property_type == property_type_omi.value:
                        quotation = q
                        break

            # I prezzi sono già al mq (richiesta con metri_quadri=1)
            if quotation.prezzo_acquisto_medio and quotation.prezzo_acquisto_medio > 0:
                price_per_sqm_omi = quotation.prezzo_acquisto_medio

                # Crea il modello OMI con dati reali
                omi_data_model = OMIData(
                    comune=property_data.city.title(),
                    zona=quotation.zona_omi if quotation.zona_omi else "Intero comune",
                    valoreMin=round(quotation.prezzo_acquisto_min or price_per_sqm_omi * 0.9, 0),
                    valoreMax=round(quotation.prezzo_acquisto_max or price_per_sqm_omi * 1.1, 0),
                    valoreNormale=round(price_per_sqm_omi, 0),
                    semestre=f"{datetime.now().year}-S{1 if datetime.now().month <= 6 else 2}",
                    stato_conservazione=quotation.stato_conservazione,
                    fonte="OMI - Dati reali",
                    property_type=quotation.property_type,
                    prezzoAffittoMin=quotation.prezzo_affitto_min,
                    prezzoAffittoMax=quotation.prezzo_affitto_max,
                    prezzoAffittoMedio=quotation.prezzo_affitto_medio,
                    fonteUrl=OMI_FONTE_URL,
                    quotationsRaw=quotations_raw or None,
                )

    except Exception as e:
        print(f"Errore nel recupero dati OMI: {e}")
        # Continua con i dati calcolati

    # Determina il prezzo finale al mq
    if price_per_sqm_omi and price_per_sqm_omi > 0:
        # Combina il prezzo OMI con quello calcolato (peso 70% OMI, 30% algoritmo)
        price_per_sqm = price_per_sqm_omi * 0.7 + price_per_sqm_base * 0.3
        confidence_boost = 15  # Maggiore confidenza con dati OMI reali
    else:
        # Usa solo il prezzo calcolato
        price_per_sqm = price_per_sqm_base
        confidence_boost = 0

        # Crea dati OMI stimati se non disponibili
        if not omi_data_model:
            omi_value_min = price_per_sqm * 0.9
            omi_value_max = price_per_sqm * 1.1
            omi_data_model = OMIData(
                comune=property_data.city.title(),
                zona="Stima",
                valoreMin=round(omi_value_min, 0),
                valoreMax=round(omi_value_max, 0),
                valoreNormale=round(price_per_sqm, 0),
                semestre=f"{datetime.now().year}-S{1 if datetime.now().month <= 6 else 2}",
                fonte="Algoritmo proprietario",
                quotationsRaw=quotations_raw or None,
            )

    # Calcola il valore stimato
    estimated_value = price_per_sqm * property_data.surface

    # Calcola la confidenza
    confidence = _calculate_confidence(property_data) + confidence_boost
    confidence = min(confidence, 95)  # Cap a 95

    # Calcola il range di stima
    spread = max(0.08, 0.18 - (confidence - 55) * 0.002)
    estimated_min = estimated_value * (1 - spread)
    estimated_max = estimated_value * (1 + spread)

    # Determina la posizione di mercato
    market_position = _build_market_position(estimated_value, property_data.price)
    deviation = None
    if property_data.price:
        deviation = ((property_data.price - estimated_value) / estimated_value) * 100

    # Genera comparables
    comparables = _build_comparables(property_data, price_per_sqm)

    # Calcola quality score
    quality_score = min(95, int(confidence + 8))

    return ValuationResponse(
        id=f"val_{datetime.now().timestamp()}",
        estimatedValue=round(estimated_value, 0),
        estimatedValueMin=round(estimated_min, 0),
        estimatedValueMax=round(estimated_max, 0),
        priceM2=round(price_per_sqm, 0),
        confidenceScore=confidence,
        qualityScore=quality_score,
        deviation=deviation,
        marketPosition=market_position,
        omiData=omi_data_model,
        comparables=comparables,
        createdAt=datetime.now(),
    )


@router.get("/health")
async def health():
    return {"status": "healthy", "service": "valuation"}

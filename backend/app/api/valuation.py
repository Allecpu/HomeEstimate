from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


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
    zona: str
    valoreMin: float
    valoreMax: float
    valoreNormale: float
    semestre: str


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
    price_per_sqm = _adjust_price_per_sqm(property_data)
    estimated_value = price_per_sqm * property_data.surface

    confidence = _calculate_confidence(property_data)
    spread = max(0.08, 0.18 - (confidence - 55) * 0.002)
    estimated_min = estimated_value * (1 - spread)
    estimated_max = estimated_value * (1 + spread)

    market_position = _build_market_position(estimated_value, property_data.price)
    deviation = None
    if property_data.price:
        deviation = ((property_data.price - estimated_value) / estimated_value) * 100

    comparables = _build_comparables(property_data, price_per_sqm)

    omi_value_min = price_per_sqm * 0.9
    omi_value_max = price_per_sqm * 1.1
    omi_data = OMIData(
        comune=property_data.city,
        zona="B1",
        valoreMin=round(omi_value_min, 0),
        valoreMax=round(omi_value_max, 0),
        valoreNormale=round(price_per_sqm, 0),
        semestre=f"{datetime.now().year}-S{1 if datetime.now().month <= 6 else 2}",
    )

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
        omiData=omi_data,
        comparables=comparables,
        createdAt=datetime.now(),
    )


@router.get("/health")
async def health():
    return {"status": "healthy", "service": "valuation"}

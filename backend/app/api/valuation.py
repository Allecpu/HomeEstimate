from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter()

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
    comparables: List[Comparable] = []
    createdAt: datetime

@router.post("/evaluate", response_model=ValuationResponse)
async def evaluate_property(property_data: PropertyInput):
    """
    Valuta un immobile basandosi su:
    - Dati OMI
    - Comparabili
    - Modello di stima ibrido
    """

    # Placeholder per MVP - implementare logica completa dopo
    # Per ora ritorna una stima semplificata

    # Stima semplice basata su prezzo medio zona (esempio Milano)
    avg_price_m2 = 4500  # €/m² medio a Milano
    estimated_value = property_data.surface * avg_price_m2

    # Range ± 15%
    estimated_min = estimated_value * 0.85
    estimated_max = estimated_value * 1.15

    # Calcola deviazione se prezzo fornito
    deviation = None
    market_position = "in_linea"
    if property_data.price:
        deviation = ((property_data.price - estimated_value) / estimated_value) * 100
        if deviation < -10:
            market_position = "sotto_mercato"
        elif deviation > 10:
            market_position = "sopra_mercato"

    # Mock comparables
    comparables = [
        Comparable(
            id="comp1",
            address="Via test 1",
            distance=150,
            price=300000,
            priceM2=4200,
            surface=property_data.surface * 0.95,
            similarityScore=85,
            includedInEstimate=True
        ),
        Comparable(
            id="comp2",
            address="Via test 2",
            distance=300,
            price=320000,
            priceM2=4500,
            surface=property_data.surface * 1.05,
            similarityScore=78,
            includedInEstimate=True
        ),
    ]

    # Mock OMI data
    omi = OMIData(
        comune=property_data.city,
        zona="B1",
        valoreMin=4000,
        valoreMax=5000,
        valoreNormale=4500,
        semestre="2024-S2"
    )

    return ValuationResponse(
        id=f"val_{datetime.now().timestamp()}",
        estimatedValue=estimated_value,
        estimatedValueMin=estimated_min,
        estimatedValueMax=estimated_max,
        priceM2=avg_price_m2,
        confidenceScore=75,
        qualityScore=80,
        deviation=deviation,
        marketPosition=market_position,
        omiData=omi,
        comparables=comparables,
        createdAt=datetime.now()
    )

@router.get("/health")
async def health():
    return {"status": "healthy", "service": "valuation"}

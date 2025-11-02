"""
Modulo per l'integrazione con le API OMI (Osservatorio del Mercato Immobiliare).
"""

from app.omi.cadastral_codes import (
    CADASTRAL_CODES,
    get_all_cities,
    get_cadastral_code,
    search_city_by_code,
)
from app.omi.client import (
    OMICache,
    OMIClient,
    OMIQuotation,
    OMIResponse,
    get_omi_client,
)
from app.omi.property_types import (
    PROPERTY_TYPE_MAPPING,
    PropertyType,
    get_property_type,
    get_property_type_display_name,
)
from app.omi.suggester import (
    get_zone_description,
    suggest_omi_zone,
    suggest_property_type,
)

__all__ = [
    # Cadastral codes
    "CADASTRAL_CODES",
    "get_cadastral_code",
    "search_city_by_code",
    "get_all_cities",
    # Client
    "OMIClient",
    "OMIQuotation",
    "OMIResponse",
    "get_omi_client",
    # Property types
    "PropertyType",
    "PROPERTY_TYPE_MAPPING",
    "get_property_type",
    "get_property_type_display_name",
    # Suggester
    "suggest_property_type",
    "suggest_omi_zone",
    "get_zone_description",
]

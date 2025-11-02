"""
Tipi di immobili supportati dalle API OMI.
"""

from enum import Enum
from typing import Dict


class PropertyType(str, Enum):
    """Tipi di immobili OMI."""

    # Residenziali
    ABITAZIONI_CIVILI = "abitazioni_civili"
    VILLE_E_VILLINI = "ville_e_villini"
    ABITAZIONI_ECONOMICHE = "abitazioni_di_tipo_economico"
    ABITAZIONI_SIGNORILI = "abitazioni_signorili"
    ABITAZIONI_TIPICHE = "abitazioni_tipiche_dei_luoghi"

    # Commerciali
    NEGOZI = "negozi"
    UFFICI = "uffici"
    UFFICI_STRUTTURATI = "uffici_strutturati"
    CENTRI_COMMERCIALI = "centri_commerciali"

    # Parcheggi
    BOX = "box"
    POSTI_AUTO_SCOPERTI = "posti_auto_scoperti"
    POSTI_AUTO_COPERTI = "posti_auto_coperti"
    AUTORIMESSE = "autorimesse"

    # Industriali
    CAPANNONI_TIPICI = "capannoni_tipici"
    CAPANNONI_INDUSTRIALI = "capannoni_industriali"
    MAGAZZINI = "magazzini"
    LABORATORI = "laboratori"


# Mappatura da descrizioni comuni ai tipi OMI
PROPERTY_TYPE_MAPPING: Dict[str, PropertyType] = {
    # Residenziali
    "appartamento": PropertyType.ABITAZIONI_CIVILI,
    "attico": PropertyType.ABITAZIONI_SIGNORILI,
    "villa": PropertyType.VILLE_E_VILLINI,
    "villino": PropertyType.VILLE_E_VILLINI,
    "villetta": PropertyType.VILLE_E_VILLINI,
    "casa indipendente": PropertyType.ABITAZIONI_CIVILI,
    "monolocale": PropertyType.ABITAZIONI_CIVILI,
    "bilocale": PropertyType.ABITAZIONI_CIVILI,
    "trilocale": PropertyType.ABITAZIONI_CIVILI,
    "quadrilocale": PropertyType.ABITAZIONI_CIVILI,

    # Commerciali
    "negozio": PropertyType.NEGOZI,
    "locale commerciale": PropertyType.NEGOZI,
    "ufficio": PropertyType.UFFICI,
    "centro commerciale": PropertyType.CENTRI_COMMERCIALI,

    # Parcheggi
    "box": PropertyType.BOX,
    "garage": PropertyType.BOX,
    "posto auto": PropertyType.POSTI_AUTO_COPERTI,
    "posto auto coperto": PropertyType.POSTI_AUTO_COPERTI,
    "posto auto scoperto": PropertyType.POSTI_AUTO_SCOPERTI,
    "autorimessa": PropertyType.AUTORIMESSE,

    # Industriali
    "capannone": PropertyType.CAPANNONI_INDUSTRIALI,
    "magazzino": PropertyType.MAGAZZINI,
    "laboratorio": PropertyType.LABORATORI,
}


def get_property_type(description: str) -> PropertyType:
    """
    Converte una descrizione testuale in un PropertyType OMI.

    Args:
        description: Descrizione del tipo di immobile

    Returns:
        PropertyType corrispondente, default ABITAZIONI_CIVILI
    """
    if not description:
        return PropertyType.ABITAZIONI_CIVILI

    desc_normalized = description.strip().lower()
    return PROPERTY_TYPE_MAPPING.get(desc_normalized, PropertyType.ABITAZIONI_CIVILI)


def get_property_type_display_name(property_type: PropertyType) -> str:
    """
    Restituisce il nome visualizzabile di un tipo di immobile.

    Args:
        property_type: Tipo di immobile

    Returns:
        Nome visualizzabile in italiano
    """
    display_names = {
        PropertyType.ABITAZIONI_CIVILI: "Abitazioni civili",
        PropertyType.VILLE_E_VILLINI: "Ville e villini",
        PropertyType.ABITAZIONI_ECONOMICHE: "Abitazioni economiche",
        PropertyType.ABITAZIONI_SIGNORILI: "Abitazioni signorili",
        PropertyType.ABITAZIONI_TIPICHE: "Abitazioni tipiche",
        PropertyType.NEGOZI: "Negozi",
        PropertyType.UFFICI: "Uffici",
        PropertyType.UFFICI_STRUTTURATI: "Uffici strutturati",
        PropertyType.CENTRI_COMMERCIALI: "Centri commerciali",
        PropertyType.BOX: "Box",
        PropertyType.POSTI_AUTO_SCOPERTI: "Posti auto scoperti",
        PropertyType.POSTI_AUTO_COPERTI: "Posti auto coperti",
        PropertyType.AUTORIMESSE: "Autorimesse",
        PropertyType.CAPANNONI_TIPICI: "Capannoni tipici",
        PropertyType.CAPANNONI_INDUSTRIALI: "Capannoni industriali",
        PropertyType.MAGAZZINI: "Magazzini",
        PropertyType.LABORATORI: "Laboratori",
    }
    return display_names.get(property_type, property_type.value)

"""
Logica per suggerire automaticamente tipo immobile e zona OMI in base all'indirizzo.
"""

import re
from typing import Optional

from app.omi.client import get_omi_client
from app.omi.property_types import PropertyType


def suggest_property_type(address: str, description: Optional[str] = None) -> Optional[str]:
    """
    Suggerisce il tipo di immobile OMI in base all'indirizzo e alla descrizione.

    Args:
        address: Indirizzo completo dell'immobile
        description: Descrizione opzionale dell'immobile

    Returns:
        Valore del PropertyType suggerito o None
    """
    text = f"{address.lower()} {description.lower() if description else ''}"

    # Parole chiave per identificare il tipo di immobile
    keywords = {
        PropertyType.ABITAZIONI_CIVILI.value: [
            "appartamento", "bilocale", "trilocale", "quadrilocale",
            "residenziale", "abitazione", "casa"
        ],
        PropertyType.VILLE_E_VILLINI.value: [
            "villa", "villino", "villetta", "bifamiliare", "trifamiliare",
            "indipendente", "singola", "giardino privato"
        ],
        PropertyType.ABITAZIONI_SIGNORILI.value: [
            "attico", "penthouse", "signorile", "prestigio", "lusso",
            "pregio", "corso", "centro storico"
        ],
        PropertyType.ABITAZIONI_ECONOMICHE.value: [
            "economico", "popolare", "edilizi", "periferia"
        ],
        PropertyType.NEGOZI.value: [
            "negozio", "locale commerciale", "commerciale", "vetrina",
            "bottega", "shop"
        ],
        PropertyType.UFFICI.value: [
            "ufficio", "studio professionale", "studio", "coworking",
            "open space ufficio"
        ],
        PropertyType.UFFICI_STRUTTURATI.value: [
            "ufficio direzionale", "sede", "palazzo uffici", "business center"
        ],
        PropertyType.CENTRI_COMMERCIALI.value: [
            "centro commerciale", "mall", "galleria commerciale"
        ],
        PropertyType.BOX.value: [
            "box", "garage", "posto auto", "autorimessa", "parcheggio"
        ],
    }

    # Conteggio occorrenze per ogni tipo
    scores = {}
    for property_type, words in keywords.items():
        score = sum(1 for word in words if word in text)
        if score > 0:
            scores[property_type] = score

    # Ritorna il tipo con il punteggio più alto
    if scores:
        return max(scores.items(), key=lambda x: x[1])[0]

    # Default: abitazioni civili (il più comune)
    return PropertyType.ABITAZIONI_CIVILI.value


async def suggest_omi_zone(city: str, address: str) -> Optional[str]:
    """
    Suggerisce la zona OMI in base alla città e all'indirizzo.

    Args:
        city: Nome del comune
        address: Indirizzo completo

    Returns:
        Zona OMI suggerita o None
    """
    try:
        omi_client = get_omi_client()

        # Ottieni le zone disponibili per la città
        # Questo richiederà una query OMI per ottenere le zone
        from app.omi.cadastral_codes import get_cadastral_code

        if not get_cadastral_code(city):
            return None

        # Estrai indicatori di zona dall'indirizzo
        address_lower = address.lower()

        # Mappatura euristica delle zone in base alle parole chiave
        zone_indicators = {
            "B": ["centro", "corso", "piazza", "centrale", "duomo"],
            "C": ["semicentro", "zona residenziale", "viale", "via principale"],
            "D": ["periferia", "quartiere", "zona", "località"],
            "E": ["estrema periferia", "frazione", "campagna", "rurale"]
        }

        # Trova la zona più probabile
        for zone_prefix, keywords in zone_indicators.items():
            if any(keyword in address_lower for keyword in keywords):
                # Ritorna la prima zona con questo prefisso
                # Es: se zona B, ritorna B1 come default
                return f"{zone_prefix}1"

        # Se non troviamo indicatori, suggerisci zona C (semicentro) come default
        return "C1"

    except Exception:
        # In caso di errore, ritorna None
        return None


def get_zone_description(zone: str) -> str:
    """
    Fornisce una descrizione della zona OMI.

    Args:
        zone: Codice zona OMI (es: B1, C2, D3)

    Returns:
        Descrizione testuale della zona
    """
    if not zone:
        return "Zona non specificata"

    zone_prefix = zone[0].upper() if zone else ""

    descriptions = {
        "B": "Centro - Zona centrale con servizi e negozi",
        "C": "Semicentro - Zona residenziale ben servita",
        "D": "Periferia - Zona periferica con buoni collegamenti",
        "E": "Estrema periferia - Zona esterna al centro urbano"
    }

    return descriptions.get(zone_prefix, "Zona urbana")

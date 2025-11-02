"""
Codici catastali dei comuni italiani.
Fonte: Agenzia delle Entrate
"""

from typing import Dict, Optional

# Dizionario dei codici catastali dei comuni italiani più rilevanti
CADASTRAL_CODES: Dict[str, str] = {
    # Lombardia
    "milano": "F205",
    "bergamo": "A794",
    "brescia": "B157",
    "como": "C933",
    "cremona": "D150",
    "lecco": "E507",
    "lodi": "E648",
    "mantova": "E897",
    "monza": "F704",
    "pavia": "G388",
    "sondrio": "I822",
    "varese": "L682",

    # Lazio
    "roma": "H501",
    "frosinone": "D810",
    "latina": "E472",
    "rieti": "H282",
    "viterbo": "M082",

    # Campania
    "napoli": "F839",
    "avellino": "A509",
    "benevento": "A783",
    "caserta": "B963",
    "salerno": "H703",

    # Piemonte
    "torino": "L219",
    "alessandria": "A182",
    "asti": "A479",
    "biella": "A859",
    "cuneo": "D205",
    "novara": "F952",
    "verbania": "L746",
    "vercelli": "L750",

    # Veneto
    "venezia": "L736",
    "belluno": "A757",
    "padova": "G224",
    "rovigo": "H620",
    "treviso": "L407",
    "verona": "L781",
    "vicenza": "L840",

    # Emilia-Romagna
    "bologna": "A944",
    "ferrara": "D548",
    "forli": "D704",
    "modena": "F257",
    "parma": "G337",
    "piacenza": "G535",
    "ravenna": "H199",
    "reggio emilia": "H223",
    "rimini": "H294",

    # Toscana
    "firenze": "D612",
    "arezzo": "A390",
    "grosseto": "E202",
    "livorno": "E625",
    "lucca": "E715",
    "massa": "F023",
    "pisa": "G702",
    "pistoia": "G713",
    "prato": "G999",
    "siena": "I726",

    # Puglia
    "bari": "A662",
    "brindisi": "B180",
    "foggia": "D643",
    "lecce": "E506",
    "taranto": "L049",
    "barletta": "A669",

    # Sicilia
    "palermo": "G273",
    "agrigento": "A089",
    "caltanissetta": "B429",
    "catania": "C351",
    "enna": "C342",
    "messina": "F158",
    "ragusa": "H163",
    "siracusa": "I754",
    "trapani": "L331",

    # Liguria
    "genova": "D969",
    "imperia": "E290",
    "la spezia": "E463",
    "savona": "I480",

    # Trentino-Alto Adige
    "trento": "L378",
    "bolzano": "A952",

    # Friuli-Venezia Giulia
    "trieste": "L424",
    "gorizia": "E098",
    "pordenone": "G888",
    "udine": "L483",

    # Marche
    "ancona": "A271",
    "ascoli piceno": "A462",
    "fermo": "D542",
    "macerata": "E783",
    "pesaro": "G540",
    "urbino": "L500",

    # Umbria
    "perugia": "G478",
    "terni": "L117",

    # Calabria
    "catanzaro": "C352",
    "cosenza": "D086",
    "crotone": "D122",
    "reggio calabria": "H224",
    "vibo valentia": "F537",

    # Sardegna
    "cagliari": "B354",
    "nuoro": "F979",
    "oristano": "G113",
    "sassari": "I452",
    "olbia": "G015",

    # Abruzzo
    "laquila": "A345",
    "chieti": "C632",
    "pescara": "G482",
    "teramo": "L103",

    # Molise
    "campobasso": "B519",
    "isernia": "E335",

    # Basilicata
    "potenza": "G942",
    "matera": "F052",

    # Valle d'Aosta
    "aosta": "A326",
}


def get_cadastral_code(city: str) -> Optional[str]:
    """
    Ottiene il codice catastale di un comune italiano.

    Args:
        city: Nome del comune (case-insensitive)

    Returns:
        Codice catastale o None se non trovato
    """
    if not city:
        return None

    city_normalized = city.strip().lower()
    return CADASTRAL_CODES.get(city_normalized)


def search_city_by_code(code: str) -> Optional[str]:
    """
    Cerca il nome di un comune dato il codice catastale.

    Args:
        code: Codice catastale

    Returns:
        Nome del comune o None se non trovato
    """
    if not code:
        return None

    code_upper = code.strip().upper()
    for city, cadastral_code in CADASTRAL_CODES.items():
        if cadastral_code == code_upper:
            return city.title()

    return None


def get_all_cities() -> Dict[str, str]:
    """
    Restituisce tutti i comuni e i loro codici catastali.

    Returns:
        Dizionario {comune: codice_catastale}
    """
    return CADASTRAL_CODES.copy()

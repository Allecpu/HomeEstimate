"""
Codici catastali dei comuni italiani.
Fonte: Agenzia delle Entrate
"""

from typing import Dict, Optional

# Dizionario dei codici catastali dei comuni italiani più rilevanti
CADASTRAL_CODES: Dict[str, str] = {
    # Lombardia - Capoluoghi e città principali
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

    # Lombardia - Altri comuni importanti
    # Provincia di Milano
    "rho": "H264",
    "sesto san giovanni": "I687",
    "cinisello balsamo": "C707",
    "legnano": "E514",
    "abbiategrasso": "A010",
    "magenta": "E801",
    "corbetta": "C986",
    "melzo": "F120",
    "gorgonzola": "E094",
    "segrate": "I577",
    "cologno monzese": "C895",
    "san donato milanese": "H827",
    "corsico": "D045",
    "rozzano": "H623",
    "opera": "G078",
    "buccinasco": "B240",
    "san giuliano milanese": "H930",
    "pioltello": "G686",
    "vimodrone": "M053",
    "peschiera borromeo": "G488",

    # Provincia di Monza e Brianza
    "desio": "D286",
    "seregno": "I625",
    "lissone": "E617",
    "cesano maderno": "C566",
    "limbiate": "E591",
    "vimercate": "M052",
    "carate brianza": "B729",
    "brugherio": "B212",
    "giussano": "E062",
    "muggio": "F797",

    # Provincia di Bergamo
    "treviglio": "L400",
    "seriate": "I628",
    "dalmine": "D245",
    "romano di lombardia": "H511",
    "albino": "A162",
    "alzano lombardo": "A246",
    "caravaggio": "B731",
    "stezzano": "I951",
    "ponte san pietro": "G854",
    "trescore balneario": "L386",

    # Provincia di Brescia
    "desenzano del garda": "D284",
    "montichiari": "F471",
    "lumezzane": "E738",
    "chiari": "C618",
    "rezzato": "H256",
    "ghedi": "E024",
    "palazzolo sull'oglio": "G284",
    "manerbio": "E879",
    "orzinuovi": "G149",
    "rovato": "H598",

    # Provincia di Como
    "erba": "D416",
    "cantù": "B639",
    "mariano comense": "E951",
    "olgiate comasco": "G030",
    "lomazzo": "E661",
    "menaggio": "F120",
    "cernobbio": "C520",

    # Provincia di Varese
    "busto arsizio": "B300",
    "gallarate": "D869",
    "saronno": "I441",
    "tradate": "L319",
    "luino": "E734",
    "castellanza": "C139",
    "somma lombardo": "I819",
    "malnate": "E863",
    "cassano magnago": "C004",

    # Provincia di Pavia
    "vigevano": "L872",
    "voghera": "M109",
    "mortara": "F754",
    "stradella": "I969",

    # Provincia di Cremona
    "crema": "D142",
    "casalmaggiore": "B898",

    # Provincia di Mantova
    "castiglione delle stiviere": "C312",
    "suzzara": "L020",
    "viadana": "L826",

    # Provincia di Lecco
    "merate": "F133",
    "calolziocorte": "B423",

    # Provincia di Lodi
    "codogno": "C816",
    "sant'angelo lodigiano": "I274",

    # Provincia di Sondrio
    "tirano": "L175",
    "morbegno": "F712",

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

    # Piemonte - Capoluoghi
    "torino": "L219",
    "alessandria": "A182",
    "asti": "A479",
    "biella": "A859",
    "cuneo": "D205",
    "novara": "F952",
    "verbania": "L746",
    "vercelli": "L750",

    # Piemonte - Altri comuni importanti
    # Provincia di Torino
    "moncalieri": "F335",
    "rivoli": "H355",
    "collegno": "C860",
    "settimo torinese": "I703",
    "nichelino": "F889",
    "venaria reale": "L736",
    "chieri": "C627",
    "pinerolo": "G674",
    "carmagnola": "B792",
    "ivrea": "E333",
    "grugliasco": "E216",
    "chivasso": "C665",
    "orbassano": "G087",
    "beinasco": "A734",
    "san mauro torinese": "I030",
    "caselle torinese": "B955",
    "alpignano": "A217",
    "avigliana": "A518",
    "giaveno": "E020",
    "cirié": "C722",
    "leini": "E518",
    "volpiano": "M120",
    "rivarolo canavese": "H335",
    "trofarello": "L444",
    "cuorgné": "D211",
    "piossasco": "G691",

    # Provincia di Alessandria
    "casale monferrato": "B885",
    "novi ligure": "F965",
    "tortona": "L304",
    "acqui terme": "A052",
    "valenza": "L570",
    "ovada": "G200",

    # Provincia di Asti
    "canelli": "B594",
    "nizza monferrato": "F902",

    # Provincia di Biella
    "cossato": "D094",
    "candelo": "B586",

    # Provincia di Cuneo
    "alba": "A124",
    "bra": "B111",
    "fossano": "D742",
    "mondovì": "F351",
    "savigliano": "I473",
    "saluzzo": "H701",
    "borgo san dalmazzo": "B006",

    # Provincia di Novara
    "arona": "A429",
    "borgomanero": "B008",
    "galliate": "D872",
    "trecate": "L359",

    # Provincia di Verbano-Cusio-Ossola
    "omegna": "G062",
    "domodossola": "D332",
    "villadossola": "M026",
    "stresa": "I976",

    # Provincia di Vercelli
    "borgosesia": "B013",
    "santhià": "I337",

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

# Integrazione API OMI - Osservatorio del Mercato Immobiliare

## Panoramica

HomeEstimate integra le API OMI (Osservatorio del Mercato Immobiliare) per fornire dati reali sulle quotazioni immobiliari in Italia. Questo documento descrive l'implementazione completa e come utilizzare le API.

## Struttura del Progetto

```
backend/app/omi/
├── __init__.py           # Exports pubblici del modulo
├── cadastral_codes.py    # Codici catastali comuni italiani (108 città)
├── property_types.py     # Tipi di immobile supportati da OMI
└── client.py            # Client HTTP per interrogare le API OMI
```

## Componenti Principali

### 1. Codici Catastali (`cadastral_codes.py`)

Gestisce la mappatura tra nomi di comuni italiani e i loro codici catastali.

**Funzioni disponibili:**
- `get_cadastral_code(city: str) -> Optional[str]` - Ottiene il codice catastale
- `search_city_by_code(code: str) -> Optional[str]` - Cerca comune da codice
- `get_all_cities() -> Dict[str, str]` - Tutti i comuni supportati

**Esempio:**
```python
from app.omi import get_cadastral_code

code = get_cadastral_code("Milano")  # Returns "F205"
```

**Comuni supportati:** 108 città principali italiane in tutte le regioni.

### 2. Tipi di Immobile (`property_types.py`)

Definisce i tipi di immobile supportati dalle API OMI.

**Enum `PropertyType`:**
- Residenziali: `ABITAZIONI_CIVILI`, `VILLE_E_VILLINI`, `ABITAZIONI_SIGNORILI`, ecc.
- Commerciali: `NEGOZI`, `UFFICI`, `UFFICI_STRUTTURATI`, `CENTRI_COMMERCIALI`
- Parcheggi: `BOX`, `POSTI_AUTO_SCOPERTI`, `POSTI_AUTO_COPERTI`, `AUTORIMESSE`
- Industriali: `CAPANNONI_TIPICI`, `CAPANNONI_INDUSTRIALI`, `MAGAZZINI`, `LABORATORI`

**Funzioni:**
- `get_property_type(description: str) -> PropertyType` - Converte descrizione in tipo OMI
- `get_property_type_display_name(property_type: PropertyType) -> str` - Nome visualizzabile

**Esempio:**
```python
from app.omi import get_property_type

prop_type = get_property_type("appartamento")  # Returns PropertyType.ABITAZIONI_CIVILI
```

### 3. Client OMI (`client.py`)

Client HTTP asincrono per interrogare le API OMI con caching e rate limiting integrati.

**Caratteristiche:**
- Rate limiting automatico (1 richiesta ogni 3 secondi)
- Cache locale con TTL configurabile (default: 1 ora)
- Gestione automatica della struttura dati API
- Parsing intelligente delle risposte

**Modelli Pydantic:**

```python
class OMIQuotation:
    zona_omi: str
    property_type: str
    stato_conservazione: Optional[str]
    prezzo_acquisto_min: Optional[float]
    prezzo_acquisto_max: Optional[float]
    prezzo_acquisto_medio: Optional[float]
    prezzo_affitto_min: Optional[float]
    prezzo_affitto_max: Optional[float]
    prezzo_affitto_medio: Optional[float]

class OMIResponse:
    codice_comune: str
    comune: str
    metri_quadri: float
    zona_omi_filter: Optional[str]
    quotations: List[OMIQuotation]
    timestamp: datetime
    zone_count: int
```

**Metodi principali:**

```python
async def query(
    city: str,
    metri_quadri: float = 1.0,
    operazione: Optional[str] = None,
    zona_omi: Optional[str] = None,
    tipo_immobile: Optional[PropertyType] = None,
    use_cache: bool = True
) -> Optional[OMIResponse]

async def get_purchase_price(...) -> Optional[Dict[str, float]]
async def get_rental_price(...) -> Optional[Dict[str, float]]
```

## Endpoints API

Le API sono accessibili tramite FastAPI su `/api/omi/`:

### 1. POST `/api/omi/query`

Interroga direttamente le API OMI.

**Request Body:**
```json
{
  "city": "Milano",
  "metri_quadri": 100,
  "operazione": "acquisto",
  "zona_omi": "B12",
  "tipo_immobile": "appartamento"
}
```

**Response:**
```json
{
  "codice_comune": "F205",
  "comune": "Milano",
  "metri_quadri": 100,
  "zona_omi_filter": "B12",
  "quotations": [
    {
      "zona_omi": "B12",
      "property_type": "abitazioni_civili",
      "stato_conservazione": "normale",
      "prezzo_acquisto_min": 830000,
      "prezzo_acquisto_max": 1080000,
      "prezzo_acquisto_medio": 955000,
      "prezzo_affitto_min": 2500,
      "prezzo_affitto_max": 3500,
      "prezzo_affitto_medio": 3000
    }
  ],
  "timestamp": "2025-01-15T10:30:00",
  "zone_count": 42
}
```

### 2. GET `/api/omi/purchase-price`

Ottiene i prezzi di acquisto.

**Query Parameters:**
- `city` (required): Nome del comune
- `metri_quadri` (required): Metri quadri
- `tipo_immobile` (optional): Tipo di immobile
- `zona_omi` (optional): Zona OMI

**Response:**
```json
{
  "min": 83000000,
  "max": 108000000,
  "medio": 95500000,
  "min_mq": 830000,
  "max_mq": 1080000,
  "medio_mq": 955000
}
```

### 3. GET `/api/omi/rental-price`

Ottiene i prezzi di affitto.

**Stessi parametri di `/purchase-price`**

### 4. GET `/api/omi/property-types`

Lista di tutti i tipi di immobile supportati.

**Response:**
```json
[
  {
    "value": "abitazioni_civili",
    "display_name": "Abitazioni civili"
  },
  ...
]
```

### 5. GET `/api/omi/cadastral-code`

Ottiene il codice catastale di un comune.

**Query Parameters:**
- `city` (required): Nome del comune

**Response:**
```json
{
  "city": "Milano",
  "code": "F205"
}
```

### 6. GET `/api/omi/cities`

Lista di tutti i comuni supportati.

**Response:**
```json
[
  {
    "city": "Agrigento",
    "code": "A089"
  },
  ...
]
```

## Integrazione con Valutazione Immobiliare

L'endpoint `/api/valuation/evaluate` è stato aggiornato per utilizzare automaticamente i dati OMI reali.

**Logica di combinazione:**
1. Calcola il prezzo base con l'algoritmo proprietario
2. Richiede i dati OMI reali (se disponibili)
3. Combina i due prezzi: **70% OMI + 30% algoritmo**
4. Aumenta il confidence score di 15 punti se usa dati OMI

**Request Body esteso:**
```json
{
  "address": "Via Roma 123",
  "city": "Milano",
  "province": "MI",
  "surface": 85,
  "price": 450000,
  "rooms": 3,
  "bedrooms": 2,
  "bathrooms": 1,
  "floor": 3,
  "property_type": "appartamento",  // NUOVO
  "zona_omi": "B12"                  // NUOVO
}
```

**Campo omiData nella risposta:**
```json
{
  "omiData": {
    "comune": "Milano",
    "zona": "B12",
    "valoreMin": 2800,
    "valoreMax": 3200,
    "valoreNormale": 3000,
    "semestre": "2025-S1",
    "stato_conservazione": "normale",
    "fonte": "OMI - Dati reali"  // o "Algoritmo proprietario"
  }
}
```

## Utilizzo Programmatico

### Esempio 1: Query Base

```python
from app.omi import get_omi_client, PropertyType

async def get_prices():
    client = get_omi_client()

    # Query con tutti i parametri
    response = await client.query(
        city="Roma",
        metri_quadri=1.0,  # 1 mq per ottenere prezzo al mq
        operazione="acquisto",
        tipo_immobile=PropertyType.ABITAZIONI_CIVILI
    )

    if response and response.quotations:
        for quotation in response.quotations:
            print(f"Zona: {quotation.zona_omi}")
            print(f"Prezzo medio: €{quotation.prezzo_acquisto_medio}/mq")
```

### Esempio 2: Prezzi Specifici

```python
from app.omi import get_omi_client, PropertyType

async def calculate_property_value():
    client = get_omi_client()

    # Ottieni prezzi per un appartamento di 85 mq
    prices = await client.get_purchase_price(
        city="Milano",
        metri_quadri=85,
        tipo_immobile=PropertyType.ABITAZIONI_CIVILI
    )

    if prices:
        print(f"Valore stimato: €{prices['medio']:,.0f}")
        print(f"Range: €{prices['min']:,.0f} - €{prices['max']:,.0f}")
        print(f"Prezzo al mq: €{prices['medio_mq']:,.0f}/mq")
```

### Esempio 3: Con Context Manager

```python
from app.omi import OMIClient, PropertyType

async def fetch_data():
    async with OMIClient(cache_ttl=1800) as client:  # Cache di 30 minuti
        response = await client.query(
            city="Palermo",
            metri_quadri=100,
            tipo_immobile=PropertyType.ABITAZIONI_CIVILI
        )
        # Client viene chiuso automaticamente
```

## Rate Limiting e Cache

### Rate Limiting
- **Limite API**: 100 richieste di credito, 1 richiesta ogni 3 secondi
- **Gestione automatica**: Il client attende automaticamente tra le richieste
- **Configurabile**: Può essere modificato nel costruttore del client

### Cache
- **TTL default**: 1 ora (3600 secondi)
- **Chiave cache**: Basata su comune, metri quadri, operazione, zona e tipo
- **Vantaggi**: Riduce drasticamente le chiamate API e migliora le performance

## Test

Esegui il test completo dell'integrazione:

```bash
cd backend
./venv/Scripts/python.exe test_omi_integration.py
```

Il test verifica:
- ✓ Codici catastali (108 comuni)
- ✓ Tipi di immobile (17 tipi)
- ✓ Query API OMI reali
- ✓ Sistema di cache

## Limitazioni e Note

1. **Comuni supportati**: Attualmente 108 città principali. Per comuni non in lista, l'API restituisce un errore 400.

2. **Zone OMI**: Le zone sono assegnate dall'Agenzia delle Entrate. Senza specificare una zona, vengono restituite tutte le zone del comune.

3. **Prezzi**: I prezzi sono forniti per i metri quadri specificati nella richiesta. Per ottenere prezzi al mq, richiedere con `metri_quadri=1.0`.

4. **Affidabilità**: I dati OMI sono ufficiali ma potrebbero non essere sempre aggiornati all'ultimo semestre.

5. **Rate Limiting**: Il servizio gratuito ha limiti. Per uso intensivo, considerare la versione commerciale.

## Riferimenti

- **API OMI**: https://github.com/davide-sagona/api-quotazioni-immobiliari-omi
- **Endpoint API**: https://3eurotools.it/api-quotazioni-immobiliari-omi/ricerca
- **Codici Catastali Ufficiali**: https://www.agenziaentrate.gov.it

## Supporto

Per problemi o domande sull'integrazione OMI, consultare:
1. Questo documento
2. Il codice sorgente in `backend/app/omi/`
3. I test in `backend/test_omi_integration.py`

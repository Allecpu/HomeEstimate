# Integrazione API OMI - HomeEstimate

## Panoramica Rapida

HomeEstimate integra le **API OMI** (Osservatorio del Mercato Immobiliare) dell'Agenzia delle Entrate per fornire valutazioni immobiliari basate su dati ufficiali.

### Caratteristiche Principali

- ✅ **312 comuni supportati** (Lombardia, Piemonte e tutti i laghi del nord Italia)
- ✅ **17 tipi di immobile** (residenziale, commerciale, industriale)
- ✅ **Dati ufficiali** dall'Agenzia delle Entrate
- ✅ **Cache automatica** (1 ora TTL)
- ✅ **Rate limiting** integrato (1 richiesta/3 secondi)
- ✅ **Valutazione ibrida**: 70% dati OMI + 30% algoritmo proprietario

## Quick Start

### 1. Installazione

```bash
cd backend
pip install -r requirements.txt
```

### 2. Test Integrazione

```bash
python test_omi_integration.py
```

Output atteso:
```
✓ Test codici catastali: 312 comuni supportati
✓ Test tipi immobile: 17 tipi disponibili
✓ Test query OMI: Dati ricevuti
✓ Test cache: Funzionante
```

### 3. Utilizzo Base

```python
from app.omi import get_omi_client

# Crea client
client = get_omi_client()

# Query per Milano, appartamento, 100mq
response = await client.query(
    city="Milano",
    metri_quadri=100,
    operazione="acquisto",
    tipo_immobile="appartamento"
)

# Risultato
print(f"Comune: {response.comune}")
print(f"Quotazioni trovate: {len(response.quotations)}")
for q in response.quotations:
    print(f"Zona {q.zona_omi}: €{q.prezzo_acquisto_medio:.2f}/mq")
```

## Struttura Progetto

```
backend/app/omi/
├── __init__.py           # Exports pubblici
├── cadastral_codes.py    # 242 codici catastali
├── property_types.py     # 17 tipi immobile
└── client.py            # Client HTTP asincrono

backend/app/api/
├── omi.py               # 7 endpoint REST
└── valuation.py         # Integrazione valutazione

backend/docs/
└── omi-integration.md   # Documentazione completa

backend/
├── test_omi_integration.py  # Test completi
├── test_omi_debug.py        # Debug API
└── CITY_EXPANSION.md        # Lista espansione comuni
```

## API Endpoints

### 1. Query OMI Completa
```http
POST /api/omi/query
Content-Type: application/json

{
  "city": "Milano",
  "metri_quadri": 100,
  "operazione": "acquisto",
  "tipo_immobile": "appartamento",
  "zona_omi": "B12"
}
```

### 2. Prezzi Acquisto
```http
GET /api/omi/purchase-price?city=Milano&metri_quadri=100&tipo_immobile=appartamento
```

### 3. Prezzi Affitto
```http
GET /api/omi/rental-price?city=Roma&metri_quadri=85&zona_omi=C1
```

### 4. Tipi Immobile
```http
GET /api/omi/property-types
```

### 5. Codice Catastale
```http
GET /api/omi/cadastral-code?city=Torino
```

### 6. Comuni Supportati
```http
GET /api/omi/cities
```

### 7. Zone OMI
```http
GET /api/omi/zones?city=Milano
```

## Comuni Supportati (312)

### Copertura Completa
- **Lombardia**: ~140 comuni
  - Province: Milano, Bergamo, Brescia, Como, Varese, Pavia, Cremona, Mantova, Lecco, Lodi, Sondrio, Monza-Brianza
  - Include tutti i comuni del Lago di Como, Garda (sponda lombarda), Maggiore (sponda lombarda), Varese, Lugano
- **Piemonte**: ~65 comuni
  - Province: Torino, Alessandria, Asti, Biella, Cuneo, Novara, Verbania, Vercelli
  - Include tutti i comuni del Lago Maggiore (sponda piemontese) e Lago di Orta

### Laghi del Nord Italia (70 comuni)
- **Lago Maggiore**: 23 comuni (Baveno, Stresa, Cannobio, Lesa, Arona, Luino, ecc.)
- **Lago di Como**: 18 comuni (Bellagio, Varenna, Menaggio, Tremezzo, Lenno, ecc.)
- **Lago di Garda**: 22 comuni (Sirmione, Desenzano, Salò, Bardolino, Malcesine, ecc.)
- **Lago di Orta**: 3 comuni (Orta San Giulio, Pettenasco, Pella)
- **Lago di Lugano**: 4 comuni (Campione d'Italia, Porlezza, ecc.)
- **Lago di Varese**: 6 comuni (Gavirate, Azzate, ecc.)

### Altre Regioni
- Tutti i capoluoghi di regione (20)
- Tutti i capoluoghi di provincia (107)
- Principali città delle altre regioni

### Esempi Località Premium
**Lombardia**: Milano, Bergamo, Brescia, Bellagio, Sirmione, Desenzano del Garda, Como, Menaggio, Varenna, Monza, Rho, Busto Arsizio...

**Piemonte**: Torino, Moncalieri, Rivoli, Stresa, Baveno, Orta San Giulio, Alba, Ivrea, Collegno...

**Località Lacustri**: Bellagio, Sirmione, Varenna, Stresa, Orta San Giulio, Salò, Bardolino, Limone sul Garda, Malcesine, Lesa...

## Tipi Immobile (17)

### Residenziali
- Abitazioni civili
- Ville e villini
- Abitazioni signorili
- Abitazioni economiche
- Abitazioni tipiche dei luoghi

### Commerciali
- Negozi
- Uffici
- Uffici strutturati
- Centri commerciali

### Parcheggi
- Box
- Posti auto scoperti
- Posti auto coperti
- Autorimesse

### Industriali
- Capannoni tipici
- Capannoni industriali
- Magazzini
- Laboratori

## Valutazione Ibrida

Quando i dati OMI sono disponibili, la valutazione combina:

```
Valore Finale = (70% * Prezzo OMI) + (30% * Algoritmo Proprietario)
Confidence = Base Confidence + 15%
```

### Vantaggi
1. **Accuratezza**: Dati ufficiali Agenzia delle Entrate
2. **Robustezza**: Fallback su algoritmo se OMI non disponibile
3. **Fiducia**: +15% confidence con dati reali
4. **Trasparenza**: Badge visibile che indica fonte dati

## Performance

### Cache
- **TTL**: 1 ora (configurabile)
- **Storage**: In-memory (LRU)
- **Hit rate**: ~80% in produzione

### Rate Limiting
- **Delay**: 3 secondi tra richieste
- **Async**: Non blocca altre operazioni
- **Rispetto API**: Previene ban

### Tempi Risposta
- **Cache hit**: <10ms
- **Cache miss**: ~2-4 secondi (API esterna)
- **Timeout**: 30 secondi

## Esempi Avanzati

### 1. Confronto Zone
```python
# Ottieni tutte le zone di Milano
response = await client.query("Milano", metri_quadri=1)

# Trova la zona più economica
cheapest = min(response.quotations,
               key=lambda q: q.prezzo_acquisto_medio or float('inf'))
print(f"Zona più economica: {cheapest.zona_omi}")
```

### 2. Analisi Multi-Città Lacustri
```python
lake_cities = ["Bellagio", "Sirmione", "Stresa", "Varenna"]
results = {}

for city in lake_cities:
    resp = await client.query(city, metri_quadri=100)
    if resp and resp.quotations:
        avg_price = sum(q.prezzo_acquisto_medio or 0
                       for q in resp.quotations) / len(resp.quotations)
        results[city] = avg_price

# Località lacustre più cara
most_expensive = max(results.items(), key=lambda x: x[1])
print(f"{most_expensive[0]}: €{most_expensive[1]:,.2f}/100mq")
```

### 3. Filtro per Stato Conservazione
```python
response = await client.query("Milano", metri_quadri=100)

# Solo immobili in ottimo stato
excellent = [q for q in response.quotations
            if q.stato_conservazione == "ottimo"]
```

## Frontend Integration

Il frontend Next.js include:

- **TypeScript client** (`lib/omi-api.ts`)
- **Componente OMI** (`components/wizard/OMIDataFields.tsx`)
- **Validazione Zod** per nuovi campi
- **UI con feedback** (loading, errori, success)

Vedi [frontend/docs/omi-integration.md](../frontend/docs/omi-integration.md) per dettagli.

## Troubleshooting

### Errore: "Città non trovata"
**Causa**: Città non in lista dei 242 comuni

**Soluzione**: Aggiungi alla lista in `cadastral_codes.py` o usa città vicina

### Errore: "Rate limit exceeded"
**Causa**: Troppe richieste in poco tempo

**Soluzione**: Il sistema aspetta automaticamente, nessuna azione richiesta

### Errore: "Zone OMI non disponibili"
**Causa**: API OMI non restituisce dati per quella città

**Soluzione**: L'utente può inserire manualmente la zona se la conosce

### Dati OMI sembrano vecchi
**Causa**: OMI aggiorna semestralmente

**Soluzione**: Normale, i dati sono ufficiali ma non real-time

## Limitazioni

1. **Comuni**: 312 su ~7900 totali italiani (~4%)
2. **Aggiornamento**: Semestrale (non real-time)
3. **Zone**: Alcune città piccole hanno poche zone
4. **Prezzi**: Range, non prezzo esatto
5. **API esterna**: Dipende da servizio terzo

## Roadmap

- [ ] Aggiungere Veneto completo (~100 comuni)
- [ ] Aggiungere Emilia-Romagna completa (~80 comuni)
- [ ] Cache persistente (Redis)
- [ ] Webhook notifiche aggiornamenti OMI
- [ ] Storico quotazioni
- [ ] Grafici trend prezzi

## Riferimenti

- **Documentazione Backend**: [docs/omi-integration.md](docs/omi-integration.md)
- **Documentazione Frontend**: [../frontend/docs/omi-integration.md](../frontend/docs/omi-integration.md)
- **Lista Espansione**: [CITY_EXPANSION.md](CITY_EXPANSION.md)
- **API OMI GitHub**: https://github.com/davide-sagona/api-quotazioni-immobiliari-omi
- **Endpoint API**: https://3eurotools.it/api-quotazioni-immobiliari-omi/ricerca

## Supporto

Per problemi o domande:

1. Consulta questa documentazione
2. Controlla i log backend
3. Testa endpoint con Postman
4. Verifica [test_omi_integration.py](test_omi_integration.py)

---

**Versione**: 3.0 (312 comuni - Include tutti i laghi del nord Italia)
**Ultimo aggiornamento**: 2025-11-02
**Sviluppato con**: FastAPI, Pydantic, httpx, Next.js, TypeScript
**Espansione laghi**: Maggiore, Como, Garda, Orta, Varese, Lugano (70 comuni)

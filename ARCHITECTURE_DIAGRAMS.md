# HomeEstimate - Architecture Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HomeEstimate Platform                             │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────────┐
                    │   Web Browser & Extension    │
                    │  (Chrome/Edge + Extension)   │
                    └──────────────┬───────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
      Browser-Ext          Frontend App          External Websites
      (content.js)      (Next.js 15, React)      (Idealista, etc)
      ┌────────────┐     ┌────────────┐         ┌────────────┐
      │  content   │     │   UI/UX    │         │   Scrape   │
      │  Photo     │────▶│  Wizard    │────────▶│   Data     │
      │  Extraction│     │  5 Steps   │         │            │
      └────────────┘     └────────────┘         └────────────┘
           │                   │
           │ URL + Data        │ API Calls
           │ (URLencoded)      │ (JSON)
           ▼                   ▼
      ┌─────────────────────────────────────────────────────────┐
      │          Backend FastAPI Service (8000)                 │
      ├─────────────────────────────────────────────────────────┤
      │  • Scraper API        (parse-url)                      │
      │  • OMI API            (query, prices, suggestions)     │
      │  • Photo Analysis     (OpenAI Vision)                  │
      │  • Valuation API      (calculate estimates)            │
      └─────────────────────────────────────────────────────────┘
           │
      ┌────┴────────────┬──────────────────┬────────────────┐
      │                 │                  │                │
      ▼                 ▼                  ▼                ▼
  ┌────────────┐ ┌────────────┐  ┌───────────────┐  ┌──────────────┐
  │   OMI API  │ │   OpenAI   │  │  localStorage │  │   Logging &  │
  │  External  │ │   Vision   │  │   /IndexedDB  │  │   Cache Files│
  │ (3eurotools)│ │  (photos)  │  │   (Frontend)  │  │ (Backend)    │
  └────────────┘ └────────────┘  └───────────────┘  └──────────────┘

Frontend: http://localhost:3000
Backend:  http://localhost:8000
API Docs: http://localhost:8000/docs
```

---

## Data Flow - Property Valuation Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                    START: User Input                               │
└─────────────────────────────────────────────────────────────────────┘
                            │
                Step 1: URL Input
                            │
        ┌───────────────────┴────────────────────┐
        │ (via Extension) OR (Manual Input)       │
        │ • Copy listing URL                      │
        │ • Idealista / Immobiliare / Casa.it    │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│           Step 2: Property Data Extraction & Parsing               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Browser Extension (content.js)        Backend Scraper (Selenium) │
│ • DOM-based extraction                • fetch_url_with_selenium()│
│ • Fast, no API calls                  • Selenium Edge webdriver  │
│ • On-site websites only               • Parse HTML w/ BS4        │
│                          ▼                                         │
│              Create PropertyData object                           │
│              • url, title, price, address, city                  │
│              • surface, rooms, bathrooms, floor                  │
│              • hasElevator, hasParking, hasBalcony               │
│              • energyClass, state, yearBuilt                     │
│              • images[] (photo URLs)                             │
│                                                                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
        Step 3: Photo Download & Analysis
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    Download Photos   Analyze w/ OpenAI Vision
    to /storage/      • Input: base64 image + prompt
    photos/           • Model: gpt-4-vision
    {listing_id}/     • Output: PhotoConditionResult
                      • Label: ottimo/buono/discreto/da_ristrutturare
                      • Confidence score: 0-1
                      • Reasoning with details

┌──────────────────────────────────────────────────────────────┐
│              Step 4: Complete Missing Data                  │
├──────────────────────────────────────────────────────────────┤
│ User Manual Input:                                          │
│ • Verify/correct extracted data                            │
│ • Add missing fields (province, postalCode, etc)          │
│ • OMI Zone (auto-suggested or manual)                      │
│ • Property Type (auto-suggested or manual)                 │
│                                                             │
│ Validation (Zod schemas):                                  │
│ • Address (min 5 chars)                                    │
│ • City (min 2 chars)                                       │
│ • Surface (10-10000 mq)                                    │
│ • Price (1000-100M euros)                                  │
│ • All optional fields bounds checked                       │
└──────────────────────────────────────────────────────────────┘
                 │
        Step 5: Location Verification
                 │
        • Map display (React Leaflet)
        • GPS coordinates lookup
        • User can adjust pin if needed
        • Confirms address match

┌──────────────────────────────────────────────────────────────┐
│           Step 6: Hybrid Valuation Calculation              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ OMI Data Query (70% weight)                          │   │
│ │ • Get OMI client                                     │   │
│ │ • Query: city + tipo_immobile + zona_omi + mq      │   │
│ │ • Response: quotations with prices                  │   │
│ │ • Cache for 1 hour (3600s)                         │   │
│ │ • Rate limit: 3 sec between requests               │   │
│ │ • Extract: min/max/median prices                    │   │
│ └──────────────────────────────────────────────────────┘   │
│                           ▼                                  │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Custom Valuation Algorithm (30% weight)              │   │
│ │ • _city_base_price() - location factor              │   │
│ │ • _adjust_price_per_sqm():                          │   │
│ │   - Surface adjustments (small +12%, large -8%)     │   │
│ │   - Floor premium (floor>=4 +5%)                    │   │
│ │   - Room density ratio check                        │   │
│ │   - Bedroom percentage evaluation                   │   │
│ │   - Bathroom count premium (2+ rooms, 3+ rooms)    │   │
│ │   - Listed price ratio analysis                     │   │
│ │ • Calculate confidence score (0-100)                │   │
│ │ • Estimate value range (min/max)                    │   │
│ └──────────────────────────────────────────────────────┘   │
│                           ▼                                  │
│ Final Estimate:                                            │
│ • estimatedValue (euro amount)                            │
│ • pricePerSqm (€/m²)                                      │
│ • estimatedValueMin / Max (range)                         │
│ • confidence (0-100)                                      │
│ • qualityScore (data completeness)                        │
│                                                            │
└──────────────────────────────────────────────────────────────┘
                 │
        Step 7: Report Generation
                 │
        • Show valuation results
        • Display market position (sotto/in_linea/sopra)
        • Comparable properties (if available)
        • Market trend analysis
        • Export options (JSON, etc)
                 │
                 ▼
        ┌────────────────────────┐
        │  SAVED TO IndexedDB   │
        │  • evaluations table  │
        │  • omiSnapshots table │
        │  • feedbacks table    │
        └────────────────────────┘
```

---

## Frontend Component Hierarchy

```
┌─ App (page.tsx)
│   │
│   ├─ WizardStepper
│   │   └─ Step indicators (1-5)
│   │
│   ├─ Step1UrlInput
│   │   ├─ Input field (URL)
│   │   ├─ Submit button
│   │   └─ Loading spinner
│   │
│   ├─ Step2CompleteData
│   │   ├─ LocationFields
│   │   │   ├─ address input
│   │   │   ├─ city input
│   │   │   ├─ province select
│   │   │   └─ postalCode input
│   │   │
│   │   ├─ PropertyCharacteristics
│   │   │   ├─ surface input
│   │   │   ├─ rooms number
│   │   │   ├─ bedrooms number
│   │   │   ├─ bathrooms number
│   │   │   ├─ floor select
│   │   │   └─ totalFloors input
│   │   │
│   │   ├─ PropertyFeatures (checkboxes)
│   │   │   ├─ hasElevator
│   │   │   ├─ hasParking
│   │   │   ├─ hasBalcony
│   │   │   ├─ hasCellar
│   │   │   └─ hasGarden
│   │   │
│   │   ├─ PropertyEnergy
│   │   │   ├─ energyClass select
│   │   │   └─ yearBuilt input
│   │   │
│   │   ├─ OMIDataFields
│   │   │   ├─ propertyTypeOMI input
│   │   │   └─ zonaOMI input
│   │   │
│   │   └─ ImageGallery
│   │       ├─ Photo thumbnails
│   │       └─ Upload button
│   │
│   ├─ Step3VerifyLocation
│   │   ├─ MapContainer (React Leaflet)
│   │   │   ├─ TileLayer (OSM)
│   │   │   ├─ Marker (draggable)
│   │   │   └─ Popup (address info)
│   │   └─ Coordinates display
│   │
│   ├─ Step4Calculation
│   │   ├─ Loading indicator
│   │   ├─ API calls to backend
│   │   │   ├─ GET /api/omi/query
│   │   │   ├─ GET /api/omi/purchase-price
│   │   │   └─ POST /api/valuation/evaluate
│   │   └─ Results compilation
│   │
│   └─ Step5Report
│       ├─ EstimatedValue display
│       ├─ PricePerSqm
│       ├─ ConfidenceScore (Progress bar)
│       ├─ Charts (Recharts)
│       │   ├─ Price range chart
│       │   ├─ Market position
│       │   └─ Trend visualization
│       ├─ ComparablesList
│       └─ Export buttons
```

---

## Backend API Structure

```
FastAPI App (main.py)
│
├─ CORS Middleware
│   └─ Allow origins: localhost:3000, localhost:3001
│
├─ Router: /api
│   │
│   ├─ /scraper
│   │   ├─ POST /parse-url          → scraper.py
│   │   │   ├─ Validate URL domain
│   │   │   ├─ fetch_url_with_selenium()
│   │   │   ├─ parse_idealista() OR parse_immobiliare() OR parse_casa()
│   │   │   ├─ extract_number() helper
│   │   │   ├─ download_photos_locally()
│   │   │   ├─ analyze_photo_condition()
│   │   │   └─ Return PropertyData
│   │   │
│   │   └─ GET /health → {"status": "healthy"}
│   │
│   ├─ /omi
│   │   ├─ POST /query              → omi.py
│   │   │   ├─ get_omi_client()
│   │   │   ├─ client.query()
│   │   │   └─ Return OMIResponse
│   │   │
│   │   ├─ GET /purchase-price      → omi.py
│   │   │   ├─ get_property_type()
│   │   │   ├─ client.get_purchase_price()
│   │   │   └─ Return {min, max, medio}
│   │   │
│   │   ├─ GET /rental-price        → omi.py
│   │   │   └─ Similar to purchase-price
│   │   │
│   │   ├─ GET /property-types      → omi.py
│   │   │   └─ Return List[PropertyTypeInfo]
│   │   │
│   │   ├─ GET /cadastral-code      → omi.py
│   │   │   └─ Return {city, code}
│   │   │
│   │   ├─ GET /cities              → omi.py
│   │   │   └─ Return List[CadastralCodeInfo]
│   │   │
│   │   ├─ GET /suggest             → omi.py
│   │   │   ├─ suggest_property_type()
│   │   │   ├─ suggest_omi_zone()
│   │   │   └─ Return suggestions
│   │   │
│   │   └─ GET /health              → {"status": "healthy"}
│   │
│   ├─ /analysis
│   │   ├─ POST /analyze-photos     → photo_analysis.py
│   │   ├─ POST /analyze-with-download
│   │   ├─ POST /analyze-base64
│   │   ├─ POST /upload-storage
│   │   ├─ POST /from-storage
│   │   └─ GET /health
│   │
│   └─ /valuation
│       ├─ POST /evaluate           → valuation.py
│       │   ├─ _normalize()
│       │   ├─ _city_base_price()
│       │   ├─ _adjust_price_per_sqm()
│       │   └─ Return ValuationResult
│       │
│       └─ GET /health              → {"status": "healthy"}
│
└─ Root Routes
    ├─ GET /       → {"message": "HomeEstimate API", ...}
    ├─ GET /health → {"status": "healthy"}
    └─ GET /favicon.ico → base64 image
```

---

## OMI Client Integration

```
OMIClient (client.py)
│
├─ Configuration
│   ├─ BASE_URL: "https://3eurotools.it/api-quotazioni-immobiliari-omi/ricerca"
│   ├─ Cache TTL: 3600 seconds (1 hour)
│   └─ Rate limit delay: 3 seconds
│
├─ Core Methods
│   ├─ async query()
│   │   ├─ Check cache first
│   │   ├─ Wait for rate limit
│   │   ├─ Build request params
│   │   ├─ Call external API
│   │   ├─ Parse response
│   │   ├─ Cache result
│   │   └─ Return OMIResponse
│   │
│   ├─ async get_purchase_price()
│   │   ├─ Extract purchase quotations
│   │   ├─ Calculate min/max/median
│   │   └─ Return prices dict
│   │
│   ├─ async get_rental_price()
│   │   └─ Similar to get_purchase_price()
│   │
│   ├─ _generate_cache_key()
│   │   └─ Create unique key from params
│   │
│   ├─ _extract_data_container()
│   │   └─ Handle API response variations
│   │
│   ├─ _parse_quotations()
│   │   └─ Extract OMIQuotation objects
│   │
│   └─ async _wait_for_rate_limit()
│       └─ Sleep if needed
│
├─ Supporting Modules
│   ├─ cadastral_codes.py
│   │   ├─ CADASTRAL_CODES dict (312 cities)
│   │   ├─ get_cadastral_code(city_name)
│   │   ├─ search_city_by_code(code)
│   │   └─ get_all_cities()
│   │
│   ├─ property_types.py
│   │   ├─ PropertyType enum (17 types)
│   │   │   ├─ appartamento
│   │   │   ├─ villa
│   │   │   ├─ terreno
│   │   │   ├─ negozio
│   │   │   ├─ ufficio
│   │   │   └─ ... (13 more)
│   │   │
│   │   ├─ PROPERTY_TYPE_MAPPING
│   │   ├─ get_property_type(name)
│   │   └─ get_property_type_display_name(type)
│   │
│   └─ suggester.py
│       ├─ suggest_property_type(address, description)
│       ├─ suggest_omi_zone(city, address)
│       ├─ get_zone_description(zone)
│       └─ Intelligent naming logic
│
└─ OMICache (internal)
    ├─ Cache dict with TTL tracking
    ├─ get(key) → OMIResponse or None
    ├─ set(key, value)
    └─ clear()
```

---

## Photo Analysis Pipeline

```
PhotoConditionServiceError (custom exception)
│
└─ analyze_photo_condition(photo_urls: List[str]) → PhotoConditionResult
   │
   ├─ Build OpenAI Vision API request
   │   ├─ _build_messages(photo_urls, locale)
   │   ├─ System prompt (Italian)
   │   └─ Photos as image_url
   │       ├─ HTTP URLs (direct)
   │       └─ Local files → base64 data URLs
   │
   ├─ Call OpenAI API
   │   ├─ Model: gpt-4-vision
   │   ├─ Prompt: Multi-language schema
   │   └─ Response: JSON string
   │
   ├─ Parse Response
   │   ├─ _clean_json_text() to extract JSON
   │   ├─ Map fields:
   │   │   ├─ condition_label → label
   │   │   ├─ condition_score → score (0-100)
   │   │   ├─ confidence → confidence (0-1)
   │   │   ├─ reasoning → reasoning text
   │   │   └─ per_photo[] → PhotoConditionPerPhoto[]
   │   │
   │   └─ Validate with Pydantic
   │       ├─ label in PHOTO_CONDITION_LABELS
   │       ├─ score 0-100
   │       └─ confidence 0-1
   │
   └─ Return PhotoConditionResult
       ├─ label: "da_ristrutturare" | "discreto" | "buono" | "ottimo"
       ├─ score: 0-100 (higher = better condition)
       ├─ confidence: 0-1 (assessment certainty)
       ├─ reasoning: "Detailed explanation in Italian"
       └─ per_photo: [{url, summary, issues}, ...]
```

---

## Database Schema (IndexedDB via Dexie)

```
HomeEstimateDB
│
├─ evaluations (++id)
│   ├─ Indexes: createdAt, updatedAt, addressHash, city, omiZone, status, qualityScore
│   ├─ id: number (primary key)
│   ├─ createdAt: number (epoch ms)
│   ├─ updatedAt: number
│   ├─ addressHash: string (SHA-256)
│   ├─ city: string
│   ├─ rawUrl: string
│   ├─ encryptedPayload: ArrayBuffer
│   ├─ omiZone: string (optional)
│   ├─ status: "draft"|"parsing"|"validating"|"calculating"|"ready"|"error"
│   ├─ qualityScore: number 0-100 (optional)
│   ├─ dataQuality: number 0-100 (optional)
│   ├─ dataSource: "auto"|"manual"|"hybrid" (optional)
│   └─ missingFields: string (JSON array)
│
├─ comparables (++id)
│   ├─ Indexes: evalId, createdAt, distance, priceM2, similarityScore, includedInEstimate
│   ├─ id: number
│   ├─ evalId: number (FK)
│   ├─ createdAt: number
│   ├─ distance: number (meters)
│   ├─ priceM2: number
│   ├─ similarityScore: number 0-100
│   ├─ includedInEstimate: boolean
│   ├─ excludeReason: "outlier"|"non_comparabile"|"altro" (optional)
│   └─ encryptedPayload: ArrayBuffer
│
├─ omiSnapshots (++id)
│   ├─ Indexes: [comune+zona+destinazione], comune, zona, destinazione, semestre, createdAt, expiresAt
│   ├─ id: number
│   ├─ comune: string
│   ├─ zona: string
│   ├─ destinazione: string
│   ├─ semestre: string
│   ├─ createdAt: number
│   ├─ expiresAt: number (TTL check)
│   ├─ source: string
│   └─ encryptedPayload: ArrayBuffer
│
├─ failedJobs (++id)
│   ├─ Indexes: jobType, url, attemptCount, lastAttempt, retryAfter
│   ├─ id: number
│   ├─ jobType: string
│   ├─ url: string
│   ├─ attemptCount: number
│   ├─ lastAttempt: number
│   ├─ retryAfter: number
│   └─ errorMessage: string (optional)
│
├─ feedbacks (++id)
│   ├─ Indexes: evalId, ts, userRating
│   ├─ id: number
│   ├─ evalId: number
│   ├─ ts: number
│   ├─ userRating: number (1-5)
│   ├─ actualPrice: number (optional)
│   └─ comments: string (optional)
│
├─ settings (key: string)
│   ├─ key: string (primary key)
│   └─ value: string (JSON)
│
└─ logs (++id)
    ├─ Indexes: level, ts
    ├─ id: number
    ├─ level: "debug"|"info"|"warn"|"error"
    ├─ ts: number
    ├─ message: string
    └─ context: string (JSON, optional)
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Request Processing                        │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴────────┐
                    │                │
            Success Path      Error/Exception Path
                    │                │
                    │         ┌───────┴──────────┐
                    │         │                  │
                    │    Validation Error   Service Error
                    │    (400 Bad Request)  (502/504)
                    │
            ┌───────┴────────────────────────┐
            │                                │
        Response              Custom Exceptions
        (200/201)             ├─ OMIServiceError
                              ├─ OMINoQuotationsError
                              ├─ PhotoConditionServiceError
                              └─ Validation errors

Error Handling in Backend:

/api/scraper/parse-url
├─ InvalidURLError → 400
├─ SeleniumTimeout → 504
├─ ParseError → 500
└─ PhotoAnalysisError → 500 (non-fatal, continues)

/api/omi/query
├─ ValueError (invalid params) → 400
├─ OMIServiceError → 502 (service unavailable)
├─ OMINoQuotationsError → 404
└─ Exception (unexpected) → 500

/api/valuation/evaluate
├─ ValidationError → 400
├─ InsufficientDataError → 400
└─ CalculationError → 500

Frontend Error Handling:
├─ Form validation (Zod) → show field errors
├─ API errors (try-catch) → show toast/alert
├─ Network timeouts → retry logic
└─ IndexedDB quota → handle quota exceeded
```

---

## Data Encryption & Storage Notes

The codebase references encrypted payloads in IndexedDB:
- `evaluations.encryptedPayload: ArrayBuffer`
- `comparables.encryptedPayload: ArrayBuffer`
- `omiSnapshots.encryptedPayload: ArrayBuffer`

However, actual encryption implementation is incomplete. The ArrayBuffers are currently plain JSON-encoded.

**Recommendation**: Implement AES-GCM encryption using Web Crypto API:
```javascript
// Example structure
const encryptPayload = async (data, key) => {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(data))
  );
  return { iv, encrypted };
};
```


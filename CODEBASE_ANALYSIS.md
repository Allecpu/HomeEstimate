# HomeEstimate Codebase - Comprehensive Analysis

## Project Overview

**HomeEstimate** is a professional real estate valuation application for Italian properties that integrates data from multiple sources (Idealista.it, Immobiliare.it, Casa.it) with official Italian real estate market data (OMI - Osservatorio del Mercato Immobiliare) to provide hybrid property valuations.

### Key Purpose
- Parse property listings from Italian real estate websites
- Extract property characteristics and photos
- Query official OMI market data
- Analyze property photos using AI (OpenAI Vision)
- Calculate professional valuations using hybrid methodology
- Provide comprehensive reports with comparables and market trends

---

## Architecture Overview

### High-Level Components

```
HomeEstimate/
├── frontend/          # Next.js 15 web application (React 19, TypeScript)
├── backend/           # FastAPI Python web service
├── browser-extension/ # Chrome/Edge extension for data extraction
└── shared/           # Shared TypeScript types
```

### Technology Stack

#### Frontend
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19, TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React hooks + Zod validation
- **Database**: IndexedDB (Dexie.js) for offline-first approach
- **Maps**: React Leaflet (Leaflet.js)
- **Charts**: Recharts
- **Form Handling**: react-hook-form with Zod validation
- **Build Tools**: TypeScript, ESLint

#### Backend
- **Framework**: FastAPI (Python 3.10+)
- **HTTP Client**: httpx (async)
- **Web Scraping**: BeautifulSoup4, Selenium/Edge webdriver
- **Retry Logic**: Tenacity
- **Data Validation**: Pydantic 2.0
- **CORS**: FastAPI middleware
- **Server**: Uvicorn

#### Browser Extension
- **Type**: Manifest V3 Chrome/Edge extension
- **JavaScript**: Vanilla JS (no frameworks)
- **Content Scripts**: DOM extraction and photo capture
- **Data Format**: JSON serialization and URL encoding

#### External Services
- **OMI API**: https://3eurotools.it/api-quotazioni-immobiliari-omi/ricerca
- **Photo Analysis**: OpenAI Vision API (requires OPENAI_API_KEY)

---

## Project Structure in Detail

### 1. Frontend (/frontend)

**Root Configuration:**
- `package.json` - Dependencies (React 19, Next.js 15, TypeScript)
- `tsconfig.json` - TypeScript configuration (strict mode, path aliases)
- `tailwind.config.ts` - Tailwind CSS customization
- `next.config.ts` - Next.js configuration (currently minimal)
- `postcss.config.mjs` - PostCSS setup
- `components.json` - shadcn/ui configuration

**App Structure:**
```
app/
├── layout.tsx        # Root layout with globals.css
├── page.tsx          # Main wizard interface
├── globals.css       # Global styles
└── api/
    ├── image-proxy/  # Image proxy route (route.ts)
    └── parse-url/    # URL parsing route (route.ts)
```

**Components (React):**
```
components/
├── ui/              # shadcn/ui components
│   ├── select.tsx
│   ├── input.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── textarea.tsx
│   ├── checkbox.tsx
│   ├── label.tsx
│   ├── alert.tsx
│   ├── badge.tsx
│   └── progress.tsx
│
└── wizard/          # Multi-step wizard (4,190 lines total)
    ├── WizardStepper.tsx         # Stepper component
    ├── Step1UrlInput.tsx         # URL input and parsing
    ├── Step2CompleteData.tsx     # Property data completion
    ├── Step3VerifyLocation.tsx   # Map verification
    ├── Step4Calculation.tsx      # Valuation calculation
    ├── Step5Report.tsx           # Results report
    ├── OMIDataFields.tsx         # OMI-specific fields
    ├── ImageGallery.tsx          # Photo gallery
    └── types.ts                  # TypeScript interfaces
```

**Libraries & Utilities:**
```
lib/
├── db.ts              # IndexedDB schema and operations (Dexie.js)
├── validation.ts      # Zod schemas for form validation
├── omi-api.ts         # OMI API client wrapper
├── photo-analysis.ts  # Photo analysis utilities
└── utils.ts           # Helper functions
```

**Hooks:**
```
hooks/
└── useExtensionData.ts # Custom hook for browser extension integration
```

**Database Schema (IndexedDB):**
- `evaluations`: Property valuations with encryption
- `comparables`: Similar property listings
- `omiSnapshots`: Cached OMI market data
- `failedJobs`: Failed extraction jobs for retry
- `feedbacks`: User feedback on valuations
- `settings`: User preferences
- `logs`: Application logs

**Key Features:**
- Offline-first with IndexedDB caching
- 5-step wizard workflow
- Real-time form validation
- Map integration for location verification
- Photo gallery and analysis
- OMI data integration
- Encrypted data storage

### 2. Backend (/backend)

**Root Configuration & Scripts:**
- `requirements.txt` - Python dependencies (FastAPI, httpx, BeautifulSoup4, Playwright, etc.)
- `start-backend.bat` / `start-backend.ps1` - Startup scripts (Windows)
- `.env.example` - Environment variables template
- Test files: `test_omi_integration.py`, `test_endpoint.py`, `test_omi_debug.py`, etc.

**Core Application Structure:**
```
app/
├── main.py              # FastAPI application setup with CORS
├── models/
│   └── __init__.py      # Data models (empty - using Pydantic inline)
│
├── api/                 # REST API endpoints (20k lines)
│   ├── __init__.py      # Router configuration
│   ├── scraper.py       # Property data extraction (20k lines)
│   ├── omi.py          # OMI quotation queries (9.5k lines)
│   ├── valuation.py    # Valuation calculation (12k lines)
│   └── photo_analysis.py # Photo analysis API (18.7k lines)
│
├── omi/                 # OMI integration module (1.5k lines)
│   ├── __init__.py      # Module exports
│   ├── client.py        # OMI HTTP client with caching (725 lines)
│   ├── cadastral_codes.py # Italian municipality codes (312 cities)
│   ├── property_types.py # 17 property type definitions
│   └── suggester.py      # Automatic zone/type suggestion
│
├── scraper/             # Web scraping module
│   └── __init__.py
│
└── valuation/           # Valuation calculation
    ├── __init__.py
    └── photo_condition.py # AI photo analysis (10.7k lines)
```

**Key Backend Features:**

1. **Scraper Module** (`api/scraper.py`):
   - Selenium/Edge webdriver for dynamic content loading
   - Parsers for 3 sites: Idealista.it, Immobiliare.it, Casa.it
   - Photo extraction and local storage
   - Property data models with 20+ fields
   - Data validation with Pydantic

2. **OMI Integration** (`api/omi.py` + `omi/client.py`):
   - 7 REST endpoints for OMI data queries
   - Support for 312 Italian municipalities
   - 17 property types
   - 1-hour cache with TTL management
   - Rate limiting (1 request/3 seconds)
   - Error handling for service outages
   - Hybrid valuation: 70% OMI + 30% custom algorithm

3. **Photo Analysis** (`api/photo_analysis.py`):
   - OpenAI Vision API integration
   - Base64 encoding for photo submission
   - Local photo storage and management
   - Condition assessment (ottimo/buono/discreto/da_ristrutturare)
   - Confidence scoring

4. **Valuation** (`api/valuation.py`):
   - Price per sqm calculation
   - City-based base price adjustments
   - Surface-based price modifiers
   - Room density analysis
   - Bathroom count premium
   - Listed price ratio analysis
   - Confidence scoring

**Storage Structure:**
```
backend/storage/
├── photos/           # Downloaded property photos
│   └── {listing_id}/
│       ├── photo_000.jpg
│       ├── photo_001.jpg
│       └── ...
└── analysis/         # Analysis results cache
```

**Test Files:**
- `tests/test_api_omi_prices.py` - API endpoint tests
- `test_omi_integration.py` - OMI client tests
- `test_endpoint.py` - Basic endpoint testing
- `test_omi_debug.py` - Debug API responses
- `test_suggest.py` - Zone/type suggestion tests
- `test_playwright.py` - Scraper testing

### 3. Browser Extension (/browser-extension)

**Manifest & Configuration:**
- `manifest.json` - Extension metadata (V3)
- Supports: Idealista.it, Immobiliare.it, Casa.it
- Permissions: activeTab, storage, scripting, tabs

**Core Files:**
- `content.js` (1,049 lines) - DOM extraction and data parsing
- `popup.js` (546 lines) - UI and communication
- `popup.html` - Extension interface
- `injector.js` - Content script injector

**Features:**
- Automatic data extraction from listing pages
- Full-size photo extraction
- Data preview and validation
- JSON data export
- URL transformation to HomeEstimate
- Error handling and fallbacks

**Icons:**
- Multiple resolutions (16, 48, 128 px)
- Color PNG icons

### 4. Shared Types (/shared)

**shared/types.ts** (159 lines):
Defines shared TypeScript interfaces for:
- `EvalStatus` - Evaluation workflow states
- `DataSource` - Data origin tracking
- `PropertyType` - Property classifications
- `PropertyState` - Condition states
- `EnergyClass` - Energy performance classes
- `Property` - Main property interface
- `OMIData` - Market data structure
- `Comparable` - Similar properties
- `ValuationResult` - Complete valuation data

---

## API Endpoints

### Scraper Endpoints
```
POST   /api/scraper/parse-url     # Parse listing URL and extract data
GET    /api/scraper/health        # Health check
```

**Response Model:**
- url, title, description, price
- address, city, province, postalCode
- surface, rooms, bedrooms, bathrooms, floor, totalFloors
- hasElevator, hasParking, hasBalcony, hasCellar
- propertyType, state, energyClass, yearBuilt
- images[], photoCondition
- source (idealista/immobiliare/casa)

### OMI Endpoints
```
POST   /api/omi/query              # Query complete OMI data
GET    /api/omi/purchase-price     # Get purchase prices (min/max/avg)
GET    /api/omi/rental-price       # Get rental prices (min/max/avg)
GET    /api/omi/property-types     # List supported property types
GET    /api/omi/cadastral-code     # Get cadastral code for city
GET    /api/omi/cities             # List all supported cities
GET    /api/omi/suggest            # Auto-suggest type and zone
GET    /api/omi/health             # Health check
```

### Analysis Endpoints
```
POST   /api/analysis/analyze-photos          # Analyze photo URLs
POST   /api/analysis/analyze-with-download   # Download and analyze
POST   /api/analysis/analyze-base64          # Analyze base64 photos
POST   /api/analysis/upload-storage          # Upload to storage
POST   /api/analysis/from-storage            # Analyze from storage
GET    /api/analysis/health                  # Health check
```

### Valuation Endpoints
```
POST   /api/valuation/evaluate     # Calculate property valuation
GET    /api/valuation/health       # Health check
```

---

## Data Models & Validation

### Validation Framework
- **Frontend**: Zod schemas for client-side validation
- **Backend**: Pydantic models for API validation

### Key Schemas (Frontend - Zod)
```typescript
urlSchema              # URL validation with domain whitelist
propertySchema         # Complete property data (80+ fields)
```

### Key Models (Backend - Pydantic)
```python
PropertyData           # Scraped property information
OMIQueryRequest        # OMI query parameters
OMIResponse            # OMI API response wrapper
OMIQuotation           # Market quotation data
PhotoAnalysisRequest   # Photo analysis request
PhotoConditionResult   # Photo condition assessment
```

---

## Configuration & Environment

### Environment Variables (.env.example)
```
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
OMI_API_URL=https://www1.agenziaentrate.gov.it/servizi/omi/
OPENAI_API_KEY=                    # Required for photo analysis
```

### Frontend Configuration
- API Base URL: `process.env.NEXT_PUBLIC_API_URL` (default: http://localhost:8000)
- Next.js App Router with path aliases (@/*)

### Backend Configuration
- CORS Origins: localhost:3000, localhost:3001
- Uvicorn server on port 8000
- Rate limiting: 3 seconds between OMI requests
- Cache TTL: 1 hour (3600 seconds)

---

## Dependencies Analysis

### Frontend Dependencies (package.json)
```
Core Framework:
- next@15.5.6
- react@19.1.0
- react-dom@19.1.0
- typescript@^5

UI & Components:
- tailwindcss@^3.4.18
- class-variance-authority@^0.7.1
- lucide-react@^0.546.0
- @radix-ui/* (checkbox, label, progress, select, slot)

Database & Storage:
- dexie@^4.2.1

Validation & Forms:
- zod@^4.1.12
- react-hook-form@^7.65.0
- @hookform/resolvers@^5.2.2

Maps & Charts:
- leaflet@^1.9.4
- react-leaflet@^5.0.0
- recharts@^3.3.0

Utilities:
- clsx@^2.1.1
- tailwind-merge@^3.3.1
- jszip@^3.10.1

Dev Dependencies:
- autoprefixer@^10.4.21
- postcss@^8.5.6
- eslint@^9
- eslint-config-next@15.5.6
```

### Backend Dependencies (requirements.txt)
```
Core Framework:
- fastapi>=0.100.0
- uvicorn[standard]>=0.23.0
- pydantic>=2.0.0
- pydantic-settings>=2.0.0

HTTP & Scraping:
- httpx[http2]>=0.24.0
- beautifulsoup4>=4.12.0
- lxml>=4.9.0
- playwright>=1.40.0

Utilities:
- python-multipart>=0.0.6
- python-dotenv>=1.0.0
- tenacity>=8.0.0

Optional (commented):
- pandas>=2.0.0
- numpy>=1.24.0
- geopy>=2.3.0
- scikit-learn>=1.3.0
```

---

## Testing Strategy

### Backend Tests
- **Location**: `backend/tests/` and `backend/*.py`
- **Framework**: pytest with FastAPI TestClient
- **Coverage**: 
  - API endpoint testing
  - OMI integration testing
  - Data parsing and validation
  - Error handling and edge cases

### Frontend Tests
- Basic validation tests (test-validation.js)
- Completeness checks (test-completeness.js)
- Photo characteristic tests (test-characteristics.js)
- NaN handling tests (test-nan.js)

### Browser Extension Tests
- URL transformation verification
- Photo extraction testing
- Content script injection
- Data serialization

---

## Documentation

### Key Documentation Files
- `README.md` - Main project overview (Italian)
- `QUICK_START.md` - Setup instructions
- `TROUBLESHOOTING.md` - Common issues and solutions
- `backend/README_OMI.md` - OMI integration guide
- `backend/docs/omi-integration.md` - Detailed OMI API documentation
- `frontend/README.md` - Frontend-specific setup
- `browser-extension/README.md` - Extension installation and usage
- `HomeEstimate.md` - Comprehensive feature documentation

### Debug & Analysis Files
- `ANALISI-ESTENSIONE-FOTO.md` - Photo extraction analysis
- `ANALISI_AI_PERSISTENTE.md` - AI analysis persistence
- `ERRORI_RISOLTI.md` - Fixed errors log
- `ESTENSIONE_FUNZIONANTE.md` - Working extension notes
- `FASE1_COMPLETATA.md` - Phase 1 completion notes
- `LAKE_CITIES.md` - Northern Italy lake region cities
- `CITY_EXPANSION.md` - City database expansion notes

---

## Project Status & Roadmap

### Phase 1 - MVP (Completed)
- ✅ Next.js + FastAPI project setup
- ✅ IndexedDB schema with Dexie
- ✅ Multi-step wizard with validation
- ✅ Basic web scraper
- ✅ Simplified valuation API endpoint
- 🚧 OMI API integration (mostly complete)
- 🚧 Comparable properties system
- 🚧 Hybrid valuation model
- 🚧 Dashboard with charts

### Phase 2 - Advanced Features (Planned)
- Temporal trend analysis
- Renovation ROI simulator
- Financial calculator
- PDF/CSV/JSON export

### Phase 3 - Optimization (Planned)
- PWA and offline-first enhancements
- Sensitive data encryption
- User feedback system
- Performance optimization

---

## Notable Patterns & Architecture Decisions

### 1. Hybrid Valuation Methodology
- 70% weight: Official OMI data (government source)
- 30% weight: Custom algorithm based on:
  - Listed price analysis
  - Surface-based adjustments
  - Room density metrics
  - Floor position premium
  - Bathroom count premium

### 2. Offline-First Approach
- IndexedDB for local data persistence
- Snapshot-based OMI caching (6-month TTL)
- Auto-cleanup of stale data every 6 hours
- Quota exceeded handling with prioritized cleanup

### 3. Multi-Source Data Integration
- **Browser Extension**: Direct DOM extraction (no API calls needed)
- **Backend Scraper**: Selenium for dynamic content
- **Official OMI API**: Government market data
- **OpenAI Vision**: AI photo analysis (when available)

### 4. Wizard-Based User Experience
- 5-step guided workflow
- Progressive data enrichment
- Real-time validation feedback
- Map-based location verification
- Visual report generation

### 5. Rate-Limited API Access
- 3-second delay between OMI requests
- Cache-first strategy to minimize API calls
- Automatic retry on service errors
- Graceful degradation on API outages

### 6. Error Handling Patterns
- Custom exception types (OMIServiceError, OMINoQuotationsError, PhotoConditionServiceError)
- HTTP status codes: 400 (validation), 404 (not found), 502 (service), 504 (timeout)
- Detailed error messages for debugging
- Logging throughout the application

### 7. Browser Extension Integration
- URL parameter passing for seamless handoff
- JSON encoding for data serialization
- Manifest V3 for modern browser compatibility
- Content scripts for non-intrusive extraction

---

## Code Organization Metrics

### File & Code Distribution
- **Total Source Files**: 78
- **Backend Python**: ~3,606 lines
- **Frontend TypeScript/React**: ~4,190 lines (wizard only)
- **Browser Extension**: ~1,595 lines
- **API Endpoints**: ~20 KB of code
- **OMI Module**: ~1,512 lines
- **Database Operations**: ~351 lines (Dexie.js)

### Module Breakdown
- **API Routes**: 4 routers (scraper, omi, valuation, analysis)
- **Components**: 15+ React components
- **Database Tables**: 7 tables in IndexedDB
- **Test Files**: 8+ test files

---

## Deployment Readiness

### What's Ready
- ✅ Containerizable backend (FastAPI)
- ✅ Static site exportable frontend (Next.js)
- ✅ Environment-based configuration
- ✅ Comprehensive documentation
- ✅ Browser extension with modern manifest

### What Needs Work
- ❌ Docker configuration (Dockerfile not present)
- ❌ CI/CD pipeline (.github/workflows not present)
- ❌ Database persistence (currently IndexedDB only)
- ❌ Authentication/authorization system
- ❌ Logging infrastructure (basic logging only)
- ❌ Monitoring and alerting

---

## Notable Concerns & Observations

### Strengths
1. **Well-Structured Codebase**: Clear separation of concerns (scraper, OMI, valuation)
2. **Type Safety**: Full TypeScript adoption on frontend, Pydantic on backend
3. **Data Validation**: Multi-layer validation (Zod, Pydantic, custom)
4. **Error Handling**: Comprehensive error handling with custom exceptions
5. **Documentation**: Excellent documentation including debug guides
6. **Offline-First**: IndexedDB with automatic cleanup
7. **Integration Testing**: Good coverage of API integrations

### Areas for Improvement
1. **Database Persistence**: No persistent database (only IndexedDB/file storage)
2. **Authentication**: No user authentication system
3. **Rate Limiting**: Client-side only, no server-side rate limiting
4. **Caching Strategy**: Could benefit from Redis for distributed caching
5. **Logging**: Basic logging, no structured logging or log aggregation
6. **Testing**: Limited frontend testing coverage
7. **Deployment**: No containerization or deployment configuration
8. **Photo Storage**: Local filesystem only (not suitable for cloud deployment)
9. **API Documentation**: No Swagger/OpenAPI documentation

### Security Considerations
1. **API Key Exposure**: OPENAI_API_KEY in environment (standard approach but needs .env management)
2. **CORS Configuration**: Hard-coded localhost origins (should be configurable)
3. **Data Encryption**: Mentions encrypted payloads but encryption not fully implemented
4. **Photo Storage**: Local filesystem with no access controls
5. **Web Scraping**: Could trigger anti-bot measures on target websites

---

## Getting Started (Summary)

### Frontend Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev  # http://localhost:3000
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000  # http://localhost:8000/docs
```

### Browser Extension
1. Open chrome://extensions
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select browser-extension folder

---

## Conclusion

HomeEstimate is a well-architected, feature-rich real estate valuation platform that successfully integrates multiple data sources with a professional user interface. The codebase demonstrates solid software engineering practices with clear separation of concerns, comprehensive validation, and thoughtful error handling.

The application is ideal for Italian real estate professionals who need quick, data-driven property valuations leveraging official government market data (OMI) combined with web-scraped information and AI photo analysis.

Key strengths lie in its integration of multiple data sources, offline-first approach, and professional UX design. To be production-ready, it would benefit from persistent database backend, proper authentication, containerization, and cloud-native storage solutions.

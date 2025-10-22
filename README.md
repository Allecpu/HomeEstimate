# HomeEstimate

App per la stima professionale del valore immobiliare a partire da un link di annuncio (Idealista, Immobiliare.it, Casa.it).

## Caratteristiche Principali

- **Wizard Multi-Step**: Interfaccia guidata per inserimento dati
- **Parsing Automatico**: Estrazione automatica dati da annunci online
- **Validazione Zod**: Validazione real-time dei dati in input
- **Database Locale**: IndexedDB per approccio offline-first
- **Valutazione Ibrida**: Stima basata su dati OMI + comparabili
- **Dashboard Interattiva**: Grafici e mappe per analisi comparabili

## Stack Tecnologico

### Frontend
- Next.js 15 (App Router)
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Dexie.js (IndexedDB)
- Zod (validazione)
- Recharts (grafici)

### Backend
- FastAPI (Python)
- BeautifulSoup4 (web scraping)
- Tenacity (retry logic)
- Pandas (analisi dati)

## Struttura del Progetto

```
HomeEstimate/
├── frontend/              # Next.js app
│   ├── app/              # App Router
│   ├── components/       # React components
│   │   └── wizard/      # Wizard multi-step
│   ├── lib/             # Utilities, DB, validations
│   └── public/          # Static assets
├── backend/             # FastAPI
│   └── app/
│       ├── api/        # API endpoints
│       ├── scraper/    # Web scraping
│       ├── omi/        # Integrazione OMI
│       └── valuation/  # Modello stima
└── shared/             # Types condivisi
```

## Setup Sviluppo

### Prerequisiti
- Node.js 18+ e npm
- Python 3.10+
- pip

### Frontend

```bash
cd frontend
npm install

# Copia e configura .env
cp .env.local.example .env.local

# Avvia dev server
npm run dev
```

Il frontend sarà disponibile su [http://localhost:3000](http://localhost:3000)

### Backend

**Opzione 1 - Script automatico (consigliato)**:
```bash
cd backend
start-backend.bat  # Windows
```

**Opzione 2 - Manuale**:
```bash
cd backend

# Crea virtual environment
python -m venv venv

# Attiva virtual environment
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Aggiorna pip
python -m pip install --upgrade pip

# Installa dipendenze
pip install -r requirements.txt

# Avvia server
uvicorn app.main:app --reload --port 8000
```

Il backend sarà disponibile su [http://localhost:8000](http://localhost:8000)

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

**Problemi?** Vedi [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## Fase 1 - MVP (Completata)

- ✅ Setup progetto Next.js + FastAPI
- ✅ Schema database IndexedDB con Dexie
- ✅ Wizard multi-step con validazione Zod
- ✅ Scraper base per parsing annunci
- ✅ Endpoint API valutazione semplificata
- 🚧 Integrazione API OMI
- 🚧 Sistema comparabili con scoring
- 🚧 Modello valutazione ibrido
- 🚧 UI dashboard con grafici

## Roadmap

### Fase 2 - Features Avanzate
- Analisi trend temporale
- Simulatore ROI ristrutturazioni
- Calcolatore finanziario
- Export PDF/CSV/JSON

### Fase 3 - Ottimizzazioni
- PWA e offline-first
- Cifratura dati sensibili
- Sistema feedback utente
- Performance optimization

## API Endpoints

### Scraper
- `POST /api/scraper/parse-url` - Parse annuncio da URL
- `GET /api/scraper/health` - Health check

### Valuation
- `POST /api/valuation/evaluate` - Valuta immobile
- `GET /api/valuation/health` - Health check

## Contribuire

Questo è un progetto in fase di sviluppo attivo. Per contribuire:

1. Fai fork del repository
2. Crea un branch per la tua feature
3. Commit delle modifiche
4. Push e apri una Pull Request

## Licenza

MIT

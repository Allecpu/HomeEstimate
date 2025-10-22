# Setup Playwright per HomeEstimate

## Installazione Backend con Playwright

### 1. Installare le dipendenze Python

Naviga nella cartella backend e installa i requisiti:

```bash
cd C:\Github\HomeEstimate\backend
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Installare i browser Playwright

Dopo aver installato playwright via pip, devi installare i browser:

```bash
playwright install chromium
```

Questo comando scarica il browser Chromium necessario per lo scraping automatizzato.

### 3. Installare le dipendenze di sistema (Windows)

Playwright potrebbe richiedere alcune dipendenze di sistema. Se ricevi errori, esegui:

```bash
playwright install-deps
```

### 4. Riavviare il backend

Dopo l'installazione, riavvia il server backend:

```bash
uvicorn app.main:app --reload --port 8000
```

O semplicemente chiudi e riapri il terminale del backend se stai usando `start-dev.bat`.

---

## Test Rapido

Puoi testare se Playwright funziona correttamente con questo comando curl:

```bash
curl -X POST http://localhost:8000/api/scraper/parse-url ^
  -H "Content-Type: application/json" ^
  -d "{\"url\": \"https://www.idealista.it/immobile/32970155/\"}"
```

Se tutto funziona, dovresti ricevere i dati dell'annuncio in formato JSON.

---

## Vantaggi di Playwright

- **Bypassa protezioni anti-bot**: Usa un browser vero, non solo richieste HTTP
- **JavaScript rendering**: Carica contenuti dinamici che richiedono JavaScript
- **Più affidabile**: Simula il comportamento di un utente reale
- **Headless**: Funziona in background senza aprire finestre

---

## Troubleshooting

### Errore: "Executable doesn't exist"
Esegui: `playwright install chromium`

### Errore: Timeout
Aumenta il timeout in `scraper.py` linea 49:
```python
await page.goto(url, wait_until='networkidle', timeout=60000)  # 60 secondi
```

### Errore: Import error
Assicurati che Playwright sia installato:
```bash
pip show playwright
```

### Browser non si chiude
Il browser viene chiuso automaticamente nel blocco `finally`. Se rimangono processi in background:
```bash
taskkill /F /IM chrome.exe
```

---

## Note

- Il primo scraping sarà più lento perché il browser deve essere avviato
- Playwright usa circa 100-200 MB di RAM per browser instance
- I browser vengono chiusi automaticamente dopo ogni richiesta

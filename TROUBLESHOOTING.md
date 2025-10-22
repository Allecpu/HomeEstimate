# Troubleshooting HomeEstimate

Questa guida risolve i problemi comuni durante il setup e l'esecuzione di HomeEstimate.

## Problemi Backend (Python/FastAPI)

### ❌ Errore: "uvicorn non riconosciuto"

**Causa**: Le dipendenze Python non sono installate correttamente nel virtual environment.

**Soluzione**:

```bash
cd backend

# Elimina il virtual environment esistente (se presente)
Remove-Item -Recurse -Force venv  # PowerShell
# oppure
rmdir /s /q venv  # CMD

# Crea un nuovo virtual environment
python -m venv venv

# Attiva il virtual environment
venv\Scripts\activate  # Windows

# Aggiorna pip
python -m pip install --upgrade pip

# Installa le dipendenze
pip install -r requirements.txt

# Verifica installazione
uvicorn --version

# Avvia il server
uvicorn app.main:app --reload --port 8000
```

### ❌ Errore: "This is an issue with the package mentioned above, not pip"

**Causa**: Conflitto di versioni o pacchetti non disponibili.

**Soluzione 1** - Usa il file requirements.txt aggiornato (già fatto):
```bash
# Il requirements.txt è stato aggiornato con versioni flessibili
pip install -r requirements.txt
```

**Soluzione 2** - Installa solo i pacchetti essenziali:
```bash
pip install fastapi uvicorn[standard] httpx beautifulsoup4 lxml python-dotenv tenacity
```

**Soluzione 3** - Aggiorna Python:
```bash
# Assicurati di avere Python 3.10 o superiore
python --version

# Se hai Python 3.9 o inferiore, aggiorna a Python 3.10+
```

### ❌ Errore: "No module named 'app'"

**Causa**: Stai eseguendo uvicorn dalla directory sbagliata.

**Soluzione**:
```bash
# Assicurati di essere nella directory backend
cd backend

# Verifica la struttura
ls app/  # Dovresti vedere main.py

# Avvia da questa directory
uvicorn app.main:app --reload --port 8000
```

### ❌ Errore: "Address already in use"

**Causa**: La porta 8000 è già occupata.

**Soluzione 1** - Usa una porta diversa:
```bash
uvicorn app.main:app --reload --port 8001
```

**Soluzione 2** - Trova e termina il processo:
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

## Problemi Frontend (Next.js)

### ❌ Errore: "Module not found"

**Causa**: Dipendenze non installate.

**Soluzione**:
```bash
cd frontend
rm -rf node_modules package-lock.json  # Pulisci cache
npm install
npm run dev
```

### ❌ Errore: "Port 3000 is already in use"

**Soluzione 1** - Usa una porta diversa:
```bash
PORT=3001 npm run dev
```

**Soluzione 2** - Modifica package.json:
```json
{
  "scripts": {
    "dev": "next dev -p 3001"
  }
}
```

### ❌ Errore CORS quando chiama il backend

**Causa**: Backend non avviato o URL sbagliato.

**Soluzione**:
1. Assicurati che il backend sia in esecuzione su `http://localhost:8000`
2. Verifica la variabile d'ambiente `BACKEND_URL` in `.env.local`:
   ```
   BACKEND_URL=http://localhost:8000
   ```
3. Riavvia il frontend dopo aver modificato `.env.local`

### ❌ Errore: "Invalid URL" durante parsing

**Causa**: Backend non configurato correttamente o scraper non funzionante.

**Soluzione**:
1. Testa direttamente l'endpoint del backend:
   ```bash
   # Vai su http://localhost:8000/docs
   # Prova l'endpoint POST /api/scraper/parse-url
   ```
2. Per ora, usa il wizard saltando lo Step 1:
   - Modifica manualmente `currentStep` a 2 in `page.tsx`
   - Compila i dati manualmente

## Script di Avvio

### Windows

**Metodo 1 - Script Batch (più semplice)**:
```bash
cd backend
start-backend.bat
```

**Metodo 2 - PowerShell**:
```bash
cd backend
.\start-backend.ps1
```

Se PowerShell blocca gli script, abilita l'esecuzione:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Metodo 3 - Manuale**:
```bash
# Terminale 1 - Backend
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminale 2 - Frontend
cd frontend
npm run dev
```

## Verifica Installazione

### Verifica Python
```bash
python --version  # Dovrebbe essere 3.10+
pip --version
```

### Verifica Node.js
```bash
node --version  # Dovrebbe essere 18+
npm --version
```

### Verifica Backend Funzionante
```bash
# Vai su http://localhost:8000
# Dovresti vedere: {"message": "HomeEstimate API", "version": "1.0.0", "status": "running"}

# API Docs disponibili su http://localhost:8000/docs
```

### Verifica Frontend Funzionante
```bash
# Vai su http://localhost:3000
# Dovresti vedere il wizard HomeEstimate
```

## Problemi Comuni IndexedDB

### ❌ Errore: "QuotaExceededError"

**Causa**: Spazio IndexedDB esaurito.

**Soluzione**:
1. Apri Developer Tools (F12)
2. Application → IndexedDB → HomeEstimateDB
3. Elimina il database
4. Ricarica la pagina

**Prevenzione**: Il cleanup automatico è già implementato in `lib/db.ts`

## Reset Completo

Se nulla funziona, reset completo:

```bash
# Backend
cd backend
Remove-Item -Recurse -Force venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd frontend
Remove-Item -Recurse -Force node_modules, .next
npm install
npm run dev
```

## Supporto

Se i problemi persistono:

1. Controlla i log della console (F12 nel browser)
2. Controlla i log del terminale backend
3. Verifica i requisiti di sistema:
   - Python 3.10+
   - Node.js 18+
   - Windows 10+ / macOS 10.15+ / Linux recente

## Contatti

Apri una issue su GitHub con:
- Sistema operativo e versione
- Versione Python e Node.js
- Messaggio di errore completo
- Passi per riprodurre il problema

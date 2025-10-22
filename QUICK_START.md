# Quick Start - HomeEstimate

## Risoluzione Problema Backend

Hai riscontrato l'errore **"uvicorn non riconosciuto"**. Ecco come risolverlo:

### Soluzione Rapida

1. **Apri PowerShell** nella cartella `backend`:
   ```powershell
   cd backend
   ```

2. **Elimina il virtual environment esistente** (se presente):
   ```powershell
   Remove-Item -Recurse -Force venv
   ```

3. **Esegui lo script automatico**:
   ```powershell
   .\start-backend.bat
   ```

   Questo script farà tutto automaticamente:
   - Crea il virtual environment
   - Attiva l'ambiente
   - Installa le dipendenze
   - Avvia il server

4. **Verifica che funzioni**:
   - Apri [http://localhost:8000](http://localhost:8000)
   - Dovresti vedere: `{"message": "HomeEstimate API", "version": "1.0.0", "status": "running"}`

### Se lo script non funziona

**Passo per passo manuale**:

```powershell
# 1. Entra nella cartella backend
cd backend

# 2. Elimina venv se esiste
if (Test-Path venv) { Remove-Item -Recurse -Force venv }

# 3. Crea nuovo virtual environment
python -m venv venv

# 4. Attiva il virtual environment
.\venv\Scripts\Activate.ps1

# Se PowerShell blocca l'esecuzione, esegui prima:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 5. Aggiorna pip
python -m pip install --upgrade pip

# 6. Installa solo i pacchetti essenziali
pip install fastapi "uvicorn[standard]" httpx beautifulsoup4 lxml python-dotenv tenacity pydantic

# 7. Verifica che uvicorn sia installato
uvicorn --version

# 8. Avvia il server
uvicorn app.main:app --reload --port 8000
```

### Verifica Python

Prima di tutto, assicurati di avere **Python 3.10 o superiore**:

```powershell
python --version
```

Se hai Python 3.9 o inferiore, scarica e installa Python 3.11 da [python.org](https://www.python.org/downloads/)

## Avvio Frontend

In un **nuovo terminale**:

```bash
cd frontend
npm run dev
```

Il frontend sarà disponibile su [http://localhost:3000](http://localhost:3000)

## Test Rapido

1. **Backend**: Vai su [http://localhost:8000/docs](http://localhost:8000/docs) - Dovresti vedere la documentazione API interattiva

2. **Frontend**: Vai su [http://localhost:3000](http://localhost:3000) - Dovresti vedere il wizard HomeEstimate

3. **Test Completo**:
   - Nel wizard, vai direttamente allo Step 2 (ignora lo Step 1 per ora)
   - Compila i dati dell'immobile manualmente
   - Verifica che la validazione funzioni

## Risoluzione Problemi Comuni

### "Termine 'uvicorn' non riconosciuto"
✅ **Soluzione**: Virtual environment non attivato correttamente
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

### "pip install failed"
✅ **Soluzione**: Aggiorna pip prima
```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### "Port 8000 already in use"
✅ **Soluzione**: Usa una porta diversa
```powershell
uvicorn app.main:app --reload --port 8001
```
Poi aggiorna `frontend/.env.local`:
```
BACKEND_URL=http://localhost:8001
```

### "Module 'app.main' not found"
✅ **Soluzione**: Sei nella directory sbagliata
```powershell
# Assicurati di essere in backend/
cd backend
ls app  # Dovresti vedere main.py
uvicorn app.main:app --reload --port 8000
```

## Struttura Corretta Directory

```
HomeEstimate/
├── backend/
│   ├── venv/              ← Virtual environment
│   ├── app/
│   │   ├── main.py       ← File principale FastAPI
│   │   └── api/
│   ├── requirements.txt
│   └── start-backend.bat
├── frontend/
│   ├── node_modules/
│   ├── app/
│   └── package.json
└── README.md
```

## File Modificati per Risolvere il Problema

Ho aggiornato questi file per risolvere l'errore:

1. ✅ **backend/requirements.txt** - Versioni più flessibili, dipendenze opzionali commentate
2. ✅ **backend/start-backend.bat** - Script automatico per Windows
3. ✅ **backend/start-backend.ps1** - Script PowerShell con controlli robusti
4. ✅ **TROUBLESHOOTING.md** - Guida completa per problemi comuni
5. ✅ **README.md** - Istruzioni aggiornate

## Supporto Aggiuntivo

Se i problemi persistono, consulta [TROUBLESHOOTING.md](TROUBLESHOOTING.md) per una guida dettagliata.

---

**Nota**: Per lo sviluppo iniziale, puoi anche lavorare solo sul frontend saltando il backend. Il wizard funziona indipendentemente e puoi inserire dati manualmente.

# Script per avviare il backend FastAPI
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HomeEstimate Backend Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Controlla se venv esiste
if (-Not (Test-Path "venv")) {
    Write-Host "[1/4] Creazione virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRORE: Impossibile creare virtual environment" -ForegroundColor Red
        Write-Host "Assicurati di avere Python 3.10+ installato" -ForegroundColor Red
        exit 1
    }
    Write-Host "      Virtual environment creato con successo" -ForegroundColor Green
} else {
    Write-Host "[1/4] Virtual environment già esistente" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/4] Attivazione virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

Write-Host ""
Write-Host "[3/4] Installazione dipendenze..." -ForegroundColor Yellow
Write-Host "      Questo potrebbe richiedere alcuni minuti..." -ForegroundColor Gray
python -m pip install --upgrade pip
pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRORE: Installazione dipendenze fallita" -ForegroundColor Red
    exit 1
}

Write-Host "      Dipendenze installate con successo" -ForegroundColor Green

Write-Host ""
Write-Host "[4/4] Avvio server FastAPI..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Backend in esecuzione!" -ForegroundColor Green
Write-Host "  URL:      http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

uvicorn app.main:app --reload --port 8000

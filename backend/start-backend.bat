@echo off
echo ========================================
echo   HomeEstimate Backend Setup
echo ========================================
echo.

REM Verifica se venv esiste
if not exist "venv\" (
    echo [1/4] Creazione virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERRORE: Impossibile creare virtual environment
        echo Assicurati di avere Python 3.10+ installato
        pause
        exit /b 1
    )
    echo       Virtual environment creato con successo
) else (
    echo [1/4] Virtual environment gia esistente
)

echo.
echo [2/4] Attivazione virtual environment...
call venv\Scripts\activate.bat

echo.
echo [3/4] Installazione dipendenze...
echo       Questo potrebbe richiedere alcuni minuti...
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

if errorlevel 1 (
    echo ERRORE: Installazione dipendenze fallita
    pause
    exit /b 1
)

echo       Dipendenze installate con successo

echo.
echo [4/4] Avvio server FastAPI...
echo.
echo ========================================
echo   Backend in esecuzione!
echo   URL:      http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ========================================
echo.

uvicorn app.main:app --reload --port 8000

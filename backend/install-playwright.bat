@echo off
echo Installing Playwright and browsers...
echo.

cd /d %~dp0

echo Activating virtual environment...
call venv\Scripts\activate

echo.
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Installing Playwright browsers (Chromium)...
python -m playwright install chromium

echo.
echo ========================================
echo Installation complete!
echo ========================================
echo.
echo You can now start the backend with:
echo   uvicorn app.main:app --reload --port 8000
echo.
pause

@echo off
echo Starting HomeEstimate Development Environment...
echo.

echo Starting Backend (FastAPI)...
cd backend
start cmd /k "python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000"

timeout /t 3 >nul

echo Starting Frontend (Next.js)...
cd ..\frontend
start cmd /k "npm run dev"

echo.
echo ========================================
echo HomeEstimate is starting...
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo ========================================

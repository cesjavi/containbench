@echo off
echo =======================================================
echo   Starting ContainBench - Local Development Mode
echo   Crash-Test AI Agents Before Production
echo =======================================================
echo.

start "ContainBench Backend" cmd /k "cd backend && .venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
start "ContainBench Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both services are starting:
echo  - Backend API: http://127.0.0.1:8000 (Docs at /docs)
echo  - Frontend Web UI: http://localhost:3000
echo.
pause


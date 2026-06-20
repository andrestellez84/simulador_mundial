@echo off
TITLE Simulador Mundial 2026
echo ===================================================
echo Iniciando el Simulador del Mundial 2026...
echo ===================================================
echo.

echo [1/2] Iniciando el Backend (FastAPI)...
:: Iniciamos el backend en una nueva ventana
start "Backend - Simulador Mundial" cmd /c "uv run uvicorn worldcup_sim.api.main:app --reload --app-dir src"

echo [2/2] Iniciando el Frontend (Vite/React)...
:: Iniciamos el frontend en la ventana actual
cd frontend
npm run dev

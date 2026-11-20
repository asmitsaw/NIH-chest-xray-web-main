@echo off
REM Chest-X AI Subsystems Launcher
REM Starts:
REM   1. AI Inference Service (Port 5001)
REM   2. Backend REST API (Port 4000)
REM   3. React Web UI (Port 5173)
REM Then opens browser directly to the UI at http://localhost:5173

echo ===================================================
echo Starting Chest-X AI Subsystems...
echo - ML Microservice: http://127.0.0.1:5001
echo - Backend REST API: http://localhost:4000
echo - Frontend Web UI:  http://localhost:5173
echo ===================================================

start "Chest-X AI service" cmd /k python ml_service\app.py
timeout /t 3 >nul
start "Chest-X Backend API" cmd /k npm.cmd run dev:api
timeout /t 2 >nul
start "Chest-X UI Client" cmd /k npm.cmd run dev:client
timeout /t 3 >nul
start http://localhost:5173

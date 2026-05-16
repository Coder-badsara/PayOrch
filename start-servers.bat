@echo off
REM Start Payment Orchestration System
REM This script runs both the backend and frontend servers

echo.
echo ============================================
echo Payment Orchestration System Startup
echo ============================================
echo.

REM Get the directory where this batch file is located
set ROOT_DIR=%~dp0

echo [*] Backend will start on http://localhost:8000
echo [*] Frontend will start on http://localhost:5173
echo.

REM Start backend server in a new window
echo [Backend] Starting Django server...
start "Backend Server" cmd /k "cd /d "%ROOT_DIR%backend" && python manage.py runserver 0.0.0.0:8000"

REM Wait a moment for backend to start
timeout /t 3 /nobreak

REM Start frontend server in a new window
echo [Frontend] Starting Vite dev server...
start "Frontend Server" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo.
echo ============================================
echo [✓] Both servers started successfully!
echo ============================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Close the command windows to stop the servers.
echo.

timeout /t 5 /nobreak

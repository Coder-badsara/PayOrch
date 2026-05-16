# Start Payment Orchestration System
# This script runs both the backend and frontend servers

Write-Host "Starting Payment Orchestration System..." -ForegroundColor Green

# Get the root directory
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Define paths
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"

# Function to start backend
function Start-Backend {
    Write-Host "`n[Backend] Starting Django server on http://localhost:8000" -ForegroundColor Cyan
    Set-Location $backendDir
    python manage.py runserver 0.0.0.0:8000
}

# Function to start frontend
function Start-Frontend {
    Write-Host "`n[Frontend] Starting Vite dev server on http://localhost:5173" -ForegroundColor Cyan
    Set-Location $frontendDir
    npm run dev
}

# Create jobs for parallel execution
Write-Host "`n[Info] Starting backend server..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock ${function:Start-Backend}

Start-Sleep -Seconds 3

Write-Host "`n[Info] Starting frontend server..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock ${function:Start-Frontend}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✓ Backend running on: http://localhost:8000" -ForegroundColor Green
Write-Host "✓ Frontend running on: http://localhost:5173" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nPress Ctrl+C to stop servers" -ForegroundColor Yellow

# Keep the script running and show output from both jobs
while ($true) {
    Get-Job | Receive-Job
    Start-Sleep -Seconds 2
}

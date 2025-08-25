@echo off
echo ========================================
echo    Funil Spy Analytics - Quick Start
echo ========================================
echo.

cd /d "%~dp0"

echo 🔍 Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please download and install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected

echo.
echo 📦 Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed

echo.
echo 🛠️ Setting up database...
node setup.js

if %errorlevel% neq 0 (
    echo ❌ Failed to setup database
    pause
    exit /b 1
)

echo.
echo 🚀 Starting analytics server...
echo.
echo Dashboard will be available at: http://localhost:3001/dashboard.html
echo.
echo Press Ctrl+C to stop the server
echo.

start "" "http://localhost:3001/dashboard.html"
npm start
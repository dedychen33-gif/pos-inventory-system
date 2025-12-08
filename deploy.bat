@echo off
REM Deploy Script untuk POS & Inventory Management (Windows)
REM Author: Your Name
REM Version: 1.0

echo ========================================
echo  POS Deployment Script (Windows)
echo ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js version:
node -v

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not installed!
    pause
    exit /b 1
)

echo [OK] npm version:
npm -v
echo.

REM Install dependencies
echo ========================================
echo  Installing dependencies...
echo ========================================
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Building production...
echo ========================================
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Build Successful!
echo ========================================
echo.
echo Build output: .\dist\
echo.
echo Next steps:
echo 1. For Netlify: netlify deploy --prod --dir=dist
echo 2. For Vercel: vercel --prod
echo 3. For cPanel: Upload files from .\dist\ to public_html\
echo.
echo ========================================
echo  Deployment Ready!
echo ========================================
pause

@echo off
REM FileShare Setup Script for Windows
REM This script helps set up the FileShare application on Windows

echo ======================================
echo    FileShare Application Setup
echo ======================================
echo.

REM Check Node.js
echo Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo X Node.js is not installed. Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION% found
echo.

REM Check PostgreSQL
echo Checking PostgreSQL...
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo X PostgreSQL is not installed. Please install PostgreSQL 15+ from https://www.postgresql.org
    echo   Or add PostgreSQL to your PATH
    pause
    exit /b 1
)
echo ✓ PostgreSQL found
echo.

echo ======================================
echo    Database Setup
echo ======================================
echo.

set /p DB_USER="Enter PostgreSQL username (default: postgres): "
if "%DB_USER%"=="" set DB_USER=postgres

set /p DB_PASSWORD="Enter PostgreSQL password: "

set /p DB_NAME="Enter database name (default: fileshare): "
if "%DB_NAME%"=="" set DB_NAME=fileshare

REM Create database
echo Creating database...
psql -U %DB_USER% -c "CREATE DATABASE %DB_NAME%;" 2>nul
if %errorlevel% equ 0 (
    echo ✓ Database created successfully
) else (
    echo ! Database may already exist
)

REM Run migrations
echo Running database migrations...
psql -U %DB_USER% -d %DB_NAME% -f database\migrations\001_initial_schema.sql
if %errorlevel% neq 0 (
    echo X Migration failed
    pause
    exit /b 1
)
echo ✓ Migrations completed successfully
echo.

echo ======================================
echo    Backend Setup
echo ======================================
echo.

cd backend

REM Create .env file
if not exist .env (
    echo Creating .env file...
    copy .env.example .env >nul

    REM Update .env with PowerShell
    powershell -Command "(Get-Content .env) -replace 'DB_USER=postgres', 'DB_USER=%DB_USER%' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'DB_PASSWORD=your_password_here', 'DB_PASSWORD=%DB_PASSWORD%' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'DB_NAME=fileshare', 'DB_NAME=%DB_NAME%' | Set-Content .env"

    REM Generate random JWT secret
    for /f %%i in ('powershell -Command "[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).Guid))"') do set JWT_SECRET=%%i
    powershell -Command "(Get-Content .env) -replace 'JWT_SECRET=.*', 'JWT_SECRET=%JWT_SECRET%' | Set-Content .env"

    echo ✓ .env file created and configured
) else (
    echo ! .env file already exists, skipping creation
)

echo Installing backend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo X Backend installation failed
    pause
    exit /b 1
)
echo ✓ Backend dependencies installed

cd ..
echo.

echo ======================================
echo    Frontend Setup
echo ======================================
echo.

cd frontend

echo Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo X Frontend installation failed
    pause
    exit /b 1
)
echo ✓ Frontend dependencies installed

cd ..
echo.

echo ======================================
echo    Root Dependencies (Optional)
echo ======================================
echo.

echo Installing root dependencies for concurrent running...
call npm install
echo ✓ Root dependencies installed
echo.

echo ======================================
echo    Setup Complete!
echo ======================================
echo.
echo To start the application:
echo.
echo Option 1 - Run both together (from project root):
echo   npm run dev
echo.
echo Option 2 - Run separately (two terminals):
echo   Terminal 1: cd backend ^&^& npm run dev
echo   Terminal 2: cd frontend ^&^& npm run dev
echo.
echo Then open: http://localhost:5173
echo.
echo Happy coding! 🚀
echo.

pause

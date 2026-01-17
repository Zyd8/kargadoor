@echo off
REM Complete Flutter Development Environment Setup Script for Windows
REM This script automates all setup steps for Flutter development with Docker
REM Usage: setup.bat

setlocal EnableDelayedExpansion

echo.
echo ========================================
echo   Flutter Docker Development Setup
echo ========================================
echo.

REM Step 1: Check Docker
echo [1/7] Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [X] Docker is not installed!
    echo.
    echo Please install Docker Desktop:
    echo   https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

docker ps >nul 2>&1
if errorlevel 1 (
    echo [X] Docker is not running!
    echo   Please start Docker Desktop
    echo.
    pause
    exit /b 1
)
echo [OK] Docker is installed and running
echo.

REM Step 2: Check ADB
echo [2/7] Checking ADB...
adb --version >nul 2>&1
if errorlevel 1 (
    echo [!] ADB is not installed or not in PATH
    echo.
    echo ADB installation options:
    echo   1. Android Studio -^> SDK Manager -^> Android SDK Platform-Tools
    echo   2. Download: https://developer.android.com/tools/releases/platform-tools
    echo   3. Add to PATH and restart terminal
    echo.
    set /p continue="Continue without ADB? (you'll need it for device connection) (y/n): "
    if /i not "!continue!"=="y" (
        pause
        exit /b 1
    )
    set SKIP_ADB=1
) else (
    echo [OK] ADB is installed
)
echo.

REM Step 3: Check project files
echo [3/7] Checking project files...
if not exist "docker-compose.yml" (
    echo [X] docker-compose.yml not found!
    echo   Please run this script from the project root directory
    echo.
    pause
    exit /b 1
)

if not exist "Dockerfile" (
    echo [X] Dockerfile not found!
    echo.
    pause
    exit /b 1
)
echo [OK] Project files found
echo.

REM Step 4: Build Docker image
echo [4/7] Building Docker image...
echo   This may take 10-20 minutes on first run...
echo.
docker-compose build
if errorlevel 1 (
    echo [X] Docker build failed!
    echo   Check the error messages above
    echo.
    pause
    exit /b 1
)
echo [OK] Docker image built successfully
echo.

REM Step 5: Check/Start ADB Server
echo [5/7] Setting up ADB server...
if not defined SKIP_ADB (
    REM Kill any existing ADB servers
    adb kill-server >nul 2>&1
    timeout /t 1 >nul
    
    REM Check if ADB server is already running
    netstat -an | findstr ":5037" | findstr "LISTENING" >nul 2>&1
    if errorlevel 1 (
        echo   Starting ADB server in network mode...
        echo   [!] You'll need to keep an ADB server window open
        echo.
        echo   Opening ADB server in a new window...
        
        REM Create temporary ADB server script
        echo # ADB Server for Docker Containers > start-adb-server.bat
        echo # Keep this window open! >> start-adb-server.bat
        echo @echo off >> start-adb-server.bat
        echo echo Starting ADB server in network mode... >> start-adb-server.bat
        echo adb -a -P 5037 nodaemon server start >> start-adb-server.bat
        
        REM Start ADB server in new window
        start "ADB Server" cmd /k start-adb-server.bat
        
        echo   Waiting for ADB server to start...
        timeout /t 3 >nul
        
        REM Verify ADB server started
        netstat -an | findstr ":5037" | findstr "LISTENING" >nul 2>&1
        if errorlevel 1 (
            echo [!] ADB server may not have started yet
            echo   Please check the ADB server window
        ) else (
            echo [OK] ADB server is running
        )
    ) else (
        echo [OK] ADB server is already running
    )
) else (
    echo   Skipping ADB setup (not installed)
)
echo.

REM Step 6: Start Docker containers
echo [6/7] Starting Docker containers...
docker-compose up -d
if errorlevel 1 (
    echo [X] Failed to start Docker containers!
    echo.
    pause
    exit /b 1
)
echo [OK] Docker containers started
echo.

REM Wait for containers to start
timeout /t 2 >nul

REM Step 7: Verify setup
echo [7/7] Verifying setup...
echo.

REM Check container is running
docker-compose ps | findstr "flutter" | findstr "Up" >nul 2>&1
if errorlevel 1 (
    echo [!] Flutter container may not be running properly
) else (
    echo [OK] Flutter container is running
)

REM Test ADB connection from container
if not defined SKIP_ADB (
    echo.
    echo   Testing ADB connection from container...
    docker-compose exec -T flutter adb devices 2>nul | findstr "List of devices attached" >nul 2>&1
    if not errorlevel 1 (
        echo [OK] ADB connection from container working
        docker-compose exec -T flutter adb devices 2>nul | findstr "device$" >nul 2>&1
        if not errorlevel 1 (
            echo   [OK] Device(s) detected!
        ) else (
            echo   [i] No devices connected yet (connect your phone via USB)
        )
    ) else (
        echo [!] ADB connection test inconclusive
    )
)

echo.
echo ========================================
echo   Setup Complete! [OK]
echo ========================================
echo.

echo Next steps:
echo.
echo 1. Enter the container:
echo    docker-compose exec flutter bash
echo.
echo 2. Inside container, verify setup:
echo    adb devices          # Check connected devices
echo    flutter doctor       # Verify Flutter setup
echo.
echo 3. Run your Flutter app:
echo    cd /home/developer/app
echo    flutter pub get
echo    flutter run -d android  # Run on device
echo    flutter run -d chrome   # Run on web
echo.
echo For detailed instructions, see SETUP_GUIDE.md
echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo You can close this terminal window now.
echo The ADB server (if started) is running in a separate window - keep that open!
echo.
pause

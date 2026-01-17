@echo off
REM Batch script to start development environment
REM Starts ADB server and Docker containers
REM Usage: start-dev.bat

echo ========================================
echo   Starting Flutter Development Environment
echo ========================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo [X] Docker is not running!
    echo   Please start Docker Desktop
    echo.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Check if ADB server is running
netstat -an | findstr ":5037" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [!] ADB server is not running
    echo.
    echo Please start ADB server in a separate window:
    echo   start-adb.bat
    echo   OR
    echo   adb -a -P 5037 nodaemon server start
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "!continue!"=="y" exit /b 1
) else (
    echo [OK] ADB server is running
)

echo.

REM Start Docker containers
echo Starting Docker containers...
docker-compose up -d

if errorlevel 1 (
    echo.
    echo [X] Failed to start Docker containers
    echo   Check the error messages above
    pause
    exit /b 1
)

echo.
echo [OK] Docker containers started successfully!
echo.
echo To enter the container:
echo   docker-compose exec flutter bash
echo.
echo To check ADB devices:
echo   docker-compose exec flutter bash
echo   adb devices

pause

@echo off
REM Batch script to start ADB server in network mode for Docker containers
REM Usage: start-adb.bat

echo ========================================
echo   Starting ADB Server for Docker Containers
echo ========================================
echo.

REM Check if ADB is installed
adb --version >nul 2>&1
if errorlevel 1 (
    echo [X] ADB is not installed or not in PATH!
    echo.
    echo Please install ADB:
    echo   1. Android Studio -^> SDK Manager -^> Android SDK Platform-Tools
    echo   2. Or download: https://developer.android.com/tools/releases/platform-tools
    echo   3. Add to PATH and restart terminal
    echo.
    pause
    exit /b 1
)

echo [OK] ADB is installed
adb --version | findstr "version"
echo.

REM Kill any existing ADB servers
echo Stopping any existing ADB servers...
adb kill-server >nul 2>&1
timeout /t 1 >nul

REM Start ADB server in network mode
echo.
echo Starting ADB server in network mode...
echo   Listening on: 0.0.0.0:5037
echo   Docker containers will connect via: host.docker.internal:5037
echo.
echo [!] IMPORTANT: Keep this window open!
echo    Closing this window will stop the ADB server.
echo.
echo Press Ctrl+C to stop the ADB server
echo ========================================
echo.

REM Start ADB server (this will keep running)
adb -a -P 5037 nodaemon server start

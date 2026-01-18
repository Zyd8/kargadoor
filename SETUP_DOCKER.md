# Docker Setup Guide

This guide covers setting up Flutter development using Docker, so you **never need to install Flutter, Android SDK, or any development tools on your computer**. Everything runs in Docker!

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Install Docker](#step-1-install-docker)
3. [Step 2: Install ADB](#step-2-install-adb)
4. [Step 3: Automated Setup](#step-3-automated-setup)
5. [Step 4: Manual Setup (Alternative)](#step-4-manual-setup-alternative)
6. [Daily Workflow](#daily-workflow)
7. [Running Flutter Apps](#running-flutter-apps)
8. [Connecting Your Phone](#connecting-your-phone)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, you need:
- A computer (Windows, Mac, or Linux)
- Internet connection
- **Docker Desktop** (required)
- **ADB (Android Debug Bridge)** - Usually comes with Android Studio, or download separately

**That's it!** You don't need Flutter, Android SDK, or other development tools installed on your computer.

---

## Step 1: Install Docker

### Windows

1. **Download Docker Desktop for Windows**
   - Go to: https://www.docker.com/products/docker-desktop/
   - Click "Download for Windows"
   - The installer will download `Docker Desktop Installer.exe`

2. **Install Docker Desktop**
   - Run the installer (`Docker Desktop Installer.exe`)
   - Follow the installation wizard
   - **Important:** Ensure "Use WSL 2 instead of Hyper-V" is checked (recommended)
   - Restart your computer when prompted

3. **Start Docker Desktop**
   - After restart, launch "Docker Desktop" from Start Menu
   - Wait for Docker to start (whale icon in system tray turns green)
   - First startup may take a few minutes

4. **Verify Installation**
   - Open PowerShell or Command Prompt
   - Run: `docker --version`
   - Run: `docker-compose --version`
   - Both should show version numbers

### macOS

1. **Download Docker Desktop for Mac**
   - Go to: https://www.docker.com/products/docker-desktop/
   - Click "Download for Mac"
   - Choose the version for your Mac chip (Intel or Apple Silicon)

2. **Install Docker Desktop**
   - Open the downloaded `.dmg` file
   - Drag Docker to Applications folder
   - Open Docker from Applications
   - Follow the setup wizard

3. **Verify Installation**
   - Open Terminal
   - Run: `docker --version`
   - Run: `docker-compose --version`

### Linux (Ubuntu/Debian)

1. **Install Docker**
   ```bash
   # Update package index
   sudo apt-get update

   # Install prerequisites
   sudo apt-get install -y \
       ca-certificates \
       curl \
       gnupg \
       lsb-release

   # Add Docker's official GPG key
   sudo mkdir -p /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

   # Set up repository
   echo \
     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
     $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

   # Install Docker
   sudo apt-get update
   sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

   # Add your user to docker group
   sudo usermod -aG docker $USER
   ```

2. **Log out and back in** (for group changes to take effect)

3. **Verify Installation**
   ```bash
   docker --version
   docker compose version
   ```

---

## Step 2: Install ADB

ADB (Android Debug Bridge) is needed to connect Android devices to the Docker container.

### Windows

**Option 1: Via Android Studio (Recommended)**
1. Install Android Studio: https://developer.android.com/studio
2. Open Android Studio → Tools → SDK Manager
3. Install "Android SDK Platform-Tools"
4. Add to PATH: `C:\Users\YourUsername\AppData\Local\Android\Sdk\platform-tools`

**Option 2: Standalone Download**
1. Download: https://developer.android.com/tools/releases/platform-tools
2. Extract to a folder (e.g., `C:\platform-tools`)
3. Add to PATH

**Verify Installation:**
```cmd
adb --version
```

### macOS

**Option 1: Via Android Studio**
1. Install Android Studio
2. Open Android Studio → Tools → SDK Manager
3. Install "Android SDK Platform-Tools"
4. Add to PATH: `export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"`

**Option 2: Via Homebrew**
```bash
brew install android-platform-tools
```

**Verify Installation:**
```bash
adb --version
```

### Linux

**Via Android Studio or Standalone:**
- Similar to macOS instructions
- Or use package manager: `sudo apt-get install android-tools-adb`

---

## Step 3: Automated Setup

The easiest way to set up everything is using the automated script.

### Windows

1. **Run the setup script:**
   ```cmd
   scripts\setup.bat
   ```

2. **What the script does:**
   - ✅ Checks Docker and ADB installation
   - ✅ Builds Docker image (first time only, takes 10-20 minutes)
   - ✅ Starts ADB server in network mode
   - ✅ Starts Docker containers
   - ✅ Verifies everything is working

3. **Follow the prompts:**
   - The script will guide you through any missing dependencies
   - If ADB is not found, you can choose to continue without it (Android device connection won't work)

### macOS/Linux

For macOS/Linux, you can use the Docker commands directly:

```bash
# Build the image
docker-compose build

# Start ADB server (in a separate terminal, keep it open)
adb kill-server
adb -a -P 5037 nodaemon server start

# In another terminal, start Docker containers
docker-compose up -d
```

---

## Step 4: Manual Setup (Alternative)

If you prefer to set up manually or the automated script doesn't work:

### 1. Build Docker Image

```bash
docker-compose build
```

**First build takes 10-20 minutes** - this downloads Flutter SDK, Android SDK, and all dependencies.

### 2. Start ADB Server (Windows)

**Important:** On Windows, the container connects to your host's ADB server via network.

1. **Open a new terminal/command prompt**
2. **Start ADB server in network mode:**
   ```cmd
   scripts\start-adb.bat
   ```
   Or manually:
   ```cmd
   adb kill-server
   adb -a -P 5037 nodaemon server start
   ```

3. **Keep this window open!** Closing it will stop the ADB server.

### 3. Start Docker Containers

```bash
docker-compose up -d
```

This starts the Flutter development container in the background.

### 4. Enter the Container

```bash
docker-compose exec flutter bash
```

You should now be inside the container with a bash prompt like:
```bash
developer@container:/home/developer$
```

### 5. Verify Setup

Inside the container:

```bash
# Check Flutter installation
flutter doctor

# Check ADB connection (should show devices if connected)
adb devices

# Navigate to app directory
cd /home/developer/app

# Get dependencies
flutter pub get
```

### 6. Create Environment File

Inside the container:

```bash
# Create .env file with your TomTom API key
echo TOMTOM_API_KEY=your_api_key_here > .env
```

Get your API key from: https://developer.tomtom.com/

---

## Daily Workflow

### Starting Your Development Session

1. **Start Docker Desktop** (if not running)
   - Launch Docker Desktop
   - Wait for it to fully start (whale icon green)

2. **Start ADB server** (if using Android device):
   ```cmd
   scripts\start-adb.bat
   ```
   ⚠️ **Keep this window open!**

3. **Start Docker containers:**
   ```cmd
   scripts\start-dev.bat
   ```
   Or manually: `docker-compose up -d`

4. **Enter the container:**
   ```bash
   docker-compose exec flutter bash
   ```

5. **Inside container:**
   ```bash
   cd /home/developer/app
   flutter pub get  # After dependency changes
   ```

### Ending Your Development Session

1. **Exit the container:**
   ```bash
   exit
   ```

2. **Stop containers (optional):**
   ```bash
   docker-compose down
   ```
   
   **Or leave them running** - they use minimal resources when idle.

3. **Stop ADB server** (close the ADB server window)

---

## Running Flutter Apps

### Run on Web Browser

Inside the container:

```bash
cd /home/developer/app

# Run on Chrome (accessible at http://localhost:3000 from your host browser)
flutter run -d chrome --web-port 3000 --web-hostname 0.0.0.0
```

**Hot Reload:**
- Press `r` in the terminal to hot reload
- Press `R` to hot restart
- Press `q` to quit

### Run on Android Phone

**Prerequisite:** Follow the [Connecting Your Phone](#connecting-your-phone) section first.

Once ADB is connected:

```bash
# Inside container, verify device is connected
adb devices

# Should show:
# List of devices attached
# ABC123XYZ    device

# Run the app
flutter run -d android
```

**Note:** The app will be installed and run on your connected Android device.

### Run on iOS (macOS only)

iOS development with Docker is more complex. For iOS development, we recommend using [Normal Flutter Setup](SETUP_NORMAL.md).

---

## Connecting Your Phone

### Android Phone Setup

1. **Enable Developer Options:**
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Developer Options will appear in Settings

2. **Enable USB Debugging:**
   - Go to Settings → Developer Options
   - Enable "USB Debugging"
   - Enable "Install via USB" (if available)

3. **Connect Phone:**
   - Connect phone to computer via USB
   - On phone, allow USB debugging when prompted

4. **Start ADB Server:**
   ```cmd
   scripts\start-adb.bat
   ```
   Keep this window open!

5. **Verify Connection:**
   ```bash
   # Inside container
   adb devices
   ```
   
   Should show your device:
   ```
   List of devices attached
   ABC123XYZ    device
   ```

### Troubleshooting ADB Connection

**Device not showing:**
- Make sure ADB server is running: `scripts\start-adb.bat`
- Check USB cable (try different cable)
- Try different USB port
- On phone: Revoke USB debugging authorizations, then reconnect

**"Unauthorized" device:**
- Check phone screen for USB debugging authorization prompt
- Click "Allow" or "Always allow"

**ADB server connection issues:**
- Restart ADB server: Close the ADB window, then run `scripts\start-adb.bat` again
- Check if port 5037 is in use: `netstat -an | findstr ":5037"`

---

## Troubleshooting

### Docker Issues

**Docker not running:**
- Start Docker Desktop
- Wait for it to fully start (whale icon green)
- Check system tray for Docker status

**Container won't start:**
- Check logs: `docker-compose logs flutter`
- Rebuild image: `docker-compose build --no-cache`
- Check Docker Desktop has enough resources allocated

**Port already in use:**
- Change port in `docker-compose.yml`
- Or stop the service using the port

**Permission denied errors (Linux):**
- Add user to docker group: `sudo usermod -aG docker $USER`
- Log out and back in
- Or use `sudo docker-compose` (not recommended)

### ADB Issues

**ADB not found:**
- Install ADB (see [Step 2: Install ADB](#step-2-install-adb))
- Add ADB to PATH
- Restart terminal

**ADB server not connecting:**
- Make sure ADB server is running: `scripts\start-adb.bat`
- Check ADB server is listening: `netstat -an | findstr ":5037"`
- Restart ADB server if needed

**Container can't see devices:**
- Verify ADB server is running on host
- Check `ADB_SERVER_SOCKET` environment variable in `docker-compose.yml`
- Try restarting both ADB server and Docker containers

### Flutter Issues

**Flutter not found in container:**
- Rebuild Docker image: `docker-compose build --no-cache`
- Check Dockerfile includes Flutter installation

**Dependencies not installing:**
- Run `flutter pub get` inside container
- Check internet connection
- Check `pubspec.yaml` syntax

**Build errors:**
- Run `flutter clean` inside container
- Delete `pubspec.lock` and run `flutter pub get` again
- Check Flutter version: `flutter --version`

---

## Available Scripts (Windows)

All scripts are in the `scripts/` folder:

- **`scripts\setup.bat`** - Complete automated setup (run once)
- **`scripts\start-adb.bat`** - Start ADB server in network mode (run daily)
- **`scripts\start-dev.bat`** - Start Docker containers (run daily)

See [scripts/README.md](scripts/README.md) for detailed script documentation.

---

## Next Steps

- Read [README.md](README.md) for quick start
- Check [SETUP_NORMAL.md](SETUP_NORMAL.md) if you prefer local Flutter installation
- Get your TomTom API key: https://developer.tomtom.com/

---

## Additional Resources

- Docker Documentation: https://docs.docker.com/
- Flutter Documentation: https://flutter.dev/docs
- TomTom Developer Portal: https://developer.tomtom.com/

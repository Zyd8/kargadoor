# Complete Setup Guide - Flutter Development with Docker

This guide will walk you through setting up Flutter development using Docker, so you **never need to install Flutter, Android SDK, or any development tools on your computer**. Everything runs in Docker!

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Install Docker](#step-1-install-docker)
3. [Step 2: Clone/Setup Project](#step-2-clonesetup-project)
4. [Step 3: Build Docker Image](#step-3-build-docker-image)
5. [Step 4: Start Development Container](#step-4-start-development-container)
6. [Step 5: Verify Flutter Setup](#step-5-verify-flutter-setup)
7. [Daily Workflow](#daily-workflow)
8. [Running Flutter Apps](#running-flutter-apps)
9. [Connecting Your Phone](#connecting-your-phone)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, you need:
- A computer (Windows, Mac, or Linux)
- Internet connection
- **ADB (Android Debug Bridge)** - Usually comes with Android Studio, or download separately
- **That's it!** You don't need Flutter, Android SDK, or other development tools installed on your computer.

### Quick Note: ADB Connection on Windows

**Important:** On Windows, the container connects to your host's ADB server via network. This requires:
1. Installing ADB on Windows (usually from Android Studio)
2. Starting ADB server in network mode: `adb -a -P 5037 nodaemon server start`
3. Container's ADB connects to host ADB server automatically (via `ADB_SERVER_SOCKET`)

See [Connecting Your Phone](#connecting-your-phone) section for detailed instructions.

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

   # Install Docker Engine
   sudo apt-get update
   sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

   # Add your user to docker group (so you don't need sudo)
   sudo usermod -aG docker $USER

   # Log out and log back in for group changes to take effect
   ```

2. **Verify Installation**
   ```bash
   docker --version
   docker compose version
   ```

---

## Step 2: Clone/Setup Project

1. **Navigate to your project directory**
   ```bash
   cd C:\Users\Zyd\Documents\GitHub\BrighteEats\logistics-project
   ```

2. **Ensure you have the required files:**
   - `Dockerfile` ✓
   - `docker-compose.yml` ✓
   - `frontend/` directory with your Flutter project ✓

3. **Verify Docker is running**
   - Windows/Mac: Check Docker Desktop is running (whale icon in system tray)
   - Linux: Run `sudo systemctl status docker`

---

## Step 3: Build Docker Image

This step downloads Flutter, Android SDK, and all dependencies into a Docker image. **This only needs to be done once** (or when you update the Dockerfile).

```bash
# Navigate to project root (where docker-compose.yml is located)
cd C:\Users\Zyd\Documents\GitHub\BrighteEats\logistics-project

# Build the Docker image (this will take 10-20 minutes the first time)
docker-compose build
```

**What happens:**
- Downloads base Debian image
- Installs all system dependencies
- Downloads and installs Flutter SDK
- Downloads and installs Android SDK & ADB
- Configures everything for development

**Note:** The build process downloads ~2-3GB of data (Flutter SDK, Android SDK, etc.). Make sure you have:
- Stable internet connection
- Enough disk space (at least 5GB free)
- Patience (first build takes 10-20 minutes)

---

## Step 4: Start Development Container

Once the image is built, start the container:

```bash
# Start the container in the background
docker-compose up -d

# Or start and see logs
docker-compose up
```

**To stop the container:**
```bash
docker-compose down
```

---

## Step 5: Verify Flutter Setup

Enter the container and verify everything is working:

```bash
# Enter the running container
docker-compose exec flutter bash

# Inside the container, run:
flutter --version

# Check Flutter doctor (shows what's installed)
flutter doctor -v

# List available Flutter devices
flutter devices
```

**Expected output from `flutter doctor`:**
- ✅ Flutter (Installed)
- ✅ Android toolchain (Installed)
- ✅ Chrome (if available)
- ⚠️ Some items may show warnings (that's OK for development)

**Exit the container:**
```bash
exit
```

---

## Daily Workflow

### Starting Your Development Session

1. **Start Docker Desktop** (if not running)

2. **If developing on phone, start ADB server on Windows:**
   ```powershell
   # On Windows PowerShell (keep this window open!)
   adb kill-server
   adb -a -P 5037 nodaemon server start
   ```

3. **Start the container:**
   ```bash
   docker-compose up -d
   ```

4. **Enter the container:**
   ```bash
   docker-compose exec flutter bash
   ```

5. **Navigate to your app:**
   ```bash
   cd /home/developer/app
   ```

6. **Get dependencies (first time or after pubspec.yaml changes):**
   ```bash
   flutter pub get
   ```

7. **Verify device connection (if using phone):**
   ```bash
   adb devices  # Should show your connected device
   ```

8. **Start developing!** (see next section)

### Ending Your Development Session

1. **Exit the container:**
   ```bash
   exit
   ```

2. **Stop the container (optional):**
   ```bash
   docker-compose down
   ```
   
   **Or leave it running** - it uses minimal resources when idle.

---

## Running Flutter Apps

### Run on Web Browser (Easiest for Testing)

```bash
# Inside the container
cd /home/developer/app

# Run on Chrome (accessible at http://localhost:3000 from your host)
flutter run -d chrome --web-port 3000 --web-hostname 0.0.0.0
```

**Hot Reload:** Press `r` in the terminal to hot reload, `R` to hot restart.

### Run on Android Phone

**Prerequisite:** Follow the [Connecting Your Phone](#connecting-your-phone) section first to set up ADB connection.

Once ADB is connected:

```bash
# Inside container, verify device is connected
adb devices

# Should show:
# List of devices attached
# 56151JEBF04133    device

# List Flutter devices
flutter devices

# Run on your phone
flutter run -d android

# Or specify device explicitly
flutter run -d <device-id>
```

**Hot Reload:** Once running, press `r` in terminal to hot reload, `R` to hot restart.

### Run on Emulator (Optional)

To use an Android emulator, you'd need to run it inside Docker (advanced) or on your host machine.

---

## Connecting Your Phone

### How ADB Connection Works

Since Docker on Windows can't directly access USB devices, we use a **network-based solution**: the container's ADB connects to your Windows host's ADB server, which already has access to USB devices.

```
Windows Host ADB Server (Network Mode)
    ↕ Has USB access
Container ADB Client → Connects via Network → Sees same devices
```

### Prerequisites

1. **Install ADB on Windows Host** (if not already installed)
   - Usually comes with Android Studio
   - Or download: https://developer.android.com/tools/releases/platform-tools
   - Verify: `adb --version` in PowerShell

2. **Enable Developer Options on your phone:**
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - You'll see "You are now a developer!"

3. **Enable USB Debugging:**
   - Go to Settings → Developer Options
   - Enable "USB Debugging"
   - (Optional) Enable "Stay Awake" while charging

4. **Connect phone via USB to your Windows computer:**
   - Connect phone to computer with USB cable
   - On your phone, tap "Allow USB Debugging" when prompted
   - Check "Always allow from this computer"

### Step-by-Step: Connecting Your Phone

#### Step 1: Verify Device on Windows Host

First, verify your Windows host can see the device:

```powershell
# On Windows PowerShell/CMD
adb devices
```

You should see:
```
List of devices attached
56151JEBF04133    device
```

**If device shows "unauthorized":**
- Check your phone screen for authorization dialog
- Tap "Allow" and check "Always allow"
- Run `adb devices` again on Windows

#### Step 2: Start ADB Server in Network Mode (Windows)

On Windows PowerShell/CMD (keep this window open!):

```powershell
# Stop any existing ADB servers
adb kill-server

# Start ADB server listening on network (so Docker can connect)
adb -a -P 5037 nodaemon server start
```

**⚠️ Keep this PowerShell window open!** This is your ADB server. If you close it, the container won't see devices.

#### Step 3: Start Docker Container

In a **new terminal/PowerShell window**:

```powershell
# Navigate to project
cd C:\Users\Zyd\Documents\GitHub\BrighteEats\logistics-project

# Start container
docker-compose up -d
```

#### Step 4: Verify Connection from Container

Enter the container and check if it sees your device:

```bash
# Enter container
docker-compose exec flutter bash

# Inside container, check devices
adb devices
```

You should see the same device as on Windows:
```
List of devices attached
56151JEBF04133    device
```

✅ **Success!** The container can now see your phone!

#### Step 5: Run Flutter on Your Phone

```bash
# Inside container
cd /home/developer/app

# List Flutter devices
flutter devices

# Run on your phone
flutter run -d android

# Or specify device explicitly
flutter run -d <device-id>
```

### Daily Workflow: Connecting Your Phone

**Every time you want to develop on your phone:**

1. **Connect phone via USB** to Windows computer
2. **Start ADB server on Windows** (PowerShell):
   ```powershell
   adb -a -P 5037 nodaemon server start
   ```
   Keep this window open!

3. **Start Docker container** (if not running):
   ```powershell
   docker-compose up -d
   ```

4. **Enter container and run Flutter:**
   ```bash
   docker-compose exec flutter bash
   adb devices  # Verify connection
   cd /home/developer/app
   flutter run -d android
   ```

### Alternative: Wireless Debugging

If you prefer wireless debugging:

1. **On your phone:**
   - Settings → Developer Options → Enable "Wireless debugging"
   - Note the IP address and port shown (e.g., `192.168.1.100:5555`)

2. **Inside container:**
   ```bash
   adb connect <PHONE_IP>:<PORT>
   adb devices
   ```

---

## Troubleshooting

### Docker won't start

**Windows:**
- Make sure WSL 2 is enabled
- Restart Docker Desktop
- Check system requirements: https://docs.docker.com/desktop/install/windows-install/

**Linux:**
```bash
sudo systemctl start docker
sudo systemctl enable docker  # Start on boot
```

### Container won't build

```bash
# Clean build (removes cache)
docker-compose build --no-cache

# See detailed logs
docker-compose build --progress=plain
```

### "No space left on device"

```bash
# Clean up unused Docker resources
docker system prune -a

# Remove unused volumes
docker volume prune
```

### Phone not detected

**Check Windows host first:**
```powershell
# On Windows PowerShell
adb devices
# Should show your device. If not, check USB connection and authorization
```

**Then check container:**
```bash
# Inside container
adb devices

# If empty, make sure:
# 1. Host ADB server is running: adb -a -P 5037 nodaemon server start
# 2. Container can connect to host (check docker-compose.yml has ADB_SERVER_SOCKET)
```

**Restart connection:**
```bash
# Stop and restart container
docker-compose down
docker-compose up -d

# Re-enter container
docker-compose exec flutter bash
adb devices
```

**If still not working:**
- Make sure ADB server is running on Windows (PowerShell window is open)
- Verify `ADB_SERVER_SOCKET=tcp:host.docker.internal:5037` is set in docker-compose.yml
- Check `extra_hosts` in docker-compose.yml includes `host.docker.internal:host-gateway`

### Flutter commands not found

```bash
# Check PATH inside container
echo $PATH

# Should include /home/developer/flutter/bin
# If not, rebuild the image:
docker-compose build --no-cache
```

### Port already in use

If port 3000 is already in use:
```bash
# Find what's using it (Windows)
netstat -ano | findstr :3000

# Or change port in docker-compose.yml:
ports:
  - "3001:3000"  # Use 3001 on host instead
```

### Container keeps stopping

```bash
# Check logs
docker-compose logs flutter

# Start interactively to see errors
docker-compose up  # (without -d flag)
```

### Need to rebuild everything

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes Flutter/Android SDK caches)
docker-compose down -v

# Rebuild from scratch
docker-compose build --no-cache

# Start again
docker-compose up -d
```

---

## Quick Reference Commands

```bash
# Build image
docker-compose build

# Start container
docker-compose up -d

# Stop container
docker-compose down

# Enter container
docker-compose exec flutter bash

# View logs
docker-compose logs -f flutter

# Rebuild and restart
docker-compose up --build -d

# Check running containers
docker-compose ps

# Clean up everything (WARNING: removes volumes)
docker-compose down -v
docker system prune -a
```

---

## What You DON'T Need to Install

Because everything is in Docker, you **don't need** to install:

- ❌ Flutter SDK
- ❌ Dart SDK
- ❌ Android Studio
- ❌ Android SDK
- ❌ ADB (Android Debug Bridge)
- ❌ Java/JDK
- ❌ Git (unless you want it on host)
- ❌ Any other Flutter dependencies

**Everything runs inside Docker!** 🎉

---

## Next Steps

- Set up ADB connection using the [Connecting Your Phone](#connecting-your-phone) section above
- Start developing your Flutter app inside the container
- Use hot reload for fast development iteration (press `r` while app is running)

## Getting Help

- Check Docker logs: `docker-compose logs flutter`
- Check Flutter status: `flutter doctor -v` (inside container)
- Review this guide's troubleshooting section
- Docker documentation: https://docs.docker.com/

---

**Congratulations!** You now have a complete Flutter development environment running in Docker, without installing anything on your computer except Docker itself! 🚀

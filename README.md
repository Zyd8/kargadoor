# Logistics Project - Flutter Development

A Flutter-based logistics project management system with Dockerized development environment.

## Quick Start

### Prerequisites

- **Docker Desktop** (required)
- **ADB (Android Debug Bridge)** - Usually comes with Android Studio

Check if ADB is installed: `adb --version`

### First Time Setup

Run the complete setup script (automates all steps):

```cmd
setup.bat
```

This will:
- ✅ Check Docker and ADB installation
- ✅ Build Docker image (if needed)
- ✅ Start ADB server in network mode
- ✅ Start Docker containers
- ✅ Verify everything is working

### Daily Use (After Initial Setup)

1. **Start ADB server** (if not running):
   ```cmd
   start-adb.bat
   ```
   ⚠️ Keep this window open!

2. **Start Docker containers**:
   ```cmd
   start-dev.bat
   ```
   Or manually: `docker-compose up -d`

3. **Enter development container**:
   ```cmd
   docker-compose exec flutter bash
   ```

4. **Inside container, verify setup**:
   ```bash
   adb devices          # Should show your connected device
   flutter doctor       # Check Flutter setup
   ```

5. **Run your Flutter app**:
   ```bash
   cd /home/developer/app
   flutter pub get
   flutter run
   ```

## Available Scripts

- **`setup.bat`** - Complete automated setup (run once)
- **`start-adb.bat`** - Start ADB server in network mode (run daily)
- **`start-dev.bat`** - Start Docker containers (run daily)

## Documentation

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup guide from scratch

## Need Help?

- Check [DEVELOPER_SETUP.md](DEVELOPER_SETUP.md) for detailed setup instructions
- See [FIX_ADB_CONFLICT.md](FIX_ADB_CONFLICT.md) for troubleshooting ADB connection issues
# Scripts

This folder contains Windows batch scripts for setting up and running the development environment.

## Available Scripts

### `setup.bat`
Complete automated setup script. Run this once to set up your development environment.

**What it does:**
- Checks Docker and ADB installation
- Builds Docker image (first time only, takes 10-20 minutes)
- Starts ADB server in network mode
- Starts Docker containers
- Verifies everything is working

**Usage:**
```cmd
scripts\setup.bat
```

### `start-adb.bat`
Starts ADB server in network mode for Docker containers to connect.

**Usage:**
```cmd
scripts\start-adb.bat
```

⚠️ **Important:** Keep this window open while developing with Android devices!

### `start-dev.bat`
Starts Docker containers for development.

**Usage:**
```cmd
scripts\start-dev.bat
```

**Note:** Make sure ADB server is running first (if using Android devices).

### `start-adb-server.bat`
Simple script to start ADB server. Usually called by `setup.bat` or `start-adb.bat`.

**Usage:**
```cmd
scripts\start-adb-server.bat
```

## Notes

- All scripts should be run from the project root directory
- Scripts use relative paths, so make sure you're in the correct directory
- For detailed setup instructions, see [SETUP_GUIDE.md](../SETUP_GUIDE.md)

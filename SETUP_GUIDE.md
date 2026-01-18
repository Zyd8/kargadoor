# Setup Guide Overview

This project supports two setup methods. Choose the one that best fits your needs:

## 🚀 Quick Decision Guide

**Choose Normal Flutter Setup if:**
- ✅ You're new to Flutter
- ✅ You want faster iteration and debugging
- ✅ You don't mind installing Flutter locally
- ✅ You want to use your IDE's Flutter features

**Choose Docker Setup if:**
- ✅ You don't want to install Flutter locally
- ✅ You need isolated development environments
- ✅ You're working on multiple projects with different Flutter versions
- ✅ You want consistent setup across team members

---

## Setup Guides

### 📱 [Normal Flutter Setup](SETUP_NORMAL.md)

Complete guide for setting up Flutter with a local installation.

**Includes:**
- Flutter SDK installation (Windows, macOS, Linux)
- Android Studio setup
- Xcode setup (macOS)
- Project configuration
- Running on web, Android, and iOS
- Troubleshooting

👉 **[Read Normal Flutter Setup Guide →](SETUP_NORMAL.md)**

### 🐳 [Docker Setup](SETUP_DOCKER.md)

Complete guide for setting up Flutter using Docker containers.

**Includes:**
- Docker Desktop installation
- ADB setup for Android device connection
- Automated setup scripts
- Container management
- Running on web and Android
- Troubleshooting

👉 **[Read Docker Setup Guide →](SETUP_DOCKER.md)**

---

## Quick Start Comparison

### Normal Flutter Setup

```bash
# 1. Install Flutter (see SETUP_NORMAL.md)
# 2. Setup project
cd frontend
flutter pub get
echo TOMTOM_API_KEY=your_key > .env

# 3. Run
flutter run -d chrome
```

### Docker Setup

```cmd
# 1. Run setup script
scripts\setup.bat

# 2. Enter container
docker-compose exec flutter bash

# 3. Inside container
cd /home/developer/app
flutter pub get
flutter run -d chrome
```

---

## Common Tasks

### Getting Dependencies

**Normal Flutter:**
```bash
cd frontend
flutter pub get
```

**Docker:**
```bash
docker-compose exec flutter bash
cd /home/developer/app
flutter pub get
```

### Running on Web

**Normal Flutter:**
```bash
cd frontend
flutter run -d chrome
```

**Docker:**
```bash
# Inside container
flutter run -d chrome --web-port 3000 --web-hostname 0.0.0.0
# Access at http://localhost:3000
```

### Running on Android

**Normal Flutter:**
```bash
# Connect device or start emulator
flutter devices
flutter run -d android
```

**Docker:**
```bash
# 1. Start ADB server on host: scripts\start-adb.bat
# 2. Connect device via USB
# 3. Inside container:
adb devices
flutter run -d android
```

---

## Troubleshooting

### Normal Flutter Setup Issues

👉 See [SETUP_NORMAL.md - Troubleshooting](SETUP_NORMAL.md#troubleshooting)

### Docker Setup Issues

👉 See [SETUP_DOCKER.md - Troubleshooting](SETUP_DOCKER.md#troubleshooting)

---

## Switching Between Methods

You can use both methods on the same project:

- **Normal Flutter:** Edit files directly, use IDE features
- **Docker:** Test in isolated environment, share exact setup

Both methods work with the same codebase - just different execution environments.

---

## Need Help?

- **Normal Flutter Issues:** See [SETUP_NORMAL.md](SETUP_NORMAL.md)
- **Docker Issues:** See [SETUP_DOCKER.md](SETUP_DOCKER.md)
- **General Questions:** Check [README.md](README.md)

---

## Next Steps

1. Choose your setup method
2. Follow the appropriate guide:
   - [SETUP_NORMAL.md](SETUP_NORMAL.md) for local Flutter
   - [SETUP_DOCKER.md](SETUP_DOCKER.md) for Docker
3. Get your TomTom API key: https://developer.tomtom.com/
4. Start developing! 🚀

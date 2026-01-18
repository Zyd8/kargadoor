# BrighteEats Logistics Project

A Flutter-based logistics management system with cross-platform support (Web, Android, iOS).

## Features

- 🗺️ **TomTom Maps Integration** - Works on both web and mobile platforms
- 📱 **Cross-Platform** - Single codebase for web, Android, and iOS
- 🐳 **Docker Support** - Optional Dockerized development environment
- 🔧 **Modern Architecture** - Clean code structure with services, models, and widgets

## Quick Start

Choose your preferred setup method:

### Option 1: Normal Flutter Setup ⭐ (Recommended for Beginners)

**Best for:** Developers who want Flutter installed locally, easier debugging, and faster iteration.

👉 **[See Normal Flutter Setup Guide →](SETUP_NORMAL.md)**

**Prerequisites:**
- Flutter SDK (3.10.7 or higher)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

**Quick Steps:**
```bash
cd frontend
flutter pub get
echo TOMTOM_API_KEY=your_key > .env
flutter run -d chrome
```

### Option 2: Docker Setup 🐳

**Best for:** Developers who don't want to install Flutter locally, or need isolated environments.

👉 **[See Docker Setup Guide →](SETUP_DOCKER.md)**

**Prerequisites:**
- Docker Desktop
- ADB (Android Debug Bridge)

**Quick Steps:**
```cmd
scripts\setup.bat
docker-compose exec flutter bash
cd /home/developer/app
flutter pub get
flutter run -d chrome
```

## Setup Guides

- **[SETUP_NORMAL.md](SETUP_NORMAL.md)** - Complete guide for local Flutter installation
- **[SETUP_DOCKER.md](SETUP_DOCKER.md)** - Complete guide for Docker-based setup

## Project Structure

```
frontend/
├── lib/
│   ├── config/          # App configuration
│   ├── models/          # Data models (Location, Address)
│   ├── services/        # Business logic (MapService - cross-platform)
│   ├── widgets/         # Reusable UI components
│   └── pages/           # Screen widgets (map.dart - cross-platform)
├── web/                 # Web-specific assets (HTML, JS, CSS)
├── android/             # Android-specific configuration
└── ios/                 # iOS-specific configuration
```

## Configuration

### Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
TOMTOM_API_KEY=your_tomtom_api_key_here
```

Get your API key from: https://developer.tomtom.com/

## Available Scripts (Windows)

All scripts are in the `scripts/` folder:

- **`scripts\setup.bat`** - Complete automated setup (Docker, run once)
- **`scripts\start-adb.bat`** - Start ADB server in network mode (Docker, run daily)
- **`scripts\start-dev.bat`** - Start Docker containers (Docker, run daily)

See [scripts/README.md](scripts/README.md) for detailed script documentation.

## Running the App

### Normal Flutter Setup

```bash
cd frontend

# Web
flutter run -d chrome

# Android (connect device or start emulator first)
flutter run -d android

# iOS (macOS only)
flutter run -d ios
```

### Docker Setup

1. Start ADB server: `scripts\start-adb.bat` (keep window open)
2. Start containers: `scripts\start-dev.bat`
3. Enter container: `docker-compose exec flutter bash`
4. Inside container:
   ```bash
   cd /home/developer/app
   flutter run -d chrome --web-port 3000 --web-hostname 0.0.0.0
   ```

## Troubleshooting

### Normal Flutter Setup

- **Flutter not found**: Add Flutter to your PATH
- **Devices not showing**: Run `flutter doctor` to check setup
- **API key error**: Make sure `.env` file exists in `frontend/` directory

👉 See [SETUP_NORMAL.md](SETUP_NORMAL.md) for detailed troubleshooting

### Docker Setup

- **Docker not running**: Start Docker Desktop
- **ADB connection issues**: Make sure ADB server is running (`scripts\start-adb.bat`)
- **Container won't start**: Check `docker-compose logs flutter`

👉 See [SETUP_DOCKER.md](SETUP_DOCKER.md) for detailed troubleshooting

## Technology Stack

- **Flutter** - Cross-platform UI framework
- **TomTom Maps** - Map services (Web: JavaScript SDK, Mobile: REST API tiles)
- **Docker** - Containerized development environment (optional)

## Documentation

- **[SETUP_NORMAL.md](SETUP_NORMAL.md)** - Normal Flutter setup guide
- **[SETUP_DOCKER.md](SETUP_DOCKER.md)** - Docker setup guide
- **[scripts/README.md](scripts/README.md)** - Scripts documentation

## License

[Your License Here]

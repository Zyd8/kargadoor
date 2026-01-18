# Normal Flutter Setup Guide

This guide covers setting up Flutter development with a **local Flutter installation**. This is the traditional approach and recommended for beginners.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Install Flutter](#step-1-install-flutter)
3. [Step 2: Install Android Studio](#step-2-install-android-studio)
4. [Step 3: Install Xcode (macOS only)](#step-3-install-xcode-macos-only)
5. [Step 4: Setup Project](#step-4-setup-project)
5. [Step 5: Verify Setup](#step-5-verify-setup)
6. [Daily Workflow](#daily-workflow)
7. [Running Flutter Apps](#running-flutter-apps)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- A computer (Windows, Mac, or Linux)
- Internet connection
- At least 2GB of free disk space
- Administrator/sudo access (for installation)

---

## Step 1: Install Flutter

### Windows

1. **Download Flutter SDK:**
   - Go to: https://flutter.dev/docs/get-started/install/windows
   - Download the Flutter SDK zip file
   - Extract to a location like `C:\src\flutter`
   - **Important:** Avoid paths with spaces or special characters

2. **Add Flutter to PATH:**
   - Search for "Environment Variables" in Windows Start Menu
   - Click "Edit the system environment variables"
   - Click "Environment Variables" button
   - Under "System variables", find and select "Path", then click "Edit"
   - Click "New" and add: `C:\src\flutter\bin`
   - Click "OK" on all dialogs
   - **Restart your terminal/IDE** for changes to take effect

3. **Verify Installation:**
   ```cmd
   flutter --version
   flutter doctor
   ```

### macOS

1. **Download Flutter SDK:**
   ```bash
   cd ~/development
   git clone https://github.com/flutter/flutter.git -b stable
   ```
   
   Or download zip from: https://flutter.dev/docs/get-started/install/macos

2. **Add Flutter to PATH:**
   
   **For zsh (default on macOS Catalina+):**
   ```bash
   echo 'export PATH="$PATH:$HOME/development/flutter/bin"' >> ~/.zshrc
   source ~/.zshrc
   ```
   
   **For bash:**
   ```bash
   echo 'export PATH="$PATH:$HOME/development/flutter/bin"' >> ~/.bash_profile
   source ~/.bash_profile
   ```

3. **Verify Installation:**
   ```bash
   flutter --version
   flutter doctor
   ```

### Linux

1. **Download Flutter SDK:**
   ```bash
   cd ~/development
   git clone https://github.com/flutter/flutter.git -b stable
   ```

2. **Add Flutter to PATH:**
   ```bash
   echo 'export PATH="$PATH:$HOME/development/flutter/bin"' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Install Additional Dependencies (Ubuntu/Debian):**
   ```bash
   sudo apt-get update
   sudo apt-get install -y \
       curl \
       git \
       unzip \
       xz-utils \
       zip \
       libglu1-mesa
   ```

4. **Verify Installation:**
   ```bash
   flutter --version
   flutter doctor
   ```

---

## Step 2: Install Android Studio

Android Studio provides the Android SDK and tools needed for Android development.

### Download and Install

1. **Download Android Studio:**
   - Go to: https://developer.android.com/studio
   - Download for your operating system
   - Run the installer and follow the wizard

2. **First Launch Setup:**
   - Open Android Studio
   - Follow the setup wizard
   - Choose "Standard" installation
   - Let it download Android SDK components

### Configure Android SDK

1. **Open SDK Manager:**
   - Android Studio → Tools → SDK Manager
   - Or: File → Settings → Appearance & Behavior → System Settings → Android SDK

2. **Install Required Components:**
   - **SDK Platforms:** Check "Android 13.0 (Tiramisu)" or latest
   - **SDK Tools:** Check these:
     - Android SDK Build-Tools
     - Android SDK Platform-Tools
     - Android SDK Command-line Tools
     - Google Play services
     - Intel x86 Emulator Accelerator (HAXM installer) - for Windows/Mac

3. **Click "Apply"** and wait for installation

### Accept Android Licenses

Open terminal and run:

```bash
flutter doctor --android-licenses
```

Accept all licenses by typing `y` when prompted.

### Verify Android Setup

```bash
flutter doctor
```

Should show:
- ✅ Android toolchain (Android SDK version XX.X)
- ✅ Android Studio (version X.X)

---

## Step 3: Install Xcode (macOS only)

For iOS development on macOS:

1. **Install Xcode:**
   - Open App Store
   - Search for "Xcode"
   - Click "Get" or "Install"
   - Wait for download (several GB, takes time)

2. **Accept Xcode License:**
   ```bash
   sudo xcodebuild -license
   ```
   Type `agree` and press Enter

3. **Install Xcode Command Line Tools:**
   ```bash
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   ```

4. **Install CocoaPods:**
   ```bash
   sudo gem install cocoapods
   ```

5. **Verify iOS Setup:**
   ```bash
   flutter doctor
   ```
   
   Should show:
   - ✅ Xcode (version X.X)
   - ✅ CocoaPods (version X.X)

---

## Step 4: Setup Project

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Get dependencies:**
   ```bash
   flutter pub get
   ```

3. **Create `.env` file:**
   ```bash
   # In frontend/ directory
   echo TOMTOM_API_KEY=your_api_key_here > .env
   ```
   
   Get your TomTom API key from: https://developer.tomtom.com/
   
   **Or manually create `.env` file:**
   ```env
   TOMTOM_API_KEY=your_api_key_here
   ```

4. **Verify project structure:**
   ```bash
   flutter analyze
   ```

---

## Step 5: Verify Setup

Run Flutter doctor to check your setup:

```bash
flutter doctor -v
```

**Expected output:**
- ✅ Flutter (Installed)
- ✅ Android toolchain (Installed)
- ✅ Chrome (if available)
- ✅ VS Code or Android Studio (if installed)
- ⚠️ Some items may show warnings (that's OK for development)

**Check available devices:**
```bash
flutter devices
```

Should show:
- Chrome (web)
- Android device/emulator (if connected/running)
- iOS Simulator (macOS only, if Xcode is installed)

---

## Daily Workflow

### Starting Development

1. **Navigate to project:**
   ```bash
   cd frontend
   ```

2. **Get dependencies** (after `pubspec.yaml` changes):
   ```bash
   flutter pub get
   ```

3. **Check devices:**
   ```bash
   flutter devices
   ```

4. **Run the app:**
   ```bash
   # Web
   flutter run -d chrome
   
   # Android (connect device or start emulator first)
   flutter run -d android
   
   # iOS (macOS only)
   flutter run -d ios
   ```

### Hot Reload

While the app is running:
- Press `r` - Hot reload (fast, preserves state)
- Press `R` - Hot restart (slower, resets state)
- Press `q` - Quit

### Ending Development

- Press `q` in the terminal to stop the app
- Or close the terminal window

---

## Running Flutter Apps

### Run on Web Browser

**Easiest for testing:**

```bash
cd frontend
flutter run -d chrome
```

The app will open in Chrome automatically. You can also use:
- `flutter run -d edge` (Microsoft Edge)
- `flutter run -d web-server` (starts a web server)

**Access from other devices:**
```bash
flutter run -d chrome --web-port 3000 --web-hostname 0.0.0.0
```
Then access from other devices on your network at `http://your-computer-ip:3000`

### Run on Android

**Option 1: Physical Device**

1. **Enable Developer Options:**
   - Settings → About Phone
   - Tap "Build Number" 7 times

2. **Enable USB Debugging:**
   - Settings → Developer Options
   - Enable "USB Debugging"

3. **Connect Device:**
   - Connect phone via USB
   - Allow USB debugging on phone when prompted

4. **Verify Connection:**
   ```bash
   flutter devices
   ```
   Should show your device

5. **Run App:**
   ```bash
   flutter run -d android
   ```

**Option 2: Android Emulator**

1. **Create Emulator:**
   - Android Studio → Tools → Device Manager
   - Click "Create Device"
   - Choose a device (e.g., Pixel 5)
   - Download a system image if needed
   - Click "Finish"

2. **Start Emulator:**
   - Device Manager → Click "Play" button next to your emulator
   - Wait for emulator to boot

3. **Run App:**
   ```bash
   flutter devices  # Verify emulator is listed
   flutter run -d android
   ```

### Run on iOS (macOS only)

**Option 1: iOS Simulator**

1. **Open Simulator:**
   ```bash
   open -a Simulator
   ```
   Or: Xcode → Open Developer Tool → Simulator

2. **Run App:**
   ```bash
   flutter devices  # Verify simulator is listed
   flutter run -d ios
   ```

**Option 2: Physical iPhone**

1. **Connect iPhone via USB**

2. **Trust Computer:**
   - On iPhone: Tap "Trust" when prompted

3. **Run App:**
   ```bash
   flutter devices  # Verify iPhone is listed
   flutter run -d ios
   ```

**Note:** You may need to configure code signing in Xcode for physical devices.

---

## Troubleshooting

### Flutter Issues

**Flutter not found:**
- Add Flutter to PATH (see [Step 1: Install Flutter](#step-1-install-flutter))
- Restart terminal/IDE
- Verify: `flutter --version`

**Flutter doctor shows errors:**
- Read the error messages carefully
- Most warnings are OK for development
- For Android: Run `flutter doctor --android-licenses`
- For iOS: Make sure Xcode is properly installed

**Dependencies not installing:**
- Check internet connection
- Run `flutter pub get` again
- Delete `pubspec.lock` and run `flutter pub get`
- Check `pubspec.yaml` syntax

### Android Issues

**No Android devices found:**
- Start Android emulator, or
- Connect Android device via USB
- Enable USB debugging on device
- Run `flutter devices` to verify

**Build errors:**
- Run `flutter clean`
- Run `flutter pub get`
- Check Android SDK is installed: Android Studio → SDK Manager
- Accept licenses: `flutter doctor --android-licenses`

**Gradle errors:**
- Check internet connection (Gradle downloads dependencies)
- Check `android/gradle/wrapper/gradle-wrapper.properties`
- Try: `cd android && ./gradlew clean`

### iOS Issues (macOS only)

**No iOS devices found:**
- Open Simulator: `open -a Simulator`
- Or connect iPhone via USB
- Run `flutter devices` to verify

**Code signing errors:**
- Open `ios/Runner.xcworkspace` in Xcode
- Select Runner target → Signing & Capabilities
- Select your development team
- Or configure automatic signing

**CocoaPods errors:**
- Run: `cd ios && pod install`
- If that fails: `sudo gem install cocoapods`
- Then: `cd ios && pod repo update && pod install`

### Web Issues

**Chrome not found:**
- Install Google Chrome
- Or use: `flutter run -d edge` (Microsoft Edge)

**Port already in use:**
- Use different port: `flutter run -d chrome --web-port 3001`
- Or stop the service using the port

### General Issues

**API key error:**
- Make sure `.env` file exists in `frontend/` directory
- Check that `TOMTOM_API_KEY` is set correctly
- File should be: `frontend/.env` (not `frontend/lib/.env`)

**Build errors:**
- Run `flutter clean`
- Delete `build/` folder
- Run `flutter pub get`
- Try again

**Hot reload not working:**
- Press `R` for hot restart instead
- Or stop and restart the app

---

## IDE Setup (Optional but Recommended)

### VS Code

1. **Install Flutter Extension:**
   - Open VS Code
   - Extensions → Search "Flutter"
   - Install "Flutter" extension by Dart Code

2. **Configure:**
   - VS Code will detect Flutter automatically
   - Use Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
   - Type "Flutter: New Project" or "Flutter: Select Device"

### Android Studio

1. **Install Flutter Plugin:**
   - Android Studio → File → Settings → Plugins
   - Search "Flutter"
   - Install "Flutter" plugin (includes Dart plugin)

2. **Restart Android Studio**

3. **Create/Open Project:**
   - File → New → New Flutter Project
   - Or: File → Open → Select `frontend/` folder

---

## Next Steps

- Read [README.md](README.md) for quick start
- Check [SETUP_DOCKER.md](SETUP_DOCKER.md) if you prefer Docker setup
- Get your TomTom API key: https://developer.tomtom.com/
- Explore Flutter documentation: https://flutter.dev/docs

---

## Additional Resources

- Flutter Documentation: https://flutter.dev/docs
- Flutter Cookbook: https://flutter.dev/docs/cookbook
- Dart Language Tour: https://dart.dev/guides/language/language-tour
- TomTom Developer Portal: https://developer.tomtom.com/

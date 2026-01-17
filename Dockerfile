# Use multi-platform base image
FROM --platform=linux/amd64 debian:bullseye

# Install dependencies including Android SDK and ADB
RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    xz-utils \
    zip \
    libglu1-mesa \
    ca-certificates \
    cmake \
    ninja-build \
    clang \
    build-essential \
    pkg-config \
    libgtk-3-dev \
    openjdk-17-jdk \
    android-tools-adb \
    android-tools-fastboot \
    udev \
    --no-install-recommends

# Set up new user first
RUN useradd -ms /bin/bash developer && \
    usermod -aG plugdev developer && \
    usermod -aG dialout developer

# Switch to user to set up Flutter in their home directory
USER developer
WORKDIR /home/developer

# Configure git to trust GitHub and handle line endings consistently
RUN git config --global http.sslverify true && \
    git config --global http.https://github.com.sslVerify true && \
    git config --global core.autocrlf input && \
    git config --global core.eol lf

# Install Flutter
RUN git clone --depth 1 https://github.com/flutter/flutter.git -b stable && \
    git config --global --add safe.directory /home/developer/flutter && \
    echo "export PATH=\"\$PATH:/home/developer/flutter/bin\"" >> ~/.bashrc

# Update PATH for Flutter
ENV PATH="${PATH}:/home/developer/flutter/bin"

# Enable web, Windows, and Android support
RUN flutter config --enable-web && \
    flutter config --enable-windows-desktop && \
    flutter config --enable-android

# Download and setup Android SDK (simplified)
# Note: For full Android development, consider using Android Studio SDK
# The zip extracts directly to cmdline-tools/, so we rename it first then reorganize
RUN mkdir -p ~/android-sdk && \
    cd ~/android-sdk && \
    curl -o commandlinetools.zip https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip && \
    unzip -q commandlinetools.zip && \
    mv cmdline-tools temp-cmdline-tools && \
    mkdir -p cmdline-tools && \
    mv temp-cmdline-tools cmdline-tools/latest && \
    rm commandlinetools.zip

# Set Android SDK environment variables
ENV ANDROID_HOME=/home/developer/android-sdk
ENV PATH="${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/tools/bin"

# Accept Android licenses and install platform tools
# Install Android SDK 36 and build tools (install multiple versions for compatibility)
RUN yes | sdkmanager --licenses || true && \
    sdkmanager "platform-tools" && \
    sdkmanager "platforms;android-36" || sdkmanager "platforms;android-34" && \
    sdkmanager "build-tools;34.0.0" && \
    sdkmanager "build-tools;33.0.0" && \
    sdkmanager "build-tools;28.0.3" || true

# Pre-accept licenses and get Flutter dependencies
# Accept Android licenses (will fail if no interaction possible, that's ok)
RUN yes | flutter doctor --android-licenses || echo "Licenses accepted manually" && \
    flutter precache --web --windows --android

# Set working directory for app
WORKDIR /home/developer/app

# Use multi-platform base image
FROM --platform=linux/amd64 debian:bullseye

# Install dependencies
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
    --no-install-recommends

# Configure git to trust GitHub and handle line endings consistently
RUN git config --global http.sslverify true && \
    git config --global http.https://github.com.sslVerify true && \
    git config --global core.autocrlf input && \
    git config --global core.eol lf

# Set up new user
RUN useradd -ms /bin/bash developer
USER developer
WORKDIR /home/developer

# Install Flutter
RUN git config --global --add safe.directory /home/developer/flutter
RUN git clone --depth 1 https://github.com/flutter/flutter.git -b stable \
    && echo "export PATH=\"\$PATH:/home/developer/flutter/bin\"" >> ~/.bashrc

# Update PATH for Flutter
ENV PATH="${PATH}:/home/developer/flutter/bin"

# Enable web and Windows support
RUN flutter config --enable-web && \
    flutter config --enable-windows-desktop

# Run basic check
RUN flutter doctor -v

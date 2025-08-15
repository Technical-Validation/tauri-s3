#!/bin/bash

# Development setup script for S3 Upload Tool
# This script installs the necessary system dependencies for Tauri development

echo "Setting up development environment for S3 Upload Tool..."

# Detect the Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
fi

echo "Detected OS: $OS"

# Install system dependencies based on the distribution
case $OS in
    "Ubuntu"*|"Debian"*)
        echo "Installing dependencies for Ubuntu/Debian..."
        sudo apt update
        sudo apt install -y \
            libwebkit2gtk-4.0-dev \
            build-essential \
            curl \
            wget \
            file \
            libssl-dev \
            libgtk-3-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev \
            libglib2.0-dev \
            libcairo2-dev \
            libpango1.0-dev \
            libgdk-pixbuf2.0-dev \
            libatk1.0-dev
        ;;
    "Fedora"*|"CentOS"*|"Red Hat"*)
        echo "Installing dependencies for Fedora/RHEL/CentOS..."
        sudo dnf install -y \
            webkit2gtk4.0-devel \
            openssl-devel \
            curl \
            wget \
            file \
            libappindicator-gtk3-devel \
            librsvg2-devel \
            gtk3-devel \
            glib2-devel \
            cairo-devel \
            pango-devel \
            gdk-pixbuf2-devel \
            atk-devel
        ;;
    "Arch Linux"*)
        echo "Installing dependencies for Arch Linux..."
        sudo pacman -S --needed \
            webkit2gtk \
            base-devel \
            curl \
            wget \
            file \
            openssl \
            appmenu-gtk-module \
            gtk3 \
            libappindicator-gtk3 \
            librsvg \
            libvips
        ;;
    *)
        echo "Unsupported distribution: $OS"
        echo "Please install the following dependencies manually:"
        echo "- webkit2gtk development libraries"
        echo "- GTK3 development libraries"
        echo "- Cairo, Pango, GLib development libraries"
        echo "- OpenSSL development libraries"
        echo "- Build tools (gcc, make, etc.)"
        exit 1
        ;;
esac

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "Rust is not installed. Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
fi

# Install npm dependencies
echo "Installing npm dependencies..."
npm install

echo "Development environment setup complete!"
echo "You can now run 'npm run tauri:dev' to start the development server."
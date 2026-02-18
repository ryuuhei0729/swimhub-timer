#!/bin/bash
# Post-install setup for monorepo
# 1. Symlink next to root node_modules so eslint-config-next can resolve it
# 2. Download ffmpeg-kit xcframeworks for iOS builds

set -e

# Symlink next from apps/web to root node_modules for eslint-config-next resolution
if [ -d "apps/web/node_modules/next" ] && [ ! -e "node_modules/next" ]; then
  echo "[postinstall] Symlinking next to root node_modules for eslint..."
  ln -s ../apps/web/node_modules/next node_modules/next
fi

FFMPEG_DIR="node_modules/ffmpeg-kit-react-native/bundle-apple-framework-ios"
MARKER="$FFMPEG_DIR/ffmpegkit.xcframework/ios-arm64/ffmpegkit.framework/Headers/FFmpegKitConfig.h"
ZIP_URL="https://github.com/jdarshan5/ffmpeg-kit-react-native/releases/download/rn-binaries/ffmpeg-full-gpl-6-0-2.zip"

# Skip if already extracted
if [ -f "$MARKER" ]; then
  echo "[ffmpeg-kit] xcframeworks already present, skipping download."
  exit 0
fi

echo "[ffmpeg-kit] Downloading xcframeworks..."
TMPZIP=$(mktemp /tmp/ffmpeg-kit-XXXXXX.zip)
curl -L -o "$TMPZIP" "$ZIP_URL"

echo "[ffmpeg-kit] Extracting to $FFMPEG_DIR..."
mkdir -p "$FFMPEG_DIR"
unzip -o -q "$TMPZIP" -d "$FFMPEG_DIR"

rm -f "$TMPZIP"
echo "[ffmpeg-kit] Done."

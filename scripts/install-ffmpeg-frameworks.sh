#!/bin/bash
# Post-install setup for monorepo
# 1. Symlink next to root node_modules so eslint-config-next can resolve it
# 2. Copy @ffmpeg/core WASM to public/ffmpeg for self-hosted serving
# 3. Download ffmpeg-kit xcframeworks for iOS builds

set -e

# Symlink next from apps/web to root node_modules for eslint-config-next resolution
if [ -d "apps/web/node_modules/next" ]; then
  echo "[postinstall] Symlinking next to root node_modules for eslint..."
  ln -sfn ../apps/web/node_modules/next node_modules/next
fi

# Copy @ffmpeg/core WASM binaries to public directory for self-hosted serving
FFMPEG_CORE_SRC="node_modules/@ffmpeg/core/dist/umd"
FFMPEG_CORE_DST="apps/web/public/ffmpeg"
if [ -d "$FFMPEG_CORE_SRC" ]; then
  mkdir -p "$FFMPEG_CORE_DST"
  cp "$FFMPEG_CORE_SRC/ffmpeg-core.js" "$FFMPEG_CORE_SRC/ffmpeg-core.wasm" "$FFMPEG_CORE_DST/"
  echo "[ffmpeg-core] Copied WASM binaries to $FFMPEG_CORE_DST"
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
rm -f /tmp/ffmpeg-kit-*.zip
TMPZIP=$(mktemp /tmp/ffmpeg-kit-XXXXXX.zip)
curl -L -o "$TMPZIP" "$ZIP_URL"

echo "[ffmpeg-kit] Extracting to $FFMPEG_DIR..."
mkdir -p "$FFMPEG_DIR"
unzip -o -q "$TMPZIP" -d "$FFMPEG_DIR"

rm -f "$TMPZIP"
echo "[ffmpeg-kit] Done."

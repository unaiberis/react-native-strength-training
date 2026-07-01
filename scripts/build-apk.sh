#!/bin/bash
# Build APK for the Strength Training app
# Usage: ./scripts/build-apk.sh [debug|release]
set -e

MODE="${1:-release}"
cd "$(dirname "$0")/../android"

export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

echo "=== Building $MODE APK ==="
if [ "$MODE" = "release" ]; then
  ./gradlew assembleRelease 2>&1 | tail -5
  APK_DIR="release"
  APK_FILE="app-release.apk"
  # If gradle generated a universal APK, also copy to legacy name for nginx
  if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    cp -f "app/build/outputs/apk/release/app-release.apk" \
          "app/build/outputs/apk/release/app-arm64-v8a-release.apk"
  fi
else
  ./gradlew assembleDebug 2>&1 | tail -5
  APK_DIR="debug"
  APK_FILE="app-debug.apk"
  if [ -f "app/build/outputs/apk/debug/app-universal-debug.apk" ]; then
    cp -f "app/build/outputs/apk/debug/app-universal-debug.apk" \
          "app/build/outputs/apk/debug/app-debug.apk"
  fi
fi

echo ""
echo "=== $MODE APK listo ==="
ls -lh "app/build/outputs/apk/$APK_DIR/"
echo ""
echo "Descargar: https://entrenamentua.musikak.com/apk"
echo "          https://entrenamentua.musikak.com/apk/universal"

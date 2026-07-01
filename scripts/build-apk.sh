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
  APK_FILE="app-arm64-v8a-release.apk"
else
  ./gradlew assembleDebug 2>&1 | tail -5
  APK_DIR="debug"
  APK_FILE="app-debug.apk"
fi

echo ""
echo "=== $MODE APK listo ==="
ls -lh "app/build/outputs/apk/$APK_DIR/$APK_FILE"
echo ""
echo "Descargar: https://entrenamentua.musikak.com/apk"
echo "          https://entrenamentua.musikak.com/apk/universal"

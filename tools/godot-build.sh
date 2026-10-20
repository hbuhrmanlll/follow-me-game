#!/usr/bin/env bash
# Builds the 3D version (the Godot project in godot/). Used by the GitHub
# Actions workflows, so nothing needs installing on your own computer.
#   tools/godot-build.sh web      -> dist/3d/ (part of the website)
#   tools/godot-build.sh android  -> godot/build/follow-me-3d-test.apk
set -euo pipefail
WHAT=${1:-web}
VER=4.7-stable
BASE=https://github.com/godotengine/godot-builds/releases/download/$VER
GODOT_DIR=${GODOT_DIR:-$HOME/godot-$VER}
G=$GODOT_DIR/godot

if [ ! -x "$G" ]; then
  mkdir -p "$GODOT_DIR"
  curl -fsSL --retry 4 -o /tmp/godot.zip "$BASE/Godot_v${VER}_linux.x86_64.zip"
  unzip -q -o /tmp/godot.zip -d "$GODOT_DIR"
  mv "$GODOT_DIR/Godot_v${VER}_linux.x86_64" "$G"
fi

# Only the export templates we need, not the whole 1.3 GB bundle.
T=$HOME/.local/share/godot/export_templates/${VER/-/.}
mkdir -p "$T"
if [ "$WHAT" = web ]; then NEED=web_nothreads_release.zip; else NEED=android_release.apk; fi
[ -f "$T/$NEED" ] || python3 tools/zip-pick.py "$BASE/Godot_v${VER}_export_templates.tpz" "$T" version.txt "$NEED"

bash tools/godot-content.sh
"$G" --headless --path godot --import >/dev/null 2>&1 || true

if [ "$WHAT" = web ]; then
  rm -rf godot/build/web && mkdir -p godot/build/web
  "$G" --headless --path godot --export-release Web build/web/index.html
  test -f godot/build/web/index.pck
  mkdir -p dist/3d && cp -r godot/build/web/. dist/3d/
  echo "Web version in dist/3d"
else
  SDK=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/usr/local/lib/android/sdk}}
  mkdir -p "$HOME/.config/godot"
  cat > "$HOME/.config/godot/editor_settings-4.7.tres" <<TRES
[gd_resource type="EditorSettings" format=3]

[resource]
export/android/android_sdk_path = "$SDK"
export/android/java_sdk_path = "${JAVA_HOME:-}"
TRES
  sed -i "s/^version\/code=.*/version\/code=${BUILD_NUMBER:-1}/" godot/export_presets.cfg
  export GODOT_ANDROID_KEYSTORE_RELEASE_PATH=$PWD/android/test-signing.keystore
  export GODOT_ANDROID_KEYSTORE_RELEASE_USER=androiddebugkey
  export GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD=android
  mkdir -p godot/build
  "$G" --headless --path godot --export-release Android build/follow-me-3d-test.apk
  test -f godot/build/follow-me-3d-test.apk
  echo "Android test app in godot/build/follow-me-3d-test.apk"
fi

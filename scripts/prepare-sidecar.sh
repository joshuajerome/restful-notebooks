#!/bin/bash
# Build the PyInstaller backend and copy to Tauri binaries directory.
# Run from the project root: ./scripts/prepare-sidecar.sh

set -e

BACKEND_DIR="backend"
TARGET_DIR="src-tauri/binaries"
TRIPLE=$(rustc -Vv | grep host | cut -d' ' -f2)

echo "Building backend with PyInstaller..."
(cd "$BACKEND_DIR" && uv run pyinstaller \
    --name restful-notebooks-server \
    --onedir \
    --noconfirm \
    --distpath dist \
    --collect-all restful \
    --collect-all app \
    --hidden-import yaml \
    --hidden-import pydantic \
    --hidden-import sqlalchemy \
    __main__.py)

echo "Copying sidecar binary..."
mkdir -p "$TARGET_DIR"

# Copy the entire onedir output
SIDECAR_NAME="restful-notebooks-server-${TRIPLE}"
cp -R "$BACKEND_DIR/dist/restful-notebooks-server" "$TARGET_DIR/$SIDECAR_NAME"

# Tauri expects a single executable, not a directory. For onedir, we need the executable.
# Copy the main binary with the platform triple name
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    cp "$BACKEND_DIR/dist/restful-notebooks-server/restful-notebooks-server.exe" "$TARGET_DIR/$SIDECAR_NAME"
else
    cp "$BACKEND_DIR/dist/restful-notebooks-server/restful-notebooks-server" "$TARGET_DIR/$SIDECAR_NAME"
fi

echo "Sidecar ready: $TARGET_DIR/$SIDECAR_NAME"
echo "Platform triple: $TRIPLE"

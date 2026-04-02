"""Entry point for PyInstaller and direct execution."""
import os
import sys

import uvicorn

from app.main import app

if __name__ == "__main__":
    port = int(os.environ.get("RESTFUL_DESK_PORT", "8000"))
    # Signal to Electron that the backend is starting on this port
    print(f"RESTFUL_PORT={port}", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=port)

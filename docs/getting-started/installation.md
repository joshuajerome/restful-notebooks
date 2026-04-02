# Installation

## Desktop App (from Releases)

Download the latest build from [GitHub Releases](https://github.com/joshuajerome/restful-notebooks/releases):

| Platform | Asset |
|----------|-------|
| macOS | `restful-notebooks-macos.dmg` or `.zip` |
| Windows | `restful-notebooks-windows.exe` |
| Linux | `restful-notebooks-linux.AppImage` |

## Development Setup

### Prerequisites

- Python >= 3.10
- Node.js >= 20
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### Backend

```bash
cd restful-notebooks/backend
uv sync
uv run python -m uvicorn app.main:app --reload --port 8000
```

To load a workspace on startup:

```bash
RESTFUL_WORKSPACE=/path/to/workspace uv run python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd restful-notebooks/frontend
npm install
npm run dev
```

The frontend dev server runs on port 3000 and proxies `/api` requests to the backend on port 8000.

### Electron (optional)

```bash
cd restful-notebooks/electron
npm install
npm start
```

The Electron shell wraps the frontend and manages the backend process lifecycle. In dev mode, it connects to the separately-running frontend and backend.

## Verify

Open `http://localhost:3000` in a browser, or launch the Electron app. The footer should show a green dot with "Backend connected".

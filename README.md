# Restful Notebooks

Desktop companion app for [restful-sdk](https://github.com/joshuajerome/restful-sdk) — visual REST workspace management, endpoint browsing, request execution, and notebook orchestration.

![Electron](https://img.shields.io/badge/Electron-33-blue) ![React](https://img.shields.io/badge/React-18-blue) ![MUI](https://img.shields.io/badge/MUI-v6-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)

## What is Restful Notebooks?

Restful Notebooks wraps the [restful-sdk](https://pypi.org/project/restful-sdk/) Python library in a desktop GUI. Every feature delegates to the library — the app adds only visual presentation and request history.

- **Workspace management** — create, configure, and switch between workspaces
- **Configuration page** — form-based API setup with plugin loading, auth config, and file pickers
- **Endpoint browser** — searchable catalog of typed endpoints with method pills and group filtering
- **Request builder** — endpoint autocomplete, OData params, query params, JSON payload editor, syntax-highlighted response viewer with right-click save-to-variable
- **Notebooks** — multi-step workflow builder with data extraction, variable templating, and per-stage execution
- **History** — timestamped request log with method/status chips and workspace filtering
- **Observability** — real-time backend log viewer with search, color-coded log levels, auto-scroll, download
- **Settings** — plugin management, temp workspace color config

## Architecture

```
┌─────────────────────────────────────────────┐
│              Electron Shell                  │
│  main.js · preload.js · splash screen       │
│  (process lifecycle, native window chrome)   │
├─────────────────────────────────────────────┤
│           FastAPI Backend                    │
│  Thin adapter wrapping restful-sdk library   │
│  + SQLite for request history                │
├─────────────────────────────────────────────┤
│         React + MUI Frontend                 │
│  Zustand stores · MUI v6 components         │
└─────────────────────────────────────────────┘
```

The backend is a **thin adapter** — every route is a 5-10 line function that calls a restful-sdk library function and returns the result as JSON.

## Development Setup

### Prerequisites

- Python >= 3.10
- Node.js >= 20
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### Backend

```bash
cd backend
uv sync
uv run python -m uvicorn app.main:app --reload --port 8000
```

To load a workspace on startup:

```bash
RESTFUL_WORKSPACE=/path/to/workspace uv run python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on port 3000, proxies `/api` to the backend on port 8000.

### Electron (optional)

```bash
cd electron
npm install
npm start
```

## Project Structure

```
restful-notebooks/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py             # App setup, lifespan, health + log endpoints
│   │   ├── dependencies.py     # get_ws dependency
│   │   ├── database.py         # SQLAlchemy + SQLite
│   │   ├── services/
│   │   │   └── workspace_manager.py  # Core state holder
│   │   ├── routers/
│   │   │   ├── workspace.py    # Create, load, save-config, variables
│   │   │   ├── endpoints.py    # Endpoint browsing
│   │   │   ├── requests.py     # HTTP execution + history
│   │   │   ├── plugins.py      # Plugin validate + load
│   │   │   └── workflow.py     # Workflow runner
│   │   ├── models/             # SQLAlchemy models
│   │   └── schemas/            # Pydantic schemas
│   └── pyproject.toml
├── frontend/                   # React + MUI + Zustand
│   ├── src/
│   │   ├── App.tsx             # Routes
│   │   ├── theme.ts            # Dark/light themes
│   │   ├── components/         # WorkspaceLayout, ResponseViewer, SyntaxEditor, etc.
│   │   ├── pages/              # Workspaces, Config, Endpoints, Request, Notebooks, etc.
│   │   ├── store/              # Zustand stores (workspace, request, endpoint, etc.)
│   │   └── hooks/              # useAuditIntegration
│   └── package.json
├── electron/                   # Electron shell
│   ├── main.js                 # Backend lifecycle, window management, auto-updater
│   ├── preload.js              # Context bridge APIs
│   ├── splash.html             # Loading screen
│   ├── icons/                  # App icons (icns, ico, png)
│   └── package.json
├── docs/                       # MkDocs documentation
└── mkdocs.yml
```

## API Endpoints

| Route | Description |
|-------|-------------|
| `GET /api/health` | Backend status + workspace info |
| `GET /api/workspace` | Current workspace info |
| `POST /api/workspace/create` | Create workspace on disk |
| `POST /api/workspace/load` | Load workspace from path |
| `POST /api/workspace/save-config` | Write API configs to YAML |
| `POST /api/workspace/unload` | Clear loaded workspace |
| `GET /api/endpoints` | List endpoints (search + group filter) |
| `POST /api/requests/execute` | Execute HTTP request |
| `GET /api/requests/history` | Request history |
| `POST /api/plugins/load` | Generate endpoint modules |
| `POST /api/plugins/validate` | Validate plugin source |
| `GET /api/workflows` | List workflows |
| `POST /api/workflows/{name}/run` | Run all stages |
| `GET /api/system/logs` | Backend log lines |

## Documentation

Full docs at [joshuajerome.github.io/restful-notebooks](https://joshuajerome.github.io/restful-notebooks)

## About

Restful Notebooks is the visual companion to [restful-sdk](https://github.com/joshuajerome/restful-sdk). While the library handles all the heavy lifting — typed endpoints, auth, plugins, workflows — the desktop app provides a GUI for users who prefer clicking over scripting.

The design principle: **there are no features in the desktop app that don't exist in the library.** The app is a thin presentation layer.

Built with Electron (cross-platform desktop), FastAPI (Python backend), React + MUI (frontend), and Zustand (state management).

## License

MIT

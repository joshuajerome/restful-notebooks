# post-it-desktop — Claude Working Context

## What is post-it-desktop

GUI for the post-it Python library. Electron-style app (FastAPI backend + React frontend). Provides visual endpoint browsing, request building, workflow editing, workspace management.

**post-it-desktop is a GUI for post-it. No substantial features in the desktop that don't exist in the library.**

## Architecture

```
post-it-desktop/
├── backend/          # FastAPI (Python) — wraps post_it library
│   └── app/
│       ├── main.py
│       ├── routers/  # endpoints, requests, variables, config, plugins
│       ├── services/ # endpoint_service, request_service
│       ├── models/   # SQLAlchemy (history, variables)
│       └── schemas/  # Pydantic models
├── frontend/         # React + MUI + Zustand
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── store/
│       ├── hooks/
│       └── api/
└── docker-compose.yml  # For test infrastructure (stub server)
```

## Development (Local)

```bash
# Backend
cd backend && uv run uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm run dev

# Both run locally — no containers for dev
```

## Key Conventions

- **Never auto-commit.** Only commit when explicitly asked.
- **uv** for Python. **npm** for frontend.
- **MUI MCP server**: Always use the MUI MCP server (`mcp__mui-mcp__useMuiDocs` with `@mui/material@6.4.12`) when making UI changes. Reference MUI v6 docs for component APIs, props, and patterns. Use only MUI components — no raw HTML elements where an MUI equivalent exists.
- **Theme**: Match cutip-desktop's design language exactly. Use theme tokens, not hardcoded colors.
- **Stores**: Zustand for state. All API calls must have error handling (try-catch).
- **Read before edit** — never modify a file you haven't read in this session.

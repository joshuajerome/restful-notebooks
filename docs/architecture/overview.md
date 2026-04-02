# Architecture Overview

Restful Notebooks is a three-layer application:

```
┌─────────────────────────────────────────────────┐
│                 Electron Shell                    │
│   main.js · preload.js · splash.html             │
│   (process lifecycle, native window chrome)       │
├─────────────────────────────────────────────────┤
│              FastAPI Backend                      │
│   Thin adapter wrapping restful library          │
│   + SQLite for request history                   │
├─────────────────────────────────────────────────┤
│            React + MUI Frontend                   │
│   Zustand stores · MUI v6 components             │
│   9 pages · 5 shared components                  │
└─────────────────────────────────────────────────┘
```

## Data Flow

```
User clicks "Send"
  → requestStore.execute()
    → POST /api/requests/execute { method, endpoint_path, api_alias, ... }
      → FastAPI router
        → WorkspaceManager.get_client(alias)
          → restful Client.get/post/put/delete(endpoint)
            → HTTP request with auth headers
          ← HttpResponse
        → Save to SQLite history
      ← ExecuteResponse { status_code, body, headers, duration_ms }
    → Update store state
  → ResponseViewer renders JSON
```

## Key Principle

The backend is a **thin adapter**. Every route is a 5-10 line function that:

1. Receives a request from the frontend
2. Calls a restful library function
3. Returns the result as JSON

The only backend-exclusive state is **request history** in SQLite — everything else lives in the restful library (workspace config, variables, token cache, clients).

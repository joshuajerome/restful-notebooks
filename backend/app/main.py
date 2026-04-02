"""Restful Notebooks backend — thin adapter for the restful library."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import endpoints, plugins, requests, workflow, workspace
from app.services.workspace_manager import WorkspaceManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()

    mgr = WorkspaceManager()
    ws_path = os.environ.get("RESTFUL_WORKSPACE")
    try:
        mgr.load(Path(ws_path) if ws_path else None)
    except FileNotFoundError:
        pass  # No workspace yet — that's OK, health will report it

    app.state.ws = mgr
    yield
    mgr.close()


app = FastAPI(title="Restful Notebooks", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workspace.router)
app.include_router(endpoints.router)
app.include_router(requests.router)
app.include_router(workflow.router)
app.include_router(plugins.router)


@app.get("/api/health")
def health():
    mgr: WorkspaceManager = app.state.ws
    return {
        "status": "ok",
        "workspace": mgr.config.name if mgr.config else None,
        "workspace_root": str(mgr.config.root) if mgr.config else None,
    }

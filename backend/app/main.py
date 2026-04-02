"""Restful Notebooks backend — thin adapter for the restful library."""

import logging
import os
from contextlib import asynccontextmanager
from logging.handlers import RotatingFileHandler
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import endpoints, plugins, requests, workflow, workspace
from app.services.workspace_manager import WorkspaceManager


def setup_logging() -> None:
    """Configure file-based logging with rotation."""
    log_dir = Path.home() / ".restful"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / "restful-notebooks.log"

    handler = RotatingFileHandler(
        log_path,
        maxBytes=5 * 1024 * 1024,  # 5 MB
        backupCount=3,
        encoding="utf-8",
    )
    handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    )
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(logging.DEBUG)
    root.addHandler(handler)

    # Capture uvicorn logs as well
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        uv_logger = logging.getLogger(name)
        uv_logger.addHandler(handler)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
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


@app.get("/api/system/logs")
def get_logs(tail: int = 200):
    """Return last N lines from the log file."""
    log_path = Path.home() / ".restful" / "restful-notebooks.log"
    if not log_path.exists():
        return {"lines": [], "path": str(log_path), "total": 0}
    with log_path.open("r", encoding="utf-8", errors="replace") as f:
        all_lines = f.readlines()
    lines = [l.rstrip() for l in all_lines[-tail:]]
    return {"lines": lines, "path": str(log_path), "total": len(all_lines)}


@app.get("/api/system/log-path")
def get_log_path():
    """Return the path to the log file."""
    log_path = Path.home() / ".restful" / "restful-notebooks.log"
    return {"path": str(log_path), "exists": log_path.exists()}

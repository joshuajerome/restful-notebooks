"""Shared fixtures for backend tests."""

import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """FastAPI test client with lifespan."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def workspace_dir(client):
    """Create a temporary workspace and return its path. Cleaned up after test."""
    r = client.get("/api/workspace/default-parent")
    parent = r.json()["path"]
    name = f"test-{id(client)}"
    ws_path = Path(parent) / name

    # Clean up if exists from a previous failed run
    if ws_path.exists():
        shutil.rmtree(ws_path)

    r = client.post("/api/workspace/create", json={"name": name, "path": parent})
    assert r.status_code == 200
    yield str(ws_path)

    # Cleanup
    shutil.rmtree(ws_path, ignore_errors=True)

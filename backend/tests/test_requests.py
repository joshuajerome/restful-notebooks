"""Tests for requests router (history)."""


def test_history_empty(workspace_dir, client):
    r = client.get("/api/requests/history")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_history_filter(workspace_dir, client):
    r = client.get("/api/requests/history?workspace=nonexistent")
    assert r.status_code == 200
    assert r.json() == []

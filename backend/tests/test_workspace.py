"""Tests for workspace router."""


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "sdk_version" in data


def test_default_parent(client):
    r = client.get("/api/workspace/default-parent")
    assert r.status_code == 200
    assert "path" in r.json()


def test_create_workspace(workspace_dir, client):
    """workspace_dir fixture creates a workspace — verify it's loaded."""
    r = client.get("/api/workspace")
    assert r.status_code == 200
    data = r.json()
    assert data["name"] is not None
    assert data["root"] is not None


def test_save_config(workspace_dir, client):
    r = client.post(
        "/api/workspace/save-config",
        json={
            "apis": [
                {
                    "name": "TestAPI",
                    "alias": "test",
                    "plugin": "",
                    "source": "",
                    "base_url": "https://example.com",
                }
            ]
        },
    )
    assert r.status_code == 200
    assert len(r.json()["apis"]) == 1
    assert r.json()["apis"][0]["name"] == "TestAPI"


def test_save_config_empty_apis(workspace_dir, client):
    r = client.post("/api/workspace/save-config", json={"apis": []})
    assert r.status_code == 200
    assert r.json()["apis"] == []


def test_workspace_variables(workspace_dir, client):
    # Set
    r = client.put("/api/workspace/variables/foo", json={"value": "bar"})
    assert r.status_code == 200

    # Get
    r = client.get("/api/workspace/variables")
    assert r.status_code == 200
    assert r.json()["variables"]["foo"] == "bar"

    # Delete
    r = client.delete("/api/workspace/variables/foo")
    assert r.status_code == 200
    r = client.get("/api/workspace/variables")
    assert "foo" not in r.json()["variables"]


def test_workspace_list(client):
    r = client.get("/api/workspace/list")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_unload(workspace_dir, client):
    r = client.post("/api/workspace/unload")
    assert r.status_code == 200

    r = client.get("/api/workspace")
    assert r.json()["name"] is None


def test_ping(client):
    r = client.post("/api/workspace/ping", json={"url": "https://www.google.com"})
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_ping_unreachable(client):
    r = client.post("/api/workspace/ping", json={"url": "http://192.0.2.1:9999"})
    assert r.status_code == 200
    assert r.json()["ok"] is False

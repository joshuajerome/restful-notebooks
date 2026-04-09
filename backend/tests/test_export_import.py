"""Tests for workspace export/import."""

import shutil
from io import BytesIO
from pathlib import Path


def test_export(workspace_dir, client):
    r = client.post("/api/workspace/export")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/zip"
    assert len(r.content) > 0


def test_export_import_roundtrip(workspace_dir, client):
    # Save some config first
    client.post(
        "/api/workspace/save-config",
        json={"apis": [{"name": "RoundtripAPI", "alias": "rt"}]},
    )

    # Export
    r = client.post("/api/workspace/export")
    assert r.status_code == 200
    zip_data = r.content

    # Delete original
    shutil.rmtree(workspace_dir)

    # Import
    r = client.post(
        "/api/workspace/import",
        files={"file": ("test.zip", BytesIO(zip_data), "application/zip")},
    )
    assert r.status_code == 200
    imported_path = r.json()["path"]

    # Verify
    assert Path(imported_path).exists()

    # Cleanup
    shutil.rmtree(imported_path, ignore_errors=True)


def test_import_invalid_zip(client):
    r = client.post(
        "/api/workspace/import",
        files={"file": ("bad.zip", BytesIO(b"not a zip"), "application/zip")},
    )
    assert r.status_code == 400


def test_import_no_config(client):
    """ZIP without *.config.yaml should fail."""
    import zipfile

    buf = BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("readme.txt", "hello")
    buf.seek(0)

    r = client.post(
        "/api/workspace/import",
        files={"file": ("noconfig.zip", buf, "application/zip")},
    )
    assert r.status_code == 400
    assert "config.yaml" in r.json()["detail"]

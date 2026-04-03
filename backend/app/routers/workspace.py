import io
import os
import zipfile
from pathlib import Path

import yaml
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.dependencies import get_ws
from app.services.workspace_manager import WorkspaceManager
from restful.workspace.scaffold import create_workspace

router = APIRouter(prefix="/api/workspace", tags=["workspace"])


# --- Request/Response schemas ---


class ApiInfo(BaseModel):
    name: str
    alias: str
    plugin: str
    base_url: str
    auth_type: str


class WorkspaceInfo(BaseModel):
    name: str | None = None
    root: str | None = None
    apis: list[ApiInfo] = []


class VariablesResponse(BaseModel):
    variables: dict[str, str]


class VariableSetBody(BaseModel):
    value: str


class LoadBody(BaseModel):
    path: str


class CreateBody(BaseModel):
    name: str
    path: str  # parent directory


class AuthConfigBody(BaseModel):
    type: str = "none"
    login_path: str = ""
    username: str = ""
    password: str = ""      # direct password (manual mode)
    password_env: str = ""  # env var name (env mode)
    header: str = "X-API-Key"
    key_env: str = ""


class ApiConfigBody(BaseModel):
    name: str
    alias: str = ""
    plugin: str = ""
    source: str = ""
    base_url: str = ""
    plugin_path: str = ""
    auth: AuthConfigBody = AuthConfigBody()


class SaveConfigBody(BaseModel):
    apis: list[ApiConfigBody]


class CreateResponse(BaseModel):
    name: str
    root: str
    config_path: str


# --- Helpers ---


def get_data_dir() -> Path:
    """Return platform-appropriate data directory for Restful Notebooks."""
    import platform
    system = platform.system()
    if system == "Windows":
        base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
    elif system == "Darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    data_dir = base / "restful"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def _build_workspace_info(mgr: WorkspaceManager) -> WorkspaceInfo:
    """Build WorkspaceInfo from the current manager state."""
    if mgr.config is None:
        return WorkspaceInfo()
    apis = [
        ApiInfo(
            name=api.name,
            alias=api.alias,
            plugin=api.plugin,
            base_url=api.base_url,
            auth_type=api.auth.type,
        )
        for api in mgr.config.apis
    ]
    return WorkspaceInfo(name=mgr.config.name, root=str(mgr.config.root), apis=apis)


def _write_config_yaml(config_path: Path, workspace_name: str, apis: list[ApiConfigBody]) -> None:
    """Serialize workspace config to YAML on disk."""
    apis_data = []
    for api in apis:
        entry: dict = {
            "name": api.name,
            "alias": api.alias,
            "plugin": api.plugin,
            "source": api.source,
        }
        if api.base_url:
            entry["base_url"] = api.base_url
        if api.plugin_path:
            entry["plugin_path"] = api.plugin_path
        if api.auth.type != "none":
            auth: dict = {"type": api.auth.type}
            if api.auth.type == "bearer":
                auth["login_path"] = api.auth.login_path
                auth["username"] = api.auth.username
                auth["password_env"] = api.auth.password_env
            elif api.auth.type == "apikey":
                auth["header"] = api.auth.header
                auth["key_env"] = api.auth.key_env
            entry["auth"] = auth
        apis_data.append(entry)

    data = {
        "apiVersion": "restful/v1",
        "workspace": {"name": workspace_name},
        "apis": apis_data,
    }
    config_path.write_text(yaml.dump(data, default_flow_style=False, sort_keys=False), encoding="utf-8")


# --- Endpoints ---


@router.get("/default-parent")
def get_default_parent():
    """Return the default parent directory for new workspaces."""
    ws_dir = get_data_dir() / "workspaces"
    ws_dir.mkdir(parents=True, exist_ok=True)
    return {"path": str(ws_dir)}


@router.get("/read-file")
def read_file(path: str):
    """Read a text file and return its content. Used by frontend for plugin.yaml etc."""
    p = Path(path)
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    if not p.is_file():
        raise HTTPException(status_code=400, detail=f"Not a file: {path}")
    try:
        return {"content": p.read_text(encoding="utf-8", errors="replace")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class PingBody(BaseModel):
    url: str


class TestAuthBody(BaseModel):
    api_alias: str


@router.post("/ping")
def ping_url(body: PingBody):
    """Ping a URL to test connectivity. Handles self-signed TLS."""
    import requests as req
    try:
        r = req.head(body.url, timeout=5, verify=False, allow_redirects=True)
        return {"ok": True, "msg": f"Reachable ({r.status_code})"}
    except req.ConnectionError:
        return {"ok": False, "msg": "Connection refused"}
    except req.Timeout:
        return {"ok": False, "msg": "Timeout (5s)"}
    except Exception as e:
        return {"ok": False, "msg": str(e)[:100]}


@router.post("/test-auth")
def test_auth(body: TestAuthBody, mgr: WorkspaceManager = Depends(get_ws)):
    """Test authentication by triggering a login for the specified API."""
    api_cfg = mgr.config.get_api(body.api_alias)
    if not api_cfg:
        raise HTTPException(status_code=404, detail=f"API '{body.api_alias}' not found")

    client = mgr.get_client(body.api_alias)

    # Force auth by getting headers (triggers login for bearer)
    try:
        if client.auth and hasattr(client.auth, 'auth_headers'):
            headers = client.auth.auth_headers()
            if headers:
                return {"ok": True, "msg": "Authenticated successfully"}
            return {"ok": False, "msg": "No auth headers returned"}
        if client.auth and hasattr(client.auth, 'invalidate'):
            return {"ok": True, "msg": "Auth configured (custom strategy)"}
        return {"ok": True, "msg": "No auth configured for this API"}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {e}")


@router.get("/list")
def list_workspaces():
    """List all workspaces in the default directory."""
    ws_dir = get_data_dir() / "workspaces"
    ws_dir.mkdir(parents=True, exist_ok=True)
    workspaces = []
    for d in sorted(ws_dir.iterdir()):
        if not d.is_dir():
            continue
        configs = list(d.glob("*.config.yaml"))
        if configs:
            workspaces.append({
                "name": d.name,
                "path": str(d),
                "config": str(configs[0]),
            })
    return workspaces


@router.get("", response_model=WorkspaceInfo)
def get_workspace(request: Request):
    """Return workspace info. Does not require a loaded workspace."""
    mgr: WorkspaceManager = request.app.state.ws
    return _build_workspace_info(mgr)


@router.post("/load", response_model=WorkspaceInfo)
def load_workspace(body: LoadBody, request: Request):
    """Load a workspace from the given path."""
    mgr: WorkspaceManager = request.app.state.ws
    try:
        mgr.load(Path(body.path))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return _build_workspace_info(mgr)


@router.post("/unload")
def unload_workspace(request: Request):
    """Unload the current workspace, clearing all cached state."""
    mgr: WorkspaceManager = request.app.state.ws
    mgr.close()
    mgr.config = None
    mgr.variables = None
    mgr.endpoints = []
    mgr._workspace_path = None
    return {"ok": True}


@router.post("/create", response_model=CreateResponse)
def create_workspace_route(body: CreateBody, request: Request):
    """Create a new workspace on disk and load it."""
    mgr: WorkspaceManager = request.app.state.ws
    try:
        root = create_workspace(body.name, Path(body.path))
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Load the newly created workspace
    mgr.load(root)
    config_path = root / f"{root.name}.config.yaml"
    return CreateResponse(name=body.name, root=str(root), config_path=str(config_path))


@router.post("/save-config", response_model=WorkspaceInfo)
def save_config(body: SaveConfigBody, mgr: WorkspaceManager = Depends(get_ws)):
    """Write API configs to the workspace config.yaml and reload."""
    # Store runtime secrets (passwords/keys not written to YAML)
    for api_body in body.apis:
        alias = api_body.alias or api_body.name.strip().lower().replace(" ", "_").replace("-", "_")
        secrets: dict = {}
        if api_body.auth.password:
            secrets["password"] = api_body.auth.password
        if hasattr(api_body.auth, 'api_key') and getattr(api_body.auth, 'api_key', ''):
            secrets["api_key"] = api_body.auth.api_key
        if secrets:
            mgr.set_secrets(alias, secrets)

    _write_config_yaml(mgr.config.config_path, mgr.config.name, body.apis)
    mgr.reload()
    return _build_workspace_info(mgr)


@router.get("/variables", response_model=VariablesResponse)
def get_variables(mgr: WorkspaceManager = Depends(get_ws)):
    """Return all workspace variables."""
    return VariablesResponse(variables=mgr.variables.all())


@router.put("/variables/{key}")
def set_variable(key: str, body: VariableSetBody, mgr: WorkspaceManager = Depends(get_ws)):
    """Set a workspace variable."""
    mgr.variables.set(key, body.value)
    mgr.variables.save()
    return {"ok": True}


@router.delete("/variables/{key}")
def delete_variable(key: str, mgr: WorkspaceManager = Depends(get_ws)):
    """Delete a workspace variable."""
    mgr.variables.delete(key)
    mgr.variables.save()
    return {"ok": True}


@router.post("/export")
def export_workspace(mgr: WorkspaceManager = Depends(get_ws)):
    """Export the loaded workspace as a ZIP file."""
    root = mgr.config.root
    exclude = {"cache.json", "__pycache__"}

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in sorted(root.rglob("*")):
            if file.is_dir():
                continue
            rel = file.relative_to(root)
            parts = set(rel.parts)
            if parts & exclude or file.suffix == ".pyc":
                continue
            zf.write(file, arcname=str(rel))

    buf.seek(0)
    filename = f"{mgr.config.name}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/import")
async def import_workspace(file: UploadFile = File(...)):
    """Import a workspace from a ZIP file."""
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Must be a .zip file")

    content = await file.read()
    buf = io.BytesIO(content)

    try:
        with zipfile.ZipFile(buf, "r") as zf:
            names = zf.namelist()
            configs = [n for n in names if n.endswith(".config.yaml")]
            if not configs:
                raise HTTPException(status_code=400, detail="ZIP does not contain a *.config.yaml")

            ws_name = configs[0].replace(".config.yaml", "")
            ws_dir = get_data_dir() / "workspaces"
            ws_dir.mkdir(parents=True, exist_ok=True)
            extract_dir = ws_dir / ws_name

            if extract_dir.exists():
                raise HTTPException(status_code=409, detail=f"Workspace '{ws_name}' already exists")

            extract_dir.mkdir(parents=True)
            zf.extractall(extract_dir)
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")

    return {"name": ws_name, "path": str(extract_dir)}


class MoveBody(BaseModel):
    current_path: str
    new_path: str


@router.post("/move")
def move_workspace(body: MoveBody, request: Request):
    """Move workspace to a new location."""
    import shutil
    mgr: WorkspaceManager = request.app.state.ws

    src = Path(body.current_path)
    dst = Path(body.new_path) / src.name

    if not src.exists():
        raise HTTPException(status_code=404, detail=f"Source not found: {src}")
    if dst.exists():
        raise HTTPException(status_code=409, detail=f"Destination already exists: {dst}")

    # Unload current workspace if it's the one being moved
    if mgr.config and str(mgr.config.root) == str(src):
        mgr.close()
        mgr.config = None
        mgr.variables = None
        mgr.endpoints = []
        mgr._workspace_path = None

    # Copy then delete
    shutil.copytree(src, dst)
    shutil.rmtree(src)

    # Load from new location
    mgr.load(dst)

    return {"name": dst.name, "path": str(dst)}

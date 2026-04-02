from pathlib import Path

import yaml
from fastapi import APIRouter, Depends, HTTPException, Request
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
    password_env: str = ""
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
    home = Path.home() / ".restful" / "workspaces"
    home.mkdir(parents=True, exist_ok=True)
    return {"path": str(home)}


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

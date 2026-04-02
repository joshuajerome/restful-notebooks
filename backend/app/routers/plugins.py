"""Plugin management — delegates to restful plugin registry."""

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_ws
from app.services.workspace_manager import WorkspaceManager
from restful.generator.python_module import generate
from restful.plugins import registry
from restful.workspace.config import _sanitize_name

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/plugins", tags=["plugins"])


class PluginInfo(BaseModel):
    name: str


class LoadResult(BaseModel):
    api_name: str
    endpoint_count: int
    output_path: str


def _resolve_adapter(api, workspace_root: Path):
    """Resolve adapter from registry, loading from plugin_path if needed."""
    adapter = registry.get(api.plugin)
    if adapter:
        return adapter

    # Try loading from plugin_path (may be absolute or relative to workspace)
    if api.plugin_path:
        p = Path(api.plugin_path)
        plugin_dir = p if p.is_absolute() else workspace_root / api.plugin_path
        try:
            return registry.load_plugin(plugin_dir)
        except Exception as e:
            logger.warning("Failed to load plugin from %s: %s", plugin_dir, e)
            raise HTTPException(
                status_code=400,
                detail=f"Failed to load plugin from {api.plugin_path}: {e}",
            )

    raise HTTPException(
        status_code=400,
        detail=f"Plugin '{api.plugin}' not registered and no plugin_path specified",
    )


@router.get("", response_model=list[PluginInfo])
def list_plugins():
    return [PluginInfo(name=name) for name in registry.list_plugins()]


@router.post("/load", response_model=LoadResult)
def load_plugin(api_alias: str, mgr: WorkspaceManager = Depends(get_ws)):
    """Generate endpoints for a workspace API."""
    if not mgr.config:
        raise HTTPException(status_code=503, detail="No workspace loaded")

    api = mgr.config.get_api(api_alias)
    if not api:
        raise HTTPException(status_code=404, detail=f"API '{api_alias}' not found in workspace")

    adapter = _resolve_adapter(api, mgr.config.root)

    source = Path(api.source) if Path(api.source).is_absolute() else mgr.config.root / api.source
    if not source.exists():
        raise HTTPException(status_code=400, detail=f"Source file not found: {source}")

    try:
        specs = adapter.parse(source)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parse error: {e}")

    # Generate into apis/<sanitized_name>/endpoints.py
    api_dir = mgr.config.root / "apis" / _sanitize_name(api.name)
    api_dir.mkdir(parents=True, exist_ok=True)

    endpoints_path = api_dir / "endpoints.py"
    source_code = generate(specs, plugin_name=api.plugin)
    endpoints_path.write_text(source_code, encoding="utf-8")

    init_path = api_dir / "__init__.py"
    if not init_path.exists():
        init_path.write_text("", encoding="utf-8")

    # Reload endpoints in the manager
    mgr.reload()

    return LoadResult(
        api_name=api.name,
        endpoint_count=len(specs),
        output_path=str(endpoints_path.relative_to(mgr.config.root)),
    )


@router.post("/validate")
def validate_plugin(api_alias: str, mgr: WorkspaceManager = Depends(get_ws)):
    """Validate a plugin source file."""
    if not mgr.config:
        raise HTTPException(status_code=503, detail="No workspace loaded")

    api = mgr.config.get_api(api_alias)
    if not api:
        raise HTTPException(status_code=404, detail=f"API '{api_alias}' not found")

    adapter = _resolve_adapter(api, mgr.config.root)

    source = Path(api.source) if Path(api.source).is_absolute() else mgr.config.root / api.source
    if not source.exists():
        raise HTTPException(status_code=400, detail=f"Source not found: {source}")

    try:
        specs = adapter.parse(source)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parse error: {e}")

    return {"api_name": api.name, "plugin": api.plugin, "endpoint_count": len(specs), "valid": True}

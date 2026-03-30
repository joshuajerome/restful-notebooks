"""Service for loading and querying generated endpoints."""

from __future__ import annotations

import importlib
import importlib.util
import re
import sys
from pathlib import Path

from app.schemas.endpoints import EndpointInfo


def _camel_to_display(name: str) -> str:
    """
    Convert PascalCase/camelCase to readable text.
    BlueprintTemplates -> Blueprint Templates
    LLDPNeighbors -> LLDP Neighbors
    NodesInterfaces -> Nodes Interfaces
    V2_BlueprintTemplates -> V2 Blueprint Templates
    """
    # Handle underscore prefixes like V2_
    name = name.replace("_", " ")
    # Insert space before uppercase runs:
    # "LLDPNeighbors" -> "LLDP Neighbors"
    # "BlueprintTemplates" -> "Blueprint Templates"
    result = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", name)
    result = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", result)
    return result.strip()

# In-memory endpoint registry loaded from generated module
_endpoints: list[EndpointInfo] = []
_loaded = False
_api_name = "snf-instance-rest"


def load_endpoints(module_path: str = "sfm_endpoints") -> list[EndpointInfo]:
    """Load endpoints from a generated Python module."""
    global _endpoints, _loaded

    try:
        # Try importing the module
        if module_path in sys.modules:
            mod = importlib.reload(sys.modules[module_path])
        else:
            mod = importlib.import_module(module_path)
    except ModuleNotFoundError:
        # Try loading from file path
        spec_path = Path(module_path)
        if spec_path.exists():
            spec = importlib.util.spec_from_file_location("_endpoints", spec_path)
            if spec is None or spec.loader is None:
                _endpoints = []
                _loaded = True
                return _endpoints
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
        else:
            _endpoints = []
            _loaded = True
            return _endpoints

    _endpoints = []
    for name in dir(mod):
        if name.startswith("_"):
            continue
        obj = getattr(mod, name)
        if hasattr(obj, "path") and hasattr(obj, "methods"):
            _endpoints.append(
                EndpointInfo(
                    name=name,
                    display_name=_camel_to_display(name),
                    path=obj.path,
                    methods=list(obj.methods),
                    group=_api_name,
                )
            )

    _loaded = True
    return _endpoints


def get_endpoints() -> list[EndpointInfo]:
    if not _loaded:
        load_endpoints()
    return _endpoints


def find_endpoint(name: str) -> EndpointInfo | None:
    for ep in get_endpoints():
        if ep.name == name:
            return ep
    return None

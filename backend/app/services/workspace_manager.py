"""Core workspace state holder wrapping restful library calls."""

from __future__ import annotations

import importlib.util
import os
import re
from pathlib import Path

from restful import BearerAuth, Client
from restful.plugins import registry
from restful.workspace.config import WorkspaceConfig
from restful.workspace.discovery import load_workspace
from restful.workspace.variables import VariableStore

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


def _build_client(api, runtime_secrets: dict | None = None) -> Client:
    """Build a Client from an ApiConnection config."""
    base_url = api.base_url
    auth = None
    secrets = runtime_secrets or {}

    if api.auth.type == "bearer":
        # Try: runtime secret → env var → empty
        password = secrets.get("password") or (os.environ.get(api.auth.password_env, "") if api.auth.password_env else "")
        auth = BearerAuth(
            base_url=base_url,
            login_path=api.auth.login_path,
            payload={"username": api.auth.username, "password": password},
        )
    elif api.auth.type == "apikey":
        key = secrets.get("api_key") or (os.environ.get(api.auth.key_env, "") if api.auth.key_env else "")
        if key:

            class ApiKeyAuth:
                def auth_headers(self):
                    return {api.auth.header: key}

                def invalidate(self):
                    pass

            auth = ApiKeyAuth()

    return Client(base_url=base_url, auth=auth)


def _load_endpoints_for_api(workspace_root: Path, api_dir_name: str, group: str) -> list[EndpointInfo]:
    """Load endpoints from apis/<api_dir_name>/endpoints.py using importlib."""
    endpoints_path = workspace_root / "apis" / api_dir_name / "endpoints.py"
    if not endpoints_path.exists():
        return []

    spec = importlib.util.spec_from_file_location(
        f"_endpoints_{api_dir_name}", endpoints_path
    )
    if spec is None or spec.loader is None:
        return []

    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    results: list[EndpointInfo] = []
    for name in dir(mod):
        if name.startswith("_"):
            continue
        obj = getattr(mod, name)
        if hasattr(obj, "path") and hasattr(obj, "methods"):
            results.append(
                EndpointInfo(
                    name=name,
                    display_name=_camel_to_display(name),
                    path=obj.path,
                    methods=list(obj.methods),
                    group=group,
                )
            )

    return results


class WorkspaceManager:
    """Holds workspace state: config, variables, clients, and endpoints."""

    def __init__(self) -> None:
        self.config: WorkspaceConfig | None = None
        self.variables: VariableStore | None = None
        self.clients: dict[str, Client] = {}
        self.endpoints: list[EndpointInfo] = []
        self._workspace_path: Path | None = None
        self._runtime_secrets: dict[str, dict] = {}  # alias → {password: ..., api_key: ...}

    def set_secrets(self, alias: str, secrets: dict) -> None:
        """Store runtime secrets (not persisted to disk)."""
        self._runtime_secrets[alias] = secrets

    def load(self, start: Path | None = None) -> None:
        """Discover workspace, build clients, and load endpoints."""
        self.config = load_workspace(start)
        self._workspace_path = self.config.root
        self.variables = VariableStore(self.config.root)

        # Load plugins from API plugin_path entries
        for api in self.config.apis:
            if api.plugin_path:
                p = Path(api.plugin_path)
                plugin_dir = p if p.is_absolute() else self.config.root / api.plugin_path
                try:
                    registry.load_plugin(plugin_dir)
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning("Failed to load plugin from %s: %s", plugin_dir, e)

        # Build a Client per API
        self.clients = {}
        for api in self.config.apis:
            self.clients[api.alias] = _build_client(api, self._runtime_secrets.get(api.alias))

        # Load endpoints from each API's endpoints.py
        from restful.workspace.config import _sanitize_name

        self.endpoints = []
        for api in self.config.apis:
            dir_name = _sanitize_name(api.name)
            self.endpoints.extend(
                _load_endpoints_for_api(self.config.root, dir_name, api.name)
            )

    def reload(self) -> None:
        """Reload from the same workspace path."""
        self.close()
        self.load(self._workspace_path)

    def close(self) -> None:
        """Close all client sessions."""
        for client in self.clients.values():
            if hasattr(client, "close"):
                client.close()
        self.clients.clear()

    def get_client(self, alias: str) -> Client:
        """Return cached Client for the given alias, or raise ValueError."""
        client = self.clients.get(alias)
        if client is None:
            available = ", ".join(sorted(self.clients.keys())) or "(none)"
            raise ValueError(f"No client for alias '{alias}'. Available: {available}")
        return client

"""Endpoint browsing — reads from WorkspaceManager's loaded endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_ws
from app.schemas.endpoints import EndpointInfo, EndpointListResponse
from app.services.workspace_manager import WorkspaceManager

router = APIRouter(prefix="/api/endpoints", tags=["endpoints"])


@router.get("", response_model=EndpointListResponse)
def list_endpoints(
    search: str | None = Query(None),
    group: str | None = Query(None),
    mgr: WorkspaceManager = Depends(get_ws),
):
    endpoints = list(mgr.endpoints)

    if search:
        s = search.lower()
        endpoints = [
            e for e in endpoints if s in e.name.lower() or s in e.display_name.lower() or s in e.path.lower()
        ]

    if group:
        endpoints = [e for e in endpoints if e.group == group]

    return EndpointListResponse(endpoints=endpoints, count=len(endpoints))


@router.get("/groups")
def list_groups(mgr: WorkspaceManager = Depends(get_ws)) -> list[str]:
    return sorted({e.group for e in mgr.endpoints})


@router.get("/{name}", response_model=EndpointInfo)
def get_endpoint(name: str, mgr: WorkspaceManager = Depends(get_ws)):
    for ep in mgr.endpoints:
        if ep.name == name:
            return ep
    raise HTTPException(status_code=404, detail=f"Endpoint '{name}' not found")

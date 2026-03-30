from fastapi import APIRouter, Query

from app.schemas.endpoints import EndpointInfo, EndpointListResponse
from app.services import endpoint_service

router = APIRouter(prefix="/api/endpoints", tags=["endpoints"])


@router.get("", response_model=EndpointListResponse)
def list_endpoints(
    search: str | None = Query(None),
    group: str | None = Query(None),
):
    endpoints = endpoint_service.get_endpoints()

    if search:
        search_lower = search.lower()
        endpoints = [e for e in endpoints if search_lower in e.name.lower() or search_lower in e.path.lower()]

    if group:
        endpoints = [e for e in endpoints if e.group == group]

    return EndpointListResponse(endpoints=endpoints, count=len(endpoints))


@router.get("/groups")
def list_groups() -> list[str]:
    endpoints = endpoint_service.get_endpoints()
    groups = sorted(set(e.group for e in endpoints))
    return groups


@router.get("/{name}", response_model=EndpointInfo)
def get_endpoint(name: str):
    ep = endpoint_service.find_endpoint(name)
    if not ep:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail=f"Endpoint '{name}' not found")
    return ep

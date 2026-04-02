from fastapi import Request, HTTPException
from app.services.workspace_manager import WorkspaceManager


def get_ws(request: Request) -> WorkspaceManager:
    mgr: WorkspaceManager = request.app.state.ws
    if mgr.config is None:
        raise HTTPException(status_code=503, detail="No workspace loaded")
    return mgr

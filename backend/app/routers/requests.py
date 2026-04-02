"""Request execution — delegates to restful Client."""

import json
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_ws
from app.models.history import RequestHistory
from app.schemas.requests import ExecuteRequest, ExecuteResponse
from app.services.workspace_manager import WorkspaceManager
from restful.http.errors import HttpError
from restful.models import Endpoint

router = APIRouter(prefix="/api/requests", tags=["requests"])


@router.post("/execute", response_model=ExecuteResponse)
def execute_request(
    body: ExecuteRequest,
    db: Session = Depends(get_db),
    mgr: WorkspaceManager = Depends(get_ws),
):
    # Get the Client for this API
    alias = body.api_alias
    if not alias:
        # Default to first API if not specified
        if mgr.config and mgr.config.apis:
            alias = mgr.config.apis[0].alias
        else:
            raise HTTPException(status_code=400, detail="No API alias specified and no APIs configured")

    try:
        client = mgr.get_client(alias)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Build a temporary Endpoint object
    endpoint = Endpoint(path=body.endpoint_path, methods=(body.method,))

    # Execute via restful Client with timing
    start = time.time()
    try:
        method_fn = getattr(client, body.method.lower(), None)
        if method_fn is None:
            raise HTTPException(status_code=400, detail=f"Unsupported method: {body.method}")

        # Use permissive expected_status so we always get a response (not an exception)
        resp = method_fn(
            endpoint,
            params=body.params,
            query=body.query,
            payload=body.payload,
            expected_status=set(range(100, 600)),
        )
        duration_ms = int((time.time() - start) * 1000)

        try:
            response_body = resp.json()
        except (json.JSONDecodeError, ValueError):
            response_body = resp.text

        result = {
            "status_code": resp.status_code,
            "method": resp.method,
            "url": resp.url,
            "body": response_body,
            "headers": resp.headers,
            "duration_ms": duration_ms,
        }

    except HttpError as e:
        duration_ms = int((time.time() - start) * 1000)
        result = {
            "status_code": e.status_code,
            "method": body.method,
            "url": e.url,
            "body": {"error": e.body[:500]},
            "headers": {},
            "duration_ms": duration_ms,
        }
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        result = {
            "status_code": 0,
            "method": body.method,
            "url": "",
            "body": {"error": str(e)},
            "headers": {},
            "duration_ms": duration_ms,
        }

    # Save to history
    entry = RequestHistory(
        method=body.method,
        endpoint_name=body.endpoint_name,
        endpoint_path=body.endpoint_path,
        params_json=json.dumps(body.params or {}),
        query_json=json.dumps(body.query or {}),
        payload_json=json.dumps(body.payload) if body.payload else "{}",
        response_status=result["status_code"],
        response_body=json.dumps(result["body"]) if isinstance(result["body"], (dict, list)) else str(result["body"]),
        duration_ms=result["duration_ms"],
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return ExecuteResponse(
        status_code=result["status_code"],
        method=result["method"],
        url=result["url"],
        body=result["body"],
        headers=result["headers"],
        duration_ms=result["duration_ms"],
        history_id=entry.id,
    )


@router.get("/history")
def get_history(limit: int = 50, db: Session = Depends(get_db)):
    entries = (
        db.query(RequestHistory)
        .order_by(RequestHistory.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": e.id,
            "method": e.method,
            "endpoint_name": e.endpoint_name,
            "endpoint_path": e.endpoint_path,
            "response_status": e.response_status,
            "duration_ms": e.duration_ms,
            "created_at": e.created_at.isoformat() if e.created_at else "",
        }
        for e in entries
    ]


@router.get("/history/{history_id}")
def get_history_entry(history_id: str, db: Session = Depends(get_db)):
    entry = db.query(RequestHistory).filter(RequestHistory.id == history_id).first()
    if not entry:
        raise HTTPException(status_code=404)
    return {
        "id": entry.id,
        "method": entry.method,
        "endpoint_name": entry.endpoint_name,
        "endpoint_path": entry.endpoint_path,
        "params": json.loads(entry.params_json),
        "query": json.loads(entry.query_json),
        "payload": json.loads(entry.payload_json),
        "response_status": entry.response_status,
        "response_body": (
            json.loads(entry.response_body)
            if entry.response_body.startswith(("{", "["))
            else entry.response_body
        ),
        "duration_ms": entry.duration_ms,
        "created_at": entry.created_at.isoformat() if entry.created_at else "",
    }

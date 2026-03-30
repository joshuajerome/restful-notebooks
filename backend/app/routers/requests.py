import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.history import RequestHistory
from app.schemas.requests import ExecuteRequest, ExecuteResponse
from app.services import request_service

router = APIRouter(prefix="/api/requests", tags=["requests"])


@router.post("/execute", response_model=ExecuteResponse)
def execute_request(body: ExecuteRequest, db: Session = Depends(get_db)):
    result = request_service.execute(
        method=body.method,
        path=body.endpoint_path,
        params=body.params,
        query=body.query,
        payload=body.payload,
    )

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
    entries = db.query(RequestHistory).order_by(RequestHistory.created_at.desc()).limit(limit).all()
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
        from fastapi import HTTPException

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
            json.loads(entry.response_body) if entry.response_body.startswith(("{", "[")) else entry.response_body
        ),
        "duration_ms": entry.duration_ms,
        "created_at": entry.created_at.isoformat() if entry.created_at else "",
    }

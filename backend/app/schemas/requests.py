from typing import Any

from pydantic import BaseModel


class ExecuteRequest(BaseModel):
    method: str
    endpoint_name: str
    endpoint_path: str
    api_alias: str = ""  # which workspace API to use
    params: dict[str, str] | None = None
    query: dict[str, Any] | None = None
    payload: Any | None = None


class ExecuteResponse(BaseModel):
    status_code: int
    method: str
    url: str
    body: Any
    headers: dict[str, str]
    duration_ms: int
    history_id: str

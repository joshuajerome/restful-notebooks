from fastapi import APIRouter
from pydantic import BaseModel

from app.services import request_service

router = APIRouter(prefix="/api/config", tags=["config"])


class ConnectionConfig(BaseModel):
    base_url: str
    login_path: str = ""
    username: str = ""
    password: str = ""


_current_config = ConnectionConfig(base_url="")


@router.get("", response_model=ConnectionConfig)
def get_config():
    return _current_config


@router.put("")
def set_config(body: ConnectionConfig):
    global _current_config
    _current_config = body
    request_service.configure(
        base_url=body.base_url,
        login_path=body.login_path,
        username=body.username,
        password=body.password,
    )
    return {"ok": True}

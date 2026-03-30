"""Service for executing REST requests via post-it Client."""

from __future__ import annotations

import time
from typing import Any

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Simple in-memory config — will be replaced by project config
_config = {
    "base_url": "",
    "login_path": "",
    "username": "",
    "password": "",
    "token": "",
}


def configure(
    base_url: str,
    login_path: str = "",
    username: str = "",
    password: str = "",
) -> None:
    _config["base_url"] = base_url.rstrip("/")
    _config["login_path"] = login_path
    _config["username"] = username
    _config["password"] = password
    _config["token"] = ""


def _ensure_token() -> str:
    """Get or refresh the bearer token."""
    if _config["token"]:
        return _config["token"]

    if not _config["login_path"]:
        return ""

    url = _config["base_url"] + _config["login_path"]
    r = requests.post(
        url,
        json={"username": _config["username"], "password": _config["password"]},
        verify=False,
        timeout=15,
    )
    r.raise_for_status()
    data = r.json()
    token = data.get("access_token") or data.get("token", "")
    _config["token"] = token
    return token


def _invalidate_token() -> None:
    _config["token"] = ""


def execute(
    method: str,
    path: str,
    params: dict[str, str] | None = None,
    query: dict[str, Any] | None = None,
    payload: Any = None,
) -> dict:
    """
    Execute a REST request and return the result.

    Returns dict with: status_code, method, url, body, headers, duration_ms
    """
    # Build path with OData key predicates
    full_path = path
    if params:
        values = ",".join(str(v) for v in params.values())
        full_path = f"{path}({values})"

    url = _config["base_url"] + full_path
    token = _ensure_token()
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    start = time.time()
    try:
        r = requests.request(
            method=method,
            url=url,
            headers=headers,
            params=query,
            json=payload,
            verify=False,
            timeout=30,
        )
    except requests.RequestException as e:
        duration_ms = int((time.time() - start) * 1000)
        return {
            "status_code": 0,
            "method": method,
            "url": url,
            "body": {"error": str(e)},
            "headers": {},
            "duration_ms": duration_ms,
        }

    duration_ms = int((time.time() - start) * 1000)

    # 401 retry
    if r.status_code == 401 and token:
        _invalidate_token()
        token = _ensure_token()
        if token:
            headers["Authorization"] = f"Bearer {token}"
            start2 = time.time()
            r = requests.request(
                method=method,
                url=url,
                headers=headers,
                params=query,
                json=payload,
                verify=False,
                timeout=30,
            )
            duration_ms = int((time.time() - start2) * 1000)

    try:
        body = r.json()
    except Exception:
        body = r.text

    return {
        "status_code": r.status_code,
        "method": method,
        "url": r.url,
        "body": body,
        "headers": dict(r.headers),
        "duration_ms": duration_ms,
    }

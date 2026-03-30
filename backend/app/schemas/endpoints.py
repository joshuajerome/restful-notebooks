from pydantic import BaseModel


class EndpointInfo(BaseModel):
    name: str
    display_name: str = ""
    path: str
    methods: list[str]
    group: str = ""


class EndpointListResponse(BaseModel):
    endpoints: list[EndpointInfo]
    count: int

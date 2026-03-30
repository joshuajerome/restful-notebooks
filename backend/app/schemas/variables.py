from pydantic import BaseModel


class VariableCreate(BaseModel):
    name: str
    value: str
    source: str = ""
    json_path: str = ""


class VariableResponse(BaseModel):
    id: str
    name: str
    value: str
    source: str
    json_path: str
    created_at: str

    class Config:
        from_attributes = True


class VariableListResponse(BaseModel):
    variables: list[VariableResponse]

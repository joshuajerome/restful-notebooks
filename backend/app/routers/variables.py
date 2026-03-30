from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.variable import Variable
from app.schemas.variables import VariableCreate, VariableListResponse, VariableResponse

router = APIRouter(prefix="/api/variables", tags=["variables"])


@router.get("", response_model=VariableListResponse)
def list_variables(db: Session = Depends(get_db)):
    variables = db.query(Variable).order_by(Variable.name).all()
    return VariableListResponse(
        variables=[
            VariableResponse(
                id=v.id,
                name=v.name,
                value=v.value,
                source=v.source,
                json_path=v.json_path,
                created_at=v.created_at.isoformat() if v.created_at else "",
            )
            for v in variables
        ]
    )


@router.post("", response_model=VariableResponse)
def create_variable(body: VariableCreate, db: Session = Depends(get_db)):
    # Upsert — update if name exists
    existing = db.query(Variable).filter(Variable.name == body.name).first()
    if existing:
        existing.value = body.value
        existing.source = body.source
        existing.json_path = body.json_path
        db.commit()
        db.refresh(existing)
        v = existing
    else:
        v = Variable(
            name=body.name,
            value=body.value,
            source=body.source,
            json_path=body.json_path,
        )
        db.add(v)
        db.commit()
        db.refresh(v)

    return VariableResponse(
        id=v.id,
        name=v.name,
        value=v.value,
        source=v.source,
        json_path=v.json_path,
        created_at=v.created_at.isoformat() if v.created_at else "",
    )


@router.delete("/{variable_id}")
def delete_variable(variable_id: str, db: Session = Depends(get_db)):
    v = db.query(Variable).filter(Variable.id == variable_id).first()
    if not v:
        raise HTTPException(status_code=404)
    db.delete(v)
    db.commit()
    return {"ok": True}

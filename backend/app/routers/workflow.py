from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_ws
from app.services.workspace_manager import WorkspaceManager
from restful.workflow.context import ClientNamespace, WorkflowContext
from restful.workflow.runner import StageResult, WorkflowRunner

router = APIRouter(prefix="/api/workflows", tags=["notebooks"])


# --- Response schemas ---


class WorkflowListItem(BaseModel):
    name: str


class StageInfo(BaseModel):
    name: str
    order: int


class StageResultResponse(BaseModel):
    stage_name: str
    success: bool
    return_value: Any = None
    error: str | None = None
    duration_ms: int = 0
    captured_vars: dict[str, str] | None = None


class RunStageBody(BaseModel):
    stage_name: str


# --- Helpers ---


def _build_ctx(mgr: WorkspaceManager) -> WorkflowContext:
    ns = ClientNamespace()
    for alias, client in mgr.clients.items():
        ns._add(alias, client)
    return WorkflowContext(clients=ns, variables=mgr.variables)


def _stage_result_to_response(r: StageResult) -> StageResultResponse:
    return StageResultResponse(
        stage_name=r.stage_name,
        success=r.success,
        return_value=r.return_value,
        error=r.error,
        duration_ms=r.duration_ms,
        captured_vars=r.captured_vars,
    )


# --- Endpoints ---


@router.get("", response_model=list[WorkflowListItem])
def list_workflows(mgr: WorkspaceManager = Depends(get_ws)):
    """List .py files in the workspace workflows/ directory."""
    workflows_dir = mgr.config.root / "notebooks"
    if not workflows_dir.is_dir():
        return []

    return [
        WorkflowListItem(name=p.stem)
        for p in sorted(workflows_dir.glob("*.py"))
        if not p.name.startswith("_")
    ]


@router.get("/{name}/stages", response_model=list[StageInfo])
def get_stages(name: str, mgr: WorkspaceManager = Depends(get_ws)):
    """Return the stages defined in a workflow file."""
    workflow_path = mgr.config.root / "notebooks" / f"{name}.py"
    if not workflow_path.exists():
        raise HTTPException(status_code=404, detail=f"Workflow '{name}' not found")

    ctx = _build_ctx(mgr)
    runner = WorkflowRunner(ctx)
    stage_names = runner.list_stages(workflow_path)

    return [StageInfo(name=s, order=i) for i, s in enumerate(stage_names)]


@router.post("/{name}/run", response_model=list[StageResultResponse])
def run_workflow(name: str, mgr: WorkspaceManager = Depends(get_ws)):
    """Run all stages in a workflow."""
    workflow_path = mgr.config.root / "notebooks" / f"{name}.py"
    if not workflow_path.exists():
        raise HTTPException(status_code=404, detail=f"Workflow '{name}' not found")

    ctx = _build_ctx(mgr)
    runner = WorkflowRunner(ctx)
    results = runner.run(workflow_path)

    return [_stage_result_to_response(r) for r in results]


@router.post("/{name}/run-stage", response_model=StageResultResponse)
def run_stage(name: str, body: RunStageBody, mgr: WorkspaceManager = Depends(get_ws)):
    """Run a single stage in a workflow by name."""
    workflow_path = mgr.config.root / "notebooks" / f"{name}.py"
    if not workflow_path.exists():
        raise HTTPException(status_code=404, detail=f"Workflow '{name}' not found")

    ctx = _build_ctx(mgr)
    runner = WorkflowRunner(ctx)

    try:
        result = runner.run_stage(workflow_path, body.stage_name)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return _stage_result_to_response(result)

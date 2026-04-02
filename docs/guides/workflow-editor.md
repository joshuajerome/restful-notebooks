# Workflow Editor

The Workflows page provides a visual builder for multi-step REST workflows.

## Canvas View

The default view shows all workflows as cards in a grid. Each card displays:
- Workflow name
- Step count
- Method chips for each step

Actions: Create, Edit, Duplicate, Delete (via right-click menu).

## Editor View

Click **Edit** on a workflow to open the step-by-step editor.

### Left Sidebar
- Workflow name
- Step list with method chips and response indicators
- Add Step button
- Workflow variables display

### Step Editor

Each step has:
- **Description** — what the step does
- **Method** — HTTP method dropdown
- **Endpoint** — autocomplete selector
- **Tabs**: Params, Query, Payload, Extract Data

### Data Extraction

After the first step, each step can extract data from the previous response:

| Mode | Description |
|------|-------------|
| None | No extraction |
| Reference | Path like `response["items"][0]["id"]` — parsed safely, no eval |
| Python | Custom function: `def extract(response: dict) -> dict` |

Extracted values are saved as workflow variables and can be used in subsequent steps via `{{variableName}}` templates in params, query, or payload.

### Comment Out

Toggle a step as "commented" to skip it during execution without deleting it. Commented steps appear grayed out.

## Execution

- **Run Step** — execute a single step
- **Run All** — execute all non-commented steps sequentially
- Variable templates (`{{varName}}`) are resolved before execution
- Results appear in the response viewer for each step

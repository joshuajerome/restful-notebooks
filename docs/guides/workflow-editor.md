# Notebook Editor

The Notebooks page provides a visual builder for block-based REST notebooks.

## Canvas View

The default view shows all notebooks as cards in a grid. Each card displays:
- Notebook name
- Block count
- Method chips for request blocks

Actions: Create, Edit, Duplicate, Delete (via right-click menu).

## Block Types

Notebooks are composed of three block types:

| Block | Purpose |
|-------|---------|
| **Request** | An HTTP request (method, endpoint, params, query, payload). The primary building block. |
| **Extract** | Extracts data from the previous response and saves it as a notebook variable. Supports reference paths (`response["items"][0]["id"]`) or custom Python functions. |
| **Variable** | Sets a notebook variable to a static value or expression. Useful for constants or computed values shared across blocks. |

Blocks execute sequentially from top to bottom. Variable templates (`{{varName}}`) are resolved in any block field before execution.

## Editor View

Click **Edit** on a notebook to open the block-based editor.

### Left Sidebar
- Notebook name
- Block list with type indicators and method chips (for request blocks)
- Add Block button (choose Request, Extract, or Variable)
- Notebook variables display

### Request Block Editor

Each request block has:
- **Description** — what the block does
- **Method** — HTTP method dropdown
- **Endpoint** — autocomplete selector
- **Tabs**: Params, Query, Payload

### Extract Block Editor

Configure data extraction from the previous response:

| Mode | Description |
|------|-------------|
| Reference | Path like `response["items"][0]["id"]` — parsed safely, no eval |
| Python | Custom function: `def extract(response: dict) -> dict` |

Extracted values are saved as notebook variables and can be used in subsequent blocks via `{{variableName}}` templates.

### Variable Block Editor

Set a variable name and value directly. The value can contain `{{varName}}` templates referencing other variables.

### Comment Out

Toggle a block as "commented" to skip it during execution without deleting it. Commented blocks appear grayed out.

## Execution

- **Run Block** — execute a single block
- **Run All** — execute all non-commented blocks sequentially
- Variable templates (`{{varName}}`) are resolved before execution
- Results appear in the response viewer for each request block

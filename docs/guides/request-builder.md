# Using the Request Builder

The Request Builder is the primary interface for making REST API calls.

## Selecting an Endpoint

1. Choose a method from the dropdown (GET, POST, PUT, DELETE)
2. Start typing in the endpoint autocomplete field
3. Results filter by name, display name, and path
4. Endpoints that don't support the selected method are grayed out
5. If an endpoint has only one method, it auto-selects when you choose the endpoint

## Parameters

### Params Tab (OData Key Predicates)

For endpoints with path parameters like `/Nodes({id},{namespace})`:

Enter values as key-value pairs:
- `id` = `abc`
- `namespace` = `prod`

Result: `/Nodes(abc,prod)`

### Query Tab

URL query string parameters. Enter as key-value pairs:
- `limit` = `10`
- `offset` = `0`

Result: `?limit=10&offset=0`

### Payload Tab

JSON request body for POST/PUT/DELETE requests. The editor provides:
- Syntax highlighting
- Auto-indent on Enter
- Tab inserts 4 spaces
- Closing brace auto-completion

## Response Viewer

The response panel shows:
- **Status chip** — color-coded by status code range
- **Duration** — request time in milliseconds
- **JSON body** — syntax-highlighted with VS Code dark theme colors

### Context Menu

Right-click any value in the response to:
- **Copy value** — copies the raw value
- **Copy reference** — copies the path (e.g., `response["items"][0]["id"]`)
- **Save to variables** — saves the value as a workspace variable

### Hover Highlighting

Hover over objects or arrays to see their boundaries highlighted.

## URL Preview

The collapsible preview panel at the bottom shows the fully constructed URL with base URL, path, params, and query string.

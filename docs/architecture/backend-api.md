# Backend API

The FastAPI backend serves as a thin adapter between the React frontend and the restful library.

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Returns status, workspace name, workspace root |

## Workspace (`/api/workspace`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workspace` | Current workspace info (name, root, APIs) |
| POST | `/api/workspace/load` | Load workspace from filesystem path |
| GET | `/api/workspace/variables` | List all workspace variables |
| PUT | `/api/workspace/variables/{key}` | Set a variable |
| DELETE | `/api/workspace/variables/{key}` | Delete a variable |

## Endpoints (`/api/endpoints`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/endpoints` | List endpoints (supports `?search=` and `?group=` filters) |
| GET | `/api/endpoints/groups` | List unique API group names |
| GET | `/api/endpoints/{name}` | Get single endpoint by name |

## Requests (`/api/requests`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/requests/execute` | Execute an HTTP request via restful Client |
| GET | `/api/requests/history` | List recent request history (default limit: 50) |
| GET | `/api/requests/history/{id}` | Get full request/response details |

### Execute Request Body

```json
{
  "method": "GET",
  "endpoint_name": "BlueprintTemplates",
  "endpoint_path": "/redfish/v1/SFM/1/BlueprintTemplates",
  "api_alias": "sfm",
  "params": null,
  "query": null,
  "payload": null
}
```

## Plugins (`/api/plugins`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/plugins` | List available plugins |
| POST | `/api/plugins/load` | Parse source and generate endpoints.py |
| POST | `/api/plugins/validate` | Validate source without generating |

## Workflows (`/api/workflows`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workflows` | List workflow files in `workflows/` |
| GET | `/api/workflows/{name}/stages` | List stages in a workflow |
| POST | `/api/workflows/{name}/run` | Run all stages |
| POST | `/api/workflows/{name}/run-stage` | Run a single stage |

## Error Handling

- **503** — No workspace loaded (returned by the `get_ws` dependency)
- **404** — Endpoint or workflow not found
- **500** — Unexpected error (logged, returned with error detail)

# Frontend Architecture

React 18 + MUI v6 + Zustand. All state management is client-side via Zustand stores.

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/app/dashboard` | Workspace card grid with create, edit, duplicate, delete, activate |
| Request Builder | `/app/request/:endpointName?` | Method + endpoint autocomplete, params/query/payload tabs, response viewer |
| Endpoint Browser | `/app/endpoints` | Searchable endpoint catalog with method pills and group filter |
| Workspaces Config | `/app/workspaces` | Split view: workspace list + config panel (APIs, variables) |
| Workflows | `/app/workflows` | Canvas view (card grid) + editor view (step builder with data extraction) |
| History | `/app/history` | Request history table with method/status chips |
| Audit Log | `/app/audit` | Chronological event log (workspace, API, request events) |
| Settings | `/app/settings` | General info + plugin management |

## Stores

| Store | Persistence | Purpose |
|-------|-------------|---------|
| `workspaceStore` | localStorage | Multi-workspace CRUD, API configs, colors |
| `requestStore` | localStorage (per-workspace) | Request state, session switching, execute |
| `endpointStore` | none (fetches from backend) | Endpoint catalog, search, filter |
| `variableStore` | none (fetches from backend) | Workspace variable CRUD |
| `workflowStore` | localStorage | Workflow CRUD, step management, extract modes |
| `auditStore` | localStorage | Event log (last 500 entries) |
| `notificationStore` | memory | Toast notification queue |
| `navStore` | memory | Browser-style back/forward history |
| `themeStore` | localStorage | Dark/light/system theme, sidebar collapse |

## Shared Components

| Component | Description |
|-----------|-------------|
| `WorkspaceLayout` | App shell: AppBar, collapsible sidebar, footer with health dot, notification panel |
| `ResponseViewer` | JSON syntax highlighting with hover, right-click context menu (copy/save to variable) |
| `SyntaxEditor` | Code editor overlay with JSON + Python highlighting, auto-indent |
| `NotificationPanel` | Right-side drawer with notification list |
| `ToastContainer` | Fixed bottom-right auto-dismiss toast alerts |

## Theme

Dual dark/light themes matching CUTIP Desktop design tokens. Dark mode default with bg `#0C1117`, paper `#141A24`. MUI component overrides for buttons, list items, cards, and scrollbars.

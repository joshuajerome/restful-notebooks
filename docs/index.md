# Restful Notebooks

**Desktop companion app for restful** — visual REST workspace management, endpoint browsing, request execution, and workflow orchestration.

## What is Restful Notebooks?

Restful Notebooks is an Electron app that wraps the [restful](https://github.com/joshuajerome/restful) Python library in a desktop GUI. It provides:

- **Request Builder** — endpoint autocomplete, method selection, OData params, query params, JSON payload editor, syntax-highlighted response viewer
- **Endpoint Browser** — searchable catalog of typed endpoints with method pills and group filtering
- **Workflow Editor** — visual multi-step workflow builder with data extraction, variable templating, and per-stage execution
- **Workspace Configuration** — manage multiple APIs, auth credentials, and variables through a form-based UI
- **Request History** — timestamped log of every request with status, duration, and full response data

## Design Principle

> Restful Notebooks is just a GUI for restful. There are no substantial features in the desktop app that don't exist in the library.

Every backend endpoint delegates to a restful library call. The desktop adds only UI-specific state: request history (SQLite) and visual layout preferences (localStorage).

## Getting Started

- [Installation](getting-started/installation.md) — download or run from source
- [Quick Start](getting-started/quickstart.md) — load a workspace and make your first request

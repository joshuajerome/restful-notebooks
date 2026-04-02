# Workspace Configuration

The Workspaces page provides a form-based interface for managing workspace settings.

## Layout

Split view:
- **Left panel** — list of all workspaces, with active indicator
- **Right panel** — configuration for the selected workspace

## General Settings

- **Name** — workspace display name
- **Color** — accent color (8 preset options: blue, green, orange, red, teal, purple, pink, gray)

## API Management

Each workspace can have multiple API connections. For each API:

| Field | Description |
|-------|-------------|
| Name | Display name (e.g., "SFM Instance REST") |
| Alias | Python identifier for `ctx.clients.<alias>` |
| Plugin | Adapter name for endpoint parsing |
| Base URL | API base URL |
| Auth Type | Bearer, API Key, or None |

### Bearer Auth Fields
- Login Path — endpoint for token exchange
- Username — login username
- Password — masked field, stored in workspace config

### API Key Auth Fields
- Header — HTTP header name (e.g., `Authorization`)
- Key — masked field

## Variables

Key-value pairs managed through the UI. Add, edit, or delete variables that are persisted via the restful VariableStore.

## Modified Indicator

An orange dot appears next to fields that have been changed but not saved. The save button shows the count of modified fields.

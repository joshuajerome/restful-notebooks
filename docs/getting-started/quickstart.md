# Quick Start

## 1. Start the Backend

```bash
cd restful-notebooks/backend
RESTFUL_WORKSPACE=/path/to/your/workspace uv run python -m uvicorn app.main:app --reload --port 8000
```

## 2. Start the Frontend

```bash
cd restful-notebooks/frontend
npm run dev
```

## 3. Open the App

Navigate to `http://localhost:3000` or launch the Electron shell.

## 4. Create a Workspace

Go to the **Dashboard** page and click **New Workspace**. Give it a name and color.

## 5. Configure an API

Navigate to **Workspaces** in the sidebar. In the right panel:

1. Click **Add API**
2. Fill in: Name, Alias, Plugin, Base URL
3. Configure auth (Bearer, API Key, or None)
4. Click **Save**

## 6. Load Endpoints

Go to **Settings → Plugins** and click **Load** for your API. This generates typed endpoint constants from the API source file.

## 7. Make a Request

Click **+ Request** in the header or navigate to the **Request Builder**:

1. Select a method (GET, POST, etc.)
2. Type to search and select an endpoint
3. Fill in any params, query, or payload
4. Click **Send**

The response appears below with syntax highlighting. Right-click any value to copy or save to variables.

## 8. Build a Workflow

Navigate to **Workflows** and create a new workflow. Add steps, chain data between them using variable extraction, and run individual steps or the full workflow.

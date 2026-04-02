# Electron Shell

The Electron layer manages the backend process lifecycle and provides native window chrome.

## Dev Mode

In development, the Electron shell connects to separately-running processes:

- Frontend: `http://127.0.0.1:3000` (Vite dev server)
- Backend: `http://127.0.0.1:8000` (uvicorn)

## Production Mode

In production, the Electron app:

1. Finds a free port using `findFreePort()`
2. Spawns the PyInstaller-bundled backend binary
3. The backend serves both the API and the built React static files on a single port
4. Waits for `/api/health` to return 200 (30 retries x 500ms)
5. Navigates from splash screen to the app URL

## Window Configuration

### macOS
- `titleBarStyle: "hiddenInset"` — native traffic lights integrated into content area
- `trafficLightPosition: { x: 16, y: 20 }` — positioned within the AppBar
- Frontend reserves 80px left padding for the traffic light buttons

### Windows
- `titleBarStyle: "hidden"` with `titleBarOverlay`
- System controls (minimize/maximize/close) overlaid at top-right
- Frontend reserves 140px right padding for the overlay buttons

## Splash Screen

Shows `</>  restful` logo with animated progress bar while the backend starts. Listens for `progress` and `error` messages from the main process via `postMessage`.

## Preload API

Exposed via `contextBridge`:

```javascript
window.electronAPI.selectDirectory()  // opens native directory picker
window.electronAPI.getVersion()       // returns app version
window.electronAPI.isDev()            // returns true in dev mode
```

## Process Lifecycle

- **Startup**: `app.whenReady()` → `startBackend()` → `createWindow(port)`
- **Shutdown**: `stopBackend()` sends SIGTERM, then SIGKILL after 5s
- **macOS**: Stays running when all windows close (re-creates window on `activate`)

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const IS_DEV = !app.isPackaged;
const DEV_FRONTEND_PORT = 3000;
const DEV_BACKEND_PORT = 8000;

let mainWindow = null;
let backendProcess = null;
let backendPort = null;

// ─── Backend Lifecycle ──────────────────────────────────────────────────

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = require("net").createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

async function startBackend() {
  if (IS_DEV) {
    // In dev, backend is started separately via `uv run uvicorn`
    backendPort = DEV_BACKEND_PORT;
    return backendPort;
  }

  // Production: spawn the PyInstaller-built backend binary
  const port = await findFreePort();
  const userData = app.getPath("userData");
  const backendPath = path.join(
    process.resourcesPath,
    "backend",
    "restful-notebooks-server"
  );

  backendProcess = spawn(backendPath, [], {
    env: {
      ...process.env,
      RESTFUL_DESK_PORT: String(port),
      RESTFUL_DESK_DATABASE_URL: `sqlite:///${path.join(userData, "history.db")}`,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  backendProcess.stdout.on("data", (data) => {
    const line = data.toString();
    console.log("[backend]", line.trim());
    const match = line.match(/RESTFUL_PORT=(\d+)/);
    if (match) backendPort = parseInt(match[1], 10);
  });

  backendProcess.stderr.on("data", (data) => {
    console.error("[backend]", data.toString().trim());
  });

  backendProcess.on("exit", (code) => {
    console.log(`[backend] exited with code ${code}`);
    backendProcess = null;
  });

  backendPort = port;
  return port;
}

function waitForBackend(port, retries = 30, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve(port);
        } else if (attempts < retries) {
          setTimeout(check, interval);
        } else {
          reject(new Error(`Backend not ready after ${retries} attempts`));
        }
      });
      req.on("error", () => {
        if (attempts < retries) {
          setTimeout(check, interval);
        } else {
          reject(new Error(`Backend not reachable after ${retries} attempts`));
        }
      });
      req.end();
    };
    check();
  });
}

function stopBackend() {
  if (!backendProcess) return;
  console.log("[backend] sending SIGTERM");
  backendProcess.kill("SIGTERM");
  setTimeout(() => {
    if (backendProcess) {
      console.log("[backend] force killing");
      backendProcess.kill("SIGKILL");
    }
  }, 5000);
}

// ─── Window ─────────────────────────────────────────────────────────────

function createWindow(port) {
  const isMac = process.platform === "darwin";

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: isMac ? "hiddenInset" : "hidden",
    trafficLightPosition: isMac ? { x: 16, y: 20 } : undefined,
    titleBarOverlay: !isMac
      ? { color: "#00000001", symbolColor: "#ffffff", height: 56 }
      : undefined,
    backgroundColor: "#0C1117",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Show splash (loading) first
  mainWindow.loadFile(path.join(__dirname, "splash.html"));
  mainWindow.once("ready-to-show", () => mainWindow.show());

  // Wait for backend then navigate to the app
  waitForBackend(port)
    .then(() => {
      const url = IS_DEV
        ? `http://127.0.0.1:${DEV_FRONTEND_PORT}`
        : `http://127.0.0.1:${port}`;
      console.log(`[main] loading ${url}`);

      // Send progress update to splash
      mainWindow.webContents.executeJavaScript(
        `window.postMessage({ type: "progress", message: "Connected to backend" }, "*")`
      );

      setTimeout(() => mainWindow.loadURL(url), 300);
    })
    .catch((err) => {
      console.error("[main] backend failed:", err.message);
      mainWindow.webContents.executeJavaScript(
        `window.postMessage({ type: "error", message: "Backend failed to start" }, "*")`
      );
    });

  // Fullscreen events
  mainWindow.on("enter-full-screen", () => {
    mainWindow.webContents.send("fullscreen-changed", true);
  });
  mainWindow.on("leave-full-screen", () => {
    mainWindow.webContents.send("fullscreen-changed", false);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── IPC Handlers ───────────────────────────────────────────────────────

ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("select-file", async (_, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: filters || [],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("get-version", () => app.getVersion());
ipcMain.handle("is-dev", () => IS_DEV);
ipcMain.handle("install-update", () => {
  if (!IS_DEV) {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.quitAndInstall();
  }
});
ipcMain.handle("check-for-updates", () => {
  if (!IS_DEV) {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.checkForUpdates();
  }
});

// ─── Auto Updater ──────────────────────────────────────────────────────

function setupAutoUpdater() {
  if (IS_DEV) return;

  try {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("update-available", (info) => {
      console.log("[updater] Update available:", info.version);
      if (mainWindow) mainWindow.webContents.send("update-available", info);
    });

    autoUpdater.on("update-downloaded", () => {
      console.log("[updater] Update downloaded, ready to install");
      if (mainWindow) mainWindow.webContents.send("update-downloaded");
    });

    autoUpdater.on("error", (err) => {
      console.error("[updater] Error:", err.message);
    });

    autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    console.log("[updater] Not available:", err.message);
  }
}

// ─── App Lifecycle ──────────────────────────────────────────────────────

app.whenReady().then(async () => {
  const port = await startBackend();
  createWindow(port);
  setupAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(port);
    }
  });
});

app.on("window-all-closed", () => {
  stopBackend();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopBackend();
});

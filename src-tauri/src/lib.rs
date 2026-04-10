use std::net::TcpListener;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use std::thread;

use tauri::{AppHandle, Manager, State};

const PREFERRED_PORT: u16 = 17834;
const HEALTH_RETRIES: u32 = 30;
const HEALTH_DELAY_MS: u64 = 500;

struct BackendState {
    port: u16,
    process: Option<Child>,
}

type Backend = Mutex<BackendState>;

/// Try to bind to the preferred port; if busy, find a random free one.
fn find_free_port() -> u16 {
    if TcpListener::bind(("127.0.0.1", PREFERRED_PORT)).is_ok() {
        return PREFERRED_PORT;
    }
    // Bind to port 0 to get a random free port
    let listener = TcpListener::bind("127.0.0.1:0").expect("Failed to find free port");
    listener.local_addr().unwrap().port()
}

/// Spawn the Python backend sidecar.
fn spawn_backend(app: &AppHandle, port: u16) -> Option<Child> {
    let is_dev = cfg!(debug_assertions);

    if is_dev {
        // In dev mode, backend is started separately
        println!("[tauri] Dev mode — expecting backend on port {}", port);
        return None;
    }

    // Production: find the sidecar binary
    let resource_dir = app.path().resource_dir().expect("No resource dir");
    let binary_name = if cfg!(target_os = "windows") {
        "restful-notebooks-server.exe"
    } else {
        "restful-notebooks-server"
    };
    let binary_path = resource_dir.join("binaries").join(binary_name);

    println!("[tauri] Backend binary: {:?}", binary_path);

    if !binary_path.exists() {
        eprintln!("[tauri] Backend binary not found at {:?}", binary_path);
        return None;
    }

    let user_data = app
        .path()
        .app_data_dir()
        .expect("No app data dir");
    std::fs::create_dir_all(&user_data).ok();

    let db_url = format!(
        "sqlite:///{}",
        user_data.join("history.db").display()
    );

    let child = Command::new(&binary_path)
        .env("RESTFUL_DESK_PORT", port.to_string())
        .env("RESTFUL_DESK_DATABASE_URL", &db_url)
        .env("HOME", dirs::home_dir().unwrap_or_default().display().to_string())
        .current_dir(binary_path.parent().unwrap_or(&resource_dir))
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn();

    match child {
        Ok(c) => {
            println!("[tauri] Backend started (pid {})", c.id());
            Some(c)
        }
        Err(e) => {
            eprintln!("[tauri] Failed to start backend: {}", e);
            None
        }
    }
}

/// Poll /api/health until 200 or timeout.
fn wait_for_health(port: u16) -> bool {
    let url = format!("http://127.0.0.1:{}/api/health", port);
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .unwrap();

    for i in 0..HEALTH_RETRIES {
        match client.get(&url).send() {
            Ok(resp) if resp.status().is_success() => {
                println!("[tauri] Backend healthy after {} attempts", i + 1);
                return true;
            }
            _ => {
                thread::sleep(Duration::from_millis(HEALTH_DELAY_MS));
            }
        }
    }
    eprintln!("[tauri] Backend health check failed after {} attempts", HEALTH_RETRIES);
    false
}

// ── Tauri Commands ──────────────────────────────────────────────────────

#[tauri::command]
fn get_backend_port(state: State<'_, Backend>) -> u16 {
    state.lock().unwrap().port
}

#[tauri::command]
fn is_dev() -> bool {
    cfg!(debug_assertions)
}

// ── App Setup ───────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let port = find_free_port();
            let process = spawn_backend(app.handle(), port);

            app.manage(Mutex::new(BackendState { port, process }));

            // Health check in a background thread, then show window
            let handle = app.handle().clone();
            thread::spawn(move || {
                let is_dev = cfg!(debug_assertions);
                let check_port = if is_dev { 8000 } else { port };

                if wait_for_health(check_port) {
                    if let Some(window) = handle.get_webview_window("main") {
                        window.show().unwrap_or_default();
                    }
                } else {
                    eprintln!("[tauri] Backend failed to start");
                    // Show window anyway so user sees something
                    if let Some(window) = handle.get_webview_window("main") {
                        window.show().unwrap_or_default();
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_backend_port, is_dev])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                // Kill backend process
                let state: &Backend = app.state::<Backend>().inner();
                if let Ok(mut s) = state.lock() {
                    if let Some(ref mut child) = s.process {
                        println!("[tauri] Stopping backend (pid {})", child.id());
                        let _ = child.kill();
                    }
                };
            }
        });
}

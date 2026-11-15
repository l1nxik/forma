use serde::Serialize;
use serde_json::Value;
use std::{
    io::{BufRead, BufReader, Write},
    process::{Child, Command, Stdio},
    sync::{mpsc, Arc, Mutex},
    time::Duration,
};
use tauri::{AppHandle, Manager, State};

#[derive(Default)]
struct Process {
    child: Option<Child>,
    port: Option<u16>,
    token: String,
    error: Option<String>,
}
#[derive(Clone)]
pub struct BackendState {
    process: Arc<Mutex<Process>>,
    http: reqwest::Client,
}
impl Default for BackendState {
    fn default() -> Self {
        Self {
            process: Arc::default(),
            http: reqwest::Client::builder()
                .no_proxy()
                .timeout(Duration::from_secs(10))
                .build()
                .expect("Unable to configure the local API client"),
        }
    }
}
#[derive(Serialize)]
pub struct Status {
    ready: bool,
    error: Option<String>,
}
impl BackendState {
    pub fn stop(&self) {
        if let Ok(mut process) = self.process.lock() {
            if let Some(mut child) = process.child.take() {
                drop(child.stdin.take()); // EOF requests graceful Java shutdown, also on host crash.
                for _ in 0..40 {
                    if child.try_wait().ok().flatten().is_some() {
                        return;
                    }
                    std::thread::sleep(Duration::from_millis(50));
                }
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}
pub fn start(app: AppHandle) {
    let state = app.state::<BackendState>().inner().clone();
    std::thread::spawn(move || {
        if let Err(error) = launch(&app, &state) {
            state.stop();
            if let Ok(mut process) = state.process.lock() {
                process.port = None;
                process.error = Some(format!("Unable to start local storage: {error}"));
            }
        }
    });
}
fn launch(app: &AppHandle, state: &BackendState) -> Result<(), String> {
    let data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data).map_err(|e| e.to_string())?;
    let home = if cfg!(debug_assertions) {
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/backend")
    } else {
        app.path()
            .resource_dir()
            .map_err(|e| e.to_string())?
            .join("backend")
    };
    let exe = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("Missing executable directory")?
        .join(if cfg!(windows) {
            "forma-backend.exe"
        } else {
            "forma-backend"
        });
    let token = format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    );
    let diagnostics = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(data.join("backend.log"))
        .map_err(|e| e.to_string())?;
    let mut stdout_log = diagnostics.try_clone().map_err(|e| e.to_string())?;
    let mut command = Command::new(exe);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW: no console flash.
    }
    let mut child = command
        .env("FORMA_BACKEND_HOME", home)
        .env("FORMA_DATA_DIR", &data)
        .env("FORMA_API_TOKEN", &token)
        .env("FORMA_PARENT_WATCH", "1")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(diagnostics)
        .spawn()
        .map_err(|e| format!("Sidecar: {e}"))?;
    let stdout = child.stdout.take().ok_or("Missing sidecar output")?;
    {
        let mut process = state.process.lock().map_err(|_| "State unavailable")?;
        process.child = Some(child);
        process.token = token;
    }
    let (send, receive) = mpsc::channel();
    std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            if let Some(port) = line
                .strip_prefix("FORMA_READY:")
                .and_then(|s| s.parse::<u16>().ok())
            {
                let _ = send.send(port);
            } else {
                let _ = writeln!(stdout_log, "{line}");
            }
        }
    });
    let port = receive
        .recv_timeout(Duration::from_secs(45))
        .map_err(|_| "The local backend did not respond within 45 seconds.")?;
    let mut process = state.process.lock().map_err(|_| "State unavailable")?;
    process.port = Some(port);
    Ok(())
}
#[tauri::command]
pub fn backend_status(state: State<'_, BackendState>) -> Result<Status, String> {
    let mut process = state.process.lock().map_err(|_| "State unavailable")?;
    if let Some(child) = process.child.as_mut() {
        if child.try_wait().map_err(|e| e.to_string())?.is_some() {
            process.port = None;
            process.error =
                Some("Local storage stopped. Restart Forma to reopen your saved tasks.".into());
        }
    }
    Ok(Status {
        ready: process.port.is_some(),
        error: process.error.clone(),
    })
}
#[tauri::command]
pub async fn api_request(
    state: State<'_, BackendState>,
    operation: String,
    workspace: Option<String>,
    id: Option<String>,
    revision: Option<u64>,
    body: Option<Value>,
    date: Option<String>,
    zone: Option<String>,
    from: Option<String>,
    to: Option<String>,
    limit: Option<u8>,
) -> Result<Value, String> {
    let workspace = workspace.unwrap_or_else(|| "personal".into());
    if workspace != "personal" {
        return Err("workspace.invalid".into());
    }
    let entity_id = id.as_deref().unwrap_or("");
    if id.is_some() {
        uuid::Uuid::parse_str(entity_id).map_err(|_| "validation")?;
    }
    let calendar_date = date.as_deref().unwrap_or("");
    let valid_date = |value: &str| {
        value.len() == 10
            && value.bytes().enumerate().all(|(i, c)| {
                if i == 4 || i == 7 {
                    c == b'-'
                } else {
                    c.is_ascii_digit()
                }
            })
    };
    if date.is_some() && !valid_date(calendar_date) {
        return Err("validation".into());
    }
    let (method, path) = match operation.as_str() {
        "workspace" => ("GET", "/api/workspace".to_owned()),
        "list" => ("GET", "/api/tasks".to_owned()),
        "create" => ("POST", "/api/tasks".to_owned()),
        "update" => ("PUT", format!("/api/tasks/{entity_id}")),
        "delete" => ("DELETE", format!("/api/tasks/{entity_id}")),
        "projects" => ("GET", "/api/projects".to_owned()),
        "createProject" => ("POST", "/api/projects".to_owned()),
        "updateProject" => ("PUT", format!("/api/projects/{entity_id}")),
        "plan" => ("GET", format!("/api/plans/{calendar_date}")),
        "savePlan" => ("PUT", format!("/api/plans/{calendar_date}")),
        "suggestPlan" => ("GET", format!("/api/plans/{calendar_date}/suggestions")),
        "focus" => ("GET", "/api/focus".to_owned()),
        "startFocus" => ("POST", "/api/focus".to_owned()),
        "pauseFocus" => ("POST", format!("/api/focus/{entity_id}/pause")),
        "resumeFocus" => ("POST", format!("/api/focus/{entity_id}/resume")),
        "stopFocus" => ("POST", format!("/api/focus/{entity_id}/stop")),
        "editSession" => ("PUT", format!("/api/focus/{entity_id}")),
        "deleteSession" => ("DELETE", format!("/api/focus/{entity_id}")),
        "statistics" => ("GET", "/api/focus/statistics".to_owned()),
        "preferences" => ("GET", "/api/preferences".to_owned()),
        "savePreferences" => ("PUT", "/api/preferences".to_owned()),
        _ => return Err("request.failed".into()),
    };
    let mut query = vec![("workspace".to_owned(), workspace)];
    if date.is_some() {
        query.push(("date".into(), calendar_date.to_owned()));
    }
    if let Some(value) = zone {
        if value.len() > 100 {
            return Err("validation".into());
        }
        query.push(("zone".into(), value));
    }
    if let Some(value) = from {
        if !valid_date(&value) {
            return Err("validation".into());
        }
        query.push(("from".into(), value));
    }
    if let Some(value) = to {
        if !valid_date(&value) {
            return Err("validation".into());
        }
        query.push(("to".into(), value));
    }
    if let Some(value) = limit {
        query.push(("limit".into(), value.to_string()));
    }
    if let Some(value) = revision {
        query.push(("revision".into(), value.to_string()));
    }
    if body.as_ref().is_some_and(|v| v.to_string().len() > 65536) {
        return Err("validation".into());
    }
    let (port, token) = {
        let process = state.process.lock().map_err(|_| "State unavailable")?;
        (
            process.port.ok_or("storage.starting")?,
            process.token.clone(),
        )
    };
    let mut request = state
        .http
        .request(
            method.parse().map_err(|_| "Invalid method")?,
            format!("http://127.0.0.1:{port}{path}"),
        )
        .header("X-Forma-Token", token)
        .query(&query);
    if let Some(value) = body {
        request = request.json(&value);
    }
    let response = request.send().await.map_err(|_| "connection".to_string())?;
    let status = response.status();
    let value: Value = response.json().await.map_err(|_| "connection")?;
    if !status.is_success() {
        return Err(value
            .get("code")
            .or_else(|| value.get("message"))
            .and_then(Value::as_str)
            .unwrap_or("request.failed")
            .to_owned());
    }
    Ok(value)
}

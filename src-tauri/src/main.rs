#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod backend;
mod glass;
mod menus;
use backend::{api_request, backend_status, BackendState};
use tauri::Manager;
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .manage(BackendState::default())
        .setup(|app| {
            menus::install(app.handle(), "en")?;
            backend::start(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            api_request,
            backend_status,
            menus::set_language,
            glass::set_sidebar_glass
        ])
        .build(tauri::generate_context!())
        .expect("Unable to create Forma window")
        .run(|handle, event| {
            if let tauri::RunEvent::Exit = event {
                handle.state::<BackendState>().stop();
            }
        });
}

mod automation;
mod storage;

use serde_json::Value;

// Load the shared app state JSON for the frontend.
#[tauri::command]
fn load_app_state(app: tauri::AppHandle) -> Result<Value, String> {
    storage::load_app_state(&app)
}

// Persist the shared app state JSON sent from the frontend.
#[tauri::command]
fn save_app_state(app: tauri::AppHandle, state: Value) -> Result<(), String> {
    storage::save_app_state(&app, state)
}

// Return the autosave file path used by the current desktop app instance.
#[tauri::command]
fn storage_file_path(app: tauri::AppHandle) -> Result<String, String> {
    storage::storage_file_path(&app)
}

// Return the external automation command file path used by child-process drivers.
#[tauri::command]
fn automation_command_path() -> Result<String, String> {
    automation::automation_command_path_string()
}

// Read and clear the next queued automation command if one exists.
#[tauri::command]
fn poll_automation_command() -> Result<Option<Value>, String> {
    automation::poll_automation_command()
}

// Start the Tauri runtime and expose the JSON storage and automation commands to the React frontend.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_app_state,
            save_app_state,
            storage_file_path,
            automation_command_path,
            poll_automation_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

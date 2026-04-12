use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};


// Build the default JSON document used before the first real save occurs.
fn default_state() -> Value {
    json!({
        "settings": {
            "delay_ms": 1500,
            "default_day_size": 30
        },
        "decks": []
    })
}


// Remove a UTF-8 BOM when external tools saved JSON with a signature prefix.
fn strip_utf8_bom(text: &str) -> &str {
    text.trim_start_matches('\u{feff}')
}


// Resolve the primary app data file and ensure the parent directory exists.
fn app_state_file(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("app_data.json"))
}


// Collect legacy JSON file candidates so older PyQt data can be imported automatically once.
fn legacy_state_candidates() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    let project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(|path| path.to_path_buf());
    if let Some(root) = project_root {
        paths.push(root.join("data").join("app_data.json"));
    }

    if let Ok(executable) = std::env::current_exe() {
        if let Some(parent) = executable.parent() {
            paths.push(parent.join("data").join("app_data.json"));
        }
    }

    paths
}


// Ensure the JSON file exists by copying legacy data first or writing a clean default state.
fn ensure_state_file(app: &AppHandle) -> Result<PathBuf, String> {
    let target = app_state_file(app)?;
    if target.exists() {
        return Ok(target);
    }

    if let Some(legacy) = legacy_state_candidates().into_iter().find(|candidate| candidate.exists()) {
        if legacy != target {
            fs::copy(&legacy, &target).map_err(|error| error.to_string())?;
            return Ok(target);
        }
    }

    let content = serde_json::to_string_pretty(&default_state()).map_err(|error| error.to_string())?;
    fs::write(&target, content).map_err(|error| error.to_string())?;
    Ok(target)
}


// Load the persisted application state JSON from disk.
pub fn load_app_state(app: &AppHandle) -> Result<Value, String> {
    let path = ensure_state_file(app)?;
    let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str::<Value>(strip_utf8_bom(&text)).map_err(|error| error.to_string())
}


// Save the shared application state JSON back to disk.
pub fn save_app_state(app: &AppHandle, state: Value) -> Result<(), String> {
    let path = ensure_state_file(app)?;
    let text = serde_json::to_string_pretty(&state).map_err(|error| error.to_string())?;
    fs::write(path, text).map_err(|error| error.to_string())
}


// Return the physical storage file path so the UI can display autosave status.
pub fn storage_file_path(app: &AppHandle) -> Result<String, String> {
    let path = ensure_state_file(app)?;
    Ok(path.to_string_lossy().to_string())
}

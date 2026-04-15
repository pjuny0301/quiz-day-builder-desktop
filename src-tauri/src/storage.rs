use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const STATE_FILE_NAME: &str = "app_data.json";
const BACKUP_FILE_NAME: &str = "app_data.backup.json";
const TEMP_FILE_NAME: &str = "app_data.json.tmp";
const STORAGE_SCHEMA_VERSION: u64 = 1;

// Build the default JSON document used before the first real save occurs.
fn default_state() -> Value {
    json!({
        "meta": {
            "schema_version": STORAGE_SCHEMA_VERSION
        },
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

// Resolve the app data directory and ensure it exists before any file IO starts.
fn state_directory(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory)
}

// Resolve the primary state file path used by the desktop app.
fn app_state_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(state_directory(app)?.join(STATE_FILE_NAME))
}

// Resolve the backup state file path used for crash-safe recovery.
fn backup_state_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(state_directory(app)?.join(BACKUP_FILE_NAME))
}

// Resolve the temporary state file path used before replacing the primary file.
fn temp_state_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(state_directory(app)?.join(TEMP_FILE_NAME))
}

// Collect legacy JSON file candidates so older PyQt data can be imported automatically once.
fn legacy_state_candidates() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    let project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(|path| path.to_path_buf());
    if let Some(root) = project_root {
        paths.push(root.join("data").join(STATE_FILE_NAME));
    }

    if let Ok(executable) = std::env::current_exe() {
        if let Some(parent) = executable.parent() {
            paths.push(parent.join("data").join(STATE_FILE_NAME));
        }
    }

    paths
}

// Ensure every saved document carries a schema version for later migrations.
fn with_storage_metadata(state: Value) -> Value {
    let mut object = match state {
        Value::Object(map) => map,
        _ => match default_state() {
            Value::Object(map) => map,
            _ => unreachable!("default state must stay a JSON object"),
        },
    };

    object
        .entry("meta".to_string())
        .and_modify(|meta| {
            if let Value::Object(meta_map) = meta {
                meta_map.insert(
                    "schema_version".to_string(),
                    Value::from(STORAGE_SCHEMA_VERSION),
                );
            } else {
                *meta = json!({ "schema_version": STORAGE_SCHEMA_VERSION });
            }
        })
        .or_insert_with(|| json!({ "schema_version": STORAGE_SCHEMA_VERSION }));

    Value::Object(object)
}

// Read and parse one JSON state document from disk.
fn read_state_file(path: &Path) -> Result<Value, String> {
    let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str::<Value>(strip_utf8_bom(&text)).map_err(|error| error.to_string())
}

// Serialize one JSON state document to disk with a stable pretty format.
fn write_state_file(path: &Path, state: &Value) -> Result<(), String> {
    let text = serde_json::to_string_pretty(state).map_err(|error| error.to_string())?;
    fs::write(path, text).map_err(|error| error.to_string())
}

// Replace the primary file through a temp file so interrupted writes leave a recoverable backup.
fn replace_primary_from_temp(primary: &Path, temp: &Path) -> Result<(), String> {
    if primary.exists() {
        fs::remove_file(primary).map_err(|error| error.to_string())?;
    }
    fs::rename(temp, primary).map_err(|error| error.to_string())
}

// Recover the primary file from the backup copy when the main JSON becomes unreadable.
fn restore_primary_from_backup(primary: &Path, backup: &Path) -> Result<Value, String> {
    let recovered = with_storage_metadata(read_state_file(backup)?);
    write_state_file(primary, &recovered)?;
    Ok(recovered)
}

// Ensure the JSON file exists by copying legacy data first or writing a clean default state.
fn ensure_state_file(app: &AppHandle) -> Result<PathBuf, String> {
    let target = app_state_file(app)?;
    if target.exists() {
        return Ok(target);
    }

    if let Some(legacy) = legacy_state_candidates()
        .into_iter()
        .find(|candidate| candidate.exists())
    {
        if legacy != target {
            let imported = with_storage_metadata(read_state_file(&legacy)?);
            write_state_file(&target, &imported)?;
            return Ok(target);
        }
    }

    let content = default_state();
    write_state_file(&target, &content)?;
    Ok(target)
}

// Load the persisted application state JSON from disk and restore the backup if needed.
pub fn load_app_state(app: &AppHandle) -> Result<Value, String> {
    let primary = ensure_state_file(app)?;
    match read_state_file(&primary) {
        Ok(state) => Ok(with_storage_metadata(state)),
        Err(primary_error) => {
            let backup = backup_state_file(app)?;
            if backup.exists() {
                restore_primary_from_backup(&primary, &backup).map_err(|backup_error| {
                    format!(
                        "주 저장 파일과 백업 파일을 모두 읽지 못했습니다. primary: {primary_error}; backup: {backup_error}"
                    )
                })
            } else {
                Err(primary_error)
            }
        }
    }
}

// Save the shared application state JSON back to disk with backup and temp-file protection.
pub fn save_app_state(app: &AppHandle, state: Value) -> Result<(), String> {
    let primary = ensure_state_file(app)?;
    let backup = backup_state_file(app)?;
    let temp = temp_state_file(app)?;
    let document = with_storage_metadata(state);

    if primary.exists() {
        fs::copy(&primary, &backup).map_err(|error| error.to_string())?;
    }

    if temp.exists() {
        fs::remove_file(&temp).map_err(|error| error.to_string())?;
    }

    write_state_file(&temp, &document)?;
    replace_primary_from_temp(&primary, &temp)
}

// Return the physical storage file path so the UI can display autosave status.
pub fn storage_file_path(app: &AppHandle) -> Result<String, String> {
    let path = ensure_state_file(app)?;
    Ok(path.to_string_lossy().to_string())
}

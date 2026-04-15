use std::{env, fs, path::PathBuf};

use serde_json::Value;

// Resolve the shared automation command file used by child-process UI drivers.
pub fn automation_command_path() -> Result<PathBuf, String> {
    let mut path = env::temp_dir();
    path.push("quiz_day_builder_automation.json");
    Ok(path)
}

// Return the automation command file path so external helpers know where to write commands.
pub fn automation_command_path_string() -> Result<String, String> {
    Ok(automation_command_path()?.display().to_string())
}

// Read one queued automation command and remove the file so commands are processed once.
pub fn poll_automation_command() -> Result<Option<Value>, String> {
    let path = automation_command_path()?;
    if !path.exists() {
        return Ok(None);
    }

    let text = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    fs::remove_file(&path).map_err(|error| error.to_string())?;

    if text.trim().is_empty() {
        return Ok(None);
    }

    let value = serde_json::from_str::<Value>(&text).map_err(|error| error.to_string())?;
    Ok(Some(value))
}

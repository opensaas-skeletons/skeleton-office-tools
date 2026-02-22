use std::fs;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn open_file_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("PDF Files", &["pdf"])
        .add_filter("All Files", &["*"])
        .blocking_pick_file();

    match file {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn save_file_dialog(
    app: tauri::AppHandle,
    default_name: Option<String>,
) -> Result<Option<String>, String> {
    let mut builder = app
        .dialog()
        .file()
        .add_filter("PDF Files", &["pdf"]);

    if let Some(name) = default_name {
        builder = builder.set_file_name(&name);
    }

    let file = builder.blocking_save_file();

    match file {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Write file bytes via JSON-serialized data. Works for small files but
/// incurs ~4x memory overhead due to JSON number-array encoding.
/// For large files (>5 MB), prefer write_file_bytes_raw instead.
#[tauri::command]
pub async fn write_file_bytes(path: String, data: Vec<u8>) -> Result<(), String> {
    fs::write(&path, data).map_err(|e| format!("Failed to write file: {}", e))
}

/// Write file bytes using raw IPC body, bypassing JSON serialization.
/// This avoids the ~4x memory overhead of encoding Uint8Array as a JSON
/// number array, preventing OOM crashes on large PDFs (10+ MB).
/// The file path is passed via the X-File-Path request header.
#[tauri::command]
pub async fn write_file_bytes_raw(request: tauri::ipc::Request<'_>) -> Result<(), String> {
    let path = request
        .headers()
        .get("X-File-Path")
        .and_then(|v: &tauri::http::HeaderValue| v.to_str().ok())
        .map(|s: &str| s.to_string())
        .ok_or_else(|| "Missing X-File-Path header".to_string())?;

    let data = match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) => bytes.clone(),
        tauri::ipc::InvokeBody::Json(value) => {
            // Fallback: handle JSON-encoded byte arrays for backward compatibility
            serde_json::from_value::<Vec<u8>>(value.clone())
                .map_err(|e| format!("Failed to deserialize data: {}", e))?
        }
    };

    fs::write(&path, &data).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub fn get_file_opened_with() -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 {
        Some(args[1].clone())
    } else {
        None
    }
}

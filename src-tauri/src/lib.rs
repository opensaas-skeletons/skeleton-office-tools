mod commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::documents::open_file_dialog,
            commands::documents::save_file_dialog,
            commands::documents::read_file_bytes,
            commands::documents::write_file_bytes,
            commands::documents::write_file_bytes_raw,
            commands::documents::get_file_opened_with,
            commands::settings::get_app_data_dir,
        ])
        .setup(|app| {
            // Check if a file was passed as CLI argument (Open With)
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let file_path = args[1].clone();
                let window = app.get_webview_window("main").unwrap();
                window.eval(&format!(
                    "window.__OPENED_FILE__ = {};",
                    serde_json::to_string(&file_path).unwrap()
                )).ok();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

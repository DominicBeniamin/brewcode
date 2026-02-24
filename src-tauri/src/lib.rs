use std::sync::Mutex;
use tauri::State;
use serde::{Deserialize, Serialize};

#[derive(Default)]
struct AppState {
    current_db_path: Mutex<Option<String>>,
}

#[derive(Serialize, Deserialize)]
struct DbPathResponse {
    path: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct SaveResponse {
    success: bool,
    path: Option<String>,
    error: Option<String>,
}

// Save database to a new location (opens save dialog)
#[tauri::command]
async fn save_database_as(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    data: Vec<u8>,
) -> Result<SaveResponse, String> {
    use tauri_plugin_dialog::{DialogExt, FilePath};

    let file_path = app
        .dialog()
        .file()
        .add_filter("SQLite Database", &["db"])
        .set_file_name("brewcode.db")
        .blocking_save_file();

    match file_path {
        Some(FilePath::Path(path)) => {
            match std::fs::write(&path, data) {
                Ok(_) => {
                    let path_str = path.to_string_lossy().to_string();
                    let mut current_path = state.current_db_path.lock().unwrap();
                    *current_path = Some(path_str.clone());
                    
                    Ok(SaveResponse {
                        success: true,
                        path: Some(path_str),
                        error: None,
                    })
                }
                Err(e) => Ok(SaveResponse {
                    success: false,
                    path: None,
                    error: Some(format!("Failed to write file: {}", e)),
                }),
            }
        }
        _ => Ok(SaveResponse {
            success: false,
            path: None,
            error: Some("Save cancelled".to_string()),
        }),
    }
}

// Save database to the current location
#[tauri::command]
async fn save_database(
    state: State<'_, AppState>,
    data: Vec<u8>,
) -> Result<SaveResponse, String> {
    let current_path = state.current_db_path.lock().unwrap();
    
    match current_path.as_ref() {
        Some(path) => {
            match std::fs::write(path, data) {
                Ok(_) => Ok(SaveResponse {
                    success: true,
                    path: Some(path.clone()),
                    error: None,
                }),
                Err(e) => Ok(SaveResponse {
                    success: false,
                    path: None,
                    error: Some(format!("Failed to write file: {}", e)),
                }),
            }
        }
        None => Ok(SaveResponse {
            success: false,
            path: None,
            error: Some("No database path set. Use 'Save As' first.".to_string()),
        }),
    }
}

// Open existing database file
#[tauri::command]
async fn open_database(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<u8>, String> {
    use tauri_plugin_dialog::{DialogExt, FilePath};

    let file_path = app
        .dialog()
        .file()
        .add_filter("SQLite Database", &["db"])
        .blocking_pick_file();

    match file_path {
        Some(FilePath::Path(path)) => {
            match std::fs::read(&path) {
                Ok(data) => {
                    let path_str = path.to_string_lossy().to_string();
                    let mut current_path = state.current_db_path.lock().unwrap();
                    *current_path = Some(path_str);
                    
                    Ok(data)
                }
                Err(e) => Err(format!("Failed to read file: {}", e)),
            }
        }
        _ => Err("Open cancelled".to_string()),
    }
}

// Export database copy to a different location (doesn't change current path)
#[tauri::command]
async fn export_database(
    app: tauri::AppHandle,
    data: Vec<u8>,
) -> Result<SaveResponse, String> {
    use tauri_plugin_dialog::{DialogExt, FilePath};

    let file_path = app
        .dialog()
        .file()
        .add_filter("SQLite Database", &["db"])
        .set_file_name("brewcode.db")
        .blocking_save_file();

    match file_path {
        Some(FilePath::Path(path)) => {
            match std::fs::write(&path, data) {
                Ok(_) => {
                    let path_str = path.to_string_lossy().to_string();
                    Ok(SaveResponse {
                        success: true,
                        path: Some(path_str),
                        error: None,
                    })
                }
                Err(e) => Ok(SaveResponse {
                    success: false,
                    path: None,
                    error: Some(format!("Failed to write file: {}", e)),
                }),
            }
        }
        _ => Ok(SaveResponse {
            success: false,
            path: None,
            error: Some("Export cancelled".to_string()),
        }),
    }
}

// Get the current database path
#[tauri::command]
async fn get_current_db_path(state: State<'_, AppState>) -> Result<DbPathResponse, String> {
    let current_path = state.current_db_path.lock().unwrap();
    Ok(DbPathResponse {
        path: current_path.clone(),
    })
}

// Check if a database file exists at the stored path
#[tauri::command]
async fn check_db_exists(state: State<'_, AppState>) -> Result<bool, String> {
    let current_path = state.current_db_path.lock().unwrap();
    
    match current_path.as_ref() {
        Some(path) => Ok(std::path::Path::new(path).exists()),
        None => Ok(false),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
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
    .manage(AppState::default())
    .invoke_handler(tauri::generate_handler![
      save_database_as,
      save_database,
      open_database,
      export_database,
      get_current_db_path,
      check_db_exists,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

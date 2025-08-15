pub mod config;
pub mod download;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      config::save_config,
      config::load_config,
      config::config_exists,
      config::delete_config,
      config::export_config,
      config::import_config,
      config::select_export_path,
      config::select_import_path,
      download::select_download_path,
      download::select_download_directory,
      download::validate_download_path,
      download::check_file_exists,
      download::get_file_size,
      download::get_default_download_path,
      download::generate_unique_filename,
      download::create_directory,
      download::check_disk_space,
      download::write_file_chunk,
      download::read_file_chunk,
      download::calculate_file_checksum,
      download::get_file_metadata,
    ])
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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

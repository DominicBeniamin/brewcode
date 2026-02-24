import { invoke } from '@tauri-apps/api/core';

export interface SaveResponse {
  success: boolean;
  path?: string;
  error?: string;
}

export interface DbPathResponse {
  path?: string;
}

/**
 * Opens a save dialog and saves the database to the chosen location.
 * This becomes the new "current" database path for auto-saves.
 */
export async function saveDatabaseAs(db: any): Promise<SaveResponse> {
  try {
    const binaryArray = db.export();
    const data = Array.from(binaryArray);
    
    const response = await invoke<SaveResponse>('save_database_as', { data });
    return response;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Saves the database to the current path (no dialog).
 * Returns error if no current path is set.
 */
export async function saveDatabase(db: any): Promise<SaveResponse> {
  try {
    const binaryArray = db.export();
    const data = Array.from(binaryArray);
    
    const response = await invoke<SaveResponse>('save_database', { data });
    return response;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Opens a file picker and loads the selected database.
 * This becomes the new "current" database path.
 */
export async function openDatabase(SQL: any): Promise<any> {
  try {
    const data = await invoke<number[]>('open_database');
    const uint8Array = new Uint8Array(data);
    const db = new SQL.Database(uint8Array);
    
    return db;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Exports a copy of the database to a chosen location.
 * Does NOT change the current database path.
 */
export async function exportDatabase(db: any): Promise<SaveResponse> {
  try {
    const binaryArray = db.export();
    const data = Array.from(binaryArray);
    
    const response = await invoke<SaveResponse>('export_database', { data });
    return response;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Gets the current database file path (if one is set).
 */
export async function getCurrentDbPath(): Promise<string | null> {
  try {
    const response = await invoke<DbPathResponse>('get_current_db_path');
    return response.path || null;
  } catch (error) {
    console.error('Failed to get current DB path:', error);
    return null;
  }
}

/**
 * Checks if a database file exists at the current path.
 */
export async function checkDbExists(): Promise<boolean> {
  try {
    return await invoke<boolean>('check_db_exists');
  } catch (error) {
    console.error('Failed to check if DB exists:', error);
    return false;
  }
}
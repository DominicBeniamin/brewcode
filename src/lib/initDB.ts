// initDb.ts

import initSqlJs from 'sql.js';

// Type declarations for SQL.js
declare global {
  interface Window {
    initSqlJs: (config: { locateFile: (file: string) => string }) => Promise<any>;
  }
}

/**
 * Fetch a SQL file from the public/database directory and execute it
 * against the provided database instance, statement by statement.
 */
async function executeSqlFile(db: any, path: string): Promise<void> {
  let sql: string;

  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    sql = await response.text();
    console.log(`SQL file loaded successfully: ${path}`);
  } catch (error) {
    console.error(`Failed to load ${path}:`, error);
    throw new Error(`Failed to load ${path}. Please ensure it exists in public/database/`);
  }

  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  console.log(`Found ${statements.length} SQL statements in ${path}`);

  let statementCount = 0;
  for (const statement of statements) {
    try {
      statementCount++;
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');
      console.log(`[${statementCount}/${statements.length}] Executing: ${preview}...`);
      db.exec(statement);
      console.log(`✓ Statement ${statementCount} succeeded`);
    } catch (statementError: any) {
      console.error(`✗ Statement ${statementCount} FAILED in ${path}:`);
      console.error(`Statement: ${statement.substring(0, 200)}`);
      console.error(`Error: ${statementError.message}`);
      throw new Error(
        `SQL execution failed in ${path} at statement ${statementCount}: ${statementError.message}`
      );
    }
  }

  console.log(`✓ All statements in ${path} executed successfully.`);
}

async function initDb() {
  console.log('Initializing database...');

  // Step 1: Initialize SQL.js library
  const SQL = await initSqlJs({
    locateFile: file => `/sql-wasm/${file}`
  });
  console.log('SQL.js loaded successfully.');

  // Step 2: Create new empty database
  const db = new SQL.Database();
  console.log('Empty database created.');

  // Step 3: Execute schema (creates tables, indexes, and system seed data)
  await executeSqlFile(db, '/database/schema.sql');

  // Step 4: Execute application seed data (ingredient types, supply types, subtypes)
  await executeSqlFile(db, '/database/seedData.sql');

  console.log('✓ Database initialised successfully.');
  return db;
}

function exportDb(db: any, filename = 'brewcode.db') {
  console.log('Exporting database...');

  try {
    const binaryArray = db.export();
    const blob = new Blob([binaryArray], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    console.log('✓ Database exported successfully.');
  } catch (error) {
    console.error('Failed to export database:', error);
    throw error;
  }
}

async function importDb(file: File) {
  console.log('Importing database...');

  try {
    const arrayBuffer = await file.arrayBuffer();
    const SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });
    const db = new SQL.Database(new Uint8Array(arrayBuffer));
    console.log('✓ Database imported successfully.');
    return db;
  } catch (error) {
    console.error('Failed to import database:', error);
    throw error;
  }
}

export { initDb, exportDb, importDb };
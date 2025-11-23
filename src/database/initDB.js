// initDb.js
async function initDb() {
    console.log("Initializing database...");

    // Step 1: Initialize SQL.js library (use global from script tag)
    const SQL = await window.initSqlJs({ 
        locateFile: file => `https://sql.js.org/dist/${file}`
    });
    
    console.log("SQL.js loaded successfully.");

    // Step 2: Create new empty database
    const db = new SQL.Database();

    console.log("Empty database created.");

    // Step 3: Load schema from file
    console.log("Loading schema...");
    const response = await fetch('./src/database/schema.sql');
    const schemaSql = await response.text();
    
    console.log("Schema loaded. Executing SQL...");
    
    // Step 4: Execute schema to create tables
    db.exec(schemaSql);
    
    console.log("Database schema applied successfully!");
    
    return db;
};

function exportDb(db, filename = 'brewcode.db') {
    console.log("Exporting database...");
    
    // Step 1: Export database to binary array
    const binaryArray = db.export();
    
    // Step 2: Create a Blob (binary file object)
    const blob = new Blob([binaryArray], { 
        type: 'application/x-sqlite3' 
    });
    
    // Step 3: Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // Step 4: Trigger download
    a.click();
    
    // Step 5: Clean up
    URL.revokeObjectURL(url);
    
    console.log("Database exported successfully!");
}

async function importDb(file) {
    console.log("Importing database...");
    
    // Step 1: Read file as binary data
    const arrayBuffer = await file.arrayBuffer();
    
    // Step 2: Initialize SQL.js (same as initDb)
    const SQL = await initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
    });
    
    // Step 3: Load database from binary data
    const db = new SQL.Database(new Uint8Array(arrayBuffer));
    
    console.log("Database imported successfully!");
    
    return db;
}

export { initDb, exportDb, importDb };
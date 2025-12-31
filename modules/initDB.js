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
    let schemaSql;
    
    try {
        // Try multiple possible paths for schema.sql
        const paths = [
            '../database/schema.sql',  // Original path
            './database/schema.sql',   // Relative to current directory
            '/database/schema.sql',    // Root relative
            './schema.sql'             // Same directory
        ];
        
        let loaded = false;
        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    schemaSql = await response.text();
                    console.log(`Schema loaded from: ${path}`);
                    loaded = true;
                    break;
                }
            } catch (e) {
                // Try next path
            }
        }
        
        if (!loaded) {
            throw new Error('Schema file not found in any location');
        }
    } catch (error) {
        console.error('Failed to load schema.sql:', error);
        throw new Error('Failed to load schema.sql. Please ensure it is accessible at ../database/schema.sql');
    }
    
    console.log("Schema loaded. Executing SQL...");
    
    // Step 4: Execute schema to create tables
    // Split by semicolon and execute statement by statement to isolate errors
    const statements = schemaSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    let statementCount = 0;
    try {
        for (const statement of statements) {
            try {
                statementCount++;
                // Show first 80 chars of statement being executed
                const preview = statement.substring(0, 80).replace(/\n/g, ' ');
                console.log(`[${statementCount}/${statements.length}] Executing: ${preview}...`);
                
                db.exec(statement);
                console.log(`✓ Statement ${statementCount} succeeded`);
            } catch (statementError) {
                console.error(`✗ Statement ${statementCount} FAILED:`);
                console.error(`Statement: ${statement.substring(0, 200)}`);
                console.error(`Error: ${statementError.message}`);
                throw statementError;
            }
        }
    } catch (error) {
        console.error('Database initialization failed:', error);
        console.error('Stack:', error.stack);
        throw new Error(`Database initialization failed at statement ${statementCount}: ${error.message}`);
    }
    
    console.log("✓ All SQL statements executed successfully!");
    
    return db;
}

function exportDb(db, filename = 'brewcode.db') {
    console.log("Exporting database...");
    
    try {
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
        
        console.log("✓ Database exported successfully!");
    } catch (error) {
        console.error('Failed to export database:', error);
        throw error;
    }
}

async function importDb(file) {
    console.log("Importing database...");
    
    try {
        // Step 1: Read file as binary data
        const arrayBuffer = await file.arrayBuffer();
        
        // Step 2: Initialize SQL.js (same as initDb)
        const SQL = await initSqlJs({
            locateFile: file => `https://sql.js.org/dist/${file}`
        });
        
        // Step 3: Load database from binary data
        const db = new SQL.Database(new Uint8Array(arrayBuffer));
        
        console.log("✓ Database imported successfully!");
        
        return db;
    } catch (error) {
        console.error('Failed to import database:', error);
        throw error;
    }
}

export { initDb, exportDb, importDb };
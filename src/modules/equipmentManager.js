// equipmentManager.js

import { resultToObjects, _updateActiveStatus } from './helpers.js';

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Create a new piece of equipment
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} equipmentData - Equipment information
 * @param {string} equipmentData.name - Equipment name (required, user-defined like "Primary Fermenter #1")
 * @param {string} equipmentData.type - Equipment type (required, e.g., "fermenter", "carboy", "monitor", "hydrometer")
 * @param {number} [equipmentData.canBeOccupied=0] - 1 = tracked for batch occupancy, 0 = general tool (optional, default: 0)
 * @param {number} [equipmentData.capacityL] - Volume capacity in liters (optional, required for vessels)
 * @param {string} [equipmentData.material] - Construction material (optional, e.g., "Glass", "Plastic", "Stainless Steel")
 * @param {string} [equipmentData.notes] - Maintenance notes, specifications (optional)
 * @returns {Object} Created equipment object with equipmentID
 * @throws {Error} If validation fails
 * 
 * @example
 * // Create a fermentation vessel
 * const fermenter = createEquipment(db, {
 *     name: "Primary Fermenter #1",
 *     type: "fermenter",
 *     canBeOccupied: 1,
 *     capacityL: 25,
 *     material: "Plastic",
 *     notes: "Food-grade HDPE bucket with airlock"
 * });
 * 
 * @example
 * // Create a general tool
 * const hydrometer = createEquipment(db, {
 *     name: "Triple Scale Hydrometer",
 *     type: "hydrometer",
 *     canBeOccupied: 0,
 *     material: "Glass"
 * });
 */
function createEquipment(db, equipmentData) {
    // STEP 1: VALIDATE REQUIRED FIELDS
    if (!equipmentData.name || equipmentData.name.trim() === '') {
        throw new Error('Equipment name is required');
    }
    
    if (!equipmentData.type || equipmentData.type.trim() === '') {
        throw new Error('Equipment type is required');
    }
    
    // STEP 2: VALIDATE canBeOccupied
    if (equipmentData.canBeOccupied !== undefined) {
        if (equipmentData.canBeOccupied !== 0 && equipmentData.canBeOccupied !== 1) {
            throw new Error('canBeOccupied must be 0 or 1');
        }
    }
    
    // STEP 3: VALIDATE capacityL (if provided)
    if (equipmentData.capacityL !== undefined && equipmentData.capacityL !== null) {
        if (typeof equipmentData.capacityL !== 'number' || equipmentData.capacityL <= 0) {
            throw new Error('Capacity must be a positive number');
        }
    }
    
    // STEP 4: BUSINESS RULE - Vessels should have capacity
    const vesselTypes = ['fermenter', 'carboy', 'keg'];
    if (vesselTypes.includes(equipmentData.type.toLowerCase())) {
        if (!equipmentData.capacityL) {
            console.warn(`Warning: ${equipmentData.type} typically requires capacityL`);
        }
    }
    
    // STEP 5: PREPARE DATA
    const equipment = {
        name: equipmentData.name.trim(),
        type: equipmentData.type.trim(),
        canBeOccupied: equipmentData.canBeOccupied ?? 0,
        capacityL: equipmentData.capacityL ?? null,
        material: equipmentData.material?.trim() || null,
        notes: equipmentData.notes?.trim() || null
    };
    
    try {
        // STEP 6: INSERT EQUIPMENT
        const sql = `
            INSERT INTO equipment (name, type, canBeOccupied, capacityL, material, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [
            equipment.name,
            equipment.type,
            equipment.canBeOccupied,
            equipment.capacityL,
            equipment.material,
            equipment.notes
        ]);
        
        // STEP 7: GET THE NEW EQUIPMENT ID
        const [[equipmentID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`Equipment created successfully: ID ${equipmentID}`);
        
        // STEP 8: RETURN COMPLETE OBJECT
        return {
            equipmentID: equipmentID,
            name: equipment.name,
            type: equipment.type,
            canBeOccupied: equipment.canBeOccupied,
            capacityL: equipment.capacityL,
            material: equipment.material,
            notes: equipment.notes,
            isActive: 1
        };
        
    } catch (error) {
        console.error('Failed to create equipment:', error.message);
        throw new Error(`Failed to create equipment: ${error.message}`);
    }
}

/**
 * Get a single piece of equipment by ID
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} equipmentID - ID of the equipment to retrieve
 * @returns {Object|null} Equipment object, or null if not found
 * @throws {Error} If equipmentID is invalid
 * 
 * @example
 * const equipment = getEquipment(db, 5);
 * if (equipment) {
 *     console.log(equipment.name);        // "Primary Fermenter #1"
 *     console.log(equipment.capacityL);   // 25
 *     console.log(equipment.isActive);    // 1
 * } else {
 *     console.log("Equipment not found");
 * }
 */
function getEquipment(db, equipmentID) {
    // STEP 1: VALIDATE EQUIPMENT ID
    if (typeof equipmentID !== 'number' || equipmentID <= 0) {
        throw new Error('Invalid equipment ID (must be positive number)');
    }
    
    try {
        // STEP 2: QUERY DATABASE
        const sql = `SELECT * FROM equipment WHERE equipmentID = ?`;
        const result = db.exec(sql, [equipmentID]);
        
        // STEP 3: CONVERT RESULT TO OBJECT
        const equipment = resultToObjects(result);
        
        if (equipment.length === 0) {
            return null;
        }
        
        // STEP 4: RETURN EQUIPMENT
        return equipment[0];
        
    } catch (error) {
        console.error('Failed to fetch equipment:', error.message);
        throw new Error(`Failed to fetch equipment: ${error.message}`);
    }
}

/**
 * Get all equipment with optional filters
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} [options] - Filter options
 * @param {string} [options.type] - Filter by equipment type (e.g., "fermenter", "carboy", "hydrometer")
 * @param {number} [options.canBeOccupied] - Filter by occupancy tracking (0 or 1)
 * @param {number} [options.isActive] - Filter by active status (0 or 1)
 * @param {number} [options.minCapacityL] - Filter by minimum capacity in liters
 * @param {number} [options.maxCapacityL] - Filter by maximum capacity in liters
 * @returns {Array} Array of equipment objects
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get all equipment
 * const all = getAllEquipment(db);
 * 
 * @example
 * // Get only fermenters
 * const fermenters = getAllEquipment(db, { type: "fermenter" });
 * 
 * @example
 * // Get only batch-occupying equipment (fermenters, monitors)
 * const occupiable = getAllEquipment(db, { canBeOccupied: 1 });
 * 
 * @example
 * // Get active fermenters with 20-30L capacity
 * const mediumFermenters = getAllEquipment(db, { 
 *     type: "fermenter",
 *     isActive: 1,
 *     minCapacityL: 20,
 *     maxCapacityL: 30
 * });
 */
function getAllEquipment(db, options = {}) {
    try {
        // STEP 1: BUILD BASE QUERY
        let sql = 'SELECT * FROM equipment';
        const conditions = [];
        const params = [];
        
        // STEP 2: FILTER BY TYPE
        if (options.type !== undefined) {
            if (typeof options.type !== 'string' || options.type.trim() === '') {
                throw new Error('type must be a non-empty string');
            }
            conditions.push('type = ?');
            params.push(options.type.trim());
        }
        
        // STEP 3: FILTER BY canBeOccupied
        if (options.canBeOccupied !== undefined) {
            if (options.canBeOccupied !== 0 && options.canBeOccupied !== 1) {
                throw new Error('canBeOccupied must be 0 or 1');
            }
            conditions.push('canBeOccupied = ?');
            params.push(options.canBeOccupied);
        }
        
        // STEP 4: FILTER BY ACTIVE STATUS
        if (options.isActive !== undefined) {
            if (options.isActive !== 0 && options.isActive !== 1) {
                throw new Error('isActive must be 0 or 1');
            }
            conditions.push('isActive = ?');
            params.push(options.isActive);
        }
        
        // STEP 5: FILTER BY MINIMUM CAPACITY
        if (options.minCapacityL !== undefined) {
            if (typeof options.minCapacityL !== 'number' || options.minCapacityL <= 0) {
                throw new Error('minCapacityL must be a positive number');
            }
            conditions.push('capacityL >= ?');
            params.push(options.minCapacityL);
        }
        
        // STEP 6: FILTER BY MAXIMUM CAPACITY
        if (options.maxCapacityL !== undefined) {
            if (typeof options.maxCapacityL !== 'number' || options.maxCapacityL <= 0) {
                throw new Error('maxCapacityL must be a positive number');
            }
            conditions.push('capacityL <= ?');
            params.push(options.maxCapacityL);
        }
        
        // STEP 7: ADD WHERE CLAUSE IF FILTERS EXIST
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        // STEP 8: ADD ORDERING
        sql += ' ORDER BY type ASC, name ASC';
        
        console.log(`Fetching equipment with query: ${sql}`);
        
        // STEP 9: EXECUTE QUERY
        const result = db.exec(sql, params);
        const equipment = resultToObjects(result);
        
        // STEP 10: RETURN RESULTS
        console.log(`Found ${equipment.length} equipment items`);
        return equipment;
        
    } catch (error) {
        console.error('Failed to fetch equipment:', error.message);
        throw new Error(`Failed to fetch equipment: ${error.message}`);
    }
}

/**
 * Update equipment
 * 
 * Updates only the provided fields. Other fields remain unchanged.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} equipmentID - Equipment to update
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - New name
 * @param {string} [updates.type] - New type
 * @param {number} [updates.canBeOccupied] - New occupancy tracking status (0 or 1)
 * @param {number} [updates.capacityL] - New capacity
 * @param {string} [updates.material] - New material
 * @param {string} [updates.notes] - New notes
 * @returns {Object} { success: boolean, message: string, updatedFields: array }
 * @throws {Error} If validation fails
 * 
 * @example
 * const result = updateEquipment(db, 5, {
 *     capacityL: 30,
 *     notes: "Upgraded to larger bucket"
 * });
 */
function updateEquipment(db, equipmentID, updates) {
    // STEP 1: VALIDATE EQUIPMENT ID
    if (typeof equipmentID !== 'number' || equipmentID <= 0) {
        throw new Error('Invalid equipment ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF EQUIPMENT EXISTS
    const equipment = getEquipment(db, equipmentID);
    if (!equipment) {
        throw new Error(`Equipment ID ${equipmentID} does not exist`);
    }
    
    // STEP 3: VALIDATE FIELDS
    
    // Validate name (if provided)
    if ('name' in updates && (!updates.name || updates.name.trim() === '')) {
        throw new Error('Equipment name cannot be empty');
    }
    
    // Validate type (if provided)
    if ('type' in updates && (!updates.type || updates.type.trim() === '')) {
        throw new Error('Equipment type cannot be empty');
    }
    
    // Validate canBeOccupied (if provided)
    if ('canBeOccupied' in updates) {
        if (updates.canBeOccupied !== 0 && updates.canBeOccupied !== 1) {
            throw new Error('canBeOccupied must be 0 or 1');
        }
    }
    
    // Validate capacityL (if provided)
    if ('capacityL' in updates && updates.capacityL !== null) {
        if (typeof updates.capacityL !== 'number' || updates.capacityL <= 0) {
            throw new Error('Capacity must be a positive number or null');
        }
    }
    
    // STEP 4: FILTER TO ALLOWED FIELDS
    const allowedFields = ['name', 'type', 'canBeOccupied', 'capacityL', 'material', 'notes'];
    
    const filteredUpdates = {};
    const unauthorizedFields = [];
    
    for (const key of Object.keys(updates)) {
        if (allowedFields.includes(key)) {
            filteredUpdates[key] = updates[key];
        } else {
            unauthorizedFields.push(key);
        }
    }
    
    if (unauthorizedFields.length > 0) {
        console.warn(`Attempted to update unauthorized fields: ${unauthorizedFields.join(', ')}`);
    }
    
    if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
    }
    
    // STEP 5: PREPARE DATA AND BUILD SQL
    const setClauses = [];
    const values = [];
    
    for (const [key, value] of Object.entries(filteredUpdates)) {
        if (key === 'name' || key === 'type' || key === 'material' || key === 'notes') {
            // String fields - trim or set to null
            setClauses.push(`${key} = ?`);
            values.push(value ? value.trim() : null);
        } else {
            // Number fields (canBeOccupied, capacityL) - use as-is
            setClauses.push(`${key} = ?`);
            values.push(value);
        }
    }
    
    const sql = `UPDATE equipment SET ${setClauses.join(', ')} WHERE equipmentID = ?`;
    values.push(equipmentID);
    
    try {
        // STEP 6: EXECUTE UPDATE
        db.run(sql, values);
        
        console.log(`Equipment ${equipmentID} updated successfully`);
        
        // STEP 7: RETURN SUCCESS
        return {
            success: true,
            message: `Equipment "${equipment.name}" updated successfully`,
            updatedFields: Object.entries(filteredUpdates).map(([key, value]) => ({
                field: key,
                newValue: value
            }))
        };
        
    } catch (error) {
        console.error('Failed to update equipment:', error.message);
        throw new Error(`Failed to update equipment: ${error.message}`);
    }
}

/**
 * Set equipment active status
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} equipmentID - Equipment to update
 * @param {number} isActive - New status (1 = active, 0 = inactive/retired)
 * @returns {Object} { success: boolean, message: string }
 * @throws {Error} If validation fails
 * 
 * @example
 * // Retire broken equipment
 * setEquipmentStatus(db, 5, 0);
 * 
 * @example
 * // Reactivate repaired equipment
 * setEquipmentStatus(db, 5, 1);
 */
function setEquipmentStatus(db, equipmentID, isActive) {
    // STEP 1: VALIDATE EQUIPMENT ID
    if (typeof equipmentID !== 'number' || equipmentID <= 0) {
        throw new Error('Invalid equipment ID (must be positive number)');
    }
    
    // STEP 2: VALIDATE isActive
    if (isActive !== 0 && isActive !== 1) {
        throw new Error('isActive must be 0 or 1');
    }
    
    // STEP 3: CHECK IF EQUIPMENT EXISTS
    const equipment = getEquipment(db, equipmentID);
    if (!equipment) {
        throw new Error(`Equipment ID ${equipmentID} does not exist`);
    }
    
    // STEP 4: CHECK IF ALREADY AT DESIRED STATUS
    if (equipment.isActive === isActive) {
        const status = isActive === 1 ? 'active' : 'inactive';
        return {
            success: true,
            message: `Equipment "${equipment.name}" is already ${status}`
        };
    }
    
    try {
        // STEP 5: UPDATE STATUS
        _updateActiveStatus(db, 'equipment', 'equipmentID', equipmentID, isActive);
        
        const status = isActive === 1 ? 'activated' : 'deactivated';
        console.log(`Equipment "${equipment.name}" ${status}`);
        
        // STEP 6: RETURN SUCCESS
        return {
            success: true,
            message: `Equipment "${equipment.name}" ${status} successfully`
        };
        
    } catch (error) {
        console.error('Failed to update equipment status:', error.message);
        throw new Error(`Failed to update equipment status: ${error.message}`);
    }
}

// ============================================
// EQUIPMENT OCCUPANCY FUNCTIONS
// ============================================

/**
 * Get available equipment (not currently in use)
 * 
 * Returns equipment that is either:
 * 1. Never been used (no usage records)
 * 2. Previously used but now released (status: "available")
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} [options] - Filter options
 * @param {string} [options.type] - Filter by equipment type
 * @param {number} [options.minCapacityL] - Minimum capacity needed
 * @param {number} [options.maxCapacityL] - Maximum capacity needed
 * @param {number} [options.canBeOccupied] - Only show occupancy-tracked equipment (1) or all (undefined)
 * @returns {Array} Array of available equipment objects
 * @throws {Error} If validation fails
 * 
 * @example
 * // Find any available fermenter
 * const fermenters = getAvailableEquipment(db, { type: "fermenter" });
 * 
 * @example
 * // Find available fermenter with 20-30L capacity
 * const fermenter = getAvailableEquipment(db, {
 *     type: "fermenter",
 *     minCapacityL: 20,
 *     maxCapacityL: 30
 * });
 * 
 * @example
 * // Find all available batch-occupying equipment
 * const occupiable = getAvailableEquipment(db, { canBeOccupied: 1 });
 */
function getAvailableEquipment(db, options = {}) {
    try {
        // STEP 1: BUILD BASE QUERY
        // Get equipment that either:
        // - Has no usage records (never used)
        // - Has most recent usage record with status = "available"
        let sql = `
            SELECT e.*
            FROM equipment e
            LEFT JOIN (
                SELECT equipmentID, status, 
                       ROW_NUMBER() OVER (PARTITION BY equipmentID ORDER BY inUseDate DESC) as rn
                FROM equipmentUsage
            ) latest ON e.equipmentID = latest.equipmentID AND latest.rn = 1
            WHERE e.isActive = 1
            AND (latest.status IS NULL OR latest.status = 'available')
        `;
        
        const conditions = [];
        const params = [];
        
        // STEP 2: FILTER BY TYPE
        if (options.type !== undefined) {
            if (typeof options.type !== 'string' || options.type.trim() === '') {
                throw new Error('type must be a non-empty string');
            }
            conditions.push('e.type = ?');
            params.push(options.type.trim());
        }
        
        // STEP 3: FILTER BY canBeOccupied
        if (options.canBeOccupied !== undefined) {
            if (options.canBeOccupied !== 0 && options.canBeOccupied !== 1) {
                throw new Error('canBeOccupied must be 0 or 1');
            }
            conditions.push('e.canBeOccupied = ?');
            params.push(options.canBeOccupied);
        }
        
        // STEP 4: FILTER BY MINIMUM CAPACITY
        if (options.minCapacityL !== undefined) {
            if (typeof options.minCapacityL !== 'number' || options.minCapacityL <= 0) {
                throw new Error('minCapacityL must be a positive number');
            }
            conditions.push('e.capacityL >= ?');
            params.push(options.minCapacityL);
        }
        
        // STEP 5: FILTER BY MAXIMUM CAPACITY
        if (options.maxCapacityL !== undefined) {
            if (typeof options.maxCapacityL !== 'number' || options.maxCapacityL <= 0) {
                throw new Error('maxCapacityL must be a positive number');
            }
            conditions.push('e.capacityL <= ?');
            params.push(options.maxCapacityL);
        }
        
        // STEP 6: ADD ADDITIONAL CONDITIONS
        if (conditions.length > 0) {
            sql += ' AND ' + conditions.join(' AND ');
        }
        
        // STEP 7: ADD ORDERING
        sql += ' ORDER BY e.type ASC, e.name ASC';
        
        console.log(`Fetching available equipment with query: ${sql}`);
        
        // STEP 8: EXECUTE QUERY
        const result = db.exec(sql, params);
        const equipment = resultToObjects(result);
        
        // STEP 9: RETURN RESULTS
        console.log(`Found ${equipment.length} available equipment items`);
        return equipment;
        
    } catch (error) {
        console.error('Failed to fetch available equipment:', error.message);
        throw new Error(`Failed to fetch available equipment: ${error.message}`);
    }
}

/**
 * Assign equipment to a batch stage
 * 
 * Marks equipment as "in-use" for a specific batch stage.
 * Only applies to equipment where canBeOccupied = 1.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} equipmentID - Equipment to assign
 * @param {number} batchStageID - Batch stage to assign equipment to
 * @param {string} [inUseDate] - When equipment was assigned (default: now)
 * @returns {Object} { success: boolean, usageID: number, message: string }
 * @throws {Error} If validation fails or equipment unavailable
 * 
 * @example
 * // Assign fermenter to fermentation stage
 * const result = assignEquipmentToStage(db, 5, 12);
 * // Returns: { success: true, usageID: 8, message: "..." }
 * 
 * @example
 * // Assign with specific date (backdating)
 * const result = assignEquipmentToStage(db, 5, 12, "2025-11-20 10:00:00");
 */
function assignEquipmentToStage(db, equipmentID, batchStageID, inUseDate = null) {
    // STEP 1: VALIDATE EQUIPMENT ID
    if (typeof equipmentID !== 'number' || equipmentID <= 0) {
        throw new Error('Invalid equipment ID (must be positive number)');
    }
    
    // STEP 2: VALIDATE BATCH STAGE ID
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    // STEP 3: CHECK IF EQUIPMENT EXISTS
    const equipment = getEquipment(db, equipmentID);
    if (!equipment) {
        throw new Error(`Equipment ID ${equipmentID} does not exist`);
    }
    
    // STEP 4: CHECK IF EQUIPMENT IS ACTIVE
    if (equipment.isActive === 0) {
        throw new Error(`Equipment "${equipment.name}" is not active`);
    }
    
    // STEP 5: CHECK IF EQUIPMENT CAN BE OCCUPIED
    if (equipment.canBeOccupied !== 1) {
        throw new Error(`Equipment "${equipment.name}" cannot be occupied (canBeOccupied = 0)`);
    }
    
    // STEP 6: CHECK IF BATCH STAGE EXISTS
    const stageSql = `SELECT batchStageID, stageName FROM batchStages WHERE batchStageID = ?`;
    const stageResult = db.exec(stageSql, [batchStageID]);
    
    if (stageResult.length === 0 || stageResult[0].values.length === 0) {
        throw new Error(`Batch stage ID ${batchStageID} does not exist`);
    }
    
    const stageName = stageResult[0].values[0][1];
    
    // STEP 7: CHECK IF EQUIPMENT IS CURRENTLY IN USE
    const checkSql = `
        SELECT usageID, status 
        FROM equipmentUsage 
        WHERE equipmentID = ? 
        ORDER BY inUseDate DESC 
        LIMIT 1
    `;
    const checkResult = db.exec(checkSql, [equipmentID]);
    
    if (checkResult.length > 0 && checkResult[0].values.length > 0) {
        const latestStatus = checkResult[0].values[0][1];
        if (latestStatus === 'in-use') {
            throw new Error(`Equipment "${equipment.name}" is currently in use. Release it first before reassigning.`);
        }
    }
    
    // STEP 8: VALIDATE inUseDate FORMAT (if provided)
    if (inUseDate !== null) {
        if (typeof inUseDate !== 'string') {
            throw new Error('inUseDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)');
        }
    }
    
    try {
        // STEP 9: INSERT USAGE RECORD
        const sql = `
            INSERT INTO equipmentUsage (equipmentID, batchStageID, inUseDate, status)
            VALUES (?, ?, ?, 'in-use')
        `;
        
        const dateValue = inUseDate || db.exec("SELECT DATETIME('now')")[0].values[0][0];
        
        db.run(sql, [equipmentID, batchStageID, dateValue]);
        
        // STEP 10: GET THE NEW USAGE ID
        const [[usageID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`Equipment "${equipment.name}" assigned to stage "${stageName}": usage ID ${usageID}`);
        
        // STEP 11: RETURN SUCCESS
        return {
            success: true,
            usageID: usageID,
            message: `Equipment "${equipment.name}" assigned to stage "${stageName}"`
        };
        
    } catch (error) {
        console.error('Failed to assign equipment:', error.message);
        throw new Error(`Failed to assign equipment: ${error.message}`);
    }
}

/**
 * Release equipment from a batch stage
 * 
 * Marks equipment as "available" by setting releaseDate and updating status.
 * Frees the equipment for use in other batch stages.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} equipmentID - Equipment to release
 * @param {number} batchStageID - Batch stage to release equipment from
 * @param {string} [releaseDate] - When equipment was released (default: now)
 * @returns {Object} { success: boolean, message: string }
 * @throws {Error} If validation fails or equipment not assigned to this stage
 * 
 * @example
 * // Release fermenter from fermentation stage
 * const result = releaseEquipmentFromStage(db, 5, 12);
 * // Returns: { success: true, message: "..." }
 * 
 * @example
 * // Release with specific date (backdating)
 * const result = releaseEquipmentFromStage(db, 5, 12, "2025-11-20 14:30:00");
 */
function releaseEquipmentFromStage(db, equipmentID, batchStageID, releaseDate = null) {
    // STEP 1: VALIDATE EQUIPMENT ID
    if (typeof equipmentID !== 'number' || equipmentID <= 0) {
        throw new Error('Invalid equipment ID (must be positive number)');
    }
    
    // STEP 2: VALIDATE BATCH STAGE ID
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    // STEP 3: CHECK IF EQUIPMENT EXISTS
    const equipment = getEquipment(db, equipmentID);
    if (!equipment) {
        throw new Error(`Equipment ID ${equipmentID} does not exist`);
    }
    
    // STEP 4: CHECK IF BATCH STAGE EXISTS
    const stageSql = `SELECT batchStageID, stageName FROM batchStages WHERE batchStageID = ?`;
    const stageResult = db.exec(stageSql, [batchStageID]);
    
    if (stageResult.length === 0 || stageResult[0].values.length === 0) {
        throw new Error(`Batch stage ID ${batchStageID} does not exist`);
    }
    
    const stageName = stageResult[0].values[0][1];
    
    // STEP 5: FIND ACTIVE USAGE RECORD FOR THIS EQUIPMENT + STAGE
    const usageSql = `
        SELECT usageID, status, releaseDate
        FROM equipmentUsage
        WHERE equipmentID = ? AND batchStageID = ?
        ORDER BY inUseDate DESC
        LIMIT 1
    `;
    const usageResult = db.exec(usageSql, [equipmentID, batchStageID]);
    
    if (usageResult.length === 0 || usageResult[0].values.length === 0) {
        throw new Error(`Equipment "${equipment.name}" is not assigned to stage "${stageName}"`);
    }
    
    const [usageID, status, currentReleaseDate] = usageResult[0].values[0];
    
    // STEP 6: CHECK IF ALREADY RELEASED
    if (status === 'available' && currentReleaseDate !== null) {
        return {
            success: true,
            message: `Equipment "${equipment.name}" was already released from stage "${stageName}" on ${currentReleaseDate}`
        };
    }
    
    // STEP 7: VALIDATE releaseDate FORMAT (if provided)
    if (releaseDate !== null) {
        if (typeof releaseDate !== 'string') {
            throw new Error('releaseDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)');
        }
    }
    
    try {
        // STEP 8: UPDATE USAGE RECORD
        const updateSql = `
            UPDATE equipmentUsage 
            SET releaseDate = ?, status = 'available'
            WHERE usageID = ?
        `;
        
        const dateValue = releaseDate || db.exec("SELECT DATETIME('now')")[0].values[0][0];
        
        db.run(updateSql, [dateValue, usageID]);
        
        console.log(`Equipment "${equipment.name}" released from stage "${stageName}"`);
        
        // STEP 9: RETURN SUCCESS
        return {
            success: true,
            message: `Equipment "${equipment.name}" released from stage "${stageName}" and is now available`
        };
        
    } catch (error) {
        console.error('Failed to release equipment:', error.message);
        throw new Error(`Failed to release equipment: ${error.message}`);
    }
}

/**
 * Get equipment assigned to a batch stage
 * 
 * Returns all equipment currently assigned to a specific batch stage.
 * Useful for viewing what equipment a stage is using.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchStageID - Batch stage to get equipment for
 * @param {Object} [options] - Filter options
 * @param {string} [options.status] - Filter by status ("in-use" or "available")
 * @returns {Array} Array of equipment objects with usage details
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get all equipment for fermentation stage
 * const equipment = getEquipmentForStage(db, 12);
 * // Returns: [
 * //   { equipmentID: 5, name: "Primary Fermenter #1", inUseDate: "...", status: "in-use" },
 * //   { equipmentID: 8, name: "TILT Blue", inUseDate: "...", status: "in-use" }
 * // ]
 * 
 * @example
 * // Get only currently in-use equipment for this stage
 * const activeEquipment = getEquipmentForStage(db, 12, { status: "in-use" });
 */
function getEquipmentForStage(db, batchStageID, options = {}) {
    // STEP 1: VALIDATE BATCH STAGE ID
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    try {
        // STEP 2: BUILD BASE QUERY
        let sql = `
            SELECT 
                e.*,
                eu.usageID,
                eu.inUseDate,
                eu.releaseDate,
                eu.status as usageStatus
            FROM equipment e
            JOIN equipmentUsage eu ON e.equipmentID = eu.equipmentID
            WHERE eu.batchStageID = ?
        `;
        
        const params = [batchStageID];
        
        // STEP 3: FILTER BY STATUS (if provided)
        if (options.status !== undefined) {
            const validStatuses = ['in-use', 'available'];
            if (!validStatuses.includes(options.status)) {
                throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }
            sql += ' AND eu.status = ?';
            params.push(options.status);
        }
        
        // STEP 4: ORDER BY IN-USE DATE
        sql += ' ORDER BY eu.inUseDate DESC';
        
        console.log(`Fetching equipment for batch stage ${batchStageID}`);
        
        // STEP 5: EXECUTE QUERY
        const result = db.exec(sql, params);
        const equipment = resultToObjects(result);
        
        // STEP 6: RETURN RESULTS
        console.log(`Found ${equipment.length} equipment items for stage`);
        return equipment;
        
    } catch (error) {
        console.error('Failed to fetch equipment for stage:', error.message);
        throw new Error(`Failed to fetch equipment for stage: ${error.message}`);
    }
}

/**
 * Get current usage information for equipment
 * 
 * Returns the batch stage currently using this equipment (if any).
 * Useful for checking "what's using this fermenter right now?"
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} equipmentID - Equipment to check
 * @returns {Object|null} Current usage object with batch/stage info, or null if not in use
 * @throws {Error} If validation fails
 * 
 * @example
 * const usage = getEquipmentCurrentUsage(db, 5);
 * if (usage) {
 *     console.log(usage.batchName);      // "Traditional Mead"
 *     console.log(usage.stageName);      // "Fermentation"
 *     console.log(usage.inUseDate);      // "2025-11-20 10:00:00"
 *     console.log(usage.status);         // "in-use"
 * } else {
 *     console.log("Equipment is available");
 * }
 */
function getEquipmentCurrentUsage(db, equipmentID) {
    // STEP 1: VALIDATE EQUIPMENT ID
    if (typeof equipmentID !== 'number' || equipmentID <= 0) {
        throw new Error('Invalid equipment ID (must be positive number)');
    }
    
    try {
        // STEP 2: QUERY FOR CURRENT USAGE
        // Get the most recent usage record with status "in-use"
        const sql = `
            SELECT 
                eu.usageID,
                eu.equipmentID,
                eu.batchStageID,
                eu.inUseDate,
                eu.releaseDate,
                eu.status,
                bs.stageName,
                bs.stageOrder,
                b.batchID,
                b.name as batchName,
                b.recipeName
            FROM equipmentUsage eu
            JOIN batchStages bs ON eu.batchStageID = bs.batchStageID
            JOIN batches b ON bs.batchID = b.batchID
            WHERE eu.equipmentID = ?
            AND eu.status = 'in-use'
            ORDER BY eu.inUseDate DESC
            LIMIT 1
        `;
        
        const result = db.exec(sql, [equipmentID]);
        const usage = resultToObjects(result);
        
        // STEP 3: RETURN RESULT
        if (usage.length === 0) {
            console.log(`Equipment ${equipmentID} is not currently in use`);
            return null;
        }
        
        console.log(`Equipment ${equipmentID} is in use by batch ${usage[0].batchName}, stage ${usage[0].stageName}`);
        return usage[0];
        
    } catch (error) {
        console.error('Failed to fetch equipment current usage:', error.message);
        throw new Error(`Failed to fetch equipment current usage: ${error.message}`);
    }
}

export {
    createEquipment,
    getEquipment,
    getAllEquipment,
    updateEquipment,
    setEquipmentStatus,
    getAvailableEquipment,
    assignEquipmentToStage,
    releaseEquipmentFromStage,
    getEquipmentForStage,
    getEquipmentCurrentUsage
};
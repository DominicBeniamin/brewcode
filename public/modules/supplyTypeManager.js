// supplyTypeManager.js - Supply type management

import { resultToObjects, _updateActiveStatus } from './helpers.js';

// ============================================
// SUPPLY TYPE FUNCTIONS
// ============================================

/**
 * Create a new supply type
 * 
 * Supply types are generic templates (e.g., "Bottle (750ml)", "Sanitizer")
 * that categorize consumable supplies used for (not in) fermentation.
 * Items are specific instances of types (e.g., "Bordeaux 750ml", "Star San 32oz").
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} supplyTypeData - Supply type information
 * @param {number} supplyTypeData.categoryID - Category this belongs to (required)
 * @param {string} supplyTypeData.name - Type name (required, must be unique)
 * @param {string} [supplyTypeData.description] - Description (optional)
 * @returns {Object} Created supply type object with supplyTypeID
 * @throws {Error} If validation fails
 * 
 * @example
 * const type = createSupplyType(db, {
 *     categoryID: 21,
 *     name: "Bottle (750ml Wine, Bordeaux)",
 *     description: "Standard wine bottle, Bordeaux shape"
 * });
 */
function createSupplyType(db, supplyTypeData) {
    // STEP 1: VALIDATE REQUIRED FIELDS
    if (!supplyTypeData.name || supplyTypeData.name.trim() === '') {
        throw new Error('Supply type name is required');
    }
    
    if (!supplyTypeData.categoryID || typeof supplyTypeData.categoryID !== 'number') {
        throw new Error('Valid categoryID is required');
    }
    
    // STEP 2: VALIDATE CATEGORY EXISTS
    const categorySql = `SELECT categoryID FROM itemCategories WHERE categoryID = ?`;
    const categoryResult = db.exec(categorySql, [supplyTypeData.categoryID]);
    
    if (categoryResult.length === 0 || categoryResult[0].values.length === 0) {
        throw new Error(`Category ID ${supplyTypeData.categoryID} does not exist`);
    }
    
    // STEP 3: PREPARE DATA
    const supplyType = {
        categoryID: supplyTypeData.categoryID,
        name: supplyTypeData.name.trim(),
        description: supplyTypeData.description?.trim() || null
    };
    
    try {
        // STEP 4: INSERT SUPPLY TYPE
        const sql = `
            INSERT INTO supplyTypes (categoryID, name, description)
            VALUES (?, ?, ?)
        `;
        
        db.run(sql, [
            supplyType.categoryID,
            supplyType.name,
            supplyType.description
        ]);
        
        // STEP 5: GET THE NEW SUPPLY TYPE ID
        const [[supplyTypeID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`Supply type created successfully: ID ${supplyTypeID}`);
        
        // STEP 6: RETURN COMPLETE OBJECT
        return {
            supplyTypeID: supplyTypeID,
            categoryID: supplyType.categoryID,
            name: supplyType.name,
            description: supplyType.description,
            isActive: 1
        };
        
    } catch (error) {
        console.error('Failed to create supply type:', error.message);
        throw new Error(`Failed to create supply type: ${error.message}`);
    }
}

/**
 * Get a single supply type by ID
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} supplyTypeID - ID of the supply type to retrieve
 * @returns {Object|null} Supply type object, or null if not found
 * @throws {Error} If supplyTypeID is invalid
 */
function getSupplyType(db, supplyTypeID) {
    if (typeof supplyTypeID !== 'number' || supplyTypeID <= 0) {
        throw new Error('Invalid supply type ID (must be positive number)');
    }
    
    try {
        const sql = `SELECT * FROM supplyTypes WHERE supplyTypeID = ?`;
        const result = db.exec(sql, [supplyTypeID]);
        const supplyTypes = resultToObjects(result);
        
        if (supplyTypes.length === 0) {
            return null;
        }
        
        return supplyTypes[0];
        
    } catch (error) {
        console.error('Failed to fetch supply type:', error.message);
        throw new Error(`Failed to fetch supply type: ${error.message}`);
    }
}

/**
 * Get all supply types with optional filters
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} [options] - Filter options
 * @param {number} [options.categoryID] - Filter by category
 * @param {number} [options.isActive] - Filter by active status (0 or 1)
 * @returns {Array} Array of supply type objects
 * @throws {Error} If validation fails
 */
function getAllSupplyTypes(db, options = {}) {
    try {
        let sql = 'SELECT * FROM supplyTypes';
        const conditions = [];
        const params = [];
        
        if (options.categoryID !== undefined) {
            if (typeof options.categoryID !== 'number' || options.categoryID <= 0) {
                throw new Error('categoryID must be a positive number');
            }
            conditions.push('categoryID = ?');
            params.push(options.categoryID);
        }
        
        if (options.isActive !== undefined) {
            if (options.isActive !== 0 && options.isActive !== 1) {
                throw new Error('isActive must be 0 or 1');
            }
            conditions.push('isActive = ?');
            params.push(options.isActive);
        }
        
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        sql += ' ORDER BY name ASC';
        
        const result = db.exec(sql, params);
        const supplyTypes = resultToObjects(result);
        
        console.log(`Found ${supplyTypes.length} supply types`);
        return supplyTypes;
        
    } catch (error) {
        console.error('Failed to fetch supply types:', error.message);
        throw new Error(`Failed to fetch supply types: ${error.message}`);
    }
}

/**
 * Update a supply type
 * 
 * Updates only the provided fields. Other fields remain unchanged.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} supplyTypeID - Supply type to update
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - New name
 * @param {string} [updates.description] - New description
 * @param {number} [updates.categoryID] - New category
 * @returns {Object} { success: boolean, message: string, updatedFields: array }
 * @throws {Error} If validation fails
 */
function updateSupplyType(db, supplyTypeID, updates) {
    if (typeof supplyTypeID !== 'number' || supplyTypeID <= 0) {
        throw new Error('Invalid supply type ID (must be positive number)');
    }
    
    const supplyType = getSupplyType(db, supplyTypeID);
    if (!supplyType) {
        throw new Error(`Supply type ID ${supplyTypeID} does not exist`);
    }
    
    if ('name' in updates && (!updates.name || updates.name.trim() === '')) {
        throw new Error('Name cannot be empty');
    }
    
    if ('categoryID' in updates) {
        if (typeof updates.categoryID !== 'number' || updates.categoryID <= 0) {
            throw new Error('categoryID must be a positive number');
        }
        
        const categorySql = `SELECT categoryID FROM itemCategories WHERE categoryID = ?`;
        const categoryResult = db.exec(categorySql, [updates.categoryID]);
        if (categoryResult.length === 0 || categoryResult[0].values.length === 0) {
            throw new Error(`Category ID ${updates.categoryID} does not exist`);
        }
    }
    
    const allowedFields = ['name', 'description', 'categoryID'];
    
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
    
    const setClauses = [];
    const values = [];
    
    for (const [key, value] of Object.entries(filteredUpdates)) {
        if (key === 'name' || key === 'description') {
            setClauses.push(`${key} = ?`);
            values.push(value ? value.trim() : null);
        } else {
            setClauses.push(`${key} = ?`);
            values.push(value);
        }
    }
    
    const sql = `UPDATE supplyTypes SET ${setClauses.join(', ')} WHERE supplyTypeID = ?`;
    values.push(supplyTypeID);
    
    try {
        db.run(sql, values);
        
        console.log(`Supply type ${supplyTypeID} updated successfully`);
        
        return {
            success: true,
            message: `Supply type "${supplyType.name}" updated successfully`,
            updatedFields: Object.entries(filteredUpdates).map(([key, value]) => ({
                field: key,
                newValue: value
            }))
        };
        
    } catch (error) {
        console.error('Failed to update supply type:', error.message);
        throw new Error(`Failed to update supply type: ${error.message}`);
    }
}

/**
 * Set supply type active status
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} supplyTypeID - Supply type to update
 * @param {number} isActive - New status (1 = active, 0 = inactive)
 * @returns {Object} { success: boolean, message: string }
 * @throws {Error} If validation fails
 */
function setSupplyTypeStatus(db, supplyTypeID, isActive) {
    if (typeof supplyTypeID !== 'number' || supplyTypeID <= 0) {
        throw new Error('Invalid supply type ID (must be positive number)');
    }
    
    if (isActive !== 0 && isActive !== 1) {
        throw new Error('isActive must be 0 or 1');
    }
    
    const supplyType = getSupplyType(db, supplyTypeID);
    if (!supplyType) {
        throw new Error(`Supply type ID ${supplyTypeID} does not exist`);
    }
    
    if (supplyType.isActive === isActive) {
        const status = isActive === 1 ? 'active' : 'inactive';
        return {
            success: true,
            message: `Supply type "${supplyType.name}" is already ${status}`
        };
    }
    
    try {
        _updateActiveStatus(db, 'supplyTypes', 'supplyTypeID', supplyTypeID, isActive);
        
        const status = isActive === 1 ? 'activated' : 'deactivated';
        console.log(`Supply type "${supplyType.name}" ${status}`);
        
        return {
            success: true,
            message: `Supply type "${supplyType.name}" ${status} successfully`
        };
        
    } catch (error) {
        console.error('Failed to update supply type status:', error.message);
        throw new Error(`Failed to update supply type status: ${error.message}`);
    }
}

export {
    createSupplyType,
    getSupplyType,
    getAllSupplyTypes,
    updateSupplyType,
    setSupplyTypeStatus
};
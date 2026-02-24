// subtypeManager.js - Ingredient subtype management

import { resultToObjects, _updateActiveStatus } from './helpers.js';

// ============================================
// INGREDIENT SUBTYPE FUNCTIONS
// ============================================

/**
 * Create a new ingredient subtype
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} subtypeData - Subtype information
 * @param {number} subtypeData.ingredientTypeID - Parent ingredient type ID (required)
 * @param {string} subtypeData.name - Subtype name (required)
 * @returns {Object} Created subtype object with ingredientSubtypeID
 * @throws {Error} If validation fails
 * 
 * @example
 * const subtype = createIngredientSubtype(db, {
 *     ingredientTypeID: 11, // Honey
 *     name: "Wildflower"
 * });
 */
function createIngredientSubtype(db, subtypeData) {
    // STEP 1: VALIDATE REQUIRED FIELDS
    if (!subtypeData.ingredientTypeID || typeof subtypeData.ingredientTypeID !== 'number') {
        throw new Error('ingredientTypeID is required and must be a number');
    }
    
    if (!subtypeData.name || subtypeData.name.trim() === '') {
        throw new Error('Subtype name is required');
    }
    
    // STEP 2: VERIFY PARENT TYPE EXISTS
    const typeCheckSql = `SELECT ingredientTypeID FROM ingredientTypes WHERE ingredientTypeID = ?`;
    const typeResult = db.exec(typeCheckSql, [subtypeData.ingredientTypeID]);
    
    if (!typeResult || typeResult.length === 0 || typeResult[0].values.length === 0) {
        throw new Error(`Ingredient type ID ${subtypeData.ingredientTypeID} does not exist`);
    }
    
    // STEP 3: CHECK FOR DUPLICATE NAME WITHIN TYPE
    const duplicateCheckSql = `
        SELECT ingredientSubtypeID 
        FROM ingredientSubtypes 
        WHERE ingredientTypeID = ? AND name = ?
    `;
    const duplicateResult = db.exec(duplicateCheckSql, [
        subtypeData.ingredientTypeID,
        subtypeData.name.trim()
    ]);
    
    if (duplicateResult && duplicateResult.length > 0 && duplicateResult[0].values.length > 0) {
        throw new Error(`Subtype "${subtypeData.name}" already exists for this ingredient type`);
    }
    
    try {
        // STEP 4: INSERT SUBTYPE
        const sql = `
            INSERT INTO ingredientSubtypes (ingredientTypeID, name)
            VALUES (?, ?)
        `;
        
        db.run(sql, [
            subtypeData.ingredientTypeID,
            subtypeData.name.trim()
        ]);
        
        // STEP 5: GET THE NEW SUBTYPE ID
        const [[ingredientSubtypeID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`Ingredient subtype created successfully: ID ${ingredientSubtypeID}`);
        
        // STEP 6: RETURN COMPLETE OBJECT
        return {
            ingredientSubtypeID: ingredientSubtypeID,
            ingredientTypeID: subtypeData.ingredientTypeID,
            name: subtypeData.name.trim(),
            isActive: 1
        };
        
    } catch (error) {
        console.error('Failed to create ingredient subtype:', error.message);
        throw new Error(`Failed to create ingredient subtype: ${error.message}`);
    }
}

/**
 * Get a single ingredient subtype by ID
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} ingredientSubtypeID - ID of the subtype to retrieve
 * @returns {Object|null} Subtype object or null if not found
 * @throws {Error} If ingredientSubtypeID is invalid
 */
function getIngredientSubtype(db, ingredientSubtypeID) {
    if (typeof ingredientSubtypeID !== 'number' || ingredientSubtypeID <= 0) {
        throw new Error('Invalid ingredientSubtypeID (must be positive number)');
    }
    
    try {
        const sql = `
            SELECT 
                ist.ingredientSubtypeID,
                ist.ingredientTypeID,
                ist.name,
                ist.isActive,
                it.name as typeName,
                it.categoryID
            FROM ingredientSubtypes ist
            JOIN ingredientTypes it ON ist.ingredientTypeID = it.ingredientTypeID
            WHERE ist.ingredientSubtypeID = ?
        `;
        
        const result = db.exec(sql, [ingredientSubtypeID]);
        const subtypes = resultToObjects(result);
        
        return subtypes.length > 0 ? subtypes[0] : null;
        
    } catch (error) {
        console.error('Failed to fetch ingredient subtype:', error.message);
        throw new Error(`Failed to fetch ingredient subtype: ${error.message}`);
    }
}

/**
 * Get all ingredient subtypes with optional filters
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} [options] - Filter options
 * @param {number} [options.ingredientTypeID] - Filter by parent type
 * @param {number} [options.categoryID] - Filter by category
 * @param {number} [options.isActive] - Filter by active status (0 or 1)
 * @returns {Array} Array of subtype objects
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get all active subtypes for Honey type
 * const honeySubtypes = getAllIngredientSubtypes(db, { 
 *     ingredientTypeID: 11, 
 *     isActive: 1 
 * });
 * 
 * @example
 * // Get all subtypes in Fruits & Juices category
 * const fruitSubtypes = getAllIngredientSubtypes(db, { 
 *     categoryID: 2 
 * });
 */
function getAllIngredientSubtypes(db, options = {}) {
    try {
        // STEP 1: BUILD BASE QUERY
        let sql = `
            SELECT 
                ist.ingredientSubtypeID,
                ist.ingredientTypeID,
                ist.name,
                ist.isActive,
                it.name as typeName,
                it.categoryID,
                ic.name as categoryName
            FROM ingredientSubtypes ist
            JOIN ingredientTypes it ON ist.ingredientTypeID = it.ingredientTypeID
            JOIN itemCategories ic ON it.categoryID = ic.categoryID
        `;
        
        const conditions = [];
        const params = [];
        
        // STEP 2: FILTER BY INGREDIENT TYPE
        if (options.ingredientTypeID !== undefined) {
            if (typeof options.ingredientTypeID !== 'number' || options.ingredientTypeID <= 0) {
                throw new Error('ingredientTypeID must be a positive number');
            }
            conditions.push('ist.ingredientTypeID = ?');
            params.push(options.ingredientTypeID);
        }
        
        // STEP 3: FILTER BY CATEGORY
        if (options.categoryID !== undefined) {
            if (typeof options.categoryID !== 'number' || options.categoryID <= 0) {
                throw new Error('categoryID must be a positive number');
            }
            conditions.push('it.categoryID = ?');
            params.push(options.categoryID);
        }
        
        // STEP 4: FILTER BY ACTIVE STATUS
        if (options.isActive !== undefined) {
            if (options.isActive !== 0 && options.isActive !== 1) {
                throw new Error('isActive must be 0 or 1');
            }
            conditions.push('ist.isActive = ?');
            params.push(options.isActive);
        }
        
        // STEP 5: ADD WHERE CLAUSE IF FILTERS EXIST
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        // STEP 6: ADD ORDERING
        sql += ' ORDER BY it.name ASC, ist.name ASC';
        
        console.log(`Fetching ingredient subtypes with query: ${sql}`);
        
        // STEP 7: EXECUTE QUERY
        const result = db.exec(sql, params);
        const subtypes = resultToObjects(result);
        
        console.log(`Found ${subtypes.length} ingredient subtypes`);
        return subtypes;
        
    } catch (error) {
        console.error('Failed to fetch ingredient subtypes:', error.message);
        throw new Error(`Failed to fetch ingredient subtypes: ${error.message}`);
    }
}

/**
 * Update an ingredient subtype
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} ingredientSubtypeID - Subtype to update
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - New subtype name
 * @returns {Object} { success: boolean, message: string, updatedFields: array }
 * @throws {Error} If validation fails
 * 
 * @example
 * const result = updateIngredientSubtype(db, 5, {
 *     name: "Orange Blossom"
 * });
 */
function updateIngredientSubtype(db, ingredientSubtypeID, updates) {
    // STEP 1: VALIDATE SUBTYPE ID
    if (typeof ingredientSubtypeID !== 'number' || ingredientSubtypeID <= 0) {
        throw new Error('Invalid ingredientSubtypeID (must be positive number)');
    }
    
    // STEP 2: CHECK IF SUBTYPE EXISTS
    const subtype = getIngredientSubtype(db, ingredientSubtypeID);
    if (!subtype) {
        throw new Error(`Ingredient subtype ID ${ingredientSubtypeID} does not exist`);
    }
    
    // STEP 3: VALIDATE NAME
    if ('name' in updates) {
        if (!updates.name || updates.name.trim() === '') {
            throw new Error('Subtype name cannot be empty');
        }
        
        // Check for duplicate name within same type
        const duplicateCheckSql = `
            SELECT ingredientSubtypeID 
            FROM ingredientSubtypes 
            WHERE ingredientTypeID = ? 
            AND name = ? 
            AND ingredientSubtypeID != ?
        `;
        const duplicateResult = db.exec(duplicateCheckSql, [
            subtype.ingredientTypeID,
            updates.name.trim(),
            ingredientSubtypeID
        ]);
        
        if (duplicateResult && duplicateResult.length > 0 && duplicateResult[0].values.length > 0) {
            throw new Error(`Subtype "${updates.name}" already exists for this ingredient type`);
        }
    }
    
    // STEP 4: FILTER TO ALLOWED FIELDS
    const allowedFields = ['name'];
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
    
    // STEP 5: BUILD SQL
    const setClauses = ['name = ?', 'updatedAt = CURRENT_TIMESTAMP'];
    const values = [filteredUpdates.name.trim(), ingredientSubtypeID];
    
    const sql = `UPDATE ingredientSubtypes SET ${setClauses.join(', ')} WHERE ingredientSubtypeID = ?`;
    
    try {
        // STEP 6: EXECUTE UPDATE
        db.run(sql, values);
        
        console.log(`Ingredient subtype ${ingredientSubtypeID} updated successfully`);
        
        // STEP 7: RETURN SUCCESS
        return {
            success: true,
            message: `Subtype "${subtype.name}" updated successfully`,
            updatedFields: Object.entries(filteredUpdates).map(([key, value]) => ({
                field: key,
                newValue: value
            }))
        };
        
    } catch (error) {
        console.error('Failed to update ingredient subtype:', error.message);
        throw new Error(`Failed to update ingredient subtype: ${error.message}`);
    }
}

/**
 * Set ingredient subtype active status
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} ingredientSubtypeID - Subtype to update
 * @param {number} isActive - New status (1 = active, 0 = inactive)
 * @returns {Object} { success: boolean, message: string }
 * @throws {Error} If validation fails
 */
function setIngredientSubtypeStatus(db, ingredientSubtypeID, isActive) {
    if (typeof ingredientSubtypeID !== 'number' || ingredientSubtypeID <= 0) {
        throw new Error('Invalid ingredientSubtypeID (must be positive number)');
    }
    
    if (isActive !== 0 && isActive !== 1) {
        throw new Error('isActive must be 0 or 1');
    }
    
    const subtype = getIngredientSubtype(db, ingredientSubtypeID);
    if (!subtype) {
        throw new Error(`Ingredient subtype ID ${ingredientSubtypeID} does not exist`);
    }
    
    if (subtype.isActive === isActive) {
        const status = isActive === 1 ? 'active' : 'inactive';
        return {
            success: true,
            message: `Subtype "${subtype.name}" is already ${status}`
        };
    }
    
    try {
        _updateActiveStatus(db, 'ingredientSubtypes', 'ingredientSubtypeID', ingredientSubtypeID, isActive);
        
        const status = isActive === 1 ? 'activated' : 'deactivated';
        console.log(`Ingredient subtype "${subtype.name}" ${status}`);
        
        return {
            success: true,
            message: `Subtype "${subtype.name}" ${status} successfully`
        };
        
    } catch (error) {
        console.error('Failed to update ingredient subtype status:', error.message);
        throw new Error(`Failed to update ingredient subtype status: ${error.message}`);
    }
}

export {
    createIngredientSubtype,
    getIngredientSubtype,
    getAllIngredientSubtypes,
    updateIngredientSubtype,
    setIngredientSubtypeStatus
};
// ingredientTypeManager.js - Ingredient type management

import { resultToObjects, _updateActiveStatus } from './helpers.js';

// ============================================
// INGREDIENT TYPE FUNCTIONS
// ============================================

/**
 * Create a new ingredient type
 * 
 * Ingredient types are generic templates (e.g., "Apple Juice", "Honey (Wildflower)")
 * that recipes reference. Items are specific instances of types (e.g., "K Classic Apfel Saft").
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} ingredientTypeData - Ingredient type information
 * @param {number} ingredientTypeData.categoryID - Category this belongs to (required)
 * @param {string} ingredientTypeData.name - Type name (required, must be unique)
 * @param {string} [ingredientTypeData.description] - Description (optional)
 * @param {Array} [ingredientTypeData.beverageTypes] - Array of beverage types (optional)
 * @param {number} [ingredientTypeData.isPrimaryRequired] - 1 if must be primary, 0 otherwise (optional, default: 0)
 * @returns {Object} Created ingredient type object with ingredientTypeID
 * @throws {Error} If validation fails
 * 
 * @example
 * const type = createIngredientType(db, {
 *     categoryID: 1,
 *     name: "Apple Juice",
 *     description: "Any apple juice (filtered or unfiltered)",
 *     beverageTypes: ["Cider"],
 *     isPrimaryRequired: 1
 * });
 */
function createIngredientType(db, ingredientTypeData) {
    // STEP 1: VALIDATE REQUIRED FIELDS
    if (!ingredientTypeData.name || ingredientTypeData.name.trim() === '') {
        throw new Error('Ingredient type name is required');
    }
    
    if (!ingredientTypeData.categoryID || typeof ingredientTypeData.categoryID !== 'number') {
        throw new Error('Valid categoryID is required');
    }
    
    // STEP 2: VALIDATE CATEGORY EXISTS
    const categorySql = `SELECT categoryID FROM itemCategories WHERE categoryID = ?`;
    const categoryResult = db.exec(categorySql, [ingredientTypeData.categoryID]);
    
    if (categoryResult.length === 0 || categoryResult[0].values.length === 0) {
        throw new Error(`Category ID ${ingredientTypeData.categoryID} does not exist`);
    }
    
    // STEP 3: VALIDATE BEVERAGE TYPES (if provided)
    if (ingredientTypeData.beverageTypes !== undefined && !Array.isArray(ingredientTypeData.beverageTypes)) {
        throw new Error('beverageTypes must be an array');
    }
    
    // STEP 4: VALIDATE isPrimaryRequired (if provided)
    if (ingredientTypeData.isPrimaryRequired !== undefined) {
        if (ingredientTypeData.isPrimaryRequired !== 0 && ingredientTypeData.isPrimaryRequired !== 1) {
            throw new Error('isPrimaryRequired must be 0 or 1');
        }
    }
    
    // STEP 5: PREPARE DATA
    const ingredientType = {
        categoryID: ingredientTypeData.categoryID,
        name: ingredientTypeData.name.trim(),
        description: ingredientTypeData.description?.trim() || null,
        beverageTypes: ingredientTypeData.beverageTypes ? JSON.stringify(ingredientTypeData.beverageTypes) : null,
        isPrimaryRequired: ingredientTypeData.isPrimaryRequired ?? 0
    };
    
    try {
        // STEP 6: INSERT INGREDIENT TYPE
        const sql = `
            INSERT INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [
            ingredientType.categoryID,
            ingredientType.name,
            ingredientType.description,
            ingredientType.beverageTypes,
            ingredientType.isPrimaryRequired
        ]);
        
        // STEP 7: GET THE NEW INGREDIENT TYPE ID
        const [[ingredientTypeID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`Ingredient type created successfully: ID ${ingredientTypeID}`);
        
        // STEP 8: RETURN COMPLETE OBJECT
        return {
            ingredientTypeID: ingredientTypeID,
            categoryID: ingredientType.categoryID,
            name: ingredientType.name,
            description: ingredientType.description,
            beverageTypes: ingredientTypeData.beverageTypes || null,
            isPrimaryRequired: ingredientType.isPrimaryRequired,
            isActive: 1
        };
        
    } catch (error) {
        console.error('Failed to create ingredient type:', error.message);
        throw new Error(`Failed to create ingredient type: ${error.message}`);
    }
}

/**
 * Get a single ingredient type by ID
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} ingredientTypeID - ID of the ingredient type to retrieve
 * @returns {Object|null} Ingredient type object, or null if not found
 * @throws {Error} If ingredientTypeID is invalid
 */
function getIngredientType(db, ingredientTypeID) {
    if (typeof ingredientTypeID !== 'number' || ingredientTypeID <= 0) {
        throw new Error('Invalid ingredient type ID (must be positive number)');
    }
    
    try {
        const sql = `SELECT * FROM ingredientTypes WHERE ingredientTypeID = ?`;
        const result = db.exec(sql, [ingredientTypeID]);
        const ingredientTypes = resultToObjects(result);
        
        if (ingredientTypes.length === 0) {
            return null;
        }
        
        const ingredientType = ingredientTypes[0];
        
        if (ingredientType.beverageTypes) {
            ingredientType.beverageTypes = JSON.parse(ingredientType.beverageTypes);
        }
        
        return ingredientType;
        
    } catch (error) {
        console.error('Failed to fetch ingredient type:', error.message);
        throw new Error(`Failed to fetch ingredient type: ${error.message}`);
    }
}

/**
 * Get all ingredient types with optional filters
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} [options] - Filter options
 * @param {number} [options.categoryID] - Filter by category
 * @param {string} [options.beverageType] - Filter by beverage type (e.g., "Cider", "Mead")
 * @param {number} [options.isActive] - Filter by active status (0 or 1)
 * @returns {Array} Array of ingredient type objects
 * @throws {Error} If validation fails
 */
function getAllIngredientTypes(db, options = {}) {
    try {
        let sql = 'SELECT * FROM ingredientTypes';
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
        
        if (options.beverageType !== undefined) {
            if (typeof options.beverageType !== 'string' || options.beverageType.trim() === '') {
                throw new Error('beverageType must be a non-empty string');
            }
            conditions.push(`beverageTypes LIKE ?`);
            params.push(`%"${options.beverageType}"%`);
        }
        
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        sql += ' ORDER BY name ASC';
        
        const result = db.exec(sql, params);
        const ingredientTypes = resultToObjects(result);
        
        for (const ingredientType of ingredientTypes) {
            if (ingredientType.beverageTypes) {
                ingredientType.beverageTypes = JSON.parse(ingredientType.beverageTypes);
            }
        }
        
        console.log(`Found ${ingredientTypes.length} ingredient types`);
        return ingredientTypes;
        
    } catch (error) {
        console.error('Failed to fetch ingredient types:', error.message);
        throw new Error(`Failed to fetch ingredient types: ${error.message}`);
    }
}

/**
 * Update an ingredient type
 * 
 * Updates only the provided fields. Other fields remain unchanged.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} ingredientTypeID - Ingredient type to update
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - New name
 * @param {string} [updates.description] - New description
 * @param {number} [updates.categoryID] - New category
 * @param {Array} [updates.beverageTypes] - New beverage types array
 * @param {number} [updates.isPrimaryRequired] - New primary required status (0 or 1)
 * @returns {Object} { success: boolean, message: string, updatedFields: array }
 * @throws {Error} If validation fails
 */
function updateIngredientType(db, ingredientTypeID, updates) {
    if (typeof ingredientTypeID !== 'number' || ingredientTypeID <= 0) {
        throw new Error('Invalid ingredient type ID (must be positive number)');
    }
    
    const ingredientType = getIngredientType(db, ingredientTypeID);
    if (!ingredientType) {
        throw new Error(`Ingredient type ID ${ingredientTypeID} does not exist`);
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
    
    if ('beverageTypes' in updates && updates.beverageTypes !== null && !Array.isArray(updates.beverageTypes)) {
        throw new Error('beverageTypes must be an array or null');
    }
    
    if ('isPrimaryRequired' in updates) {
        if (updates.isPrimaryRequired !== 0 && updates.isPrimaryRequired !== 1) {
            throw new Error('isPrimaryRequired must be 0 or 1');
        }
    }
    
    const allowedFields = ['name', 'description', 'categoryID', 'beverageTypes', 'isPrimaryRequired'];
    
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
        } else if (key === 'beverageTypes') {
            setClauses.push(`${key} = ?`);
            values.push(value ? JSON.stringify(value) : null);
        } else {
            setClauses.push(`${key} = ?`);
            values.push(value);
        }
    }
    
    const sql = `UPDATE ingredientTypes SET ${setClauses.join(', ')} WHERE ingredientTypeID = ?`;
    values.push(ingredientTypeID);
    
    try {
        db.run(sql, values);
        
        console.log(`Ingredient type ${ingredientTypeID} updated successfully`);
        
        return {
            success: true,
            message: `Ingredient type "${ingredientType.name}" updated successfully`,
            updatedFields: Object.entries(filteredUpdates).map(([key, value]) => ({
                field: key,
                newValue: value
            }))
        };
        
    } catch (error) {
        console.error('Failed to update ingredient type:', error.message);
        throw new Error(`Failed to update ingredient type: ${error.message}`);
    }
}

/**
 * Set ingredient type active status
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} ingredientTypeID - Ingredient type to update
 * @param {number} isActive - New status (1 = active, 0 = inactive)
 * @returns {Object} { success: boolean, message: string }
 * @throws {Error} If validation fails
 */
function setIngredientTypeStatus(db, ingredientTypeID, isActive) {
    if (typeof ingredientTypeID !== 'number' || ingredientTypeID <= 0) {
        throw new Error('Invalid ingredient type ID (must be positive number)');
    }
    
    if (isActive !== 0 && isActive !== 1) {
        throw new Error('isActive must be 0 or 1');
    }
    
    const ingredientType = getIngredientType(db, ingredientTypeID);
    if (!ingredientType) {
        throw new Error(`Ingredient type ID ${ingredientTypeID} does not exist`);
    }
    
    if (ingredientType.isActive === isActive) {
        const status = isActive === 1 ? 'active' : 'inactive';
        return {
            success: true,
            message: `Ingredient type "${ingredientType.name}" is already ${status}`
        };
    }
    
    try {
        _updateActiveStatus(db, 'ingredientTypes', 'ingredientTypeID', ingredientTypeID, isActive);
        
        const status = isActive === 1 ? 'activated' : 'deactivated';
        console.log(`Ingredient type "${ingredientType.name}" ${status}`);
        
        return {
            success: true,
            message: `Ingredient type "${ingredientType.name}" ${status} successfully`
        };
        
    } catch (error) {
        console.error('Failed to update ingredient type status:', error.message);
        throw new Error(`Failed to update ingredient type status: ${error.message}`);
    }
}

export {
    createIngredientType,
    getIngredientType,
    getAllIngredientTypes,
    updateIngredientType,
    setIngredientTypeStatus
};
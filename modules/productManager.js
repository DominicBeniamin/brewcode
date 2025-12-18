// ingredientManager.js

import { resultToObjects, _updateActiveStatus } from './helpers.js';

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Create a new ingredient
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} ingredientData - ingredient information
 * @param {number} ingredientData.ingredientTypeID - Ingredient type this ingredient belongs to (required)
 * @param {string} ingredientData.name - ingredient name (required)
 * @param {string} [ingredientData.brand] - Brand name (optional, NULL for homemade)
 * @param {number} [ingredientData.packageSize] - Package size (optional)
 * @param {string} [ingredientData.packageUnit] - Package unit (optional, e.g., "L", "kg")
 * @param {string} [ingredientData.notes] - Additional notes (optional)
 * @returns {Object} Created ingredient object with ingredientID
 * @throws {Error} If validation fails
 * 
 * @example
 * // Fixed-size ingredient
 * const ingredient = createingredient(db, {
 *     ingredientTypeID: 1,
 *     brand: "K Classic",
 *     name: "Apfel Saft",
 *     packageSize: 1,
 *     packageUnit: "L",
 *     notes: "Available at Kaufland"
 * });
 * 
 * @example
 * // Variable-size ingredient (size recorded at inventory level)
 * const ingredient = createingredient(db, {
 *     ingredientTypeID: 1,
 *     brand: "Local Farm",
 *     name: "Fresh Pressed Apple Juice",
 *     notes: "From farmer's market - size varies"
 * });
 */
function createingredient(db, ingredientData) {
    console.log('ingredientManager.js - createingredient called');
    console.log('ingredientManager.js - ingredientData:', ingredientData);
    console.log('ingredientManager.js - ingredientData.name:', ingredientData.name);
    
    // STEP 1: VALIDATE REQUIRED FIELDS
    if (!ingredientData.name || ingredientData.name.trim() === '') {
        throw new Error('ingredient name is required');
    }
    
    if (!ingredientData.ingredientTypeID || typeof ingredientData.ingredientTypeID !== 'number') {
        throw new Error('Valid ingredientTypeID is required');
    }
    
    // STEP 2: VALIDATE INGREDIENT TYPE EXISTS
    const ingredientTypeSql = `SELECT ingredientTypeID, name, isActive FROM ingredientTypes WHERE ingredientTypeID = ?`;
    const ingredientTypeResult = db.exec(ingredientTypeSql, [ingredientData.ingredientTypeID]);
    
    if (ingredientTypeResult.length === 0 || ingredientTypeResult[0].values.length === 0) {
        throw new Error(`Ingredient type ID ${ingredientData.ingredientTypeID} does not exist`);
    }
    
    const ingredientTypeName = ingredientTypeResult[0].values[0][1];
    const isActive = ingredientTypeResult[0].values[0][2];
    
    if (isActive === 0) {
        console.warn(`Creating ingredient for inactive ingredient type: ${ingredientTypeName}`);
    }
    
    // STEP 3: VALIDATE PACKAGE SIZE AND UNIT
    if (ingredientData.packageSize !== undefined && ingredientData.packageSize !== null) {
        if (typeof ingredientData.packageSize !== 'number' || ingredientData.packageSize <= 0) {
            throw new Error('Package size must be a positive number');
        }
        
        if (!ingredientData.packageUnit || ingredientData.packageUnit.trim() === '') {
            throw new Error('Package unit is required when package size is provided');
        }
    }
    
    // STEP 4: PREPARE DATA
    const ingredient = {
        ingredientTypeID: ingredientData.ingredientTypeID,
        brand: ingredientData.brand?.trim() || null,
        name: ingredientData.name.trim(),
        packageSize: ingredientData.packageSize ?? null,
        packageUnit: ingredientData.packageUnit?.trim() || null,
        notes: ingredientData.notes?.trim() || null
    };
    
    try {
        // STEP 5: INSERT ingredient
        const sql = `
            INSERT INTO ingredients (ingredientTypeID, brand, name, packageSize, packageUnit, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.run(sql, [
            ingredient.ingredientTypeID,
            ingredient.brand,
            ingredient.name,
            ingredient.packageSize,
            ingredient.packageUnit,
            ingredient.notes
        ]);
        
        // STEP 6: GET THE NEW ingredient ID
        const [[ingredientID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`ingredient created successfully: ID ${ingredientID}`);
        
        // STEP 7: RETURN COMPLETE OBJECT
        return {
            ingredientID: ingredientID,
            ingredientTypeID: ingredient.ingredientTypeID,
            ingredientTypeName: ingredientTypeName,
            brand: ingredient.brand,
            name: ingredient.name,
            packageSize: ingredient.packageSize,
            packageUnit: ingredient.packageUnit,
            notes: ingredient.notes,
            isActive: 1
        };
        
    } catch (error) {
        console.error('Failed to create ingredient:', error.message);
        throw new Error(`Failed to create ingredient: ${error.message}`);
    }
}

/**
 * Get a single ingredient by ID
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} ingredientID - ID of the ingredient to retrieve
 * @returns {Object|null} ingredient object, or null if not found
 * @throws {Error} If ingredientID is invalid
 * 
 * @example
 * const ingredient = getingredient(db, 5);
 * if (ingredient) {
 *     console.log(ingredient.brand);    // "K Classic"
 *     console.log(ingredient.name);  // "Apfel Saft"
 * } else {
 *     console.log("ingredient not found");
 * }
 */
function getingredient(db, ingredientID) {
    // STEP 1: VALIDATE ingredient ID
    if (typeof ingredientID !== 'number' || ingredientID <= 0) {
        throw new Error('Invalid ingredient ID (must be positive number)');
    }
    
    try {
        // STEP 2: QUERY DATABASE WITH JOIN TO GET INGREDIENT TYPE NAME
        const sql = `
            SELECT 
                i.*,
                it.name as ingredientTypeName
            FROM ingredients i
            JOIN ingredientTypes it ON i.ingredientTypeID = it.ingredientTypeID
            WHERE i.ingredientID = ?
        `;
        const result = db.exec(sql, [ingredientID]);
        
        // STEP 3: CONVERT RESULT TO OBJECT
        const ingredients = resultToObjects(result);
        
        if (ingredients.length === 0) {
            return null;
        }
        
        // STEP 4: RETURN ingredient
        return ingredients[0];
        
    } catch (error) {
        console.error('Failed to fetch ingredient:', error.message);
        throw new Error(`Failed to fetch ingredient: ${error.message}`);
    }
}

/**
 * Get all ingredients for a specific ingredient type
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} ingredientTypeID - Ingredient type to get ingredients for
 * @param {Object} [options] - Filter options
 * @param {number} [options.isActive] - Filter by active status (0 or 1)
 * @returns {Array} Array of ingredient objects
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get all apple juice ingredients
 * const appleJuices = getingredientsByIngredientType(db, 1);
 * 
 * @example
 * // Get only active apple juice ingredients
 * const activeAppleJuices = getingredientsByIngredientType(db, 1, { isActive: 1 });
 */
function getingredientsByIngredientType(db, ingredientTypeID, options = {}) {
    // STEP 1: VALIDATE INGREDIENT TYPE ID
    if (typeof ingredientTypeID !== 'number' || ingredientTypeID <= 0) {
        throw new Error('Invalid ingredient type ID (must be positive number)');
    }
    
    try {
        // STEP 2: BUILD QUERY
        let sql = `
            SELECT 
                i.*,
                it.name as ingredientTypeName
            FROM ingredients i
            JOIN ingredientTypes it ON i.ingredientTypeID = it.ingredientTypeID
            WHERE i.ingredientTypeID = ?
        `;
        
        const params = [ingredientTypeID];
        
        // STEP 3: FILTER BY ACTIVE STATUS (if provided)
        if (options.isActive !== undefined) {
            if (options.isActive !== 0 && options.isActive !== 1) {
                throw new Error('isActive must be 0 or 1');
            }
            sql += ' AND i.isActive = ?';
            params.push(options.isActive);
        }
        
        // STEP 4: ADD ORDERING
        sql += ' ORDER BY i.brand ASC, i.name ASC';
        
        console.log(`Fetching ingredients for ingredient type ${ingredientTypeID}`);
        
        // STEP 5: EXECUTE QUERY
        const result = db.exec(sql, params);
        const ingredients = resultToObjects(result);
        
        // STEP 6: RETURN RESULTS
        console.log(`Found ${ingredients.length} ingredients`);
        return ingredients;
        
    } catch (error) {
        console.error('Failed to fetch ingredients:', error.message);
        throw new Error(`Failed to fetch ingredients: ${error.message}`);
    }
}

/**
 * Get all ingredients with optional filters
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} [options] - Filter options
 * @param {number} [options.ingredientTypeID] - Filter by ingredient type
 * @param {number} [options.isActive] - Filter by active status (0 or 1)
 * @param {string} [options.brand] - Filter by brand name (partial match)
 * @returns {Array} Array of ingredient objects
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get all ingredients
 * const all = getAllingredients(db);
 * 
 * @example
 * // Get only active ingredients
 * const active = getAllingredients(db, { isActive: 1 });
 * 
 * @example
 * // Get all K Classic ingredients
 * const kClassic = getAllingredients(db, { brand: "K Classic" });
 * 
 * @example
 * // Get active apple juice ingredients
 * const activeAppleJuice = getAllingredients(db, { 
 *     ingredientTypeID: 1, 
 *     isActive: 1 
 * });
 */
function getAllingredients(db, options = {}) {
    try {
        // STEP 1: BUILD BASE QUERY WITH JOIN
        let sql = `
            SELECT 
                i.*,
                it.name as ingredientTypeName
            FROM ingredients i
            JOIN ingredientTypes it ON i.ingredientTypeID = it.ingredientTypeID
        `;
        
        const conditions = [];
        const params = [];
        
        // STEP 2: FILTER BY INGREDIENT TYPE
        if (options.ingredientTypeID !== undefined) {
            if (typeof options.ingredientTypeID !== 'number' || options.ingredientTypeID <= 0) {
                throw new Error('ingredientTypeID must be a positive number');
            }
            conditions.push('i.ingredientTypeID = ?');
            params.push(options.ingredientTypeID);
        }
        
        // STEP 3: FILTER BY ACTIVE STATUS
        if (options.isActive !== undefined) {
            if (options.isActive !== 0 && options.isActive !== 1) {
                throw new Error('isActive must be 0 or 1');
            }
            conditions.push('i.isActive = ?');
            params.push(options.isActive);
        }
        
        // STEP 4: FILTER BY BRAND NAME
        if (options.brand !== undefined) {
            if (typeof options.brand !== 'string' || options.brand.trim() === '') {
                throw new Error('brand must be a non-empty string');
            }
            conditions.push('i.brand LIKE ?');
            params.push(`%${options.brand}%`);
        }
        
        // STEP 5: ADD WHERE CLAUSE IF FILTERS EXIST
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        // STEP 6: ADD ORDERING
        sql += ' ORDER BY it.name ASC, i.brand ASC, i.name ASC';
        
        console.log(`Fetching ingredients with query: ${sql}`);
        
        // STEP 7: EXECUTE QUERY
        const result = db.exec(sql, params);
        const ingredients = resultToObjects(result);
        
        // STEP 8: RETURN RESULTS
        console.log(`Found ${ingredients.length} ingredients`);
        return ingredients;
        
    } catch (error) {
        console.error('Failed to fetch ingredients:', error.message);
        throw new Error(`Failed to fetch ingredients: ${error.message}`);
    }
}

/**
 * Update a ingredient
 * 
 * Updates only the provided fields. Other fields remain unchanged.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} ingredientID - ingredient to update
 * @param {Object} updates - Fields to update
 * @param {string} [updates.brand] - New brand name
 * @param {string} [updates.name] - New ingredient name
 * @param {number} [updates.ingredientTypeID] - New ingredient type
 * @param {number} [updates.packageSize] - New package size
 * @param {string} [updates.packageUnit] - New package unit
 * @param {string} [updates.notes] - New notes
 * @returns {Object} { success: boolean, message: string, updatedFields: array }
 * @throws {Error} If validation fails
 * 
 * @example
 * const result = updateingredient(db, 5, {
 *     packageSize: 5,
 *     packageUnit: "L",
 *     notes: "Now available in 5L boxes"
 * });
 */
function updateingredient(db, ingredientID, updates) {
    // STEP 1: VALIDATE ingredient ID
    if (typeof ingredientID !== 'number' || ingredientID <= 0) {
        throw new Error('Invalid ingredient ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF ingredient EXISTS
    const ingredient = getingredient(db, ingredientID);
    if (!ingredient) {
        throw new Error(`ingredient ID ${ingredientID} does not exist`);
    }
    
    // STEP 3: VALIDATE FIELDS
    
    // Validate name (if provided)
    if ('name' in updates && (!updates.name || updates.name.trim() === '')) {
        throw new Error('ingredient name cannot be empty');
    }
    
    // Validate ingredientTypeID (if provided)
    if ('ingredientTypeID' in updates) {
        if (typeof updates.ingredientTypeID !== 'number' || updates.ingredientTypeID <= 0) {
            throw new Error('ingredientTypeID must be a positive number');
        }
        
        // Check ingredient type exists
        const ingredientTypeSql = `SELECT ingredientTypeID FROM ingredientTypes WHERE ingredientTypeID = ?`;
        const ingredientTypeResult = db.exec(ingredientTypeSql, [updates.ingredientTypeID]);
        if (ingredientTypeResult.length === 0 || ingredientTypeResult[0].values.length === 0) {
            throw new Error(`Ingredient type ID ${updates.ingredientTypeID} does not exist`);
        }
    }
    
    // Validate packageSize (if provided)
    if ('packageSize' in updates && updates.packageSize !== null) {
        if (typeof updates.packageSize !== 'number' || updates.packageSize <= 0) {
            throw new Error('Package size must be a positive number or null');
        }
    }
    
    // If packageSize is provided, packageUnit should be provided too
    if ('packageSize' in updates && updates.packageSize !== null) {
        if ('packageUnit' in updates) {
            if (!updates.packageUnit || updates.packageUnit.trim() === '') {
                throw new Error('Package unit is required when package size is provided');
            }
        } else {
            // packageSize provided but packageUnit not in updates - check existing
            if (!ingredient.packageUnit) {
                throw new Error('Package unit is required when package size is provided');
            }
        }
    }
    
    // STEP 4: FILTER TO ALLOWED FIELDS
    const allowedFields = ['brand', 'name', 'ingredientTypeID', 'packageSize', 'packageUnit', 'notes'];
    
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
        if (key === 'brand' || key === 'name' || key === 'packageUnit' || key === 'notes') {
            // String fields - trim or set to null
            setClauses.push(`${key} = ?`);
            values.push(value ? value.trim() : null);
            
        } else {
            // Number fields (ingredientTypeID, packageSize) - use as-is
            setClauses.push(`${key} = ?`);
            values.push(value);
        }
    }
    
    const sql = `UPDATE ingredients SET ${setClauses.join(', ')} WHERE ingredientID = ?`;
    values.push(ingredientID);
    
    try {
        // STEP 6: EXECUTE UPDATE
        db.run(sql, values);
        
        console.log(`ingredient ${ingredientID} updated successfully`);
        
        // STEP 7: RETURN SUCCESS
        return {
            success: true,
            message: `ingredient "${ingredient.name}" updated successfully`,
            updatedFields: Object.entries(filteredUpdates).map(([key, value]) => ({
                field: key,
                newValue: value
            }))
        };
        
    } catch (error) {
        console.error('Failed to update ingredient:', error.message);
        throw new Error(`Failed to update ingredient: ${error.message}`);
    }
}

/**
 * Set ingredient active status
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} ingredientID - ingredient to update
 * @param {number} isActive - New status (1 = active, 0 = inactive)
 * @returns {Object} { success: boolean, message: string }
 * @throws {Error} If validation fails
 * 
 * @example
 * // Deactivate a ingredient
 * setingredientStatus(db, 5, 0);
 * 
 * @example
 * // Reactivate a ingredient
 * setingredientStatus(db, 5, 1);
 */
function setingredientStatus(db, ingredientID, isActive) {
    // STEP 1: VALIDATE ingredient ID
    if (typeof ingredientID !== 'number' || ingredientID <= 0) {
        throw new Error('Invalid ingredient ID (must be positive number)');
    }
    
    // STEP 2: VALIDATE isActive
    if (isActive !== 0 && isActive !== 1) {
        throw new Error('isActive must be 0 or 1');
    }
    
    // STEP 3: CHECK IF ingredient EXISTS
    const ingredient = getingredient(db, ingredientID);
    if (!ingredient) {
        throw new Error(`ingredient ID ${ingredientID} does not exist`);
    }
    
    // STEP 4: CHECK IF ALREADY AT DESIRED STATUS
    if (ingredient.isActive === isActive) {
        const status = isActive === 1 ? 'active' : 'inactive';
        return {
            success: true,
            message: `ingredient "${ingredient.name}" is already ${status}`
        };
    }
    
    try {
        // STEP 5: UPDATE STATUS
        _updateActiveStatus(db, 'ingredients', 'ingredientID', ingredientID, isActive);
        
        const status = isActive === 1 ? 'activated' : 'deactivated';
        console.log(`ingredient "${ingredient.name}" ${status}`);
        
        // STEP 6: RETURN SUCCESS
        return {
            success: true,
            message: `ingredient "${ingredient.name}" ${status} successfully`
        };
        
    } catch (error) {
        console.error('Failed to update ingredient status:', error.message);
        throw new Error(`Failed to update ingredient status: ${error.message}`);
    }
}

export {
    createingredient,
    getingredient,
    getingredientsByIngredientType,
    getAllingredients,
    updateingredient,
    setingredientStatus
};
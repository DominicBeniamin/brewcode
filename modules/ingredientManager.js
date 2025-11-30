// ingredientManager.js

import { resultToObjects, _updateActiveStatus } from './helpers.js';

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Create a new ingredient type
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} ingredientData - Ingredient information
 * @param {number} ingredientData.categoryID - Category this belongs to (required)
 * @param {string} ingredientData.name - Ingredient name (required, must be unique)
 * @param {string} [ingredientData.description] - Description (optional)
 * @param {Array} [ingredientData.beverageTypes] - Array of beverage types (optional)
 * @param {number} [ingredientData.isPrimaryRequired] - 1 if must be primary, 0 otherwise (optional, default: 0)
 * @returns {Object} Created ingredient type object with ingredientTypeID
 * @throws {Error} If validation fails
 * 
 * @example
 * const ingredient = createIngredientType(db, {
 *     categoryID: 1,
 *     name: "Cherry Juice",
 *     description: "Tart cherry juice for melomel",
 *     beverageTypes: ["Mead", "Melomel"],
 *     isPrimaryRequired: 0
 * });
 */
function createIngredientType(db, ingredientData) {
    // STEP 1: VALIDATE REQUIRED FIELDS
    if (!ingredientData.name || ingredientData.name.trim() === '') {
        throw new Error('Ingredient name is required');
    }
    
    if (!ingredientData.categoryID || typeof ingredientData.categoryID !== 'number') {
        throw new Error('Valid categoryID is required');
    }
    
    // STEP 2: VALIDATE CATEGORY EXISTS
    const categorySql = `SELECT categoryID FROM itemCategories WHERE categoryID = ?`;
    const categoryResult = db.exec(categorySql, [ingredientData.categoryID]);
    
    if (categoryResult.length === 0 || categoryResult[0].values.length === 0) {
        throw new Error(`Category ID ${ingredientData.categoryID} does not exist`);
    }
    
    // STEP 3: VALIDATE BEVERAGE TYPES (if provided)
    if (ingredientData.beverageTypes !== undefined && !Array.isArray(ingredientData.beverageTypes)) {
        throw new Error('beverageTypes must be an array');
    }
    
    // STEP 4: VALIDATE isPrimaryRequired (if provided)
    if (ingredientData.isPrimaryRequired !== undefined) {
        if (ingredientData.isPrimaryRequired !== 0 && ingredientData.isPrimaryRequired !== 1) {
            throw new Error('isPrimaryRequired must be 0 or 1');
        }
    }
    
    // STEP 5: PREPARE DATA
    const ingredient = {
        categoryID: ingredientData.categoryID,
        name: ingredientData.name.trim(),
        description: ingredientData.description?.trim() || null,
        beverageTypes: ingredientData.beverageTypes ? JSON.stringify(ingredientData.beverageTypes) : null,
        isPrimaryRequired: ingredientData.isPrimaryRequired ?? 0
    };
    
    try {
        // STEP 6: INSERT INGREDIENT TYPE
        const sql = `
            INSERT INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [
            ingredient.categoryID,
            ingredient.name,
            ingredient.description,
            ingredient.beverageTypes,
            ingredient.isPrimaryRequired
        ]);
        
        // STEP 7: GET THE NEW INGREDIENT TYPE ID
        const [[ingredientTypeID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`Ingredient type created successfully: ID ${ingredientTypeID}`);
        
        // STEP 8: RETURN COMPLETE OBJECT
        return {
            ingredientTypeID: ingredientTypeID,
            categoryID: ingredient.categoryID,
            name: ingredient.name,
            description: ingredient.description,
            beverageTypes: ingredientData.beverageTypes || null,
            isPrimaryRequired: ingredient.isPrimaryRequired,
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
 * 
 * @example
 * const ingredient = getIngredientType(db, 5);
 * if (ingredient) {
 *     console.log(ingredient.name);           // "Cherry Juice"
 *     console.log(ingredient.beverageTypes);  // ["Mead", "Melomel"]
 * } else {
 *     console.log("Ingredient not found");
 * }
 */
function getIngredientType(db, ingredientTypeID) {
    // STEP 1: VALIDATE INGREDIENT TYPE ID
    if (typeof ingredientTypeID !== 'number' || ingredientTypeID <= 0) {
        throw new Error('Invalid ingredient type ID (must be positive number)');
    }
    
    try {
        // STEP 2: QUERY DATABASE
        const sql = `SELECT * FROM ingredientTypes WHERE ingredientTypeID = ?`;
        const result = db.exec(sql, [ingredientTypeID]);
        
        // STEP 3: CONVERT RESULT TO OBJECT
        const ingredients = resultToObjects(result);
        
        if (ingredients.length === 0) {
            return null;
        }
        
        const ingredient = ingredients[0];
        
        // STEP 4: PARSE beverageTypes JSON TO ARRAY
        if (ingredient.beverageTypes) {
            ingredient.beverageTypes = JSON.parse(ingredient.beverageTypes);
        }
        
        // STEP 5: RETURN INGREDIENT
        return ingredient;
        
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
 * 
 * @example
 * // Get all ingredients
 * const all = getAllIngredientTypes(db);
 * 
 * @example
 * // Get only fruits
 * const fruits = getAllIngredientTypes(db, { categoryID: 1 });
 * 
 * @example
 * // Get only active cider ingredients
 * const ciderIngredients = getAllIngredientTypes(db, { 
 *     beverageType: "Cider", 
 *     isActive: 1 
 * });
 */
function getAllIngredientTypes(db, options = {}) {
    try {
        // STEP 1: BUILD BASE QUERY
        let sql = 'SELECT * FROM ingredientTypes';
        const conditions = [];
        const params = [];
        
        // STEP 2: FILTER BY CATEGORY
        if (options.categoryID !== undefined) {
            if (typeof options.categoryID !== 'number' || options.categoryID <= 0) {
                throw new Error('categoryID must be a positive number');
            }
            conditions.push('categoryID = ?');
            params.push(options.categoryID);
        }
        
        // STEP 3: FILTER BY ACTIVE STATUS
        if (options.isActive !== undefined) {
            if (options.isActive !== 0 && options.isActive !== 1) {
                throw new Error('isActive must be 0 or 1');
            }
            conditions.push('isActive = ?');
            params.push(options.isActive);
        }
        
        // STEP 4: FILTER BY BEVERAGE TYPE
        if (options.beverageType !== undefined) {
            if (typeof options.beverageType !== 'string' || options.beverageType.trim() === '') {
                throw new Error('beverageType must be a non-empty string');
            }
            conditions.push(`beverageTypes LIKE ?`);
            params.push(`%"${options.beverageType}"%`);
        }
        
        // STEP 5: ADD WHERE CLAUSE IF FILTERS EXIST
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        // STEP 6: ADD ORDERING
        sql += ' ORDER BY name ASC';
        
        console.log(`Fetching ingredient types with query: ${sql}`);
        
        // STEP 7: EXECUTE QUERY
        const result = db.exec(sql, params);
        const ingredients = resultToObjects(result);
        
        // STEP 8: PARSE beverageTypes JSON FOR EACH INGREDIENT
        for (const ingredient of ingredients) {
            if (ingredient.beverageTypes) {
                ingredient.beverageTypes = JSON.parse(ingredient.beverageTypes);
            }
        }
        
        // STEP 9: RETURN RESULTS
        console.log(`Found ${ingredients.length} ingredient types`);
        return ingredients;
        
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
 * 
 * @example
 * const result = updateIngredientType(db, 5, {
 *     description: "Updated description",
 *     beverageTypes: ["Cider", "Perry"]
 * });
 */
function updateIngredientType(db, ingredientTypeID, updates) {
    // STEP 1: VALIDATE INGREDIENT TYPE ID
    if (typeof ingredientTypeID !== 'number' || ingredientTypeID <= 0) {
        throw new Error('Invalid ingredient type ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF INGREDIENT TYPE EXISTS
    const ingredient = getIngredientType(db, ingredientTypeID);
    if (!ingredient) {
        throw new Error(`Ingredient type ID ${ingredientTypeID} does not exist`);
    }
    
    // STEP 3: VALIDATE FIELDS
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
    
    // STEP 4: FILTER TO ALLOWED FIELDS
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
    
    // STEP 5: PREPARE DATA AND BUILD SQL
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
        // STEP 6: EXECUTE UPDATE
        db.run(sql, values);
        
        console.log(`Ingredient type ${ingredientTypeID} updated successfully`);
        
        // STEP 7: RETURN SUCCESS
        return {
            success: true,
            message: `Ingredient type "${ingredient.name}" updated successfully`,
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
 * 
 * @example
 * // Deactivate an ingredient type
 * setIngredientTypeStatus(db, 5, 0);
 * 
 * @example
 * // Reactivate an ingredient type
 * setIngredientTypeStatus(db, 5, 1);
 */
function setIngredientTypeStatus(db, ingredientTypeID, isActive) {
    // STEP 1: VALIDATE INGREDIENT TYPE ID
    if (typeof ingredientTypeID !== 'number' || ingredientTypeID <= 0) {
        throw new Error('Invalid ingredient type ID (must be positive number)');
    }
    
    // STEP 2: VALIDATE isActive
    if (isActive !== 0 && isActive !== 1) {
        throw new Error('isActive must be 0 or 1');
    }
    
    // STEP 3: CHECK IF INGREDIENT TYPE EXISTS
    const ingredient = getIngredientType(db, ingredientTypeID);
    if (!ingredient) {
        throw new Error(`Ingredient type ID ${ingredientTypeID} does not exist`);
    }
    
    // STEP 4: CHECK IF ALREADY AT DESIRED STATUS
    if (ingredient.isActive === isActive) {
        const status = isActive === 1 ? 'active' : 'inactive';
        return {
            success: true,
            message: `Ingredient type "${ingredient.name}" is already ${status}`
        };
    }
    
    try {
        // STEP 5: UPDATE STATUS
        _updateActiveStatus(db, 'ingredientTypes', 'ingredientTypeID', ingredientTypeID, isActive);
        
        const status = isActive === 1 ? 'activated' : 'deactivated';
        console.log(`Ingredient type "${ingredient.name}" ${status}`);
        
        // STEP 6: RETURN SUCCESS
        return {
            success: true,
            message: `Ingredient type "${ingredient.name}" ${status} successfully`
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
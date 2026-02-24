// itemManager.js - Unified item manager (ingredients + supplies combined)

import { resultToObjects, _updateActiveStatus } from './helpers.js';

// =============================================================================
// DUAL-PURPOSE ITEM VALIDATION
// =============================================================================
// Validates that dual-purpose items use allowed category combinations.
// 
// Business Rule:
//   Dual-purpose items (having both ingredientTypeID and supplyTypeID) are rare
//   and limited to specific use cases:
//   - Water: ingredient (categoryID=1) + supply for cleaning (categoryID=9)
//   - Additives like K-Meta: ingredient (categoryID=7) + supply sanitizer (categoryID=9)
//
// Allowed Combinations:
//   - Ingredient Category: 1 (Water) or 7 (Additives)
//   - Supply Category: 9 (Cleaners & Sanitizers)
//
// This validation prevents illogical combinations like:
//   - Honey (ingredient) + Bottle (supply) ❌
//   - Apple Juice (ingredient) + Cork (supply) ❌
// =============================================================================

/**
 * Validates dual-purpose item category combination
 * @param {Object} db - SQL.js database instance
 * @param {number} ingredientTypeID - Ingredient type ID
 * @param {number} supplyTypeID - Supply type ID
 * @throws {Error} If combination is invalid
 */
function validateDualPurposeItem(db, ingredientTypeID, supplyTypeID) {
  // Get ingredient type's category
  const ingredientType = db.exec(
    'SELECT categoryID FROM ingredientTypes WHERE ingredientTypeID = ?',
    [ingredientTypeID]
  );
  
  if (!ingredientType || ingredientType.length === 0 || ingredientType[0].values.length === 0) {
    throw new Error('Invalid ingredient type');
  }
  
  const ingredientCategoryID = ingredientType[0].values[0][0];
  
  // Get supply type's category
  const supplyType = db.exec(
    'SELECT categoryID FROM supplyTypes WHERE supplyTypeID = ?',
    [supplyTypeID]
  );
  
  if (!supplyType || supplyType.length === 0 || supplyType[0].values.length === 0) {
    throw new Error('Invalid supply type');
  }
  
  const supplyCategoryID = supplyType[0].values[0][0];
  
  // Validate allowed combinations
  const ALLOWED_INGREDIENT_CATEGORIES = [1, 7]; // Water, Additives
  const ALLOWED_SUPPLY_CATEGORIES = [9];        // Cleaners & Sanitizers
  
  const validIngredientCategory = ALLOWED_INGREDIENT_CATEGORIES.includes(ingredientCategoryID);
  const validSupplyCategory = ALLOWED_SUPPLY_CATEGORIES.includes(supplyCategoryID);
  
  if (!validIngredientCategory || !validSupplyCategory) {
    throw new Error(
      'Dual-purpose items must use Water or Additives category for ingredients ' +
      'and Cleaners & Sanitizers category for supplies'
    );
  }
}

// ============================================
// ITEM FUNCTIONS (unified ingredient/supply items)
// ============================================

/**
 * Create a new item (can be ingredient, supply, or both)
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} itemData - Item information
 * @param {string} itemData.name - Item name (required)
 * @param {string} itemData.unit - Unit of measure (required, e.g., "L", "kg", "g", "count")
 * @param {string} [itemData.brand] - Brand name (optional, NULL for homemade/generic)
 * @param {number} [itemData.onDemand] - 1 = buy/make as needed, 0 = track stock (optional, default: 0)
 * @param {number} [itemData.onDemandPrice] - Price for onDemandPriceQty units (optional, required if onDemand=1)
 * @param {number} [itemData.onDemandPriceQty] - Quantity that price applies to (optional, required if onDemand=1)
 * @param {number} [itemData.reorderPoint] - Low stock alert threshold (optional)
 * @param {string} [itemData.notes] - User notes (optional)
 * @param {Array} [itemData.roles] - Array of role objects to add (optional, added after item creation)
 *   Role object: { roleType: 'ingredient'|'supply', itemTypeID: number, categoryID: number }
 * @returns {Object} Created item object with itemID
 * @throws {Error} If validation fails
 * 
 * @example
 * // Create a tracked ingredient
 * const item = createItem(db, {
 *     name: "Apple Juice",
 *     unit: "L",
 *     brand: "K Classic",
 *     onDemand: 0,
 *     reorderPoint: 5,
 *     notes: "Available at Kaufland"
 * });
 * 
 * @example
 * // Create an on-demand dual-purpose item
 * const item = createItem(db, {
 *     name: "Potassium Metabisulfite",
 *     unit: "g",
 *     onDemand: 1,
 *     onDemandPrice: 5.99,
 *     onDemandPriceQty: 5,
 *     roles: [
 *         { roleType: 'ingredient', itemTypeID: 15, categoryID: 6 },
 *         { roleType: 'supply', itemTypeID: 12, categoryID: 20 }
 *     ]
 * });
 */
function createItem(db, itemData) {
    // STEP 1: VALIDATE REQUIRED FIELDS
    if (!itemData.name || itemData.name.trim() === '') {
        throw new Error('Item name is required');
    }
    
    if (!itemData.unit || itemData.unit.trim() === '') {
        throw new Error('Unit of measure is required');
    }
    
    // STEP 2: VALIDATE ONDEMAND FIELDS
    if (itemData.onDemand !== undefined) {
        if (itemData.onDemand !== 0 && itemData.onDemand !== 1) {
            throw new Error('onDemand must be 0 or 1');
        }
        
        if (itemData.onDemand === 1) {
            if (itemData.onDemandPrice === undefined || itemData.onDemandPrice === null) {
                throw new Error('onDemandPrice is required when onDemand=1');
            }
            if (itemData.onDemandPriceQty === undefined || itemData.onDemandPriceQty === null) {
                throw new Error('onDemandPriceQty is required when onDemand=1');
            }
            if (typeof itemData.onDemandPrice !== 'number' || itemData.onDemandPrice < 0) {
                throw new Error('onDemandPrice must be a non-negative number');
            }
            if (typeof itemData.onDemandPriceQty !== 'number' || itemData.onDemandPriceQty <= 0) {
                throw new Error('onDemandPriceQty must be a positive number');
            }
        }
    }
    
    // STEP 3: VALIDATE REORDER POINT
    if (itemData.reorderPoint !== undefined && itemData.reorderPoint !== null) {
        if (typeof itemData.reorderPoint !== 'number' || itemData.reorderPoint < 0) {
            throw new Error('reorderPoint must be a non-negative number or null');
        }
    }
    
    // STEP 4: PREPARE DATA
    const item = {
        brand: itemData.brand?.trim() || null,
        name: itemData.name.trim(),
        unit: itemData.unit.trim(),
        onDemand: itemData.onDemand ?? 0,
        onDemandPrice: itemData.onDemandPrice ?? null,
        onDemandPriceQty: itemData.onDemandPriceQty ?? null,
        reorderPoint: itemData.reorderPoint ?? null,
        notes: itemData.notes?.trim() || null
    };
    
    try {
        // STEP 5: INSERT ITEM
        const sql = `
            INSERT INTO items (brand, name, unit, ingredientTypeID, ingredientSubtypeID, supplyTypeID, onDemand, onDemandPrice, onDemandPriceQty, reorderPoint, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [
            item.brand,
            item.name,
            item.unit,
            itemData.ingredientTypeID ?? null,
            itemData.ingredientSubtypeID ?? null,
            itemData.supplyTypeID ?? null,
            item.onDemand,
            item.onDemandPrice,
            item.onDemandPriceQty,
            item.reorderPoint,
            item.notes
        ]);
        
        // STEP 6: GET THE NEW ITEM ID
        const [[itemID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`Item created successfully: ID ${itemID}`);
        
        // STEP 7: VALIDATE DUAL-PURPOSE (if both type IDs provided)
        if (itemData.ingredientTypeID && itemData.supplyTypeID) {
            validateDualPurposeItem(db, itemData.ingredientTypeID, itemData.supplyTypeID);
        }
        
        // STEP 8: RETURN COMPLETE OBJECT
        return {
            itemID: itemID,
            brand: item.brand,
            name: item.name,
            unit: item.unit,
            onDemand: item.onDemand,
            onDemandPrice: item.onDemandPrice,
            onDemandPriceQty: item.onDemandPriceQty,
            reorderPoint: item.reorderPoint,
            notes: item.notes,
            isActive: 1,
            roles: itemData.roles || []
        };
        
    } catch (error) {
        console.error('Failed to create item:', error.message);
        throw new Error(`Failed to create item: ${error.message}`);
    }
}

/**
 * Get a single item by ID
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} itemID - ID of the item to retrieve
 * @returns {Object|null} Item object with roles array, or null if not found
 * @throws {Error} If itemID is invalid
 */
function getItem(db, itemID) {
    if (typeof itemID !== 'number' || itemID <= 0) {
        throw new Error('Invalid item ID (must be positive number)');
    }
    
    try {
        // GET ITEM WITH TYPE INFORMATION
        const itemSql = `
            SELECT 
                i.*,
                it.name as ingredientTypeName,
                st.name as supplyTypeName
            FROM items i
            LEFT JOIN ingredientTypes it ON i.ingredientTypeID = it.ingredientTypeID
            LEFT JOIN supplyTypes st ON i.supplyTypeID = st.supplyTypeID
            WHERE i.itemID = ?
        `;
        const itemResult = db.exec(itemSql, [itemID]);
        const items = resultToObjects(itemResult);
        
        if (items.length === 0) {
            return null;
        }
        
        return items[0];
        
    } catch (error) {
        console.error('Failed to fetch item:', error.message);
        throw new Error(`Failed to fetch item: ${error.message}`);
    }
}

/**
 * Get all items with optional filters
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} [options] - Filter options
 * @param {number} [options.isActive] - Filter by active status (0 or 1)
 * @param {number} [options.onDemand] - Filter by on-demand status (0 or 1)
 * @param {string} [options.roleType] - Filter by role type ('ingredient' or 'supply')
 * @param {number} [options.itemTypeID] - Filter by specific type (across both roles)
 * @param {number} [options.categoryID] - Filter by category
 * @returns {Array} Array of item objects with roles
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get all active items
 * const items = getAllItems(db, { isActive: 1 });
 * 
 * @example
 * // Get all on-demand items
 * const onDemand = getAllItems(db, { onDemand: 1 });
 * 
 * @example
 * // Get all items that have an ingredient role
 * const ingredients = getAllItems(db, { roleType: 'ingredient' });
 * 
 * @example
 * // Get all items in a specific category
 * const categoryItems = getAllItems(db, { categoryID: 6, roleType: 'ingredient' });
 */
function getAllItems(db, options = {}) {
    try {
        // BUILD BASE QUERY WITH TYPE INFORMATION
        let sql = `
            SELECT DISTINCT 
                i.*,
                it.name as ingredientTypeName,
                it.categoryID as ingredientCategoryID,
                st.name as supplyTypeName,
                st.categoryID as supplyCategoryID
            FROM items i
            LEFT JOIN ingredientTypes it ON i.ingredientTypeID = it.ingredientTypeID
            LEFT JOIN supplyTypes st ON i.supplyTypeID = st.supplyTypeID
        `;
        const conditions = [];
        const params = [];
        
        // FILTER BY ACTIVE STATUS
        if (options.isActive !== undefined) {
            if (options.isActive !== 0 && options.isActive !== 1) {
                throw new Error('isActive must be 0 or 1');
            }
            conditions.push('i.isActive = ?');
            params.push(options.isActive);
        }
        
        // FILTER BY ONDEMAND STATUS
        if (options.onDemand !== undefined) {
            if (options.onDemand !== 0 && options.onDemand !== 1) {
                throw new Error('onDemand must be 0 or 1');
            }
            conditions.push('i.onDemand = ?');
            params.push(options.onDemand);
        }
        
        // FILTER BY ROLE TYPE
        if (options.roleType !== undefined) {
            if (options.roleType !== 'ingredient' && options.roleType !== 'supply') {
                throw new Error('roleType must be "ingredient" or "supply"');
            }
            if (options.roleType === 'ingredient') {
                conditions.push('i.ingredientTypeID IS NOT NULL');
            } else {
                conditions.push('i.supplyTypeID IS NOT NULL');
            }
        }
        
        // FILTER BY INGREDIENT TYPE ID
        if (options.itemTypeID !== undefined) {
            if (typeof options.itemTypeID !== 'number' || options.itemTypeID <= 0) {
                throw new Error('itemTypeID must be a positive number');
            }
            conditions.push('(i.ingredientTypeID = ? OR i.supplyTypeID = ?)');
            params.push(options.itemTypeID, options.itemTypeID);
        }
        
        // FILTER BY CATEGORY
        if (options.categoryID !== undefined) {
            if (typeof options.categoryID !== 'number' || options.categoryID <= 0) {
                throw new Error('categoryID must be a positive number');
            }
            conditions.push('(it.categoryID = ? OR st.categoryID = ?)');
            params.push(options.categoryID, options.categoryID);
        }
        
        // ADD WHERE CLAUSE IF FILTERS EXIST
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        // ADD ORDERING
        sql += ' ORDER BY i.name ASC';
        
        console.log(`Fetching items with filters`);
        
        // EXECUTE QUERY
        const result = db.exec(sql, params);
        const items = resultToObjects(result);
        
        // RETURN RESULTS
        console.log(`Found ${items.length} items`);
        return items;
        
    } catch (error) {
        console.error('Failed to fetch items:', error.message);
        throw new Error(`Failed to fetch items: ${error.message}`);
    }
}

/**
 * Update an item
 * 
 * Updates only the provided fields. Roles are managed separately via addItemRole/removeItemRole.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} itemID - Item to update
 * @param {Object} updates - Fields to update
 * @param {string} [updates.brand] - New brand
 * @param {string} [updates.name] - New item name
 * @param {string} [updates.unit] - New unit of measure
 * @param {number} [updates.onDemand] - New on-demand status (0 or 1)
 * @param {number} [updates.onDemandPrice] - New price
 * @param {number} [updates.onDemandPriceQty] - New price quantity
 * @param {number} [updates.reorderPoint] - New reorder point
 * @param {string} [updates.notes] - New notes
 * @returns {Object} { success: boolean, message: string, updatedFields: array }
 * @throws {Error} If validation fails
 * 
 * @example
 * const result = updateItem(db, 5, {
 *     onDemandPrice: 7.99,
 *     onDemandPriceQty: 10,
 *     reorderPoint: 100
 * });
 */
function updateItem(db, itemID, updates) {
    // STEP 1: VALIDATE ITEM ID
    if (typeof itemID !== 'number' || itemID <= 0) {
        throw new Error('Invalid item ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF ITEM EXISTS
    const item = getItem(db, itemID);
    if (!item) {
        throw new Error(`Item ID ${itemID} does not exist`);
    }
    
    // STEP 3: VALIDATE FIELDS
    if ('name' in updates && (!updates.name || updates.name.trim() === '')) {
        throw new Error('Item name cannot be empty');
    }
    
    if ('unit' in updates && (!updates.unit || updates.unit.trim() === '')) {
        throw new Error('Unit cannot be empty');
    }
    
    if ('onDemand' in updates) {
        if (updates.onDemand !== 0 && updates.onDemand !== 1) {
            throw new Error('onDemand must be 0 or 1');
        }
        
        if (updates.onDemand === 1) {
            const newPrice = 'onDemandPrice' in updates ? updates.onDemandPrice : item.onDemandPrice;
            const newQty = 'onDemandPriceQty' in updates ? updates.onDemandPriceQty : item.onDemandPriceQty;
            
            if (newPrice === undefined || newPrice === null) {
                throw new Error('onDemandPrice is required when onDemand=1');
            }
            if (newQty === undefined || newQty === null) {
                throw new Error('onDemandPriceQty is required when onDemand=1');
            }
        }
    }
    
    if ('onDemandPrice' in updates && updates.onDemandPrice !== null) {
        if (typeof updates.onDemandPrice !== 'number' || updates.onDemandPrice < 0) {
            throw new Error('onDemandPrice must be a non-negative number or null');
        }
    }
    
    if ('onDemandPriceQty' in updates && updates.onDemandPriceQty !== null) {
        if (typeof updates.onDemandPriceQty !== 'number' || updates.onDemandPriceQty <= 0) {
            throw new Error('onDemandPriceQty must be a positive number or null');
        }
    }
    
    if ('reorderPoint' in updates && updates.reorderPoint !== null) {
        if (typeof updates.reorderPoint !== 'number' || updates.reorderPoint < 0) {
            throw new Error('reorderPoint must be a non-negative number or null');
        }
    }
    
    // STEP 4: FILTER TO ALLOWED FIELDS
    const allowedFields = ['brand', 'name', 'unit', 'onDemand', 'onDemandPrice', 'onDemandPriceQty', 'reorderPoint', 'notes'];
    
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
        if (key === 'brand' || key === 'name' || key === 'unit' || key === 'notes') {
            setClauses.push(`${key} = ?`);
            values.push(value ? value.trim() : null);
        } else {
            setClauses.push(`${key} = ?`);
            values.push(value);
        }
    }
    
    // Add modifiedDate
    setClauses.push('modifiedDate = ?');
    values.push(new Date().toISOString().split('T')[0]);
    
    const sql = `UPDATE items SET ${setClauses.join(', ')} WHERE itemID = ?`;
    values.push(itemID);
    
    try {
        // STEP 6: EXECUTE UPDATE
        db.run(sql, values);
        
        console.log(`Item ${itemID} updated successfully`);
        
        // STEP 7: RETURN SUCCESS
        return {
            success: true,
            message: `Item "${item.name}" updated successfully`,
            updatedFields: Object.entries(filteredUpdates).map(([key, value]) => ({
                field: key,
                newValue: value
            }))
        };
        
    } catch (error) {
        console.error('Failed to update item:', error.message);
        throw new Error(`Failed to update item: ${error.message}`);
    }
}

/**
 * Set item active status
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} itemID - Item to update
 * @param {number} isActive - New status (1 = active, 0 = inactive)
 * @returns {Object} { success: boolean, message: string }
 * @throws {Error} If validation fails
 */
function setItemStatus(db, itemID, isActive) {
    if (typeof itemID !== 'number' || itemID <= 0) {
        throw new Error('Invalid item ID (must be positive number)');
    }
    
    if (isActive !== 0 && isActive !== 1) {
        throw new Error('isActive must be 0 or 1');
    }
    
    const item = getItem(db, itemID);
    if (!item) {
        throw new Error(`Item ID ${itemID} does not exist`);
    }
    
    if (item.isActive === isActive) {
        const status = isActive === 1 ? 'active' : 'inactive';
        return {
            success: true,
            message: `Item "${item.name}" is already ${status}`
        };
    }
    
    try {
        _updateActiveStatus(db, 'items', 'itemID', itemID, isActive);
        
        const status = isActive === 1 ? 'activated' : 'deactivated';
        console.log(`Item "${item.name}" ${status}`);
        
        return {
            success: true,
            message: `Item "${item.name}" ${status} successfully`
        };
        
    } catch (error) {
        console.error('Failed to update item status:', error.message);
        throw new Error(`Failed to update item status: ${error.message}`);
    }
}

export {
    createItem,
    getItem,
    getAllItems,
    updateItem,
    setItemStatus
};
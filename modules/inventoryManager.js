// inventoryManager.js - Inventory lot management (unified schema)

import { resultToObjects } from './helpers.js';

// ============================================
// QUERY BUILDER HELPER
// ============================================

/**
 * Build the base inventory query with all necessary JOINs
 * 
 * Returns complete lot information with item details and role information.
 * Supports dual-purpose items (both ingredient and supply roles).
 * 
 * @param {string} whereClause - Optional WHERE clause (include 'WHERE')
 * @param {string} orderClause - Optional ORDER BY clause (include 'ORDER BY')
 * @returns {string} Complete SQL query
 */
function buildInventoryQuery(whereClause = '', orderClause = '') {
    return `
        SELECT 
            il.*,
            i.brand,
            i.name as itemName,
            i.unit as itemUnit,
            i.onDemand,
            i.onDemandPrice,
            i.onDemandPriceQty,
            i.reorderPoint,
            -- Ingredient role
            ir_ing.roleType as ingredientRole,
            it.ingredientTypeID,
            it.name as ingredientTypeName,
            ic_ing.categoryID as ingredientCategoryID,
            ic_ing.name as ingredientCategoryName,
            -- Supply role
            ir_sup.roleType as supplyRole,
            st.supplyTypeID,
            st.name as supplyTypeName,
            ic_sup.categoryID as supplyCategoryID,
            ic_sup.name as supplyCategoryName
        FROM inventoryLots il
        JOIN items i ON il.itemID = i.itemID
        LEFT JOIN itemRoles ir_ing ON i.itemID = ir_ing.itemID AND ir_ing.roleType = 'ingredient'
        LEFT JOIN ingredientTypes it ON ir_ing.itemTypeID = it.ingredientTypeID
        LEFT JOIN itemCategories ic_ing ON ir_ing.categoryID = ic_ing.categoryID
        LEFT JOIN itemRoles ir_sup ON i.itemID = ir_sup.itemID AND ir_sup.roleType = 'supply'
        LEFT JOIN supplyTypes st ON ir_sup.itemTypeID = st.supplyTypeID
        LEFT JOIN itemCategories ic_sup ON ir_sup.categoryID = ic_sup.categoryID
        ${whereClause}
        ${orderClause}
    `.trim();
}

// ============================================
// INVENTORY LOT FUNCTIONS
// ============================================

/**
 * Add a new inventory lot
 * 
 * Records a purchase or acquisition of an item (tracked items only).
 * On-demand items do not use inventory lots.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} lotData - Lot information
 * @param {number} lotData.itemID - Item ID (required)
 * @param {number} lotData.quantityPurchased - Amount purchased (required)
 * @param {string} lotData.unit - Unit of measure (required, e.g., "kg", "L")
 * @param {string} lotData.purchaseDate - Purchase date ISO 8601 (required, YYYY-MM-DD)
 * @param {string} [lotData.expirationDate] - Expiration date ISO 8601 (optional, YYYY-MM-DD)
 * @param {number} [lotData.costPerUnit] - Cost per unit (optional)
 * @param {string} [lotData.supplier] - Supplier name (optional)
 * @param {string} [lotData.notes] - Additional notes (optional)
 * @returns {Object} Created lot object with lotID
 * @throws {Error} If validation fails
 * 
 * @example
 * const lot = addInventoryLot(db, {
 *     itemID: 5,
 *     quantityPurchased: 10,
 *     unit: "kg",
 *     purchaseDate: "2025-11-23",
 *     expirationDate: "2026-11-23",
 *     costPerUnit: 8.99,
 *     supplier: "Local beekeeper"
 * });
 */
function addInventoryLot(db, lotData) {
    // STEP 1: DESTRUCTURE WITH DEFAULTS
    const {
        itemID,
        quantityPurchased,
        unit,
        purchaseDate,
        expirationDate = null,
        costPerUnit = null,
        supplier = null,
        notes = null
    } = lotData;
    
    // STEP 2: VALIDATE ITEM ID
    if (!itemID || typeof itemID !== 'number' || itemID <= 0) {
        throw new Error('Valid itemID is required');
    }
    
    // STEP 3: VALIDATE ITEM EXISTS AND IS NOT ONDEMAND
    const itemSql = `SELECT itemID, name, onDemand FROM items WHERE itemID = ?`;
    const itemResult = db.exec(itemSql, [itemID]);
    
    if (itemResult.length === 0 || itemResult[0].values.length === 0) {
        throw new Error(`Item ID ${itemID} does not exist`);
    }
    
    const [, itemName, itemOnDemand] = itemResult[0].values[0];
    
    if (itemOnDemand === 1) {
        throw new Error(`Cannot create inventory lot for on-demand item "${itemName}". On-demand items do not track inventory.`);
    }
    
    // STEP 4: VALIDATE QUANTITY
    if (typeof quantityPurchased !== 'number' || quantityPurchased <= 0) {
        throw new Error('quantityPurchased must be a positive number');
    }
    
    // STEP 5: VALIDATE UNIT
    if (typeof unit !== 'string' || unit.trim() === '') {
        throw new Error('unit must be a non-empty string');
    }
    
    // STEP 6: VALIDATE PURCHASE DATE
    if (!purchaseDate || typeof purchaseDate !== 'string') {
        throw new Error('Purchase date is required');
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(purchaseDate)) {
        throw new Error('Purchase date must be in ISO 8601 format (YYYY-MM-DD)');
    }
    
    // STEP 7: VALIDATE EXPIRATION DATE (if provided)
    if (expirationDate !== null) {
        if (typeof expirationDate !== 'string' || !dateRegex.test(expirationDate)) {
            throw new Error('Expiration date must be in ISO 8601 format (YYYY-MM-DD)');
        }
    }
    
    // STEP 8: VALIDATE COST PER UNIT (if provided)
    if (costPerUnit !== null && (typeof costPerUnit !== 'number' || costPerUnit < 0)) {
        throw new Error('Cost per unit must be a non-negative number or null');
    }
    
    // STEP 9: PREPARE LOT DATA
    const lot = {
        itemID: itemID,
        quantityPurchased: quantityPurchased,
        quantityRemaining: quantityPurchased,
        unit: unit.trim(),
        purchaseDate: purchaseDate,
        expirationDate: expirationDate,
        costPerUnit: costPerUnit,
        supplier: supplier?.trim() || null,
        notes: notes?.trim() || null,
        status: 'active'
    };
    
    try {
        // STEP 10: INSERT LOT
        const sql = `
            INSERT INTO inventoryLots (
                itemID, quantityPurchased, quantityRemaining, 
                unit, purchaseDate, expirationDate, costPerUnit, supplier, notes, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [
            lot.itemID,
            lot.quantityPurchased,
            lot.quantityRemaining,
            lot.unit,
            lot.purchaseDate,
            lot.expirationDate,
            lot.costPerUnit,
            lot.supplier,
            lot.notes,
            lot.status
        ]);
        
        // STEP 11: GET THE NEW LOT ID
        const [[lotID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`Inventory lot created successfully: ID ${lotID}`);
        
        // STEP 12: RETURN COMPLETE OBJECT
        return {
            lotID: lotID,
            itemID: lot.itemID,
            quantityPurchased: lot.quantityPurchased,
            quantityRemaining: lot.quantityRemaining,
            unit: lot.unit,
            purchaseDate: lot.purchaseDate,
            expirationDate: lot.expirationDate,
            costPerUnit: lot.costPerUnit,
            supplier: lot.supplier,
            notes: lot.notes,
            status: lot.status
        };
        
    } catch (error) {
        console.error('Failed to create inventory lot:', error.message);
        throw new Error(`Failed to create inventory lot: ${error.message}`);
    }
}

/**
 * Get a single inventory lot by ID
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} lotID - ID of the lot to retrieve
 * @returns {Object|null} Inventory lot object with item details, or null if not found
 * @throws {Error} If lotID is invalid
 */
function getInventoryLot(db, lotID) {
    if (typeof lotID !== 'number' || lotID <= 0) {
        throw new Error('Invalid lot ID (must be positive number)');
    }
    
    try {
        const sql = buildInventoryQuery('WHERE il.lotID = ?');
        const result = db.exec(sql, [lotID]);
        const lots = resultToObjects(result);
        
        if (lots.length === 0) {
            return null;
        }
        
        return lots[0];
        
    } catch (error) {
        console.error('Failed to fetch inventory lot:', error.message);
        throw new Error(`Failed to fetch inventory lot: ${error.message}`);
    }
}

/**
 * Get all inventory lots for a specific item (FIFO ordered)
 * 
 * Returns lots ordered by purchase date (oldest first) for FIFO consumption.
 * By default, only returns active lots with remaining quantity.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} itemID - Item to get inventory for
 * @param {Object} [options] - Filter options
 * @param {string} [options.status] - Filter by status ('active', 'consumed', 'expired')
 * @param {boolean} [options.includeEmpty] - Include lots with quantityRemaining = 0 (default: false)
 * @returns {Array} Array of inventory lot objects (FIFO ordered)
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get available inventory for an item (FIFO ordered)
 * const lots = getInventoryForItem(db, 5);
 * 
 * @example
 * // Get all lots including consumed ones
 * const allLots = getInventoryForItem(db, 5, { 
 *     status: null,
 *     includeEmpty: true 
 * });
 */
function getInventoryForItem(db, itemID, options = {}) {
    if (typeof itemID !== 'number' || itemID <= 0) {
        throw new Error('Invalid item ID (must be positive number)');
    }
    
    try {
        // STEP 1: BUILD WHERE CLAUSE
        const conditions = ['il.itemID = ?'];
        const params = [itemID];
        
        // STEP 2: FILTER BY STATUS (default: active only)
        if (options.status !== undefined && options.status !== null) {
            const validStatuses = ['active', 'consumed', 'expired'];
            if (!validStatuses.includes(options.status)) {
                throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }
            conditions.push('il.status = ?');
            params.push(options.status);
        } else if (options.status === undefined) {
            conditions.push('il.status = ?');
            params.push('active');
        }
        
        // STEP 3: FILTER BY QUANTITY REMAINING (default: exclude empty)
        if (!options.includeEmpty) {
            conditions.push('il.quantityRemaining > 0');
        }
        
        // STEP 4: BUILD COMPLETE QUERY
        const whereClause = 'WHERE ' + conditions.join(' AND ');
        const orderClause = 'ORDER BY il.purchaseDate ASC, il.lotID ASC';
        const sql = buildInventoryQuery(whereClause, orderClause);
        
        console.log(`Fetching inventory for item ${itemID}`);
        
        // STEP 5: EXECUTE QUERY
        const result = db.exec(sql, params);
        const lots = resultToObjects(result);
        
        // STEP 6: RETURN RESULTS
        console.log(`Found ${lots.length} inventory lots`);
        return lots;
        
    } catch (error) {
        console.error('Failed to fetch inventory:', error.message);
        throw new Error(`Failed to fetch inventory: ${error.message}`);
    }
}

/**
 * Get all inventory lots with optional filters
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} [options] - Filter options
 * @param {number} [options.itemID] - Filter by item
 * @param {string} [options.status] - Filter by status ('active', 'consumed', 'expired')
 * @param {boolean} [options.includeEmpty] - Include lots with quantityRemaining = 0 (default: false)
 * @param {string} [options.purchasedAfter] - Filter by purchase date >= this date (ISO 8601)
 * @param {string} [options.purchasedBefore] - Filter by purchase date <= this date (ISO 8601)
 * @returns {Array} Array of inventory lot objects
 * @throws {Error} If validation fails
 */
function getAllInventory(db, options = {}) {
    try {
        // STEP 1: BUILD WHERE CONDITIONS
        const conditions = [];
        const params = [];
        
        // STEP 2: FILTER BY ITEM
        if (options.itemID !== undefined) {
            if (typeof options.itemID !== 'number' || options.itemID <= 0) {
                throw new Error('itemID must be a positive number');
            }
            conditions.push('il.itemID = ?');
            params.push(options.itemID);
        }
        
        // STEP 3: FILTER BY STATUS
        if (options.status !== undefined) {
            const validStatuses = ['active', 'consumed', 'expired'];
            if (!validStatuses.includes(options.status)) {
                throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }
            conditions.push('il.status = ?');
            params.push(options.status);
        }
        
        // STEP 4: FILTER BY QUANTITY REMAINING (default: exclude empty)
        if (!options.includeEmpty) {
            conditions.push('il.quantityRemaining > 0');
        }
        
        // STEP 5: FILTER BY PURCHASE DATE RANGE
        if (options.purchasedAfter !== undefined) {
            if (typeof options.purchasedAfter !== 'string') {
                throw new Error('purchasedAfter must be a date string (YYYY-MM-DD)');
            }
            conditions.push('il.purchaseDate >= ?');
            params.push(options.purchasedAfter);
        }
        
        if (options.purchasedBefore !== undefined) {
            if (typeof options.purchasedBefore !== 'string') {
                throw new Error('purchasedBefore must be a date string (YYYY-MM-DD)');
            }
            conditions.push('il.purchaseDate <= ?');
            params.push(options.purchasedBefore);
        }
        
        // STEP 6: BUILD COMPLETE QUERY
        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        const orderClause = 'ORDER BY il.itemID ASC, il.purchaseDate ASC, il.lotID ASC';
        const sql = buildInventoryQuery(whereClause, orderClause);
        
        console.log(`Fetching inventory with filters`);
        
        // STEP 7: EXECUTE QUERY
        const result = db.exec(sql, params);
        const lots = resultToObjects(result);
        
        // STEP 8: RETURN RESULTS
        console.log(`Found ${lots.length} inventory lots`);
        return lots;
        
    } catch (error) {
        console.error('Failed to fetch inventory:', error.message);
        throw new Error(`Failed to fetch inventory: ${error.message}`);
    }
}

/**
 * Consume inventory using FIFO (First In, First Out)
 * 
 * Consumes the specified quantity from available inventory lots, starting with
 * the oldest lots first. Updates lot quantities and marks fully consumed lots.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} itemID - Item to consume from
 * @param {number} quantityNeeded - Amount to consume
 * @param {string} unit - Unit of measure (must match inventory lots)
 * @returns {Object} Consumption details
 * @throws {Error} If insufficient inventory or validation fails
 */
function consumeFromInventory(db, itemID, quantityNeeded, unit) {
    if (typeof itemID !== 'number' || itemID <= 0) {
        throw new Error('Invalid item ID (must be positive number)');
    }
    
    if (typeof quantityNeeded !== 'number' || quantityNeeded <= 0) {
        throw new Error('Quantity needed must be a positive number');
    }
    
    if (typeof unit !== 'string' || unit.trim() === '') {
        throw new Error('Unit must be a non-empty string');
    }
    
    const unitNormalized = unit.trim();
    
    try {
        // STEP 1: GET AVAILABLE INVENTORY (FIFO ORDERED)
        const availableLots = getInventoryForItem(db, itemID, {
            status: 'active'
        });
        
        if (availableLots.length === 0) {
            throw new Error(`No inventory available for item ID ${itemID}`);
        }
        
        // STEP 2: VALIDATE UNIT MATCHES
        const firstLot = availableLots[0];
        if (firstLot.unit !== unitNormalized) {
            throw new Error(`Unit mismatch: requested "${unitNormalized}" but inventory is in "${firstLot.unit}"`);
        }
        
        // STEP 3: CHECK IF SUFFICIENT INVENTORY
        const totalAvailable = availableLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
        
        if (totalAvailable < quantityNeeded) {
            throw new Error(`Insufficient inventory: need ${quantityNeeded} ${unitNormalized}, only ${totalAvailable} ${unitNormalized} available`);
        }
        
        // STEP 4: CONSUME FROM LOTS (FIFO)
        const consumed = [];
        let remaining = quantityNeeded;
        
        db.run("BEGIN TRANSACTION");
        
        for (const lot of availableLots) {
            if (remaining <= 0) break;
            
            const toConsume = Math.min(remaining, lot.quantityRemaining);
            const newQuantity = lot.quantityRemaining - toConsume;
            const newStatus = newQuantity === 0 ? 'consumed' : 'active';
            
            const updateSql = `
                UPDATE inventoryLots 
                SET quantityRemaining = ?, status = ? 
                WHERE lotID = ?
            `;
            db.run(updateSql, [newQuantity, newStatus, lot.lotID]);
            
            consumed.push({
                lotID: lot.lotID,
                quantityUsed: toConsume,
                quantityRemaining: newQuantity,
                costPerUnit: lot.costPerUnit,
                purchaseDate: lot.purchaseDate,
                supplier: lot.supplier
            });
            
            remaining -= toConsume;
        }
        
        db.run("COMMIT");
        
        // STEP 5: CALCULATE SUMMARY
        const totalConsumed = consumed.reduce((sum, item) => sum + item.quantityUsed, 0);
        const totalCost = consumed.reduce((sum, item) => {
            return sum + (item.quantityUsed * (item.costPerUnit || 0));
        }, 0);
        const remainingInventory = totalAvailable - totalConsumed;
        
        console.log(`Consumed ${totalConsumed} ${unitNormalized} from ${consumed.length} lots`);
        
        // STEP 6: RETURN CONSUMPTION DETAILS
        return {
            consumed: consumed,
            totalConsumed: totalConsumed,
            totalCost: totalCost,
            unit: unitNormalized,
            remainingInventory: remainingInventory
        };
        
    } catch (error) {
        db.run("ROLLBACK");
        console.error('Failed to consume inventory:', error.message);
        throw new Error(`Failed to consume inventory: ${error.message}`);
    }
}

/**
 * Mark an inventory lot as expired
 * 
 * Sets the lot status to 'expired'. Does not affect quantity (for record keeping).
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} lotID - Lot to mark as expired
 * @returns {Object} { success: boolean, message: string }
 * @throws {Error} If validation fails
 */
function markLotExpired(db, lotID) {
    if (typeof lotID !== 'number' || lotID <= 0) {
        throw new Error('Invalid lot ID (must be positive number)');
    }
    
    const lot = getInventoryLot(db, lotID);
    if (!lot) {
        throw new Error(`Lot ID ${lotID} does not exist`);
    }
    
    if (lot.status === 'expired') {
        return {
            success: true,
            message: `Lot ${lotID} is already marked as expired`
        };
    }
    
    if (lot.status === 'consumed') {
        throw new Error(`Cannot mark consumed lot as expired. Lot ${lotID} is already fully consumed.`);
    }
    
    try {
        const sql = `UPDATE inventoryLots SET status = 'expired' WHERE lotID = ?`;
        db.run(sql, [lotID]);
        
        console.log(`Lot ${lotID} (${lot.itemName}) marked as expired`);
        
        return {
            success: true,
            message: `Lot ${lotID} marked as expired (${lot.quantityRemaining} ${lot.unit} of ${lot.itemName})`
        };
        
    } catch (error) {
        console.error('Failed to mark lot as expired:', error.message);
        throw new Error(`Failed to mark lot as expired: ${error.message}`);
    }
}

/**
 * Get inventory history (consumed and expired lots)
 * 
 * Returns lots that are no longer active, useful for cost tracking and analytics.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} [options] - Filter options
 * @param {number} [options.itemID] - Filter by item
 * @param {string} [options.status] - Filter by status ('consumed' or 'expired')
 * @returns {Array} Array of historical lot objects
 * @throws {Error} If validation fails
 */
function getInventoryHistory(db, options = {}) {
    try {
        // STEP 1: BUILD WHERE CONDITIONS
        const conditions = ["il.status IN ('consumed', 'expired')"];
        const params = [];
        
        // STEP 2: FILTER BY ITEM
        if (options.itemID !== undefined) {
            if (typeof options.itemID !== 'number' || options.itemID <= 0) {
                throw new Error('itemID must be a positive number');
            }
            conditions.push('il.itemID = ?');
            params.push(options.itemID);
        }
        
        // STEP 3: FILTER BY SPECIFIC STATUS
        if (options.status !== undefined) {
            const validStatuses = ['consumed', 'expired'];
            if (!validStatuses.includes(options.status)) {
                throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }
            conditions.push('il.status = ?');
            params.push(options.status);
        }
        
        // STEP 4: BUILD COMPLETE QUERY
        const whereClause = 'WHERE ' + conditions.join(' AND ');
        const orderClause = 'ORDER BY il.purchaseDate DESC, il.lotID DESC';
        const sql = buildInventoryQuery(whereClause, orderClause);
        
        console.log(`Fetching inventory history`);
        
        // STEP 5: EXECUTE QUERY
        const result = db.exec(sql, params);
        const lots = resultToObjects(result);
        
        // STEP 6: RETURN RESULTS
        console.log(`Found ${lots.length} historical lots`);
        return lots;
        
    } catch (error) {
        console.error('Failed to fetch inventory history:', error.message);
        throw new Error(`Failed to fetch inventory history: ${error.message}`);
    }
}

export {
    addInventoryLot,
    getInventoryLot,
    getInventoryForItem,
    getAllInventory,
    consumeFromInventory,
    markLotExpired,
    getInventoryHistory
};
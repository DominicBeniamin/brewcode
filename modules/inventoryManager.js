// inventoryManager.js

import { resultToObjects } from './helpers.js';

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Add a new inventory lot
 * 
 * Records a purchase or acquisition of a ingredient or supply.
 * Exactly one of ingredientID or supplyID must be provided.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} lotData - Lot information
 * @param {number} [lotData.ingredientID] - Ingredient ID (required if not supply)
 * @param {number} [lotData.supplyID] - Supply ID (required if not ingredient)
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
 *     ingredientID: 5,
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
        ingredientID,
        supplyID,
        quantityPurchased,
        unit,
        purchaseDate,
        expirationDate = null,
        costPerUnit = null,
        supplier = null,
        notes = null
    } = lotData;
    
    // STEP 2: VALIDATE EXACTLY ONE OF ingredientID OR supplyID
    if ((!ingredientID && !supplyID) || (ingredientID && supplyID)) {
        throw new Error("Either ingredientID or supplyID must be provided, but not both");
    }
    
    // STEP 3: VALIDATE QUANTITY
    if (typeof quantityPurchased !== 'number' || quantityPurchased <= 0) {
        throw new Error("quantityPurchased must be a positive number");
    }
    
    // STEP 4: VALIDATE UNIT
    if (typeof unit !== 'string' || unit.trim() === '') {
        throw new Error("unit must be a non-empty string");
    }
    
    // STEP 5: VALIDATE PURCHASE DATE
    if (!purchaseDate || typeof purchaseDate !== 'string') {
        throw new Error('Purchase date is required');
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(purchaseDate)) {
        throw new Error('Purchase date must be in ISO 8601 format (YYYY-MM-DD)');
    }
    
    // STEP 6: VALIDATE EXPIRATION DATE (if provided)
    if (expirationDate !== null) {
        if (typeof expirationDate !== 'string' || !dateRegex.test(expirationDate)) {
            throw new Error('Expiration date must be in ISO 8601 format (YYYY-MM-DD)');
        }
    }
    
    // STEP 7: VALIDATE COST PER UNIT (if provided)
    if (costPerUnit !== null && (typeof costPerUnit !== 'number' || costPerUnit < 0)) {
        throw new Error('Cost per unit must be a non-negative number or null');
    }
    
    // STEP 8: VALIDATE INGREDIENT OR SUPPLY EXISTS
    if (ingredientID) {
        const ingredientSql = `SELECT ingredientID, name FROM ingredients WHERE ingredientID = ?`;
        const ingredientResult = db.exec(ingredientSql, [ingredientID]);
        
        if (ingredientResult.length === 0 || ingredientResult[0].values.length === 0) {
            throw new Error(`Ingredient ID ${ingredientID} does not exist`);
        }
    }
    
    if (supplyID) {
        const supplySql = `SELECT supplyID, name FROM supplies WHERE supplyID = ?`;
        const supplyResult = db.exec(supplySql, [supplyID]);
        
        if (supplyResult.length === 0 || supplyResult[0].values.length === 0) {
            throw new Error(`Supply ID ${supplyID} does not exist`);
        }
    }

        // STEP 9: PREPARE LOT DATA
    const lot = {
        ingredientID: ingredientID || null,
        supplyID: supplyID || null,
        quantityPurchased: quantityPurchased,
        quantityRemaining: quantityPurchased,  // Initially same as purchased
        unit: unit.trim(),
        purchaseDate: purchaseDate,
        expirationDate: expirationDate,
        costPerUnit: costPerUnit,
        supplier: supplier?.trim() || null,
        notes: notes?.trim() || null,
        status: 'active'  // Always starts as active
    };
    
    try {
        // STEP 10: INSERT LOT
        const sql = `
            INSERT INTO inventoryLots (
                ingredientID, supplyID, quantityPurchased, quantityRemaining, 
                unit, purchaseDate, expirationDate, costPerUnit, supplier, notes, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [
            lot.ingredientID,
            lot.supplyID,
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
            ingredientID: lot.ingredientID,
            supplyID: lot.supplyID,
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
 * @returns {Object|null} Inventory lot object, or null if not found
 * @throws {Error} If lotID is invalid
 * 
 * @example
 * const lot = getInventoryLot(db, 5);
 * if (lot) {
 *     console.log(lot.quantityRemaining);  // 7.5
 *     console.log(lot.status);             // "active"
 * } else {
 *     console.log("Lot not found");
 * }
 */
function getInventoryLot(db, lotID) {
    // STEP 1: VALIDATE LOT ID
    if (typeof lotID !== 'number' || lotID <= 0) {
        throw new Error('Invalid lot ID (must be positive number)');
    }
    
    try {
        // STEP 2: QUERY DATABASE WITH JOINS
        const sql = `
            SELECT 
                il.*,
                p.name as name,
                p.brand as brand,
                it.name as ingredientTypeName,
                s.name as supplyName,
                st.name as supplyTypeName
            FROM inventoryLots il
            LEFT JOIN ingredients p ON il.ingredientID = p.ingredientID
            LEFT JOIN ingredientTypes it ON p.ingredientTypeID = it.ingredientTypeID
            LEFT JOIN supplies s ON il.supplyID = s.supplyID
            LEFT JOIN supplyTypes st ON s.supplyTypeID = st.supplyTypeID
            WHERE il.lotID = ?
        `;
        
        const result = db.exec(sql, [lotID]);
        
        // STEP 3: CONVERT RESULT TO OBJECT
        const lots = resultToObjects(result);
        
        if (lots.length === 0) {
            return null;
        }
        
        // STEP 4: RETURN LOT
        return lots[0];
        
    } catch (error) {
        console.error('Failed to fetch inventory lot:', error.message);
        throw new Error(`Failed to fetch inventory lot: ${error.message}`);
    }
}

/**
 * Get all inventory lots for a specific ingredient (FIFO ordered)
 * 
 * Returns lots ordered by purchase date (oldest first) for FIFO consumption.
 * By default, only returns active lots with remaining quantity.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} ingredientID - Ingredient to get inventory for
 * @param {Object} [options] - Filter options
 * @param {string} [options.status] - Filter by status ('active', 'consumed', 'expired')
 * @param {boolean} [options.includeEmpty] - Include lots with quantityRemaining = 0 (default: false)
 * @returns {Array} Array of inventory lot objects (FIFO ordered)
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get available inventory for apple juice (FIFO ordered)
 * const lots = getInventoryForIngredient(db, 5);
 * // Returns only active lots with remaining quantity, oldest first
 * 
 * @example
 * // Get all lots including consumed ones
 * const allLots = getInventoryForIngredient(db, 5, { 
 *     status: null,  // Don't filter by status
 *     includeEmpty: true 
 * });
 */
function getInventoryForIngredient(db, ingredientID, options = {}) {
    // STEP 1: VALIDATE INGREDIENT ID
    if (typeof ingredientID !== 'number' || ingredientID <= 0) {
        throw new Error('Invalid ingredient ID (must be positive number)');
    }
    
    try {
        // STEP 2: BUILD BASE QUERY
        let sql = `
            SELECT 
                il.*,
                p.name,
                p.brand,
                it.name as ingredientTypeName
            FROM inventoryLots il
            JOIN ingredients p ON il.ingredientID = p.ingredientID
            JOIN ingredientTypes it ON p.ingredientTypeID = it.ingredientTypeID
            WHERE il.ingredientID = ?
        `;
        
        const params = [ingredientID];
        
        // STEP 3: FILTER BY STATUS (default: active only)
        if (options.status !== undefined && options.status !== null) {
            const validStatuses = ['active', 'consumed', 'expired'];
            if (!validStatuses.includes(options.status)) {
                throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }
            sql += ' AND il.status = ?';
            params.push(options.status);
        } else if (options.status === undefined) {
            // Default: only active lots
            sql += ' AND il.status = ?';
            params.push('active');
        }
        
        // STEP 4: FILTER BY QUANTITY REMAINING (default: exclude empty)
        if (!options.includeEmpty) {
            sql += ' AND il.quantityRemaining > 0';
        }
        
        // STEP 5: ORDER BY PURCHASE DATE (FIFO - oldest first)
        sql += ' ORDER BY il.purchaseDate ASC, il.lotID ASC';
        
        console.log(`Fetching inventory for ingredient ${ingredientID}`);
        
        // STEP 6: EXECUTE QUERY
        const result = db.exec(sql, params);
        const lots = resultToObjects(result);
        
        // STEP 7: RETURN RESULTS
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
 * @param {number} [options.ingredientID] - Filter by ingredient
 * @param {number} [options.supplyID] - Filter by supply
 * @param {string} [options.status] - Filter by status ('active', 'consumed', 'expired')
 * @param {boolean} [options.includeEmpty] - Include lots with quantityRemaining = 0 (default: false)
 * @param {string} [options.purchasedAfter] - Filter by purchase date >= this date (ISO 8601)
 * @param {string} [options.purchasedBefore] - Filter by purchase date <= this date (ISO 8601)
 * @returns {Array} Array of inventory lot objects
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get all active inventory
 * const active = getAllInventory(db, { status: 'active' });
 * 
 * @example
 * // Get all inventory purchased in November 2025
 * const november = getAllInventory(db, {
 *     purchasedAfter: "2025-11-01",
 *     purchasedBefore: "2025-11-30"
 * });
 * 
 * @example
 * // Get all consumed ingredient inventory
 * const consumed = getAllInventory(db, {
 *     ingredientID: 5,
 *     status: 'consumed',
 *     includeEmpty: true
 * });
 */
function getAllInventory(db, options = {}) {
    try {
        // STEP 1: BUILD BASE QUERY WITH ALL JOINS
        let sql = `
            SELECT 
                il.*,
                p.name,
                p.brand,
                it.name as ingredientTypeName,
                s.name as supplyName,
                st.name as supplyTypeName
            FROM inventoryLots il
            LEFT JOIN ingredients p ON il.ingredientID = p.ingredientID
            LEFT JOIN ingredientTypes it ON p.ingredientTypeID = it.ingredientTypeID
            LEFT JOIN supplies s ON il.supplyID = s.supplyID
            LEFT JOIN supplyTypes st ON s.supplyTypeID = st.supplyTypeID
        `;
        
        const conditions = [];
        const params = [];
        
        // STEP 2: FILTER BY INGREDIENT
        if (options.ingredientID !== undefined) {
            if (typeof options.ingredientID !== 'number' || options.ingredientID <= 0) {
                throw new Error('ingredientID must be a positive number');
            }
            conditions.push('il.ingredientID = ?');
            params.push(options.ingredientID);
        }
        
        // STEP 3: FILTER BY SUPPLY
        if (options.supplyID !== undefined) {
            if (typeof options.supplyID !== 'number' || options.supplyID <= 0) {
                throw new Error('supplyID must be a positive number');
            }
            conditions.push('il.supplyID = ?');
            params.push(options.supplyID);
        }
        
        // STEP 4: FILTER BY STATUS
        if (options.status !== undefined) {
            const validStatuses = ['active', 'consumed', 'expired'];
            if (!validStatuses.includes(options.status)) {
                throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }
            conditions.push('il.status = ?');
            params.push(options.status);
        }
        
        // STEP 5: FILTER BY QUANTITY REMAINING (default: exclude empty)
        if (!options.includeEmpty) {
            conditions.push('il.quantityRemaining > 0');
        }
        
        // STEP 6: FILTER BY PURCHASE DATE RANGE
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
        
        // STEP 7: ADD WHERE CLAUSE IF FILTERS EXIST
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        // STEP 8: ORDER BY TYPE, THEN FIFO
        sql += ' ORDER BY il.ingredientID ASC, il.supplyID ASC, il.purchaseDate ASC, il.lotID ASC';
        
        console.log(`Fetching inventory with query: ${sql}`);
        
        // STEP 9: EXECUTE QUERY
        const result = db.exec(sql, params);
        const lots = resultToObjects(result);
        
        // STEP 10: RETURN RESULTS
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
 * @param {number} ingredientID - Ingredient to consume from
 * @param {number} quantityNeeded - Amount to consume
 * @param {string} unit - Unit of measure (must match inventory lots)
 * @returns {Object} Consumption details (lots used, total cost, etc.)
 * @throws {Error} If insufficient inventory or validation fails
 * 
 * @example
 * const result = consumeFromInventory(db, 5, 6.0, "kg");
 */
function consumeFromInventory(db, ingredientID, quantityNeeded, unit) {
    // STEP 1: VALIDATE INPUTS
    if (typeof ingredientID !== 'number' || ingredientID <= 0) {
        throw new Error('Invalid ingredient ID (must be positive number)');
    }
    
    if (typeof quantityNeeded !== 'number' || quantityNeeded <= 0) {
        throw new Error('Quantity needed must be a positive number');
    }
    
    if (typeof unit !== 'string' || unit.trim() === '') {
        throw new Error('Unit must be a non-empty string');
    }
    
    const unitNormalized = unit.trim();
    
    // STEP 2: GET AVAILABLE INVENTORY (FIFO ORDERED)
    const availableLots = getInventoryForIngredient(db, ingredientID, {
        status: 'active'
    });
    
    if (availableLots.length === 0) {
        throw new Error(`No inventory available for ingredient ID ${ingredientID}`);
    }
    
    // STEP 3: VALIDATE UNIT MATCHES
    const firstLot = availableLots[0];
    if (firstLot.unit !== unitNormalized) {
        throw new Error(`Unit mismatch: requested "${unitNormalized}" but inventory is in "${firstLot.unit}"`);
    }
    
    // STEP 4: CHECK IF SUFFICIENT INVENTORY
    const totalAvailable = availableLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
    
    if (totalAvailable < quantityNeeded) {
        throw new Error(`Insufficient inventory: need ${quantityNeeded} ${unitNormalized}, only ${totalAvailable} ${unitNormalized} available`);
    }
    
    // STEP 5: CONSUME FROM LOTS (FIFO)
    const consumed = [];
    let remaining = quantityNeeded;
    
    try {
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
        
        // STEP 6: CALCULATE SUMMARY
        const totalConsumed = consumed.reduce((sum, item) => sum + item.quantityUsed, 0);
        const totalCost = consumed.reduce((sum, item) => {
            return sum + (item.quantityUsed * (item.costPerUnit || 0));
        }, 0);
        const remainingInventory = totalAvailable - totalConsumed;
        
        console.log(`Consumed ${totalConsumed} ${unitNormalized} from ${consumed.length} lots`);
        
        // STEP 7: RETURN CONSUMPTION DETAILS
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
 * 
 * @example
 * markLotExpired(db, 5);
 */
function markLotExpired(db, lotID) {
    // STEP 1: VALIDATE LOT ID
    if (typeof lotID !== 'number' || lotID <= 0) {
        throw new Error('Invalid lot ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF LOT EXISTS
    const lot = getInventoryLot(db, lotID);
    if (!lot) {
        throw new Error(`Lot ID ${lotID} does not exist`);
    }
    
    // STEP 3: CHECK IF ALREADY EXPIRED
    if (lot.status === 'expired') {
        return {
            success: true,
            message: `Lot ${lotID} is already marked as expired`
        };
    }
    
    // STEP 4: CHECK IF ALREADY CONSUMED
    if (lot.status === 'consumed') {
        throw new Error(`Cannot mark consumed lot as expired. Lot ${lotID} is already fully consumed.`);
    }
    
    try {
        // STEP 5: UPDATE STATUS
        const sql = `UPDATE inventoryLots SET status = 'expired' WHERE lotID = ?`;
        db.run(sql, [lotID]);
        
        const itemName = lot.ingredientID 
            ? `${lot.brand} ${lot.ingredientName}` 
            : lot.supplyName;
        
        console.log(`Lot ${lotID} (${itemName}) marked as expired`);
        
        // STEP 6: RETURN SUCCESS
        return {
            success: true,
            message: `Lot ${lotID} marked as expired (${lot.quantityRemaining} ${lot.unit} of ${itemName})`
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
 * @param {number} [options.ingredientID] - Filter by ingredient
 * @param {number} [options.supplyID] - Filter by supply
 * @param {string} [options.status] - Filter by status ('consumed' or 'expired')
 * @returns {Array} Array of historical lot objects
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get all consumed inventory
 * const consumed = getInventoryHistory(db, { status: 'consumed' });
 * 
 * @example
 * // Get all expired apple juice lots
 * const expired = getInventoryHistory(db, { 
 *     ingredientID: 5, 
 *     status: 'expired' 
 * });
 */
function getInventoryHistory(db, options = {}) {
    try {
        // STEP 1: BUILD BASE QUERY
        let sql = `
            SELECT 
                il.*,
                p.name,
                p.brand,
                it.name as ingredientTypeName,
                s.name as supplyName,
                st.name as supplyTypeName
            FROM inventoryLots il
            LEFT JOIN ingredients p ON il.ingredientID = p.ingredientID
            LEFT JOIN ingredientTypes it ON p.ingredientTypeID = it.ingredientTypeID
            LEFT JOIN supplies s ON il.supplyID = s.supplyID
            LEFT JOIN supplyTypes st ON s.supplyTypeID = st.supplyTypeID
            WHERE il.status IN ('consumed', 'expired')
        `;
        
        const params = [];
        
        // STEP 2: FILTER BY INGREDIENT
        if (options.ingredientID !== undefined) {
            if (typeof options.ingredientID !== 'number' || options.ingredientID <= 0) {
                throw new Error('ingredientID must be a positive number');
            }
            sql += ' AND il.ingredientID = ?';
            params.push(options.ingredientID);
        }
        
        // STEP 3: FILTER BY SUPPLY
        if (options.supplyID !== undefined) {
            if (typeof options.supplyID !== 'number' || options.supplyID <= 0) {
                throw new Error('supplyID must be a positive number');
            }
            sql += ' AND il.supplyID = ?';
            params.push(options.supplyID);
        }
        
        // STEP 4: FILTER BY SPECIFIC STATUS
        if (options.status !== undefined) {
            const validStatuses = ['consumed', 'expired'];
            if (!validStatuses.includes(options.status)) {
                throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }
            sql += ' AND il.status = ?';
            params.push(options.status);
        }
        
        // STEP 5: ORDER BY PURCHASE DATE (most recent first for history)
        sql += ' ORDER BY il.purchaseDate DESC, il.lotID DESC';
        
        console.log(`Fetching inventory history`);
        
        // STEP 6: EXECUTE QUERY
        const result = db.exec(sql, params);
        const lots = resultToObjects(result);
        
        // STEP 7: RETURN RESULTS
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
    getInventoryForIngredient,
    getAllInventory,
    consumeFromInventory,
    markLotExpired,
    getInventoryHistory
};
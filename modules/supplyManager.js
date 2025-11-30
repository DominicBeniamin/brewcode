// supplyManager.js

import { resultToObjects, _updateActiveStatus } from './helpers.js';

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Create a new supply
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} supplyData - Supply information
 * @param {number} supplyData.supplyTypeID - Supply type this belongs to (required)
 * @param {string} supplyData.productName - Product name (required)
 * @param {string} [supplyData.brandName] - Brand name (optional)
 * @param {number} [supplyData.packageSize] - Package size (optional)
 * @param {string} [supplyData.packageUnit] - Package unit (optional)
 * @param {string} [supplyData.notes] - Additional notes (optional)
 * @returns {Object} Created supply object with supplyID
 * @throws {Error} If validation fails
 */
function createSupply(db, supplyData) {
    if (!supplyData.productName || supplyData.productName.trim() === '') {
        throw new Error('Product name is required');
    }
    
    if (!supplyData.supplyTypeID || typeof supplyData.supplyTypeID !== 'number') {
        throw new Error('Valid supplyTypeID is required');
    }
    
    const supplyTypeSql = `SELECT supplyTypeID, name, isActive FROM supplyTypes WHERE supplyTypeID = ?`;
    const supplyTypeResult = db.exec(supplyTypeSql, [supplyData.supplyTypeID]);
    
    if (supplyTypeResult.length === 0 || supplyTypeResult[0].values.length === 0) {
        throw new Error(`Supply type ID ${supplyData.supplyTypeID} does not exist`);
    }
    
    const supplyTypeName = supplyTypeResult[0].values[0][1];
    const isActive = supplyTypeResult[0].values[0][2];
    
    if (isActive === 0) {
        console.warn(`Creating supply for inactive supply type: ${supplyTypeName}`);
    }
    
    if (supplyData.packageSize !== undefined && supplyData.packageSize !== null) {
        if (typeof supplyData.packageSize !== 'number' || supplyData.packageSize <= 0) {
            throw new Error('Package size must be a positive number');
        }
        
        if (!supplyData.packageUnit || supplyData.packageUnit.trim() === '') {
            throw new Error('Package unit is required when package size is provided');
        }
    }
    
    const supply = {
        supplyTypeID: supplyData.supplyTypeID,
        brandName: supplyData.brandName?.trim() || null,
        productName: supplyData.productName.trim(),
        packageSize: supplyData.packageSize ?? null,
        packageUnit: supplyData.packageUnit?.trim() || null,
        notes: supplyData.notes?.trim() || null
    };
    
    try {
        const sql = `
            INSERT INTO supplies (supplyTypeID, brandName, productName, packageSize, packageUnit, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [
            supply.supplyTypeID,
            supply.brandName,
            supply.productName,
            supply.packageSize,
            supply.packageUnit,
            supply.notes
        ]);
        
        const [[supplyID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`Supply created successfully: ID ${supplyID}`);
        
        return {
            supplyID: supplyID,
            supplyTypeID: supply.supplyTypeID,
            supplyTypeName: supplyTypeName,
            brandName: supply.brandName,
            productName: supply.productName,
            packageSize: supply.packageSize,
            packageUnit: supply.packageUnit,
            notes: supply.notes,
            isActive: 1
        };
        
    } catch (error) {
        console.error('Failed to create supply:', error.message);
        throw new Error(`Failed to create supply: ${error.message}`);
    }
}

/**
 * Get a single supply by ID
 */
function getSupply(db, supplyID) {
    if (typeof supplyID !== 'number' || supplyID <= 0) {
        throw new Error('Invalid supply ID (must be positive number)');
    }
    
    try {
        const sql = `
            SELECT 
                s.*,
                st.name as supplyTypeName
            FROM supplies s
            JOIN supplyTypes st ON s.supplyTypeID = st.supplyTypeID
            WHERE s.supplyID = ?
        `;
        const result = db.exec(sql, [supplyID]);
        const supplies = resultToObjects(result);
        
        if (supplies.length === 0) {
            return null;
        }
        
        return supplies[0];
        
    } catch (error) {
        console.error('Failed to fetch supply:', error.message);
        throw new Error(`Failed to fetch supply: ${error.message}`);
    }
}

/**
 * Get all supplies for a specific supply type
 */
function getSuppliesBySupplyType(db, supplyTypeID, options = {}) {
    if (typeof supplyTypeID !== 'number' || supplyTypeID <= 0) {
        throw new Error('Invalid supply type ID (must be positive number)');
    }
    
    try {
        let sql = `
            SELECT 
                s.*,
                st.name as supplyTypeName
            FROM supplies s
            JOIN supplyTypes st ON s.supplyTypeID = st.supplyTypeID
            WHERE s.supplyTypeID = ?
        `;
        
        const params = [supplyTypeID];
        
        if (options.isActive !== undefined) {
            if (options.isActive !== 0 && options.isActive !== 1) {
                throw new Error('isActive must be 0 or 1');
            }
            sql += ' AND s.isActive = ?';
            params.push(options.isActive);
        }
        
        sql += ' ORDER BY s.brandName ASC, s.productName ASC';
        
        console.log(`Fetching supplies for supply type ${supplyTypeID}`);
        
        const result = db.exec(sql, params);
        const supplies = resultToObjects(result);
        
        console.log(`Found ${supplies.length} supplies`);
        return supplies;
        
    } catch (error) {
        console.error('Failed to fetch supplies:', error.message);
        throw new Error(`Failed to fetch supplies: ${error.message}`);
    }
}

/**
 * Get all supplies with optional filters
 */
function getAllSupplies(db, options = {}) {
    try {
        let sql = `
            SELECT 
                s.*,
                st.name as supplyTypeName
            FROM supplies s
            JOIN supplyTypes st ON s.supplyTypeID = st.supplyTypeID
        `;
        
        const conditions = [];
        const params = [];
        
        if (options.supplyTypeID !== undefined) {
            if (typeof options.supplyTypeID !== 'number' || options.supplyTypeID <= 0) {
                throw new Error('supplyTypeID must be a positive number');
            }
            conditions.push('s.supplyTypeID = ?');
            params.push(options.supplyTypeID);
        }
        
        if (options.isActive !== undefined) {
            if (options.isActive !== 0 && options.isActive !== 1) {
                throw new Error('isActive must be 0 or 1');
            }
            conditions.push('s.isActive = ?');
            params.push(options.isActive);
        }
        
        if (options.brandName !== undefined) {
            if (typeof options.brandName !== 'string' || options.brandName.trim() === '') {
                throw new Error('brandName must be a non-empty string');
            }
            conditions.push('s.brandName LIKE ?');
            params.push(`%${options.brandName}%`);
        }
        
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        sql += ' ORDER BY st.name ASC, s.brandName ASC, s.productName ASC';
        
        console.log(`Fetching supplies with query: ${sql}`);
        
        const result = db.exec(sql, params);
        const supplies = resultToObjects(result);
        
        console.log(`Found ${supplies.length} supplies`);
        return supplies;
        
    } catch (error) {
        console.error('Failed to fetch supplies:', error.message);
        throw new Error(`Failed to fetch supplies: ${error.message}`);
    }
}

/**
 * Update a supply
 */
function updateSupply(db, supplyID, updates) {
    if (typeof supplyID !== 'number' || supplyID <= 0) {
        throw new Error('Invalid supply ID (must be positive number)');
    }
    
    const supply = getSupply(db, supplyID);
    if (!supply) {
        throw new Error(`Supply ID ${supplyID} does not exist`);
    }
    
    if ('productName' in updates && (!updates.productName || updates.productName.trim() === '')) {
        throw new Error('Product name cannot be empty');
    }
    
    if ('supplyTypeID' in updates) {
        if (typeof updates.supplyTypeID !== 'number' || updates.supplyTypeID <= 0) {
            throw new Error('supplyTypeID must be a positive number');
        }
        
        const supplyTypeSql = `SELECT supplyTypeID FROM supplyTypes WHERE supplyTypeID = ?`;
        const supplyTypeResult = db.exec(supplyTypeSql, [updates.supplyTypeID]);
        if (supplyTypeResult.length === 0 || supplyTypeResult[0].values.length === 0) {
            throw new Error(`Supply type ID ${updates.supplyTypeID} does not exist`);
        }
    }
    
    if ('packageSize' in updates && updates.packageSize !== null) {
        if (typeof updates.packageSize !== 'number' || updates.packageSize <= 0) {
            throw new Error('Package size must be a positive number or null');
        }
    }
    
    if ('packageSize' in updates && updates.packageSize !== null) {
        if ('packageUnit' in updates) {
            if (!updates.packageUnit || updates.packageUnit.trim() === '') {
                throw new Error('Package unit is required when package size is provided');
            }
        } else {
            if (!supply.packageUnit) {
                throw new Error('Package unit is required when package size is provided');
            }
        }
    }
    
    const allowedFields = ['brandName', 'productName', 'supplyTypeID', 'packageSize', 'packageUnit', 'notes'];
    
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
        if (key === 'brandName' || key === 'productName' || key === 'packageUnit' || key === 'notes') {
            setClauses.push(`${key} = ?`);
            values.push(value ? value.trim() : null);
        } else {
            setClauses.push(`${key} = ?`);
            values.push(value);
        }
    }
    
    const sql = `UPDATE supplies SET ${setClauses.join(', ')} WHERE supplyID = ?`;
    values.push(supplyID);
    
    try {
        db.run(sql, values);
        
        console.log(`Supply ${supplyID} updated successfully`);
        
        return {
            success: true,
            message: `Supply "${supply.productName}" updated successfully`,
            updatedFields: Object.entries(filteredUpdates).map(([key, value]) => ({
                field: key,
                newValue: value
            }))
        };
        
    } catch (error) {
        console.error('Failed to update supply:', error.message);
        throw new Error(`Failed to update supply: ${error.message}`);
    }
}

/**
 * Set supply active status
 */
function setSupplyStatus(db, supplyID, isActive) {
    if (typeof supplyID !== 'number' || supplyID <= 0) {
        throw new Error('Invalid supply ID (must be positive number)');
    }
    
    if (isActive !== 0 && isActive !== 1) {
        throw new Error('isActive must be 0 or 1');
    }
    
    const supply = getSupply(db, supplyID);
    if (!supply) {
        throw new Error(`Supply ID ${supplyID} does not exist`);
    }
    
    if (supply.isActive === isActive) {
        const status = isActive === 1 ? 'active' : 'inactive';
        return {
            success: true,
            message: `Supply "${supply.productName}" is already ${status}`
        };
    }
    
    try {
        _updateActiveStatus(db, 'supplies', 'supplyID', supplyID, isActive);
        
        const status = isActive === 1 ? 'activated' : 'deactivated';
        console.log(`Supply "${supply.productName}" ${status}`);
        
        return {
            success: true,
            message: `Supply "${supply.productName}" ${status} successfully`
        };
        
    } catch (error) {
        console.error('Failed to update supply status:', error.message);
        throw new Error(`Failed to update supply status: ${error.message}`);
    }
}

export {
    createSupply,
    getSupply,
    getSuppliesBySupplyType,
    getAllSupplies,
    updateSupply,
    setSupplyStatus    
};
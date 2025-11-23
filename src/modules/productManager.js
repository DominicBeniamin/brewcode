// productManager.js

import { resultToObjects, _updateActiveStatus } from './helpers.js';

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Create a new product
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} productData - Product information
 * @param {number} productData.ingredientTypeID - Ingredient type this product belongs to (required)
 * @param {string} productData.productName - Product name (required)
 * @param {string} [productData.brandName] - Brand name (optional, NULL for homemade)
 * @param {number} [productData.packageSize] - Package size (optional)
 * @param {string} [productData.packageUnit] - Package unit (optional, e.g., "L", "kg")
 * @param {string} [productData.notes] - Additional notes (optional)
 * @returns {Object} Created product object with productID
 * @throws {Error} If validation fails
 * 
 * @example
 * // Fixed-size product
 * const product = createProduct(db, {
 *     ingredientTypeID: 1,
 *     brandName: "K Classic",
 *     productName: "Apfel Saft",
 *     packageSize: 1,
 *     packageUnit: "L",
 *     notes: "Available at Kaufland"
 * });
 * 
 * @example
 * // Variable-size product (size recorded at inventory level)
 * const product = createProduct(db, {
 *     ingredientTypeID: 1,
 *     brandName: "Local Farm",
 *     productName: "Fresh Pressed Apple Juice",
 *     notes: "From farmer's market - size varies"
 * });
 */
function createProduct(db, productData) {
    // STEP 1: VALIDATE REQUIRED FIELDS
    if (!productData.productName || productData.productName.trim() === '') {
        throw new Error('Product name is required');
    }
    
    if (!productData.ingredientTypeID || typeof productData.ingredientTypeID !== 'number') {
        throw new Error('Valid ingredientTypeID is required');
    }
    
    // STEP 2: VALIDATE INGREDIENT TYPE EXISTS
    const ingredientTypeSql = `SELECT ingredientTypeID, name, isActive FROM ingredientTypes WHERE ingredientTypeID = ?`;
    const ingredientTypeResult = db.exec(ingredientTypeSql, [productData.ingredientTypeID]);
    
    if (ingredientTypeResult.length === 0 || ingredientTypeResult[0].values.length === 0) {
        throw new Error(`Ingredient type ID ${productData.ingredientTypeID} does not exist`);
    }
    
    const ingredientTypeName = ingredientTypeResult[0].values[0][1];
    const isActive = ingredientTypeResult[0].values[0][2];
    
    if (isActive === 0) {
        console.warn(`Creating product for inactive ingredient type: ${ingredientTypeName}`);
    }
    
    // STEP 3: VALIDATE PACKAGE SIZE AND UNIT
    if (productData.packageSize !== undefined && productData.packageSize !== null) {
        if (typeof productData.packageSize !== 'number' || productData.packageSize <= 0) {
            throw new Error('Package size must be a positive number');
        }
        
        if (!productData.packageUnit || productData.packageUnit.trim() === '') {
            throw new Error('Package unit is required when package size is provided');
        }
    }
    
    // STEP 4: PREPARE DATA
    const product = {
        ingredientTypeID: productData.ingredientTypeID,
        brandName: productData.brandName?.trim() || null,
        productName: productData.productName.trim(),
        packageSize: productData.packageSize ?? null,
        packageUnit: productData.packageUnit?.trim() || null,
        notes: productData.notes?.trim() || null
    };
    
    try {
        // STEP 5: INSERT PRODUCT
        const sql = `
            INSERT INTO products (ingredientTypeID, brandName, productName, packageSize, packageUnit, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [
            product.ingredientTypeID,
            product.brandName,
            product.productName,
            product.packageSize,
            product.packageUnit,
            product.notes
        ]);
        
        // STEP 6: GET THE NEW PRODUCT ID
        const [[productID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`Product created successfully: ID ${productID}`);
        
        // STEP 7: RETURN COMPLETE OBJECT
        return {
            productID: productID,
            ingredientTypeID: product.ingredientTypeID,
            ingredientTypeName: ingredientTypeName,
            brandName: product.brandName,
            productName: product.productName,
            packageSize: product.packageSize,
            packageUnit: product.packageUnit,
            notes: product.notes,
            isActive: 1
        };
        
    } catch (error) {
        console.error('Failed to create product:', error.message);
        throw new Error(`Failed to create product: ${error.message}`);
    }
}

/**
 * Get a single product by ID
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} productID - ID of the product to retrieve
 * @returns {Object|null} Product object, or null if not found
 * @throws {Error} If productID is invalid
 * 
 * @example
 * const product = getProduct(db, 5);
 * if (product) {
 *     console.log(product.brandName);    // "K Classic"
 *     console.log(product.productName);  // "Apfel Saft"
 * } else {
 *     console.log("Product not found");
 * }
 */
function getProduct(db, productID) {
    // STEP 1: VALIDATE PRODUCT ID
    if (typeof productID !== 'number' || productID <= 0) {
        throw new Error('Invalid product ID (must be positive number)');
    }
    
    try {
        // STEP 2: QUERY DATABASE WITH JOIN TO GET INGREDIENT TYPE NAME
        const sql = `
            SELECT 
                p.*,
                it.name as ingredientTypeName
            FROM products p
            JOIN ingredientTypes it ON p.ingredientTypeID = it.ingredientTypeID
            WHERE p.productID = ?
        `;
        const result = db.exec(sql, [productID]);
        
        // STEP 3: CONVERT RESULT TO OBJECT
        const products = resultToObjects(result);
        
        if (products.length === 0) {
            return null;
        }
        
        // STEP 4: RETURN PRODUCT
        return products[0];
        
    } catch (error) {
        console.error('Failed to fetch product:', error.message);
        throw new Error(`Failed to fetch product: ${error.message}`);
    }
}

/**
 * Get all products for a specific ingredient type
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} ingredientTypeID - Ingredient type to get products for
 * @param {Object} [options] - Filter options
 * @param {number} [options.isActive] - Filter by active status (0 or 1)
 * @returns {Array} Array of product objects
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get all apple juice products
 * const appleJuices = getProductsByIngredientType(db, 1);
 * 
 * @example
 * // Get only active apple juice products
 * const activeAppleJuices = getProductsByIngredientType(db, 1, { isActive: 1 });
 */
function getProductsByIngredientType(db, ingredientTypeID, options = {}) {
    // STEP 1: VALIDATE INGREDIENT TYPE ID
    if (typeof ingredientTypeID !== 'number' || ingredientTypeID <= 0) {
        throw new Error('Invalid ingredient type ID (must be positive number)');
    }
    
    try {
        // STEP 2: BUILD QUERY
        let sql = `
            SELECT 
                p.*,
                it.name as ingredientTypeName
            FROM products p
            JOIN ingredientTypes it ON p.ingredientTypeID = it.ingredientTypeID
            WHERE p.ingredientTypeID = ?
        `;
        
        const params = [ingredientTypeID];
        
        // STEP 3: FILTER BY ACTIVE STATUS (if provided)
        if (options.isActive !== undefined) {
            if (options.isActive !== 0 && options.isActive !== 1) {
                throw new Error('isActive must be 0 or 1');
            }
            sql += ' AND p.isActive = ?';
            params.push(options.isActive);
        }
        
        // STEP 4: ADD ORDERING
        sql += ' ORDER BY p.brandName ASC, p.productName ASC';
        
        console.log(`Fetching products for ingredient type ${ingredientTypeID}`);
        
        // STEP 5: EXECUTE QUERY
        const result = db.exec(sql, params);
        const products = resultToObjects(result);
        
        // STEP 6: RETURN RESULTS
        console.log(`Found ${products.length} products`);
        return products;
        
    } catch (error) {
        console.error('Failed to fetch products:', error.message);
        throw new Error(`Failed to fetch products: ${error.message}`);
    }
}

/**
 * Get all products with optional filters
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} [options] - Filter options
 * @param {number} [options.ingredientTypeID] - Filter by ingredient type
 * @param {number} [options.isActive] - Filter by active status (0 or 1)
 * @param {string} [options.brandName] - Filter by brand name (partial match)
 * @returns {Array} Array of product objects
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get all products
 * const all = getAllProducts(db);
 * 
 * @example
 * // Get only active products
 * const active = getAllProducts(db, { isActive: 1 });
 * 
 * @example
 * // Get all K Classic products
 * const kClassic = getAllProducts(db, { brandName: "K Classic" });
 * 
 * @example
 * // Get active apple juice products
 * const activeAppleJuice = getAllProducts(db, { 
 *     ingredientTypeID: 1, 
 *     isActive: 1 
 * });
 */
function getAllProducts(db, options = {}) {
    try {
        // STEP 1: BUILD BASE QUERY WITH JOIN
        let sql = `
            SELECT 
                p.*,
                it.name as ingredientTypeName
            FROM products p
            JOIN ingredientTypes it ON p.ingredientTypeID = it.ingredientTypeID
        `;
        
        const conditions = [];
        const params = [];
        
        // STEP 2: FILTER BY INGREDIENT TYPE
        if (options.ingredientTypeID !== undefined) {
            if (typeof options.ingredientTypeID !== 'number' || options.ingredientTypeID <= 0) {
                throw new Error('ingredientTypeID must be a positive number');
            }
            conditions.push('p.ingredientTypeID = ?');
            params.push(options.ingredientTypeID);
        }
        
        // STEP 3: FILTER BY ACTIVE STATUS
        if (options.isActive !== undefined) {
            if (options.isActive !== 0 && options.isActive !== 1) {
                throw new Error('isActive must be 0 or 1');
            }
            conditions.push('p.isActive = ?');
            params.push(options.isActive);
        }
        
        // STEP 4: FILTER BY BRAND NAME
        if (options.brandName !== undefined) {
            if (typeof options.brandName !== 'string' || options.brandName.trim() === '') {
                throw new Error('brandName must be a non-empty string');
            }
            conditions.push('p.brandName LIKE ?');
            params.push(`%${options.brandName}%`);
        }
        
        // STEP 5: ADD WHERE CLAUSE IF FILTERS EXIST
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        // STEP 6: ADD ORDERING
        sql += ' ORDER BY it.name ASC, p.brandName ASC, p.productName ASC';
        
        console.log(`Fetching products with query: ${sql}`);
        
        // STEP 7: EXECUTE QUERY
        const result = db.exec(sql, params);
        const products = resultToObjects(result);
        
        // STEP 8: RETURN RESULTS
        console.log(`Found ${products.length} products`);
        return products;
        
    } catch (error) {
        console.error('Failed to fetch products:', error.message);
        throw new Error(`Failed to fetch products: ${error.message}`);
    }
}

/**
 * Update a product
 * 
 * Updates only the provided fields. Other fields remain unchanged.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} productID - Product to update
 * @param {Object} updates - Fields to update
 * @param {string} [updates.brandName] - New brand name
 * @param {string} [updates.productName] - New product name
 * @param {number} [updates.ingredientTypeID] - New ingredient type
 * @param {number} [updates.packageSize] - New package size
 * @param {string} [updates.packageUnit] - New package unit
 * @param {string} [updates.notes] - New notes
 * @returns {Object} { success: boolean, message: string, updatedFields: array }
 * @throws {Error} If validation fails
 * 
 * @example
 * const result = updateProduct(db, 5, {
 *     packageSize: 5,
 *     packageUnit: "L",
 *     notes: "Now available in 5L boxes"
 * });
 */
function updateProduct(db, productID, updates) {
    // STEP 1: VALIDATE PRODUCT ID
    if (typeof productID !== 'number' || productID <= 0) {
        throw new Error('Invalid product ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF PRODUCT EXISTS
    const product = getProduct(db, productID);
    if (!product) {
        throw new Error(`Product ID ${productID} does not exist`);
    }
    
    // STEP 3: VALIDATE FIELDS
    
    // Validate productName (if provided)
    if ('productName' in updates && (!updates.productName || updates.productName.trim() === '')) {
        throw new Error('Product name cannot be empty');
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
            if (!product.packageUnit) {
                throw new Error('Package unit is required when package size is provided');
            }
        }
    }
    
    // STEP 4: FILTER TO ALLOWED FIELDS
    const allowedFields = ['brandName', 'productName', 'ingredientTypeID', 'packageSize', 'packageUnit', 'notes'];
    
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
        if (key === 'brandName' || key === 'productName' || key === 'packageUnit' || key === 'notes') {
            // String fields - trim or set to null
            setClauses.push(`${key} = ?`);
            values.push(value ? value.trim() : null);
            
        } else {
            // Number fields (ingredientTypeID, packageSize) - use as-is
            setClauses.push(`${key} = ?`);
            values.push(value);
        }
    }
    
    const sql = `UPDATE products SET ${setClauses.join(', ')} WHERE productID = ?`;
    values.push(productID);
    
    try {
        // STEP 6: EXECUTE UPDATE
        db.run(sql, values);
        
        console.log(`Product ${productID} updated successfully`);
        
        // STEP 7: RETURN SUCCESS
        return {
            success: true,
            message: `Product "${product.productName}" updated successfully`,
            updatedFields: Object.entries(filteredUpdates).map(([key, value]) => ({
                field: key,
                newValue: value
            }))
        };
        
    } catch (error) {
        console.error('Failed to update product:', error.message);
        throw new Error(`Failed to update product: ${error.message}`);
    }
}

/**
 * Set product active status
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} productID - Product to update
 * @param {number} isActive - New status (1 = active, 0 = inactive)
 * @returns {Object} { success: boolean, message: string }
 * @throws {Error} If validation fails
 * 
 * @example
 * // Deactivate a product
 * setProductStatus(db, 5, 0);
 * 
 * @example
 * // Reactivate a product
 * setProductStatus(db, 5, 1);
 */
function setProductStatus(db, productID, isActive) {
    // STEP 1: VALIDATE PRODUCT ID
    if (typeof productID !== 'number' || productID <= 0) {
        throw new Error('Invalid product ID (must be positive number)');
    }
    
    // STEP 2: VALIDATE isActive
    if (isActive !== 0 && isActive !== 1) {
        throw new Error('isActive must be 0 or 1');
    }
    
    // STEP 3: CHECK IF PRODUCT EXISTS
    const product = getProduct(db, productID);
    if (!product) {
        throw new Error(`Product ID ${productID} does not exist`);
    }
    
    // STEP 4: CHECK IF ALREADY AT DESIRED STATUS
    if (product.isActive === isActive) {
        const status = isActive === 1 ? 'active' : 'inactive';
        return {
            success: true,
            message: `Product "${product.productName}" is already ${status}`
        };
    }
    
    try {
        // STEP 5: UPDATE STATUS
        _updateActiveStatus(db, 'products', 'productID', productID, isActive);
        
        const status = isActive === 1 ? 'activated' : 'deactivated';
        console.log(`Product "${product.productName}" ${status}`);
        
        // STEP 6: RETURN SUCCESS
        return {
            success: true,
            message: `Product "${product.productName}" ${status} successfully`
        };
        
    } catch (error) {
        console.error('Failed to update product status:', error.message);
        throw new Error(`Failed to update product status: ${error.message}`);
    }
}

export {
    createProduct,
    getProduct,
    getProductsByIngredientType,
    getAllProducts,
    updateProduct,
    setProductStatus
};
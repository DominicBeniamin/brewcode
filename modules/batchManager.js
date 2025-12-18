// batchManager.js

import { resultToObjects } from './helpers.js';
import { getRecipeWithDetails } from './recipeManager.js';
import { consumeFromInventory } from './inventoryManager.js';
import { assignEquipmentToStage, releaseEquipmentFromStage } from './equipmentManager.js';
import { convert } from './conversions.js';

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Create a new batch from a recipe
 * 
 * Creates a complete batch by snapshotting recipe data (stages + ingredients).
 * Recipe changes won't affect this batch after creation.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} batchData - Batch information
 * @param {number} batchData.recipeID - Recipe to base batch on (required)
 * @param {string} batchData.name - Batch name (required)
 * @param {number} batchData.actualBatchSizeL - Batch size in liters (required)
 * @param {string} [batchData.notes] - General batch notes (optional)
 * @returns {Object} Created batch object with all stages and ingredients
 * @throws {Error} If validation fails or recipe doesn't exist
 * 
 * @example
 * const batch = createBatch(db, {
 *     recipeID: 5,
 *     name: "Traditional Mead - Batch #1",
 *     actualBatchSizeL: 10,
 *     notes: "First attempt at mead making"
 * });
 * 
 * // Returns:
 * {
 *   batchID: 1,
 *   name: "Traditional Mead - Batch #1",
 *   recipeID: 5,
 *   recipeName: "Traditional Mead",
 *   actualBatchSizeL: 10,
 *   status: "planned",
 *   stages: [
 *     {
 *       batchStageID: 1,
 *       stageName: "Must Preparation",
 *       stageOrder: 1,
 *       status: "pending",
 *       ingredients: [
 *         {
 *           batchIngredientID: 1,
 *           ingredientTypeName: "Honey (Wildflower)",
 *           plannedAmount: 3.0,  // Scaled from recipe
 *           plannedUnit: "kg"
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
function createBatch(db, batchData) {
    // STEP 1: VALIDATE REQUIRED FIELDS
    if (!batchData.recipeID || typeof batchData.recipeID !== 'number') {
        throw new Error('Valid recipeID is required');
    }
    
    if (!batchData.name || batchData.name.trim() === '') {
        throw new Error('Batch name is required');
    }
    
    if (!batchData.actualBatchSizeL || typeof batchData.actualBatchSizeL !== 'number' || batchData.actualBatchSizeL <= 0) {
        throw new Error('actualBatchSizeL must be a positive number');
    }
    
    // STEP 2: GET RECIPE WITH FULL DETAILS
    const recipe = getRecipeWithDetails(db, batchData.recipeID);
    if (!recipe) {
        throw new Error(`Recipe ID ${batchData.recipeID} does not exist`);
    }
    
    // STEP 3: VALIDATE RECIPE IS NOT A DRAFT
    if (recipe.isDraft === 1) {
        throw new Error('Cannot create batch from draft recipe. Finalize recipe first.');
    }
    
    // STEP 4: VALIDATE RECIPE HAS STAGES
    if (!recipe.stages || recipe.stages.length === 0) {
        throw new Error('Recipe has no stages. Cannot create batch.');
    }
    
    // STEP 5: CALCULATE SCALING FACTOR
    const scalingFactor = recipe.batchSizeL 
        ? batchData.actualBatchSizeL / recipe.batchSizeL 
        : 1; // If no recipe batch size, don't scale
    
    console.log(`Creating batch with scaling factor: ${scalingFactor}x (${batchData.actualBatchSizeL}L / ${recipe.batchSizeL}L)`);
    
    try {
        // STEP 6: BEGIN TRANSACTION
        db.run("BEGIN TRANSACTION");
        
        // STEP 7: INSERT BATCH (METADATA)
        const batchSql = `
            INSERT INTO batches (recipeID, name, recipeName, actualBatchSizeL, status, notes)
            VALUES (?, ?, ?, ?, 'planned', ?)
        `;
        
        db.run(batchSql, [
            batchData.recipeID,
            batchData.name.trim(),
            recipe.name, // Snapshot recipe name
            batchData.actualBatchSizeL,
            batchData.notes?.trim() || null
        ]);
        
        // Get new batch ID
        const [[batchID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        console.log(`Batch created: ID ${batchID}`);
        
        // STEP 8: COPY RECIPE STAGES
        const createdStages = [];
        
        for (const recipeStage of recipe.stages) {
            // Insert batch stage (snapshot from recipe)
            const stageSql = `
                INSERT INTO batchStages (
                    batchID, stageTypeID, stageName, stageOrder, 
                    instructions, expectedDurationDays, status
                )
                VALUES (?, ?, ?, ?, ?, ?, 'pending')
            `;
            
            db.run(stageSql, [
                batchID,
                recipeStage.stageTypeID,
                recipeStage.stageName, // Snapshot stage name
                recipeStage.stageOrder,
                recipeStage.instructions,
                recipeStage.expectedDurationDays
            ]);
            
            // Get new batch stage ID
            const [[batchStageID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
            
            console.log(`  Stage ${recipeStage.stageOrder} created: ID ${batchStageID}`);
            
            // STEP 9: COPY AND SCALE INGREDIENTS
            const createdIngredients = [];
            
            if (recipeStage.ingredients && recipeStage.ingredients.length > 0) {
                for (const recipeIngredient of recipeStage.ingredients) {
                    // Calculate scaled amount based on scalingMethod
                    let scaledAmount;
                    
                    switch (recipeIngredient.scalingMethod) {
                        case 'linear':
                            // Scale proportionally
                            scaledAmount = recipeIngredient.amount * scalingFactor;
                            break;
                        
                        case 'fixed':
                            // Always same amount (e.g., 1 yeast packet)
                            scaledAmount = recipeIngredient.amount;
                            break;
                        
                        case 'step':
                            // Scale in steps (e.g., 1 packet per 20L)
                            // For step scaling, we need a step size (assume 20L default)
                            const stepSize = 20;
                            const steps = Math.ceil(batchData.actualBatchSizeL / stepSize);
                            scaledAmount = recipeIngredient.amount * steps;
                            break;
                        
                        default:
                            // Default to linear
                            scaledAmount = recipeIngredient.amount * scalingFactor;
                    }
                    
                    // Insert batch ingredient (snapshot from recipe)
                    const ingredientSql = `
                        INSERT INTO batchIngredients (
                            batchStageID, ingredientTypeID, ingredientTypeName,
                            plannedAmount, plannedUnit, notes
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    
                    db.run(ingredientSql, [
                        batchStageID,
                        recipeIngredient.ingredientTypeID,
                        recipeIngredient.ingredientTypeName, // Snapshot ingredient type name
                        scaledAmount,
                        recipeIngredient.unit,
                        recipeIngredient.notes
                    ]);
                    
                    // Get new batch ingredient ID
                    const [[batchIngredientID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
                    
                    console.log(`    Ingredient created: ID ${batchIngredientID} (${scaledAmount} ${recipeIngredient.unit})`);
                    
                    // Store ingredient info
                    createdIngredients.push({
                        batchIngredientID: batchIngredientID,
                        ingredientTypeID: recipeIngredient.ingredientTypeID,
                        ingredientTypeName: recipeIngredient.ingredientTypeName,
                        plannedAmount: scaledAmount,
                        plannedUnit: recipeIngredient.unit,
                        actualAmount: null,
                        actualUnit: null,
                        ingredientID: null,
                        ingredientName: null,
                        notes: recipeIngredient.notes
                    });
                }
            }
            
            // Store stage info with ingredients
            createdStages.push({
                batchStageID: batchStageID,
                stageTypeID: recipeStage.stageTypeID,
                stageName: recipeStage.stageName,
                stageOrder: recipeStage.stageOrder,
                instructions: recipeStage.instructions,
                expectedDurationDays: recipeStage.expectedDurationDays,
                startDate: null,
                endDate: null,
                status: 'pending',
                ingredients: createdIngredients
            });
        }
        
        // STEP 10: COMMIT TRANSACTION
        db.run("COMMIT");
        
        console.log(`Batch ${batchID} created successfully with ${createdStages.length} stages`);
        
        // STEP 11: RETURN COMPLETE BATCH OBJECT
        return {
            batchID: batchID,
            name: batchData.name.trim(),
            recipeID: batchData.recipeID,
            recipeName: recipe.name,
            actualBatchSizeL: batchData.actualBatchSizeL,
            startDate: null,
            endDate: null,
            currentStageID: null,
            status: 'planned',
            abandonReason: null,
            notes: batchData.notes?.trim() || null,
            stages: createdStages
        };
        
    } catch (error) {
        // ROLLBACK ON ERROR
        db.run("ROLLBACK");
        console.error('Failed to create batch:', error.message);
        throw new Error(`Failed to create batch: ${error.message}`);
    }
}

/**
 * Get a single batch by ID
 * 
 * Retrieves basic batch information (metadata only).
 * Does NOT include stages, ingredients, measurements, or equipment.
 * Use getBatchWithDetails() for complete batch information.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchID - ID of the batch to retrieve
 * @returns {Object|null} Batch object with basic info, or null if not found
 * @throws {Error} If batchID is invalid
 * 
 * @example
 * const batch = getBatch(db, 5);
 * if (batch) {
 *     console.log(batch.name);              // "Traditional Mead - Batch #1"
 *     console.log(batch.status);            // "active"
 *     console.log(batch.actualBatchSizeL);  // 10
 * } else {
 *     console.log("Batch not found");
 * }
 */
function getBatch(db, batchID) {
    // STEP 1: VALIDATE BATCH ID
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    try {
        // STEP 2: QUERY DATABASE
        const sql = `SELECT * FROM batches WHERE batchID = ?`;
        const result = db.exec(sql, [batchID]);
        
        // STEP 3: CONVERT RESULT TO OBJECT
        const batches = resultToObjects(result);
        
        if (batches.length === 0) {
            return null;
        }
        
        // STEP 4: RETURN BATCH
        return batches[0];
        
    } catch (error) {
        console.error('Failed to fetch batch:', error.message);
        throw new Error(`Failed to fetch batch: ${error.message}`);
    }
}

/**
 * Get complete batch with all stages, ingredients, measurements, and equipment
 * 
 * Returns a fully populated batch object including:
 * - All stages (in order)
 * - All ingredients for each stage (planned vs actual)
 * - All measurements for each stage
 * - All equipment assigned to each stage
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchID - Batch to retrieve
 * @returns {Object|null} Complete batch object or null if not found
 * @throws {Error} If database operation fails
 * 
 * @example
 * const batch = getBatchWithDetails(db, 5);
 * // Returns:
 * {
 *   batchID: 5,
 *   name: "Traditional Mead - Batch #1",
 *   status: "active",
 *   ...metadata...,
 *   stages: [
 *     {
 *       batchStageID: 1,
 *       stageName: "Must Preparation",
 *       status: "completed",
 *       ingredients: [...],
 *       measurements: [...],
 *       equipment: [...]
 *     },
 *     {
 *       batchStageID: 2,
 *       stageName: "Fermentation",
 *       status: "active",
 *       ingredients: [...],
 *       measurements: [...],
 *       equipment: [...]
 *     }
 *   ]
 * }
 */
function getBatchWithDetails(db, batchID) {
    // STEP 1: GET BASIC BATCH
    const batch = getBatch(db, batchID);
    if (!batch) {
        return null;  // Batch doesn't exist
    }
    
    try {
        // STEP 2: GET ALL STAGES
        const stagesSql = `
            SELECT 
                batchStageID,
                stageTypeID,
                stageName,
                stageOrder,
                instructions,
                expectedDurationDays,
                startDate,
                endDate,
                status,
                allowMultipleAdditions,
                notes
            FROM batchStages
            WHERE batchID = ?
            ORDER BY stageOrder
        `;
        
        const stagesResult = db.exec(stagesSql, [batchID]);
        const stages = resultToObjects(stagesResult);
        
        // STEP 3: GET ALL INGREDIENTS (if stages exist)
        if (stages.length > 0) {
            const stageIDs = stages.map(s => s.batchStageID);
            
            // Query all ingredients for all stages
            const ingredientsSql = `
                SELECT 
                    batchIngredientID,
                    batchStageID,
                    ingredientTypeID,
                    ingredientTypeName,
                    ingredientID,
                    ingredientName,
                    plannedAmount,
                    plannedUnit,
                    actualAmount,
                    actualUnit,
                    inventoryLotID,
                    notes
                FROM batchIngredients
                WHERE batchStageID IN (${stageIDs.join(',')})
                ORDER BY batchIngredientID
            `;
            
            const ingredientsResult = db.exec(ingredientsSql);
            const allIngredients = resultToObjects(ingredientsResult);
            
            // STEP 4: GET ALL MEASUREMENTS (if stages exist)
            const measurementsSql = `
                SELECT 
                    measurementID,
                    batchStageID,
                    measurementDate,
                    measurementType,
                    value,
                    unit,
                    notes
                FROM batchMeasurements
                WHERE batchStageID IN (${stageIDs.join(',')})
                ORDER BY measurementDate DESC
            `;
            
            const measurementsResult = db.exec(measurementsSql);
            const allMeasurements = resultToObjects(measurementsResult);
            
            // STEP 5: GET ALL EQUIPMENT (if stages exist)
            const equipmentSql = `
                SELECT 
                    eu.usageID,
                    eu.batchStageID,
                    eu.equipmentID,
                    e.name as equipmentName,
                    e.type as equipmentType,
                    e.capacityL,
                    eu.inUseDate,
                    eu.releaseDate,
                    eu.status
                FROM equipmentUsage eu
                JOIN equipment e ON eu.equipmentID = e.equipmentID
                WHERE eu.batchStageID IN (${stageIDs.join(',')})
                ORDER BY eu.inUseDate DESC
            `;
            
            const equipmentResult = db.exec(equipmentSql);
            const allEquipment = resultToObjects(equipmentResult);
            
            // STEP 6: ATTACH DATA TO STAGES
            for (const stage of stages) {
                stage.ingredients = allIngredients.filter(ing => ing.batchStageID === stage.batchStageID);
                stage.measurements = allMeasurements.filter(meas => meas.batchStageID === stage.batchStageID);
                stage.equipment = allEquipment.filter(eq => eq.batchStageID === stage.batchStageID);
            }
        }
        
        // Always set stages (populated or empty)
        batch.stages = stages;
        
        // STEP 7: RETURN COMPLETE BATCH
        return batch;
        
    } catch (error) {
        console.error('Failed to fetch batch details:', error.message);
        throw new Error(`Failed to fetch batch details: ${error.message}`);
    }
}

/**
 * Get all batches with optional filters
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} [options] - Filter options
 * @param {string} [options.status] - Filter by status ('planned', 'active', 'completed', 'abandoned')
 * @param {number} [options.recipeID] - Filter by recipe
 * @param {string} [options.startedAfter] - Filter by start date >= this date (ISO 8601: YYYY-MM-DD)
 * @param {string} [options.startedBefore] - Filter by start date <= this date (ISO 8601: YYYY-MM-DD)
 * @param {string} [options.completedAfter] - Filter by end date >= this date (ISO 8601: YYYY-MM-DD)
 * @param {string} [options.completedBefore] - Filter by end date <= this date (ISO 8601: YYYY-MM-DD)
 * @returns {Array} Array of batch objects (metadata only, no stages/ingredients)
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get all batches
 * const all = getAllBatches(db);
 * 
 * @example
 * // Get only active batches
 * const active = getAllBatches(db, { status: 'active' });
 * 
 * @example
 * // Get completed batches from a specific recipe
 * const completed = getAllBatches(db, { 
 *     recipeID: 5, 
 *     status: 'completed' 
 * });
 * 
 * @example
 * // Get batches started in November 2025
 * const november = getAllBatches(db, {
 *     startedAfter: "2025-11-01",
 *     startedBefore: "2025-11-30"
 * });
 */
function getAllBatches(db, options = {}) {
    try {
        // STEP 1: BUILD BASE QUERY
        let sql = 'SELECT * FROM batches';
        const conditions = [];
        const params = [];
        
        // STEP 2: FILTER BY STATUS
        if (options.status !== undefined) {
            const validStatuses = ['planned', 'active', 'completed', 'abandoned'];
            if (!validStatuses.includes(options.status)) {
                throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }
            conditions.push('status = ?');
            params.push(options.status);
        }
        
        // STEP 3: FILTER BY RECIPE
        if (options.recipeID !== undefined) {
            if (typeof options.recipeID !== 'number' || options.recipeID <= 0) {
                throw new Error('recipeID must be a positive number');
            }
            conditions.push('recipeID = ?');
            params.push(options.recipeID);
        }
        
        // STEP 4: FILTER BY START DATE RANGE
        if (options.startedAfter !== undefined) {
            if (typeof options.startedAfter !== 'string') {
                throw new Error('startedAfter must be a date string (YYYY-MM-DD)');
            }
            conditions.push('startDate >= ?');
            params.push(options.startedAfter);
        }
        
        if (options.startedBefore !== undefined) {
            if (typeof options.startedBefore !== 'string') {
                throw new Error('startedBefore must be a date string (YYYY-MM-DD)');
            }
            conditions.push('startDate <= ?');
            params.push(options.startedBefore);
        }
        
        // STEP 5: FILTER BY COMPLETION DATE RANGE
        if (options.completedAfter !== undefined) {
            if (typeof options.completedAfter !== 'string') {
                throw new Error('completedAfter must be a date string (YYYY-MM-DD)');
            }
            conditions.push('endDate >= ?');
            params.push(options.completedAfter);
        }
        
        if (options.completedBefore !== undefined) {
            if (typeof options.completedBefore !== 'string') {
                throw new Error('completedBefore must be a date string (YYYY-MM-DD)');
            }
            conditions.push('endDate <= ?');
            params.push(options.completedBefore);
        }
        
        // STEP 6: ADD WHERE CLAUSE IF FILTERS EXIST
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        // STEP 7: ADD ORDERING (most recent first)
        sql += ' ORDER BY batchID DESC';
        
        console.log(`Fetching batches with query: ${sql}`);
        
        // STEP 8: EXECUTE QUERY
        const result = db.exec(sql, params);
        const batches = resultToObjects(result);
        
        // STEP 9: RETURN RESULTS
        console.log(`Found ${batches.length} batches`);
        return batches;
        
    } catch (error) {
        console.error('Failed to fetch batches:', error.message);
        throw new Error(`Failed to fetch batches: ${error.message}`);
    }
}

/**
 * Update batch metadata (basic information)
 * 
 * Updates non-structural batch data. Cannot modify stages, ingredients, or status.
 * Use stage/ingredient functions for those changes.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchID - Batch to update
 * @param {Object} updates - Fields to update (only provided fields are changed)
 * @param {string} [updates.name] - New batch name
 * @param {string} [updates.notes] - New notes
 * @returns {Object} { success: boolean, message: string, updatedFields: array }
 * @throws {Error} If batch doesn't exist or validation fails
 * 
 * @example
 * const result = updateBatchMetadata(db, 5, {
 *     name: "Traditional Mead - Batch #1 (Revised)",
 *     notes: "Added extra notes about fermentation temperature"
 * });
 */
function updateBatchMetadata(db, batchID, updates) {
    // STEP 1: VALIDATE BATCH ID
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF BATCH EXISTS
    const batch = getBatch(db, batchID);
    if (!batch) {
        throw new Error(`Batch ID ${batchID} does not exist`);
    }
    
    // STEP 3: VALIDATE FIELDS
    
    // Validate name (if provided)
    if ('name' in updates && (!updates.name || updates.name.trim() === '')) {
        throw new Error('Batch name cannot be empty');
    }
    
    // STEP 4: FILTER TO ALLOWED FIELDS
    const allowedFields = ['name', 'notes'];
    
    const filteredUpdates = {};
    const unauthorizedFields = [];
    
    for (const key of Object.keys(updates)) {
        if (allowedFields.includes(key)) {
            filteredUpdates[key] = updates[key];
        } else {
            unauthorizedFields.push(key);
        }
    }
    
    // Log unauthorized attempts
    if (unauthorizedFields.length > 0) {
        console.warn(`Attempted to update unauthorized fields: ${unauthorizedFields.join(', ')}`);
    }
    
    // Check if there's anything to update
    if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
    }
    
    // STEP 5: BUILD DYNAMIC SQL
    const setClauses = [];
    const values = [];
    
    for (const [key, value] of Object.entries(filteredUpdates)) {
        setClauses.push(`${key} = ?`);
        values.push(value ? value.trim() : null);
    }
    
    const sql = `UPDATE batches SET ${setClauses.join(', ')} WHERE batchID = ?`;
    values.push(batchID);
    
    try {
        // STEP 6: EXECUTE UPDATE
        db.run(sql, values);
        
        console.log(`Batch ${batchID} updated successfully`);
        
        // STEP 7: RETURN SUCCESS
        return {
            success: true,
            message: `Batch "${batch.name}" updated successfully`,
            updatedFields: Object.entries(filteredUpdates).map(([key, value]) => ({
                field: key,
                newValue: value
            }))
        };
        
    } catch (error) {
        console.error('Failed to update batch:', error.message);
        throw new Error(`Failed to update batch: ${error.message}`);
    }
}

/**
 * Delete a batch
 * 
 * Permanently deletes a batch and all associated data (stages, ingredients, measurements).
 * Can only delete batches with status='planned' (not started yet).
 * Use abandonBatch() for active batches instead.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchID - Batch to delete
 * @param {Object} [options] - Delete options
 * @param {boolean} [options.force=false] - Allow deleting active/completed batches (use with caution)
 * @returns {Object} { success: boolean, message: string }
 * @throws {Error} If batch doesn't exist or validation fails
 * 
 * @example
 * // Delete a planned batch
 * const result = deleteBatch(db, 5);
 * 
 * @example
 * // Force delete an active batch (dangerous!)
 * const result = deleteBatch(db, 5, { force: true });
 */
function deleteBatch(db, batchID, options = {}) {
    // STEP 1: VALIDATE BATCH ID
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF BATCH EXISTS
    const batch = getBatch(db, batchID);
    if (!batch) {
        throw new Error(`Batch ID ${batchID} does not exist`);
    }
    
    // STEP 3: CHECK BATCH STATUS
    if (batch.status !== 'planned' && !options.force) {
        throw new Error(
            `Cannot delete batch with status '${batch.status}'. ` +
            `Only 'planned' batches can be deleted. ` +
            `Use abandonBatch() for active batches, or use { force: true } to override.`
        );
    }
    
    // STEP 4: WARN IF FORCE DELETING
    if (options.force && batch.status !== 'planned') {
        console.warn(`Force deleting batch ${batchID} with status '${batch.status}'`);
    }
    
    try {
        // STEP 5: DELETE BATCH
        // CASCADE will automatically delete:
        // - batchStages
        // - batchIngredients (via batchStages CASCADE)
        // - batchMeasurements (via batchStages CASCADE)
        // - equipmentUsage (via batchStages CASCADE)
        const deleteSql = `DELETE FROM batches WHERE batchID = ?`;
        db.run(deleteSql, [batchID]);
        
        console.log(`Batch ID ${batchID} deleted successfully`);
        
        // STEP 6: RETURN SUCCESS
        return {
            success: true,
            message: `Batch "${batch.name}" deleted successfully`
        };
        
    } catch (error) {
        console.error('Failed to delete batch:', error.message);
        throw new Error(`Failed to delete batch: ${error.message}`);
    }
}

// ============================================
// BATCH LIFECYCLE FUNCTIONS
// ============================================

/**
 * Start a batch
 * 
 * Changes batch status from 'planned' to 'active' and sets startDate.
 * Optionally auto-starts the first stage.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchID - Batch to start
 * @param {Object} [options] - Start options
 * @param {string} [options.startDate] - When batch was started (default: now, ISO 8601: YYYY-MM-DD HH:MM:SS)
 * @param {boolean} [options.autoStartFirstStage=true] - Automatically start first stage
 * @returns {Object} { success: boolean, message: string, batchID: number, firstStageID: number|null }
 * @throws {Error} If batch doesn't exist, already started, or validation fails
 * 
 * @example
 * // Start batch now and auto-start first stage
 * const result = startBatch(db, 5);
 * // Returns: { success: true, message: "...", batchID: 5, firstStageID: 12 }
 * 
 * @example
 * // Start batch with specific date, don't auto-start stage
 * const result = startBatch(db, 5, {
 *     startDate: "2025-11-20 10:00:00",
 *     autoStartFirstStage: false
 * });
 */
function startBatch(db, batchID, options = {}) {
    // STEP 1: VALIDATE BATCH ID
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF BATCH EXISTS
    const batch = getBatch(db, batchID);
    if (!batch) {
        throw new Error(`Batch ID ${batchID} does not exist`);
    }
    
    // STEP 3: CHECK BATCH STATUS
    if (batch.status !== 'planned') {
        throw new Error(`Cannot start batch with status '${batch.status}'. Only 'planned' batches can be started.`);
    }
    
    // STEP 4: VALIDATE startDate FORMAT (if provided)
    if (options.startDate !== undefined) {
        if (typeof options.startDate !== 'string') {
            throw new Error('startDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)');
        }
    }
    
    // STEP 5: SET DEFAULT OPTIONS
    const autoStartFirstStage = options.autoStartFirstStage !== false; // Default: true
    
    try {
        // STEP 6: BEGIN TRANSACTION
        db.run("BEGIN TRANSACTION");
        
        // STEP 7: UPDATE BATCH STATUS AND START DATE
        const dateValue = options.startDate || db.exec("SELECT DATETIME('now')")[0].values[0][0];
        
        const updateSql = `
            UPDATE batches 
            SET status = 'active', startDate = ?
            WHERE batchID = ?
        `;
        
        db.run(updateSql, [dateValue, batchID]);
        
        console.log(`Batch ${batchID} started at ${dateValue}`);
        
        let firstStageID = null;
        
        // STEP 8: AUTO-START FIRST STAGE (if enabled)
        if (autoStartFirstStage) {
            // Get first stage (lowest stageOrder)
            const firstStageSql = `
                SELECT batchStageID, stageName
                FROM batchStages
                WHERE batchID = ?
                ORDER BY stageOrder ASC
                LIMIT 1
            `;
            
            const firstStageResult = db.exec(firstStageSql, [batchID]);
            
            if (firstStageResult.length > 0 && firstStageResult[0].values.length > 0) {
                firstStageID = firstStageResult[0].values[0][0];
                const firstStageName = firstStageResult[0].values[0][1];
                
                // Start first stage
                const startStageSql = `
                    UPDATE batchStages
                    SET status = 'active', startDate = ?
                    WHERE batchStageID = ?
                `;
                
                db.run(startStageSql, [dateValue, firstStageID]);
                
                // Update batch.currentStageID
                const updateCurrentStageSql = `
                    UPDATE batches
                    SET currentStageID = ?
                    WHERE batchID = ?
                `;
                
                db.run(updateCurrentStageSql, [firstStageID, batchID]);
                
                console.log(`  First stage "${firstStageName}" (ID ${firstStageID}) auto-started`);
            }
        }
        
        // STEP 9: COMMIT TRANSACTION
        db.run("COMMIT");
        
        // STEP 10: RETURN SUCCESS
        return {
            success: true,
            message: `Batch "${batch.name}" started successfully` + 
                     (firstStageID ? ` and first stage activated` : ''),
            batchID: batchID,
            firstStageID: firstStageID
        };
        
    } catch (error) {
        db.run("ROLLBACK");
        console.error('Failed to start batch:', error.message);
        throw new Error(`Failed to start batch: ${error.message}`);
    }
}

/**
 * Complete a batch
 * 
 * Changes batch status from 'active' to 'completed' and sets endDate.
 * Verifies all stages are completed before allowing batch completion.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchID - Batch to complete
 * @param {Object} [options] - Completion options
 * @param {string} [options.endDate] - When batch was completed (default: now, ISO 8601: YYYY-MM-DD HH:MM:SS)
 * @param {boolean} [options.skipValidation=false] - Skip stage completion validation (use with caution)
 * @returns {Object} { success: boolean, message: string, batchID: number }
 * @throws {Error} If batch doesn't exist, not active, or stages incomplete
 * 
 * @example
 * // Complete batch now
 * const result = completeBatch(db, 5);
 * 
 * @example
 * // Complete with specific date
 * const result = completeBatch(db, 5, {
 *     endDate: "2025-12-01 14:00:00"
 * });
 * 
 * @example
 * // Force complete without validating stages (emergency use)
 * const result = completeBatch(db, 5, { skipValidation: true });
 */
function completeBatch(db, batchID, options = {}) {
    // STEP 1: VALIDATE BATCH ID
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF BATCH EXISTS
    const batch = getBatch(db, batchID);
    if (!batch) {
        throw new Error(`Batch ID ${batchID} does not exist`);
    }
    
    // STEP 3: CHECK BATCH STATUS
    if (batch.status !== 'active') {
        throw new Error(`Cannot complete batch with status '${batch.status}'. Only 'active' batches can be completed.`);
    }
    
    // STEP 4: VALIDATE endDate FORMAT (if provided)
    if (options.endDate !== undefined) {
        if (typeof options.endDate !== 'string') {
            throw new Error('endDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)');
        }
    }
    
    // STEP 5: VALIDATE ALL STAGES ARE COMPLETED (unless skipValidation)
    if (!options.skipValidation) {
        const incompleteStagesSql = `
            SELECT batchStageID, stageName, status
            FROM batchStages
            WHERE batchID = ?
            AND status NOT IN ('completed', 'skipped')
            ORDER BY stageOrder
        `;
        
        const incompleteStagesResult = db.exec(incompleteStagesSql, [batchID]);
        
        if (incompleteStagesResult.length > 0 && incompleteStagesResult[0].values.length > 0) {
            const incompleteStages = resultToObjects(incompleteStagesResult);
            const stageNames = incompleteStages.map(s => `"${s.stageName}" (${s.status})`).join(', ');
            
            throw new Error(
                `Cannot complete batch: ${incompleteStages.length} stage(s) are not completed: ${stageNames}. ` +
                `Complete or skip all stages first, or use { skipValidation: true } to override.`
            );
        }
    }
    
    try {
        // STEP 6: UPDATE BATCH STATUS AND END DATE
        const dateValue = options.endDate || db.exec("SELECT DATETIME('now')")[0].values[0][0];
        
        const updateSql = `
            UPDATE batches 
            SET status = 'completed', endDate = ?, currentStageID = NULL
            WHERE batchID = ?
        `;
        
        db.run(updateSql, [dateValue, batchID]);
        
        console.log(`Batch ${batchID} completed at ${dateValue}`);
        
        // STEP 7: RETURN SUCCESS
        return {
            success: true,
            message: `Batch "${batch.name}" completed successfully`,
            batchID: batchID
        };
        
    } catch (error) {
        console.error('Failed to complete batch:', error.message);
        throw new Error(`Failed to complete batch: ${error.message}`);
    }
}

/**
 * Abandon a batch
 * 
 * Changes batch status to 'abandoned' and sets endDate and abandonReason.
 * Releases all equipment currently assigned to batch stages.
 * Use this when batch fails (infection, off-flavour, accident, etc.)
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchID - Batch to abandon
 * @param {string} abandonReason - Why batch was abandoned (required)
 * @param {Object} [options] - Abandon options
 * @param {string} [options.endDate] - When batch was abandoned (default: now, ISO 8601: YYYY-MM-DD HH:MM:SS)
 * @param {boolean} [options.releaseEquipment=true] - Automatically release all equipment
 * @returns {Object} { success: boolean, message: string, batchID: number, equipmentReleased: number }
 * @throws {Error} If batch doesn't exist, already completed/abandoned, or validation fails
 * 
 * @example
 * // Abandon batch due to infection
 * const result = abandonBatch(db, 5, "Infection detected - mold on surface");
 * 
 * @example
 * // Abandon with specific date, don't auto-release equipment
 * const result = abandonBatch(db, 5, "Accidental spill", {
 *     endDate: "2025-11-25 09:30:00",
 *     releaseEquipment: false
 * });
 */
function abandonBatch(db, batchID, abandonReason, options = {}) {
    // STEP 1: VALIDATE BATCH ID
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    // STEP 2: VALIDATE abandonReason
    if (!abandonReason || typeof abandonReason !== 'string' || abandonReason.trim() === '') {
        throw new Error('abandonReason is required and must be a non-empty string');
    }
    
    // STEP 3: CHECK IF BATCH EXISTS
    const batch = getBatch(db, batchID);
    if (!batch) {
        throw new Error(`Batch ID ${batchID} does not exist`);
    }
    
    // STEP 4: CHECK BATCH STATUS
    if (batch.status === 'completed') {
        throw new Error(`Cannot abandon completed batch. Batch "${batch.name}" is already finished.`);
    }
    
    if (batch.status === 'abandoned') {
        return {
            success: true,
            message: `Batch "${batch.name}" was already abandoned (reason: ${batch.abandonReason})`,
            batchID: batchID,
            equipmentReleased: 0
        };
    }
    
    // STEP 5: VALIDATE endDate FORMAT (if provided)
    if (options.endDate !== undefined) {
        if (typeof options.endDate !== 'string') {
            throw new Error('endDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)');
        }
    }
    
    // STEP 6: SET DEFAULT OPTIONS
    const releaseEquipment = options.releaseEquipment !== false; // Default: true
    
    try {
        // STEP 7: BEGIN TRANSACTION
        db.run("BEGIN TRANSACTION");
        
        // STEP 8: UPDATE BATCH STATUS, END DATE, AND ABANDON REASON
        const dateValue = options.endDate || db.exec("SELECT DATETIME('now')")[0].values[0][0];
        
        const updateSql = `
            UPDATE batches 
            SET status = 'abandoned', endDate = ?, abandonReason = ?, currentStageID = NULL
            WHERE batchID = ?
        `;
        
        db.run(updateSql, [dateValue, abandonReason.trim(), batchID]);
        
        console.log(`Batch ${batchID} abandoned at ${dateValue}: ${abandonReason}`);
        
        let equipmentReleased = 0;
        
        // STEP 9: RELEASE ALL EQUIPMENT (if enabled)
        if (releaseEquipment) {
            // Get all batch stages
            const stagesSql = `SELECT batchStageID FROM batchStages WHERE batchID = ?`;
            const stagesResult = db.exec(stagesSql, [batchID]);
            
            if (stagesResult.length > 0 && stagesResult[0].values.length > 0) {
                const stageIDs = stagesResult[0].values.map(row => row[0]);
                
                // Release all equipment currently in use
                const releaseEquipmentSql = `
                    UPDATE equipmentUsage
                    SET releaseDate = ?, status = 'available'
                    WHERE batchStageID IN (${stageIDs.join(',')})
                    AND status = 'in-use'
                `;
                
                db.run(releaseEquipmentSql, [dateValue]);
                
                // Count how many equipment items were released
                const countSql = `SELECT changes() as count`;
                const countResult = db.exec(countSql);
                equipmentReleased = countResult[0].values[0][0];
                
                console.log(`  Released ${equipmentReleased} equipment item(s)`);
            }
        }
        
        // STEP 10: COMMIT TRANSACTION
        db.run("COMMIT");
        
        // STEP 11: RETURN SUCCESS
        return {
            success: true,
            message: `Batch "${batch.name}" abandoned: ${abandonReason}` +
                     (equipmentReleased > 0 ? ` (${equipmentReleased} equipment item(s) released)` : ''),
            batchID: batchID,
            equipmentReleased: equipmentReleased
        };
        
    } catch (error) {
        db.run("ROLLBACK");
        console.error('Failed to abandon batch:', error.message);
        throw new Error(`Failed to abandon batch: ${error.message}`);
    }
}

// ============================================
// BATCH STAGE FUNCTIONS
// ============================================

/**
 * Start a batch stage
 * 
 * Changes stage status from 'pending' to 'active' and sets startDate.
 * Updates batch.currentStageID to point to this stage.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchStageID - Stage to start
 * @param {Object} [options] - Start options
 * @param {string} [options.startDate] - When stage was started (default: now, ISO 8601: YYYY-MM-DD HH:MM:SS)
 * @returns {Object} { success: boolean, message: string, batchStageID: number }
 * @throws {Error} If stage doesn't exist, already started, or batch not active
 * 
 * @example
 * // Start stage now
 * const result = startBatchStage(db, 12);
 * 
 * @example
 * // Start stage with specific date (backdating)
 * const result = startBatchStage(db, 12, {
 *     startDate: "2025-11-20 10:00:00"
 * });
 */
function startBatchStage(db, batchStageID, options = {}) {
    // STEP 1: VALIDATE BATCH STAGE ID
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF STAGE EXISTS
    const stageSql = `
        SELECT 
            bs.batchStageID,
            bs.batchID,
            bs.stageName,
            bs.status,
            b.status as batchStatus
        FROM batchStages bs
        JOIN batches b ON bs.batchID = b.batchID
        WHERE bs.batchStageID = ?
    `;
    
    const stageResult = db.exec(stageSql, [batchStageID]);
    
    if (stageResult.length === 0 || stageResult[0].values.length === 0) {
        throw new Error(`Batch stage ID ${batchStageID} does not exist`);
    }
    
    const [_, batchID, stageName, stageStatus, batchStatus] = stageResult[0].values[0];
    
    // STEP 3: CHECK BATCH STATUS
    if (batchStatus !== 'active') {
        throw new Error(`Cannot start stage: batch is not active (status: ${batchStatus}). Start the batch first.`);
    }
    
    // STEP 4: CHECK STAGE STATUS
    if (stageStatus === 'active') {
        return {
            success: true,
            message: `Stage "${stageName}" is already active`,
            batchStageID: batchStageID
        };
    }
    
    if (stageStatus !== 'pending') {
        throw new Error(`Cannot start stage with status '${stageStatus}'. Only 'pending' stages can be started.`);
    }
    
    // STEP 5: VALIDATE startDate FORMAT (if provided)
    if (options.startDate !== undefined) {
        if (typeof options.startDate !== 'string') {
            throw new Error('startDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)');
        }
    }
    
    try {
        // STEP 6: BEGIN TRANSACTION
        db.run("BEGIN TRANSACTION");
        
        // STEP 7: UPDATE STAGE STATUS AND START DATE
        const dateValue = options.startDate || db.exec("SELECT DATETIME('now')")[0].values[0][0];
        
        const updateStageSql = `
            UPDATE batchStages
            SET status = 'active', startDate = ?
            WHERE batchStageID = ?
        `;
        
        db.run(updateStageSql, [dateValue, batchStageID]);
        
        console.log(`Stage "${stageName}" (ID ${batchStageID}) started at ${dateValue}`);
        
        // STEP 8: UPDATE BATCH CURRENT STAGE
        const updateBatchSql = `
            UPDATE batches
            SET currentStageID = ?
            WHERE batchID = ?
        `;
        
        db.run(updateBatchSql, [batchStageID, batchID]);
        
        // STEP 9: COMMIT TRANSACTION
        db.run("COMMIT");
        
        // STEP 10: RETURN SUCCESS
        return {
            success: true,
            message: `Stage "${stageName}" started successfully`,
            batchStageID: batchStageID
        };
        
    } catch (error) {
        db.run("ROLLBACK");
        console.error('Failed to start stage:', error.message);
        throw new Error(`Failed to start stage: ${error.message}`);
    }
}

/**
 * Complete a batch stage
 * 
 * Changes stage status from 'active' to 'completed' and sets endDate.
 * Optionally releases equipment and auto-advances to next stage.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchStageID - Stage to complete
 * @param {Object} [options] - Completion options
 * @param {string} [options.endDate] - When stage was completed (default: now, ISO 8601: YYYY-MM-DD HH:MM:SS)
 * @param {boolean} [options.releaseEquipment=true] - Automatically release equipment assigned to this stage
 * @param {boolean} [options.autoAdvance=true] - Automatically start next stage
 * @returns {Object} { success: boolean, message: string, batchStageID: number, nextStageID: number|null, equipmentReleased: number }
 * @throws {Error} If stage doesn't exist, not active, or validation fails
 * 
 * @example
 * // Complete stage now, release equipment, auto-start next stage
 * const result = completeBatchStage(db, 12);
 * // Returns: { success: true, message: "...", batchStageID: 12, nextStageID: 13, equipmentReleased: 2 }
 * 
 * @example
 * // Complete without auto-advancing
 * const result = completeBatchStage(db, 12, {
 *     autoAdvance: false
 * });
 * 
 * @example
 * // Complete with specific date, keep equipment assigned
 * const result = completeBatchStage(db, 12, {
 *     endDate: "2025-12-01 14:00:00",
 *     releaseEquipment: false
 * });
 */
function completeBatchStage(db, batchStageID, options = {}) {
    // STEP 1: VALIDATE BATCH STAGE ID
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF STAGE EXISTS
    const stageSql = `
        SELECT 
            bs.batchStageID,
            bs.batchID,
            bs.stageName,
            bs.stageOrder,
            bs.status,
            b.status as batchStatus
        FROM batchStages bs
        JOIN batches b ON bs.batchID = b.batchID
        WHERE bs.batchStageID = ?
    `;
    
    const stageResult = db.exec(stageSql, [batchStageID]);
    
    if (stageResult.length === 0 || stageResult[0].values.length === 0) {
        throw new Error(`Batch stage ID ${batchStageID} does not exist`);
    }
    
    const [_, batchID, stageName, stageOrder, stageStatus, batchStatus] = stageResult[0].values[0];
    
    // STEP 3: CHECK STAGE STATUS
    if (stageStatus === 'completed') {
        return {
            success: true,
            message: `Stage "${stageName}" is already completed`,
            batchStageID: batchStageID,
            nextStageID: null,
            equipmentReleased: 0
        };
    }
    
    if (stageStatus !== 'active') {
        throw new Error(`Cannot complete stage with status '${stageStatus}'. Only 'active' stages can be completed.`);
    }
    
    // STEP 4: VALIDATE endDate FORMAT (if provided)
    if (options.endDate !== undefined) {
        if (typeof options.endDate !== 'string') {
            throw new Error('endDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)');
        }
    }
    
    // STEP 5: SET DEFAULT OPTIONS
    const releaseEquipment = options.releaseEquipment !== false; // Default: true
    const autoAdvance = options.autoAdvance !== false; // Default: true
    
    try {
        // STEP 6: BEGIN TRANSACTION
        db.run("BEGIN TRANSACTION");
        
        // STEP 7: UPDATE STAGE STATUS AND END DATE
        const dateValue = options.endDate || db.exec("SELECT DATETIME('now')")[0].values[0][0];
        
        const updateStageSql = `
            UPDATE batchStages
            SET status = 'completed', endDate = ?
            WHERE batchStageID = ?
        `;
        
        db.run(updateStageSql, [dateValue, batchStageID]);
        
        console.log(`Stage "${stageName}" (ID ${batchStageID}) completed at ${dateValue}`);
        
        let equipmentReleased = 0;
        
        // STEP 8: RELEASE EQUIPMENT (if enabled)
        if (releaseEquipment) {
            const releaseEquipmentSql = `
                UPDATE equipmentUsage
                SET releaseDate = ?, status = 'available'
                WHERE batchStageID = ?
                AND status = 'in-use'
            `;
            
            db.run(releaseEquipmentSql, [dateValue, batchStageID]);
            
            // Count how many equipment items were released
            const countSql = `SELECT changes() as count`;
            const countResult = db.exec(countSql);
            equipmentReleased = countResult[0].values[0][0];
            
            if (equipmentReleased > 0) {
                console.log(`  Released ${equipmentReleased} equipment item(s)`);
            }
        }
        
        let nextStageID = null;
        
        // STEP 9: AUTO-ADVANCE TO NEXT STAGE (if enabled)
        if (autoAdvance) {
            // Get next stage (next stageOrder)
            const nextStageSql = `
                SELECT batchStageID, stageName, status
                FROM batchStages
                WHERE batchID = ?
                AND stageOrder > ?
                ORDER BY stageOrder ASC
                LIMIT 1
            `;
            
            const nextStageResult = db.exec(nextStageSql, [batchID, stageOrder]);
            
            if (nextStageResult.length > 0 && nextStageResult[0].values.length > 0) {
                nextStageID = nextStageResult[0].values[0][0];
                const nextStageName = nextStageResult[0].values[0][1];
                const nextStageStatus = nextStageResult[0].values[0][2];
                
                // Only start if pending
                if (nextStageStatus === 'pending') {
                    const startNextStageSql = `
                        UPDATE batchStages
                        SET status = 'active', startDate = ?
                        WHERE batchStageID = ?
                    `;
                    
                    db.run(startNextStageSql, [dateValue, nextStageID]);
                    
                    // Update batch.currentStageID
                    const updateCurrentStageSql = `
                        UPDATE batches
                        SET currentStageID = ?
                        WHERE batchID = ?
                    `;
                    
                    db.run(updateCurrentStageSql, [nextStageID, batchID]);
                    
                    console.log(`  Next stage "${nextStageName}" (ID ${nextStageID}) auto-started`);
                } else {
                    console.log(`  Next stage "${nextStageName}" has status '${nextStageStatus}', not auto-started`);
                    nextStageID = null; // Don't report it if we didn't start it
                }
            } else {
                // No more stages - clear currentStageID
                const clearCurrentStageSql = `
                    UPDATE batches
                    SET currentStageID = NULL
                    WHERE batchID = ?
                `;
                
                db.run(clearCurrentStageSql, [batchID]);
                
                console.log(`  No more stages to advance to`);
            }
        } else {
            // Not auto-advancing - clear currentStageID since no stage is active
            const clearCurrentStageSql = `
                UPDATE batches
                SET currentStageID = NULL
                WHERE batchID = ?
            `;
            
            db.run(clearCurrentStageSql, [batchID]);
        }
        
        // STEP 10: COMMIT TRANSACTION
        db.run("COMMIT");
        
        // STEP 11: RETURN SUCCESS
        return {
            success: true,
            message: `Stage "${stageName}" completed successfully` +
                     (nextStageID ? ` and next stage activated` : '') +
                     (equipmentReleased > 0 ? ` (${equipmentReleased} equipment item(s) released)` : ''),
            batchStageID: batchStageID,
            nextStageID: nextStageID,
            equipmentReleased: equipmentReleased
        };
        
    } catch (error) {
        db.run("ROLLBACK");
        console.error('Failed to complete stage:', error.message);
        throw new Error(`Failed to complete stage: ${error.message}`);
    }
}

/**
 * Skip a batch stage
 * 
 * Changes stage status from 'pending' to 'skipped'.
 * Use this for optional stages the user chooses not to perform.
 * Cannot skip stages that are already active or completed.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchStageID - Stage to skip
 * @returns {Object} { success: boolean, message: string, batchStageID: number }
 * @throws {Error} If stage doesn't exist, not pending, or validation fails
 * 
 * @example
 * // Skip an optional aging stage
 * const result = skipBatchStage(db, 15);
 * // Returns: { success: true, message: "Stage 'Clarification & Aging' skipped", batchStageID: 15 }
 */
function skipBatchStage(db, batchStageID) {
    // STEP 1: VALIDATE BATCH STAGE ID
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF STAGE EXISTS
    const stageSql = `
        SELECT 
            bs.batchStageID,
            bs.stageName,
            bs.status,
            st.isRequired
        FROM batchStages bs
        JOIN stageTypes st ON bs.stageTypeID = st.stageTypeID
        WHERE bs.batchStageID = ?
    `;
    
    const stageResult = db.exec(stageSql, [batchStageID]);
    
    if (stageResult.length === 0 || stageResult[0].values.length === 0) {
        throw new Error(`Batch stage ID ${batchStageID} does not exist`);
    }
    
    const [_, stageName, stageStatus, isRequired] = stageResult[0].values[0];
    
    // STEP 3: CHECK IF STAGE IS REQUIRED
    if (isRequired === 1) {
        throw new Error(`Cannot skip required stage "${stageName}". This stage must be completed.`);
    }
    
    // STEP 4: CHECK STAGE STATUS
    if (stageStatus === 'skipped') {
        return {
            success: true,
            message: `Stage "${stageName}" is already skipped`,
            batchStageID: batchStageID
        };
    }
    
    if (stageStatus !== 'pending') {
        throw new Error(`Cannot skip stage with status '${stageStatus}'. Only 'pending' stages can be skipped.`);
    }
    
    try {
        // STEP 5: UPDATE STAGE STATUS
        const updateStageSql = `
            UPDATE batchStages
            SET status = 'skipped'
            WHERE batchStageID = ?
        `;
        
        db.run(updateStageSql, [batchStageID]);
        
        console.log(`Stage "${stageName}" (ID ${batchStageID}) skipped`);
        
        // STEP 6: RETURN SUCCESS
        return {
            success: true,
            message: `Stage "${stageName}" skipped`,
            batchStageID: batchStageID
        };
        
    } catch (error) {
        console.error('Failed to skip stage:', error.message);
        throw new Error(`Failed to skip stage: ${error.message}`);
    }
}

// ============================================
// BATCH INGREDIENT FUNCTIONS
// ============================================

/**
 * Record ingredient usage for a batch
 * 
 * Records what was actually used (ingredient, amount) vs. what was planned.
 * Optionally consumes from inventory using FIFO.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchIngredientID - Batch ingredient to update
 * @param {Object} usageData - Actual usage information
 * @param {number} usageData.ingredientID - Specific ingredient used (required)
 * @param {number} usageData.actualAmount - Amount actually used (required)
 * @param {string} usageData.actualUnit - Unit of measurement (required)
 * @param {string} [usageData.notes] - Additional notes (optional)
 * @param {boolean} [usageData.consumeFromInventory=false] - Consume from inventory (FIFO)
 * @returns {Object} { success: boolean, message: string, batchIngredientID: number, inventoryConsumed: Object|null }
 * @throws {Error} If validation fails or ingredient doesn't match ingredient type
 * 
 * @example
 * // Record honey usage without consuming inventory
 * const result = recordIngredientUsage(db, 8, {
 *     ingredientID: 15,
 *     actualAmount: 3.2,
 *     actualUnit: "kg",
 *     notes: "Used slightly more than planned"
 * });
 * 
 * @example
 * // Record apple juice usage and consume from inventory
 * const result = recordIngredientUsage(db, 9, {
 *     ingredientID: 3,
 *     actualAmount: 10.5,
 *     actualUnit: "L",
 *     consumeFromInventory: true
 * });
 * // Returns: { success: true, ..., inventoryConsumed: { totalConsumed: 10.5, totalCost: 15.75, ... } }
 */
function recordIngredientUsage(db, batchIngredientID, usageData) {
    // STEP 1: VALIDATE BATCH INGREDIENT ID
    if (typeof batchIngredientID !== 'number' || batchIngredientID <= 0) {
        throw new Error('Invalid batch ingredient ID (must be positive number)');
    }
    
    // STEP 2: VALIDATE REQUIRED FIELDS
    if (!usageData.ingredientID || typeof usageData.ingredientID !== 'number') {
        throw new Error('Valid ingredientID is required');
    }
    
    if (!usageData.actualAmount || typeof usageData.actualAmount !== 'number' || usageData.actualAmount <= 0) {
        throw new Error('actualAmount must be a positive number');
    }
    
    if (!usageData.actualUnit || typeof usageData.actualUnit !== 'string' || usageData.actualUnit.trim() === '') {
        throw new Error('actualUnit is required and must be a non-empty string');
    }
    
    // STEP 3: CHECK IF BATCH INGREDIENT EXISTS
    const ingredientSql = `
        SELECT 
            bi.batchIngredientID,
            bi.ingredientTypeID,
            bi.ingredientTypeName,
            bi.plannedAmount,
            bi.plannedUnit
        FROM batchIngredients bi
        WHERE bi.batchIngredientID = ?
    `;
    
    const ingredientResult = db.exec(ingredientSql, [batchIngredientID]);
    
    if (ingredientResult.length === 0 || ingredientResult[0].values.length === 0) {
        throw new Error(`Batch ingredient ID ${batchIngredientID} does not exist`);
    }
    
    const [_, ingredientTypeID, ingredientTypeName, plannedAmount, plannedUnit] = ingredientResult[0].values[0];
    
    // STEP 4: VALIDATE INGREDIENT EXISTS AND MATCHES INGREDIENT TYPE
    const ingredientCheckSql = `
        SELECT ingredientID, name, brand, ingredientTypeID
        FROM ingredients
        WHERE ingredientID = ?
    `;
    
    const ingredientCheckResult = db.exec(ingredientCheckSql, [usageData.ingredientID]);
    
    if (ingredientCheckResult.length === 0 || ingredientCheckResult[0].values.length === 0) {
        throw new Error(`Ingredient ID ${usageData.ingredientID} does not exist`);
    }
    
    const [ingredientID, ingredientName, ingredientBrand, ingredientIngredientTypeID] = ingredientCheckResult[0].values[0];
    
    // Build display name (brand + name if brand exists, otherwise just name)
    const displayName = ingredientBrand ? `${ingredientBrand} ${ingredientName}` : ingredientName;
    
    // STEP 5: VALIDATE INGREDIENT MATCHES INGREDIENT TYPE
    if (ingredientIngredientTypeID !== ingredientTypeID) {
        throw new Error(
            `Ingredient "${displayName}" (type ID ${ingredientIngredientTypeID}) does not match ` +
            `required ingredient type "${ingredientTypeName}" (type ID ${ingredientTypeID})`
        );
    }
    
    try {
        // STEP 6: BEGIN TRANSACTION
        db.run("BEGIN TRANSACTION");
        
        let inventoryConsumed = null;
        let inventoryLotID = null;
        
        // STEP 7: CONSUME FROM INVENTORY (if requested)
        if (usageData.consumeFromInventory) {
            try {
                inventoryConsumed = consumeFromInventory(db, usageData.ingredientID, usageData.actualAmount, usageData.actualUnit);
                inventoryLotID = inventoryConsumed.consumed[0]?.lotID || null;
                
                console.log(`Consumed ${inventoryConsumed.totalConsumed} ${inventoryConsumed.unit} from ${inventoryConsumed.consumed.length} inventory lot(s)`);
            } catch (invError) {
                // Rollback transaction
                db.run("ROLLBACK");
                console.error('Failed to consume inventory:', invError.message);
                throw new Error(`Failed to consume inventory: ${invError.message}`);
            }
        }
        
        // STEP 8: UPDATE BATCH INGREDIENT WITH ACTUAL USAGE
        const updateSql = `
            UPDATE batchIngredients
            SET 
                ingredientID = ?,
                ingredientName = ?,
                actualAmount = ?,
                actualUnit = ?,
                inventoryLotID = ?,
                notes = ?
            WHERE batchIngredientID = ?
        `;
        
        db.run(updateSql, [
            usageData.ingredientID,
            displayName,
            usageData.actualAmount,
            usageData.actualUnit.trim(),
            inventoryLotID,
            usageData.notes?.trim() || null,
            batchIngredientID
        ]);
        
        console.log(`Recorded usage for ingredient "${ingredientTypeName}": ${usageData.actualAmount} ${usageData.actualUnit} of "${displayName}"`);
        
        // STEP 9: COMMIT TRANSACTION
        db.run("COMMIT");
        
        // STEP 10: RETURN SUCCESS
        return {
            success: true,
            message: `Recorded ${usageData.actualAmount} ${usageData.actualUnit} of "${displayName}" ` +
                     `(planned: ${plannedAmount} ${plannedUnit})`,
            batchIngredientID: batchIngredientID,
            inventoryConsumed: inventoryConsumed
        };
        
    } catch (error) {
        db.run("ROLLBACK");
        console.error('Failed to record ingredient usage:', error.message);
        throw new Error(`Failed to record ingredient usage: ${error.message}`);
    }
}

// ============================================
// BATCH MEASUREMENT FUNCTIONS
// ============================================

/**
 * Add a measurement to a batch stage
 * 
 * Records measurements like SG, pH, temperature, color, taste, aroma, etc.
 * Supports both quantitative (with value/unit) and qualitative (notes only) measurements.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchStageID - Stage to add measurement to
 * @param {Object} measurementData - Measurement information
 * @param {string} measurementData.measurementType - Type of measurement (required, e.g., "SG", "pH", "temp", "color", "taste")
 * @param {number} [measurementData.value] - Numeric value (required for quantitative measurements)
 * @param {string} [measurementData.unit] - Unit of measurement (required for quantitative measurements)
 * @param {string} [measurementData.notes] - Additional observations (optional)
 * @param {string} [measurementData.measurementDate] - When measured (default: now, ISO 8601: YYYY-MM-DD HH:MM:SS)
 * @returns {Object} { success: boolean, message: string, measurementID: number }
 * @throws {Error} If validation fails
 * 
 * @example
 * // Record specific gravity measurement
 * const result = addBatchMeasurement(db, 12, {
 *     measurementType: "SG",
 *     value: 1.050,
 *     unit: "SG",
 *     notes: "After pitching yeast"
 * });
 * 
 * @example
 * // Record temperature
 * const result = addBatchMeasurement(db, 12, {
 *     measurementType: "temp",
 *     value: 20,
 *     unit: "°C"
 * });
 * 
 * @example
 * // Record qualitative measurement (taste test)
 * const result = addBatchMeasurement(db, 15, {
 *     measurementType: "taste",
 *     notes: "Dry, clean finish with slight honey notes. Very pleasant!"
 * });
 * 
 * @example
 * // Record color observation
 * const result = addBatchMeasurement(db, 13, {
 *     measurementType: "color",
 *     notes: "Deep amber, crystal clear"
 * });
 */
function addBatchMeasurement(db, batchStageID, measurementData) {
    // STEP 1: VALIDATE BATCH STAGE ID
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    // STEP 2: VALIDATE measurementType
    if (!measurementData.measurementType || typeof measurementData.measurementType !== 'string' || measurementData.measurementType.trim() === '') {
        throw new Error('measurementType is required and must be a non-empty string');
    }
    
    // STEP 3: CHECK IF BATCH STAGE EXISTS
    const stageSql = `
        SELECT batchStageID, stageName
        FROM batchStages
        WHERE batchStageID = ?
    `;
    
    const stageResult = db.exec(stageSql, [batchStageID]);
    
    if (stageResult.length === 0 || stageResult[0].values.length === 0) {
        throw new Error(`Batch stage ID ${batchStageID} does not exist`);
    }
    
    const stageName = stageResult[0].values[0][1];
    
    // STEP 4: VALIDATE QUANTITATIVE VS QUALITATIVE
    const quantitativeTypes = ['SG', 'pH', 'temp', 'pressure'];
    const qualitativeTypes = ['color', 'taste', 'aroma', 'clarity'];
    
    const isQuantitative = quantitativeTypes.includes(measurementData.measurementType);
    const isQualitative = qualitativeTypes.includes(measurementData.measurementType);
    
    if (isQuantitative) {
        // Quantitative measurements require value and unit
        if (measurementData.value === undefined || measurementData.value === null) {
            throw new Error(`Quantitative measurement type "${measurementData.measurementType}" requires a value`);
        }
        if (typeof measurementData.value !== 'number') {
            throw new Error('Measurement value must be a number');
        }
        if (!measurementData.unit || typeof measurementData.unit !== 'string' || measurementData.unit.trim() === '') {
            throw new Error(`Quantitative measurement type "${measurementData.measurementType}" requires a unit`);
        }
    } else if (isQualitative) {
        // Qualitative measurements should have notes
        if (!measurementData.notes || measurementData.notes.trim() === '') {
            console.warn(`Qualitative measurement type "${measurementData.measurementType}" typically requires notes`);
        }
    }
    // Allow custom measurement types (not in predefined lists)
    
    // STEP 5: VALIDATE measurementDate FORMAT (if provided)
    if (measurementData.measurementDate !== undefined) {
        if (typeof measurementData.measurementDate !== 'string') {
            throw new Error('measurementDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)');
        }
    }
    
    try {
        // STEP 6: INSERT MEASUREMENT
        const dateValue = measurementData.measurementDate || db.exec("SELECT DATETIME('now')")[0].values[0][0];
        
        const sql = `
            INSERT INTO batchMeasurements (
                batchStageID, measurementDate, measurementType, value, unit, notes
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [
            batchStageID,
            dateValue,
            measurementData.measurementType.trim(),
            measurementData.value ?? null,
            measurementData.unit?.trim() || null,
            measurementData.notes?.trim() || null
        ]);
        
        // STEP 7: GET THE NEW MEASUREMENT ID
        const [[measurementID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`Measurement recorded for stage "${stageName}": ${measurementData.measurementType}` +
                   (measurementData.value !== undefined ? ` = ${measurementData.value} ${measurementData.unit}` : ''));
        
        // STEP 8: RETURN SUCCESS
        return {
            success: true,
            message: `Measurement recorded: ${measurementData.measurementType}` +
                    (measurementData.value !== undefined ? ` = ${measurementData.value} ${measurementData.unit}` : ''),
            measurementID: measurementID
        };
        
    } catch (error) {
        console.error('Failed to add measurement:', error.message);
        throw new Error(`Failed to add measurement: ${error.message}`);
    }
}

/**
 * Get measurements for a batch
 * 
 * Retrieves all measurements for a batch, with optional filters.
 * Can filter by stage, measurement type, or date range.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchID - Batch to get measurements for
 * @param {Object} [options] - Filter options
 * @param {number} [options.batchStageID] - Filter by specific stage
 * @param {string} [options.measurementType] - Filter by type (e.g., "SG", "pH", "temp")
 * @param {string} [options.measuredAfter] - Filter by date >= this date (ISO 8601: YYYY-MM-DD)
 * @param {string} [options.measuredBefore] - Filter by date <= this date (ISO 8601: YYYY-MM-DD)
 * @returns {Array} Array of measurement objects
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get all measurements for a batch
 * const all = getBatchMeasurements(db, 5);
 * 
 * @example
 * // Get only SG measurements
 * const sgReadings = getBatchMeasurements(db, 5, { 
 *     measurementType: "SG" 
 * });
 * 
 * @example
 * // Get measurements for fermentation stage only
 * const fermentation = getBatchMeasurements(db, 5, { 
 *     batchStageID: 12 
 * });
 * 
 * @example
 * // Get measurements from November 2025
 * const november = getBatchMeasurements(db, 5, {
 *     measuredAfter: "2025-11-01",
 *     measuredBefore: "2025-11-30"
 * });
 */
function getBatchMeasurements(db, batchID, options = {}) {
    // STEP 1: VALIDATE BATCH ID
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    try {
        // STEP 2: BUILD BASE QUERY WITH JOINS
        let sql = `
            SELECT 
                bm.measurementID,
                bm.batchStageID,
                bs.stageName,
                bs.stageOrder,
                bm.measurementDate,
                bm.measurementType,
                bm.value,
                bm.unit,
                bm.notes
            FROM batchMeasurements bm
            JOIN batchStages bs ON bm.batchStageID = bs.batchStageID
            WHERE bs.batchID = ?
        `;
        
        const params = [batchID];
        
        // STEP 3: FILTER BY BATCH STAGE (if provided)
        if (options.batchStageID !== undefined) {
            if (typeof options.batchStageID !== 'number' || options.batchStageID <= 0) {
                throw new Error('batchStageID must be a positive number');
            }
            sql += ' AND bm.batchStageID = ?';
            params.push(options.batchStageID);
        }
        
        // STEP 4: FILTER BY MEASUREMENT TYPE (if provided)
        if (options.measurementType !== undefined) {
            if (typeof options.measurementType !== 'string' || options.measurementType.trim() === '') {
                throw new Error('measurementType must be a non-empty string');
            }
            sql += ' AND bm.measurementType = ?';
            params.push(options.measurementType.trim());
        }
        
        // STEP 5: FILTER BY DATE RANGE
        if (options.measuredAfter !== undefined) {
            if (typeof options.measuredAfter !== 'string') {
                throw new Error('measuredAfter must be a date string (YYYY-MM-DD)');
            }
            sql += ' AND bm.measurementDate >= ?';
            params.push(options.measuredAfter);
        }
        
        if (options.measuredBefore !== undefined) {
            if (typeof options.measuredBefore !== 'string') {
                throw new Error('measuredBefore must be a date string (YYYY-MM-DD)');
            }
            sql += ' AND bm.measurementDate <= ?';
            params.push(options.measuredBefore);
        }
        
        // STEP 6: ORDER BY DATE (most recent first)
        sql += ' ORDER BY bm.measurementDate DESC';
        
        console.log(`Fetching measurements for batch ${batchID}`);
        
        // STEP 7: EXECUTE QUERY
        const result = db.exec(sql, params);
        const measurements = resultToObjects(result);
        
        // STEP 8: RETURN RESULTS
        console.log(`Found ${measurements.length} measurements`);
        return measurements;
        
    } catch (error) {
        console.error('Failed to fetch measurements:', error.message);
        throw new Error(`Failed to fetch measurements: ${error.message}`);
    }
}

// ============================================
// BATCH EQUIPMENT FUNCTIONS
// ============================================

/**
 * Assign equipment to a batch stage
 * 
 * Convenience wrapper for equipmentManager.assignEquipmentToStage().
 * Validates batch stage exists and belongs to an active batch.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchStageID - Stage to assign equipment to
 * @param {number} equipmentID - Equipment to assign
 * @param {string} [inUseDate] - When equipment was assigned (default: now)
 * @returns {Object} { success: boolean, message: string, usageID: number }
 * @throws {Error} If validation fails
 * 
 * @example
 * // Assign fermenter to fermentation stage
 * const result = assignEquipmentToBatchStage(db, 12, 5);
 * 
 * @example
 * // Assign with specific date
 * const result = assignEquipmentToBatchStage(db, 12, 5, "2025-11-20 10:00:00");
 */
function assignEquipmentToBatchStage(db, batchStageID, equipmentID, inUseDate = null) {
    // STEP 1: VALIDATE IDs
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    if (typeof equipmentID !== 'number' || equipmentID <= 0) {
        throw new Error('Invalid equipment ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF BATCH STAGE EXISTS
    const stageSql = `
        SELECT 
            bs.batchStageID,
            bs.stageName,
            bs.status as stageStatus,
            b.status as batchStatus,
            b.name as batchName
        FROM batchStages bs
        JOIN batches b ON bs.batchID = b.batchID
        WHERE bs.batchStageID = ?
    `;
    
    const stageResult = db.exec(stageSql, [batchStageID]);
    
    if (stageResult.length === 0 || stageResult[0].values.length === 0) {
        throw new Error(`Batch stage ID ${batchStageID} does not exist`);
    }
    
    const [_, stageName, stageStatus, batchStatus, batchName] = stageResult[0].values[0];
    
    // STEP 3: VALIDATE BATCH IS ACTIVE
    if (batchStatus !== 'active') {
        throw new Error(`Cannot assign equipment: batch "${batchName}" is not active (status: ${batchStatus})`);
    }
    
    // STEP 4: CALL EQUIPMENT MANAGER
    try {
        const result = assignEquipmentToStage(db, equipmentID, batchStageID, inUseDate);
        
        console.log(`Equipment ${equipmentID} assigned to batch "${batchName}", stage "${stageName}"`);
        
        return result;
        
    } catch (error) {
        console.error('Failed to assign equipment:', error.message);
        throw new Error(`Failed to assign equipment: ${error.message}`);
    }
}

/**
 * Release equipment from a batch stage
 * 
 * Convenience wrapper for equipmentManager.releaseEquipmentFromStage().
 * Frees equipment for use in other batch stages.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchStageID - Stage to release equipment from
 * @param {number} equipmentID - Equipment to release
 * @param {string} [releaseDate] - When equipment was released (default: now)
 * @returns {Object} { success: boolean, message: string }
 * @throws {Error} If validation fails
 * 
 * @example
 * // Release fermenter from fermentation stage
 * const result = releaseEquipmentFromBatchStage(db, 12, 5);
 */
function releaseEquipmentFromBatchStage(db, batchStageID, equipmentID, releaseDate = null) {
    // STEP 1: VALIDATE IDs
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    if (typeof equipmentID !== 'number' || equipmentID <= 0) {
        throw new Error('Invalid equipment ID (must be positive number)');
    }
    
    // STEP 2: CALL EQUIPMENT MANAGER
    try {
        const result = releaseEquipmentFromStage(db, equipmentID, batchStageID, releaseDate);
        
        console.log(`Equipment ${equipmentID} released from batch stage ${batchStageID}`);
        
        return result;
        
    } catch (error) {
        console.error('Failed to release equipment:', error.message);
        throw new Error(`Failed to release equipment: ${error.message}`);
    }
}

/**
 * Get all equipment for a batch
 * 
 * Returns all equipment used across all stages of a batch.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchID - Batch to get equipment for
 * @param {Object} [options] - Filter options
 * @param {number} [options.batchStageID] - Filter by specific stage
 * @param {string} [options.status] - Filter by status ('in-use' or 'available')
 * @returns {Array} Array of equipment usage objects
 * @throws {Error} If validation fails
 * 
 * @example
 * // Get all equipment for a batch
 * const equipment = getBatchEquipment(db, 5);
 * 
 * @example
 * // Get only currently in-use equipment
 * const inUse = getBatchEquipment(db, 5, { status: 'in-use' });
 * 
 * @example
 * // Get equipment for specific stage
 * const fermentationEquipment = getBatchEquipment(db, 5, { batchStageID: 12 });
 */
function getBatchEquipment(db, batchID, options = {}) {
    // STEP 1: VALIDATE BATCH ID
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    try {
        // STEP 2: BUILD QUERY
        let sql = `
            SELECT 
                eu.usageID,
                eu.equipmentID,
                e.name as equipmentName,
                e.type as equipmentType,
                e.capacityL,
                eu.batchStageID,
                bs.stageName,
                bs.stageOrder,
                eu.inUseDate,
                eu.releaseDate,
                eu.status
            FROM equipmentUsage eu
            JOIN equipment e ON eu.equipmentID = e.equipmentID
            JOIN batchStages bs ON eu.batchStageID = bs.batchStageID
            WHERE bs.batchID = ?
        `;
        
        const params = [batchID];
        
        // STEP 3: FILTER BY STAGE (if provided)
        if (options.batchStageID !== undefined) {
            if (typeof options.batchStageID !== 'number' || options.batchStageID <= 0) {
                throw new Error('batchStageID must be a positive number');
            }
            sql += ' AND eu.batchStageID = ?';
            params.push(options.batchStageID);
        }
        
        // STEP 4: FILTER BY STATUS (if provided)
        if (options.status !== undefined) {
            const validStatuses = ['in-use', 'available'];
            if (!validStatuses.includes(options.status)) {
                throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }
            sql += ' AND eu.status = ?';
            params.push(options.status);
        }
        
        // STEP 5: ORDER BY STAGE AND IN-USE DATE
        sql += ' ORDER BY bs.stageOrder, eu.inUseDate DESC';
        
        console.log(`Fetching equipment for batch ${batchID}`);
        
        // STEP 6: EXECUTE QUERY
        const result = db.exec(sql, params);
        const equipment = resultToObjects(result);
        
        // STEP 7: RETURN RESULTS
        console.log(`Found ${equipment.length} equipment usage records`);
        return equipment;
        
    } catch (error) {
        console.error('Failed to fetch batch equipment:', error.message);
        throw new Error(`Failed to fetch batch equipment: ${error.message}`);
    }
}

// ============================================
// HELPER/UTILITY FUNCTIONS
// ============================================

/**
 * Get complete batch timeline
 * 
 * Returns a chronological timeline of all events in a batch:
 * - Batch started/completed/abandoned
 * - Stage transitions (started/completed/skipped)
 * - Measurements taken
 * - Equipment assignments/releases
 * - Ingredient usage recorded
 * 
 * Useful for viewing complete batch history and troubleshooting.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchID - Batch to get timeline for
 * @returns {Array} Array of timeline events, sorted chronologically (oldest first)
 * @throws {Error} If validation fails
 * 
 * @example
 * const timeline = getBatchTimeline(db, 5);
 * // Returns:
 * [
 *   { date: "2025-11-20 10:00:00", type: "batch_started", description: "Batch started" },
 *   { date: "2025-11-20 10:05:00", type: "stage_started", description: "Stage 'Must Preparation' started", stageID: 12 },
 *   { date: "2025-11-20 10:10:00", type: "measurement", description: "SG = 1.050 SG", stageID: 12 },
 *   { date: "2025-11-20 10:30:00", type: "equipment_assigned", description: "Equipment 'Primary Fermenter #1' assigned", stageID: 12 },
 *   { date: "2025-11-20 11:00:00", type: "stage_completed", description: "Stage 'Must Preparation' completed", stageID: 12 },
 *   ...
 * ]
 */
function getBatchTimeline(db, batchID) {
    // STEP 1: VALIDATE BATCH ID
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF BATCH EXISTS
    const batch = getBatch(db, batchID);
    if (!batch) {
        throw new Error(`Batch ID ${batchID} does not exist`);
    }
    
    try {
        const timeline = [];
        
        // STEP 3: ADD BATCH EVENTS
        if (batch.startDate) {
            timeline.push({
                date: batch.startDate,
                type: "batch_started",
                description: `Batch "${batch.name}" started`
            });
        }
        
        if (batch.endDate) {
            if (batch.status === 'completed') {
                timeline.push({
                    date: batch.endDate,
                    type: "batch_completed",
                    description: `Batch "${batch.name}" completed`
                });
            } else if (batch.status === 'abandoned') {
                timeline.push({
                    date: batch.endDate,
                    type: "batch_abandoned",
                    description: `Batch "${batch.name}" abandoned: ${batch.abandonReason}`
                });
            }
        }
        
        // STEP 4: GET ALL STAGES AND ADD STAGE EVENTS
        const stagesSql = `
            SELECT batchStageID, stageName, startDate, endDate, status
            FROM batchStages
            WHERE batchID = ?
            ORDER BY stageOrder
        `;
        
        const stagesResult = db.exec(stagesSql, [batchID]);
        const stages = resultToObjects(stagesResult);
        
        for (const stage of stages) {
            if (stage.startDate) {
                timeline.push({
                    date: stage.startDate,
                    type: "stage_started",
                    description: `Stage "${stage.stageName}" started`,
                    stageID: stage.batchStageID
                });
            }
            
            if (stage.endDate) {
                if (stage.status === 'completed') {
                    timeline.push({
                        date: stage.endDate,
                        type: "stage_completed",
                        description: `Stage "${stage.stageName}" completed`,
                        stageID: stage.batchStageID
                    });
                } else if (stage.status === 'skipped') {
                    timeline.push({
                        date: stage.endDate || batch.endDate || new Date().toISOString(),
                        type: "stage_skipped",
                        description: `Stage "${stage.stageName}" skipped`,
                        stageID: stage.batchStageID
                    });
                }
            }
        }
        
        // STEP 5: GET ALL MEASUREMENTS
        const measurements = getBatchMeasurements(db, batchID);
        
        for (const measurement of measurements) {
            let description = `${measurement.measurementType}`;
            if (measurement.value !== null) {
                description += ` = ${measurement.value} ${measurement.unit}`;
            }
            if (measurement.notes) {
                description += ` (${measurement.notes})`;
            }
            
            timeline.push({
                date: measurement.measurementDate,
                type: "measurement",
                description: description,
                stageID: measurement.batchStageID,
                measurementID: measurement.measurementID
            });
        }
        
        // STEP 6: GET ALL EQUIPMENT EVENTS
        const equipment = getBatchEquipment(db, batchID);
        
        for (const eq of equipment) {
            timeline.push({
                date: eq.inUseDate,
                type: "equipment_assigned",
                description: `Equipment "${eq.equipmentName}" assigned to stage "${eq.stageName}"`,
                stageID: eq.batchStageID,
                equipmentID: eq.equipmentID
            });
            
            if (eq.releaseDate) {
                timeline.push({
                    date: eq.releaseDate,
                    type: "equipment_released",
                    description: `Equipment "${eq.equipmentName}" released from stage "${eq.stageName}"`,
                    stageID: eq.batchStageID,
                    equipmentID: eq.equipmentID
                });
            }
        }
        
        // STEP 7: GET INGREDIENT USAGE EVENTS
        const ingredientsSql = `
            SELECT 
                bi.batchIngredientID,
                bi.ingredientTypeName,
                bi.ingredientName,
                bi.actualAmount,
                bi.actualUnit,
                bs.batchStageID,
                bs.stageName,
                bs.startDate
            FROM batchIngredients bi
            JOIN batchStages bs ON bi.batchStageID = bs.batchStageID
            WHERE bs.batchID = ?
            AND bi.actualAmount IS NOT NULL
        `;
        
        const ingredientsResult = db.exec(ingredientsSql, [batchID]);
        const ingredients = resultToObjects(ingredientsResult);
        
        for (const ing of ingredients) {
            // Use stage start date as approximation (actual usage time not tracked separately)
            const date = ing.startDate || batch.startDate || new Date().toISOString();
            
            timeline.push({
                date: date,
                type: "ingredient_used",
                description: `Used ${ing.actualAmount} ${ing.actualUnit} of ${ing.ingredientName || ing.ingredientTypeName}`,
                stageID: ing.batchStageID,
                ingredientID: ing.batchIngredientID
            });
        }
        
        // STEP 8: SORT TIMELINE CHRONOLOGICALLY (oldest first)
        timeline.sort((a, b) => {
            if (a.date < b.date) return -1;
            if (a.date > b.date) return 1;
            return 0;
        });
        
        console.log(`Generated timeline with ${timeline.length} events for batch ${batchID}`);
        
        // STEP 9: RETURN TIMELINE
        return timeline;
        
    } catch (error) {
        console.error('Failed to generate batch timeline:', error.message);
        throw new Error(`Failed to generate batch timeline: ${error.message}`);
    }
}

/**
 * Calculate batch cost
 * 
 * Calculates total cost of a batch by summing:
 * - Ingredient costs (from inventory lots if tracked)
 * - Supply costs (bottles, caps, etc.)
 * 
 * Only includes items where actual usage was recorded and inventory tracking enabled.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} batchID - Batch to calculate cost for
 * @returns {Object} Cost breakdown { ingredientCost, supplyCost, totalCost, details: [...] }
 * @throws {Error} If validation fails
 * 
 * @example
 * const cost = getBatchCost(db, 5);
 * // Returns:
 * {
 *   ingredientCost: 45.50,
 *   supplyCost: 12.00,
 *   totalCost: 57.50,
 *   details: [
 *     { type: "ingredient", name: "Honey (Wildflower)", amount: 3.2, unit: "kg", cost: 28.77 },
 *     { type: "ingredient", name: "Apple Juice", amount: 10.5, unit: "L", cost: 16.73 },
 *     { type: "supply", name: "Wine Bottles 750ml", amount: 12, unit: "count", cost: 12.00 }
 *   ]
 * }
 */
function getBatchCost(db, batchID) {
    // STEP 1: VALIDATE BATCH ID
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF BATCH EXISTS
    const batch = getBatch(db, batchID);
    if (!batch) {
        throw new Error(`Batch ID ${batchID} does not exist`);
    }
    
    try {
        const details = [];
        let ingredientCost = 0;
        let supplyCost = 0;
        
        // STEP 3: GET INGREDIENT COSTS FROM INVENTORY
        const ingredientsSql = `
            SELECT 
                bi.ingredientTypeName,
                bi.ingredientName,
                bi.actualAmount,
                bi.actualUnit,
                bi.inventoryLotID,
                il.costPerUnit,
                il.unit as lotUnit
            FROM batchIngredients bi
            JOIN batchStages bs ON bi.batchStageID = bs.batchStageID
            LEFT JOIN inventoryLots il ON bi.inventoryLotID = il.lotID
            WHERE bs.batchID = ?
            AND bi.actualAmount IS NOT NULL
            AND bi.inventoryLotID IS NOT NULL
        `;
        
        const ingredientsResult = db.exec(ingredientsSql, [batchID]);
        const ingredients = resultToObjects(ingredientsResult);
        
        for (const ing of ingredients) {
            // Calculate cost with unit conversion if needed
            let cost = 0;
            
            if (ing.costPerUnit !== null) {
                let amountInLotUnits = ing.actualAmount;
                
                // Convert units if they don't match
                if (ing.actualUnit !== ing.lotUnit) {
                    try {
                        // Determine conversion category (mass or volume)
                        const massUnits = ['mg', 'g', 'kg', 'tonne', 'gr', 'dr', 'oz', 'lb', 'ton'];
                        const volumeUnits = ['ml', 'l', 'cl', 'dl', 'm3', 'tsp', 'tbsp', 'fl-oz', 'cup', 'pt', 'qt', 'gal', 'imp-fl-oz', 'imp-pt', 'imp-qt', 'imp-gal'];
                        
                        let category;
                        if (massUnits.includes(ing.actualUnit.toLowerCase()) && massUnits.includes(ing.lotUnit.toLowerCase())) {
                            category = 'mass';
                        } else if (volumeUnits.includes(ing.actualUnit.toLowerCase()) && volumeUnits.includes(ing.lotUnit.toLowerCase())) {
                            category = 'volume';
                        } else {
                            console.warn(`Cannot convert ${ing.actualUnit} to ${ing.lotUnit} for ${ing.ingredientTypeName} - incompatible unit types`);
                            continue; // Skip this ingredient
                        }
                        
                        amountInLotUnits = convert(ing.actualAmount, ing.actualUnit, ing.lotUnit, category);
                        console.log(`Converted ${ing.actualAmount} ${ing.actualUnit} to ${amountInLotUnits} ${ing.lotUnit}`);
                        
                    } catch (convError) {
                        console.warn(`Unit conversion failed for ${ing.ingredientTypeName}: ${convError.message}`);
                        continue; // Skip this ingredient
                    }
                }
                
                cost = amountInLotUnits * ing.costPerUnit;
                ingredientCost += cost;
                
                details.push({
                    type: "ingredient",
                    name: ing.ingredientName || ing.ingredientTypeName,
                    amount: ing.actualAmount,
                    unit: ing.actualUnit,
                    cost: parseFloat(cost.toFixed(2))
                });
            }
        }
        
        // STEP 4: GET SUPPLY COSTS
        // Note: Supplies would need to be tracked similarly to ingredients
        // For now, this is a placeholder since supply usage isn't fully implemented yet
        
        // Future implementation would query batchSupplies table (not yet in schema)
        // const suppliesSql = `
        //     SELECT supplyName, actualAmount, actualUnit, costPerUnit
        //     FROM batchSupplies bs
        //     WHERE bs.batchID = ?
        //     AND bs.actualAmount IS NOT NULL
        // `;
        
        // STEP 5: CALCULATE TOTAL
        const totalCost = ingredientCost + supplyCost;
        
        console.log(`Batch ${batchID} cost: ingredients ${ingredientCost.toFixed(2)}, supplies ${supplyCost.toFixed(2)}, total ${totalCost.toFixed(2)}`);
        
        // STEP 6: RETURN COST BREAKDOWN
        return {
            ingredientCost: parseFloat(ingredientCost.toFixed(2)),
            supplyCost: parseFloat(supplyCost.toFixed(2)),
            totalCost: parseFloat(totalCost.toFixed(2)),
            details: details,
            note: details.length === 0 
                ? "No cost data available (ingredients not linked to inventory lots)" 
                : null
        };
        
    } catch (error) {
        console.error('Failed to calculate batch cost:', error.message);
        throw new Error(`Failed to calculate batch cost: ${error.message}`);
    }
}

export {
    createBatch,
    getBatch,
    getBatchWithDetails,
    getAllBatches,
    updateBatchMetadata,
    deleteBatch,
    startBatch,
    completeBatch,
    abandonBatch,
    startBatchStage,
    completeBatchStage,
    skipBatchStage,
    recordIngredientUsage,
    addBatchMeasurement,
    getBatchMeasurements,
    assignEquipmentToBatchStage,
    releaseEquipmentFromBatchStage,
    getBatchEquipment,
    getBatchTimeline,
    getBatchCost
};
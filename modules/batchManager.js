// batchManager.js - Refactored for new schema

import { resultToObjects } from './helpers.js';
import { getRecipeWithDetails } from './recipeManager.js';
import { consumeFromInventory } from './inventoryManager.js';
import { assignEquipmentToStage, releaseEquipmentFromStage } from './equipmentManager.js';
import { convert } from './conversions.js';

// ============================================
// CRUD FUNCTIONS
// ============================================

function createBatch(db, batchData) {
    if (!batchData.recipeID || typeof batchData.recipeID !== 'number') {
        throw new Error('Valid recipeID is required');
    }
    if (!batchData.name || batchData.name.trim() === '') {
        throw new Error('Batch name is required');
    }
    if (!batchData.actualBatchSizeL || typeof batchData.actualBatchSizeL !== 'number' || batchData.actualBatchSizeL <= 0) {
        throw new Error('actualBatchSizeL must be a positive number');
    }
    
    const recipe = getRecipeWithDetails(db, batchData.recipeID);
    if (!recipe) {
        throw new Error(`Recipe ID ${batchData.recipeID} does not exist`);
    }
    if (recipe.isDraft === 1) {
        throw new Error('Cannot create batch from draft recipe. Finalize recipe first.');
    }
    if (!recipe.stages || recipe.stages.length === 0) {
        throw new Error('Recipe has no stages. Cannot create batch.');
    }
    
    const scalingFactor = recipe.batchSizeL ? batchData.actualBatchSizeL / recipe.batchSizeL : 1;
    console.log(`Creating batch with scaling factor: ${scalingFactor}x (${batchData.actualBatchSizeL}L / ${recipe.batchSizeL}L)`);
    
    try {
        db.run("BEGIN TRANSACTION");
        
        const batchSql = `
            INSERT INTO batches (recipeID, name, recipeName, actualBatchSizeL, status, notes)
            VALUES (?, ?, ?, ?, 'planned', ?)
        `;
        
        db.run(batchSql, [
            batchData.recipeID,
            batchData.name.trim(),
            recipe.name,
            batchData.actualBatchSizeL,
            batchData.notes?.trim() || null
        ]);
        
        const [[batchID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        console.log(`Batch created: ID ${batchID}`);
        
        const createdStages = [];
        
        for (const recipeStage of recipe.stages) {
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
                recipeStage.stageName,
                recipeStage.stageOrder,
                recipeStage.instructions,
                recipeStage.expectedDurationDays
            ]);
            
            const [[batchStageID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
            console.log(`  Stage ${recipeStage.stageOrder} created: ID ${batchStageID}`);
            
            const createdIngredients = [];
            
            if (recipeStage.ingredients && recipeStage.ingredients.length > 0) {
                for (const recipeIngredient of recipeStage.ingredients) {
                    let scaledAmount;
                    
                    switch (recipeIngredient.scalingMethod) {
                        case 'linear':
                            scaledAmount = recipeIngredient.amount * scalingFactor;
                            break;
                        case 'fixed':
                            scaledAmount = recipeIngredient.amount;
                            break;
                        case 'step':
                            const stepSize = 20;
                            const steps = Math.ceil(batchData.actualBatchSizeL / stepSize);
                            scaledAmount = recipeIngredient.amount * steps;
                            break;
                        default:
                            scaledAmount = recipeIngredient.amount * scalingFactor;
                    }
                    
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
                        recipeIngredient.ingredientTypeName,
                        scaledAmount,
                        recipeIngredient.unit,
                        recipeIngredient.notes
                    ]);
                    
                    const [[batchIngredientID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
                    console.log(`    Ingredient created: ID ${batchIngredientID} (${scaledAmount} ${recipeIngredient.unit})`);
                    
                    createdIngredients.push({
                        batchIngredientID,
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
            
            createdStages.push({
                batchStageID,
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
        
        db.run("COMMIT");
        console.log(`Batch ${batchID} created successfully with ${createdStages.length} stages`);
        
        return {
            batchID,
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
        db.run("ROLLBACK");
        console.error('Failed to create batch:', error.message);
        throw new Error(`Failed to create batch: ${error.message}`);
    }
}

function getBatch(db, batchID) {
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    try {
        const sql = `SELECT * FROM batches WHERE batchID = ?`;
        const result = db.exec(sql, [batchID]);
        const batches = resultToObjects(result);
        return batches.length > 0 ? batches[0] : null;
    } catch (error) {
        console.error('Failed to fetch batch:', error.message);
        throw new Error(`Failed to fetch batch: ${error.message}`);
    }
}

function getBatchWithDetails(db, batchID) {
    const batch = getBatch(db, batchID);
    if (!batch) return null;
    
    try {
        const stagesSql = `
            SELECT 
                batchStageID, stageTypeID, stageName, stageOrder,
                instructions, expectedDurationDays, startDate, endDate,
                status, allowMultipleAdditions, notes
            FROM batchStages
            WHERE batchID = ?
            ORDER BY stageOrder
        `;
        
        const stagesResult = db.exec(stagesSql, [batchID]);
        const stages = resultToObjects(stagesResult);
        
        if (stages.length > 0) {
            const stageIDs = stages.map(s => s.batchStageID);
            
            const ingredientsSql = `
                SELECT 
                    batchIngredientID, batchStageID, ingredientTypeID,
                    ingredientTypeName, ingredientID, ingredientName,
                    plannedAmount, plannedUnit, actualAmount, actualUnit,
                    inventoryLotID, notes
                FROM batchIngredients
                WHERE batchStageID IN (${stageIDs.join(',')})
                ORDER BY batchIngredientID
            `;
            
            const ingredientsResult = db.exec(ingredientsSql);
            const allIngredients = resultToObjects(ingredientsResult);
            
            const measurementsSql = `
                SELECT 
                    measurementID, batchStageID, measurementDate,
                    measurementType, value, unit, notes
                FROM batchMeasurements
                WHERE batchStageID IN (${stageIDs.join(',')})
                ORDER BY measurementDate DESC
            `;
            
            const measurementsResult = db.exec(measurementsSql);
            const allMeasurements = resultToObjects(measurementsResult);
            
            const equipmentSql = `
                SELECT 
                    eu.usageID, eu.batchStageID, eu.equipmentID,
                    e.name as equipmentName, e.type as equipmentType,
                    e.capacityL, eu.inUseDate, eu.releaseDate, eu.status
                FROM equipmentUsage eu
                JOIN equipment e ON eu.equipmentID = e.equipmentID
                WHERE eu.batchStageID IN (${stageIDs.join(',')})
                ORDER BY eu.inUseDate DESC
            `;
            
            const equipmentResult = db.exec(equipmentSql);
            const allEquipment = resultToObjects(equipmentResult);
            
            for (const stage of stages) {
                stage.ingredients = allIngredients.filter(ing => ing.batchStageID === stage.batchStageID);
                stage.measurements = allMeasurements.filter(meas => meas.batchStageID === stage.batchStageID);
                stage.equipment = allEquipment.filter(eq => eq.batchStageID === stage.batchStageID);
            }
        }
        
        batch.stages = stages;
        return batch;
        
    } catch (error) {
        console.error('Failed to fetch batch details:', error.message);
        throw new Error(`Failed to fetch batch details: ${error.message}`);
    }
}

function getAllBatches(db, options = {}) {
    try {
        let sql = 'SELECT * FROM batches';
        const conditions = [];
        const params = [];
        
        if (options.status !== undefined) {
            const validStatuses = ['planned', 'active', 'completed', 'abandoned'];
            if (!validStatuses.includes(options.status)) {
                throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }
            conditions.push('status = ?');
            params.push(options.status);
        }
        
        if (options.recipeID !== undefined) {
            if (typeof options.recipeID !== 'number' || options.recipeID <= 0) {
                throw new Error('recipeID must be a positive number');
            }
            conditions.push('recipeID = ?');
            params.push(options.recipeID);
        }
        
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
        
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        sql += ' ORDER BY batchID DESC';
        console.log(`Fetching batches with query: ${sql}`);
        
        const result = db.exec(sql, params);
        const batches = resultToObjects(result);
        
        console.log(`Found ${batches.length} batches`);
        return batches;
        
    } catch (error) {
        console.error('Failed to fetch batches:', error.message);
        throw new Error(`Failed to fetch batches: ${error.message}`);
    }
}

function updateBatchMetadata(db, batchID, updates) {
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    const batch = getBatch(db, batchID);
    if (!batch) throw new Error(`Batch ID ${batchID} does not exist`);
    
    if ('name' in updates && (!updates.name || updates.name.trim() === '')) {
        throw new Error('Batch name cannot be empty');
    }
    
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
    
    if (unauthorizedFields.length > 0) {
        console.warn(`Attempted to update unauthorized fields: ${unauthorizedFields.join(', ')}`);
    }
    
    if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
    }
    
    const setClauses = [];
    const values = [];
    
    for (const [key, value] of Object.entries(filteredUpdates)) {
        setClauses.push(`${key} = ?`);
        values.push(value ? value.trim() : null);
    }
    
    const sql = `UPDATE batches SET ${setClauses.join(', ')} WHERE batchID = ?`;
    values.push(batchID);
    
    try {
        db.run(sql, values);
        console.log(`Batch ${batchID} updated successfully`);
        
        return {
            success: true,
            message: `Batch "${batch.name}" updated successfully`,
            updatedFields: Object.entries(filteredUpdates).map(([key, value]) => ({ field: key, newValue: value }))
        };
    } catch (error) {
        console.error('Failed to update batch:', error.message);
        throw new Error(`Failed to update batch: ${error.message}`);
    }
}

function deleteBatch(db, batchID, options = {}) {
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    const batch = getBatch(db, batchID);
    if (!batch) throw new Error(`Batch ID ${batchID} does not exist`);
    
    if (batch.status !== 'planned' && !options.force) {
        throw new Error(
            `Cannot delete batch with status '${batch.status}'. Only 'planned' batches can be deleted. ` +
            `Use abandonBatch() for active batches, or use { force: true } to override.`
        );
    }
    
    if (options.force && batch.status !== 'planned') {
        console.warn(`Force deleting batch ${batchID} with status '${batch.status}'`);
    }
    
    try {
        db.run(`DELETE FROM batches WHERE batchID = ?`, [batchID]);
        console.log(`Batch ID ${batchID} deleted successfully`);
        
        return { success: true, message: `Batch "${batch.name}" deleted successfully` };
    } catch (error) {
        console.error('Failed to delete batch:', error.message);
        throw new Error(`Failed to delete batch: ${error.message}`);
    }
}

// ============================================
// BATCH LIFECYCLE FUNCTIONS
// ============================================

function startBatch(db, batchID, options = {}) {
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    const batch = getBatch(db, batchID);
    if (!batch) throw new Error(`Batch ID ${batchID} does not exist`);
    
    if (batch.status !== 'planned') {
        throw new Error(`Cannot start batch with status '${batch.status}'. Only 'planned' batches can be started.`);
    }
    
    if (options.startDate !== undefined && typeof options.startDate !== 'string') {
        throw new Error('startDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)');
    }
    
    const autoStartFirstStage = options.autoStartFirstStage !== false;
    
    try {
        db.run("BEGIN TRANSACTION");
        
        const dateValue = options.startDate || db.exec("SELECT DATETIME('now')")[0].values[0][0];
        
        db.run(`UPDATE batches SET status = 'active', startDate = ? WHERE batchID = ?`, [dateValue, batchID]);
        console.log(`Batch ${batchID} started at ${dateValue}`);
        
        let firstStageID = null;
        
        if (autoStartFirstStage) {
            const firstStageSql = `SELECT batchStageID, stageName FROM batchStages WHERE batchID = ? ORDER BY stageOrder ASC LIMIT 1`;
            const firstStageResult = db.exec(firstStageSql, [batchID]);
            
            if (firstStageResult.length > 0 && firstStageResult[0].values.length > 0) {
                firstStageID = firstStageResult[0].values[0][0];
                const firstStageName = firstStageResult[0].values[0][1];
                
                db.run(`UPDATE batchStages SET status = 'active', startDate = ? WHERE batchStageID = ?`, [dateValue, firstStageID]);
                db.run(`UPDATE batches SET currentStageID = ? WHERE batchID = ?`, [firstStageID, batchID]);
                
                console.log(`  First stage "${firstStageName}" (ID ${firstStageID}) auto-started`);
            }
        }
        
        db.run("COMMIT");
        
        return {
            success: true,
            message: `Batch "${batch.name}" started successfully` + (firstStageID ? ` and first stage activated` : ''),
            batchID,
            firstStageID
        };
    } catch (error) {
        db.run("ROLLBACK");
        console.error('Failed to start batch:', error.message);
        throw new Error(`Failed to start batch: ${error.message}`);
    }
}

function completeBatch(db, batchID, options = {}) {
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    const batch = getBatch(db, batchID);
    if (!batch) throw new Error(`Batch ID ${batchID} does not exist`);
    
    if (batch.status !== 'active') {
        throw new Error(`Cannot complete batch with status '${batch.status}'. Only 'active' batches can be completed.`);
    }
    
    if (options.endDate !== undefined && typeof options.endDate !== 'string') {
        throw new Error('endDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)');
    }
    
    if (!options.skipValidation) {
        const incompleteStagesSql = `
            SELECT batchStageID, stageName, status FROM batchStages
            WHERE batchID = ? AND status NOT IN ('completed', 'skipped')
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
        const dateValue = options.endDate || db.exec("SELECT DATETIME('now')")[0].values[0][0];
        db.run(`UPDATE batches SET status = 'completed', endDate = ?, currentStageID = NULL WHERE batchID = ?`, [dateValue, batchID]);
        console.log(`Batch ${batchID} completed at ${dateValue}`);
        
        return { success: true, message: `Batch "${batch.name}" completed successfully`, batchID };
    } catch (error) {
        console.error('Failed to complete batch:', error.message);
        throw new Error(`Failed to complete batch: ${error.message}`);
    }
}

function abandonBatch(db, batchID, abandonReason, options = {}) {
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    if (!abandonReason || typeof abandonReason !== 'string' || abandonReason.trim() === '') {
        throw new Error('abandonReason is required and must be a non-empty string');
    }
    
    const batch = getBatch(db, batchID);
    if (!batch) throw new Error(`Batch ID ${batchID} does not exist`);
    
    if (batch.status === 'completed') {
        throw new Error(`Cannot abandon completed batch. Batch "${batch.name}" is already finished.`);
    }
    
    if (batch.status === 'abandoned') {
        return { success: true, message: `Batch "${batch.name}" was already abandoned (reason: ${batch.abandonReason})`, batchID, equipmentReleased: 0 };
    }
    
    if (options.endDate !== undefined && typeof options.endDate !== 'string') {
        throw new Error('endDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)');
    }
    
    const releaseEquipment = options.releaseEquipment !== false;
    
    try {
        db.run("BEGIN TRANSACTION");
        
        const dateValue = options.endDate || db.exec("SELECT DATETIME('now')")[0].values[0][0];
        db.run(`UPDATE batches SET status = 'abandoned', endDate = ?, abandonReason = ?, currentStageID = NULL WHERE batchID = ?`, 
               [dateValue, abandonReason.trim(), batchID]);
        console.log(`Batch ${batchID} abandoned at ${dateValue}: ${abandonReason}`);
        
        let equipmentReleased = 0;
        
        if (releaseEquipment) {
            const stagesSql = `SELECT batchStageID FROM batchStages WHERE batchID = ?`;
            const stagesResult = db.exec(stagesSql, [batchID]);
            
            if (stagesResult.length > 0 && stagesResult[0].values.length > 0) {
                const stageIDs = stagesResult[0].values.map(row => row[0]);
                db.run(`UPDATE equipmentUsage SET releaseDate = ?, status = 'available' WHERE batchStageID IN (${stageIDs.join(',')}) AND status = 'in-use'`, [dateValue]);
                
                const countResult = db.exec(`SELECT changes() as count`);
                equipmentReleased = countResult[0].values[0][0];
                console.log(`  Released ${equipmentReleased} equipment item(s)`);
            }
        }
        
        db.run("COMMIT");
        
        return {
            success: true,
            message: `Batch "${batch.name}" abandoned: ${abandonReason}` + (equipmentReleased > 0 ? ` (${equipmentReleased} equipment item(s) released)` : ''),
            batchID,
            equipmentReleased
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

function startBatchStage(db, batchStageID, options = {}) {
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    const stageSql = `SELECT bs.batchStageID, bs.batchID, bs.stageName, bs.status, b.status as batchStatus FROM batchStages bs JOIN batches b ON bs.batchID = b.batchID WHERE bs.batchStageID = ?`;
    const stageResult = db.exec(stageSql, [batchStageID]);
    
    if (stageResult.length === 0 || stageResult[0].values.length === 0) {
        throw new Error(`Batch stage ID ${batchStageID} does not exist`);
    }
    
    const [_, batchID, stageName, stageStatus, batchStatus] = stageResult[0].values[0];
    
    if (batchStatus !== 'active') {
        throw new Error(`Cannot start stage: batch is not active (status: ${batchStatus}). Start the batch first.`);
    }
    
    if (stageStatus === 'active') {
        return { success: true, message: `Stage "${stageName}" is already active`, batchStageID };
    }
    
    if (stageStatus !== 'pending') {
        throw new Error(`Cannot start stage with status '${stageStatus}'. Only 'pending' stages can be started.`);
    }
    
    if (options.startDate !== undefined && typeof options.startDate !== 'string') {
        throw new Error('startDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)');
    }
    
    try {
        db.run("BEGIN TRANSACTION");
        
        const dateValue = options.startDate || db.exec("SELECT DATETIME('now')")[0].values[0][0];
        
        db.run(`UPDATE batchStages SET status = 'active', startDate = ? WHERE batchStageID = ?`, [dateValue, batchStageID]);
        console.log(`Stage "${stageName}" (ID ${batchStageID}) started at ${dateValue}`);
        
        db.run(`UPDATE batches SET currentStageID = ? WHERE batchID = ?`, [batchStageID, batchID]);
        
        db.run("COMMIT");
        
        return { success: true, message: `Stage "${stageName}" started successfully`, batchStageID };
    } catch (error) {
        db.run("ROLLBACK");
        console.error('Failed to start stage:', error.message);
        throw new Error(`Failed to start stage: ${error.message}`);
    }
}

function completeBatchStage(db, batchStageID, options = {}) {
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    const stageSql = `SELECT bs.batchStageID, bs.batchID, bs.stageName, bs.stageOrder, bs.status, b.status as batchStatus FROM batchStages bs JOIN batches b ON bs.batchID = b.batchID WHERE bs.batchStageID = ?`;
    const stageResult = db.exec(stageSql, [batchStageID]);
    
    if (stageResult.length === 0 || stageResult[0].values.length === 0) {
        throw new Error(`Batch stage ID ${batchStageID} does not exist`);
    }
    
    const [_, batchID, stageName, stageOrder, stageStatus] = stageResult[0].values[0];
    
    if (stageStatus === 'completed') {
        return { success: true, message: `Stage "${stageName}" is already completed`, batchStageID, nextStageID: null, equipmentReleased: 0 };
    }
    
    if (stageStatus !== 'active') {
        throw new Error(`Cannot complete stage with status '${stageStatus}'. Only 'active' stages can be completed.`);
    }
    
    if (options.endDate !== undefined && typeof options.endDate !== 'string') {
        throw new Error('endDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)');
    }
    
    const releaseEquipment = options.releaseEquipment !== false;
    const autoAdvance = options.autoAdvance !== false;
    
    try {
        db.run("BEGIN TRANSACTION");
        
        const dateValue = options.endDate || db.exec("SELECT DATETIME('now')")[0].values[0][0];
        
        db.run(`UPDATE batchStages SET status = 'completed', endDate = ? WHERE batchStageID = ?`, [dateValue, batchStageID]);
        console.log(`Stage "${stageName}" (ID ${batchStageID}) completed at ${dateValue}`);
        
        let equipmentReleased = 0;
        
        if (releaseEquipment) {
            db.run(`UPDATE equipmentUsage SET releaseDate = ?, status = 'available' WHERE batchStageID = ? AND status = 'in-use'`, [dateValue, batchStageID]);
            
            const countResult = db.exec(`SELECT changes() as count`);
            equipmentReleased = countResult[0].values[0][0];
            
            if (equipmentReleased > 0) {
                console.log(`  Released ${equipmentReleased} equipment item(s)`);
            }
        }
        
        let nextStageID = null;
        
        if (autoAdvance) {
            const nextStageSql = `SELECT batchStageID, stageName, status FROM batchStages WHERE batchID = ? AND stageOrder > ? ORDER BY stageOrder ASC LIMIT 1`;
            const nextStageResult = db.exec(nextStageSql, [batchID, stageOrder]);
            
            if (nextStageResult.length > 0 && nextStageResult[0].values.length > 0) {
                nextStageID = nextStageResult[0].values[0][0];
                const nextStageName = nextStageResult[0].values[0][1];
                const nextStageStatus = nextStageResult[0].values[0][2];
                
                if (nextStageStatus === 'pending') {
                    db.run(`UPDATE batchStages SET status = 'active', startDate = ? WHERE batchStageID = ?`, [dateValue, nextStageID]);
                    db.run(`UPDATE batches SET currentStageID = ? WHERE batchID = ?`, [nextStageID, batchID]);
                    console.log(`  Next stage "${nextStageName}" (ID ${nextStageID}) auto-started`);
                } else {
                    console.log(`  Next stage "${nextStageName}" has status '${nextStageStatus}', not auto-started`);
                    nextStageID = null;
                }
            } else {
                db.run(`UPDATE batches SET currentStageID = NULL WHERE batchID = ?`, [batchID]);
                console.log(`  No more stages to advance to`);
            }
        } else {
            db.run(`UPDATE batches SET currentStageID = NULL WHERE batchID = ?`, [batchID]);
        }
        
        db.run("COMMIT");
        
        return {
            success: true,
            message: `Stage "${stageName}" completed successfully` + (nextStageID ? ` and next stage activated` : '') + (equipmentReleased > 0 ? ` (${equipmentReleased} equipment item(s) released)` : ''),
            batchStageID,
            nextStageID,
            equipmentReleased
        };
    } catch (error) {
        db.run("ROLLBACK");
        console.error('Failed to complete stage:', error.message);
        throw new Error(`Failed to complete stage: ${error.message}`);
    }
}

function skipBatchStage(db, batchStageID) {
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    const stageSql = `SELECT bs.batchStageID, bs.stageName, bs.status, st.isRequired FROM batchStages bs JOIN stageTypes st ON bs.stageTypeID = st.stageTypeID WHERE bs.batchStageID = ?`;
    const stageResult = db.exec(stageSql, [batchStageID]);
    
    if (stageResult.length === 0 || stageResult[0].values.length === 0) {
        throw new Error(`Batch stage ID ${batchStageID} does not exist`);
    }
    
    const [_, stageName, stageStatus, isRequired] = stageResult[0].values[0];
    
    if (isRequired === 1) {
        throw new Error(`Cannot skip required stage "${stageName}". This stage must be completed.`);
    }
    
    if (stageStatus === 'skipped') {
        return { success: true, message: `Stage "${stageName}" is already skipped`, batchStageID };
    }
    
    if (stageStatus !== 'pending') {
        throw new Error(`Cannot skip stage with status '${stageStatus}'. Only 'pending' stages can be skipped.`);
    }
    
    try {
        db.run(`UPDATE batchStages SET status = 'skipped' WHERE batchStageID = ?`, [batchStageID]);
        console.log(`Stage "${stageName}" (ID ${batchStageID}) skipped`);
        
        return { success: true, message: `Stage "${stageName}" skipped`, batchStageID };
    } catch (error) {
        console.error('Failed to skip stage:', error.message);
        throw new Error(`Failed to skip stage: ${error.message}`);
    }
}

// ============================================
// BATCH INGREDIENT FUNCTIONS
// ============================================

function recordIngredientUsage(db, batchIngredientID, usageData) {
    if (typeof batchIngredientID !== 'number' || batchIngredientID <= 0) {
        throw new Error('Invalid batch ingredient ID (must be positive number)');
    }
    
    if (!usageData.ingredientID || typeof usageData.ingredientID !== 'number') {
        throw new Error('Valid ingredientID is required');
    }
    
    if (!usageData.actualAmount || typeof usageData.actualAmount !== 'number' || usageData.actualAmount <= 0) {
        throw new Error('actualAmount must be a positive number');
    }
    
    if (!usageData.actualUnit || typeof usageData.actualUnit !== 'string' || usageData.actualUnit.trim() === '') {
        throw new Error('actualUnit is required and must be a non-empty string');
    }
    
    const ingredientSql = `SELECT bi.batchIngredientID, bi.ingredientTypeID, bi.ingredientTypeName, bi.plannedAmount, bi.plannedUnit FROM batchIngredients bi WHERE bi.batchIngredientID = ?`;
    const ingredientResult = db.exec(ingredientSql, [batchIngredientID]);
    
    if (ingredientResult.length === 0 || ingredientResult[0].values.length === 0) {
        throw new Error(`Batch ingredient ID ${batchIngredientID} does not exist`);
    }
    
    const [_, ingredientTypeID, ingredientTypeName, plannedAmount, plannedUnit] = ingredientResult[0].values[0];
    
    const ingredientCheckSql = `SELECT ingredientID, name, brand, ingredientTypeID FROM ingredients WHERE ingredientID = ?`;
    const ingredientCheckResult = db.exec(ingredientCheckSql, [usageData.ingredientID]);
    
    if (ingredientCheckResult.length === 0 || ingredientCheckResult[0].values.length === 0) {
        throw new Error(`Ingredient ID ${usageData.ingredientID} does not exist`);
    }
    
    const [ingredientID, ingredientName, ingredientBrand, ingredientIngredientTypeID] = ingredientCheckResult[0].values[0];
    const displayName = ingredientBrand ? `${ingredientBrand} ${ingredientName}` : ingredientName;
    
    if (ingredientIngredientTypeID !== ingredientTypeID) {
        throw new Error(
            `Ingredient "${displayName}" (type ID ${ingredientIngredientTypeID}) does not match required ingredient type "${ingredientTypeName}" (type ID ${ingredientTypeID})`
        );
    }
    
    try {
        db.run("BEGIN TRANSACTION");
        
        let inventoryConsumed = null;
        let inventoryLotID = null;
        
        if (usageData.consumeFromInventory) {
            try {
                inventoryConsumed = consumeFromInventory(db, usageData.ingredientID, usageData.actualAmount, usageData.actualUnit);
                inventoryLotID = inventoryConsumed.consumed[0]?.lotID || null;
                console.log(`Consumed ${inventoryConsumed.totalConsumed} ${inventoryConsumed.unit} from ${inventoryConsumed.consumed.length} inventory lot(s)`);
            } catch (invError) {
                db.run("ROLLBACK");
                console.error('Failed to consume inventory:', invError.message);
                throw new Error(`Failed to consume inventory: ${invError.message}`);
            }
        }
        
        db.run(`UPDATE batchIngredients SET ingredientID = ?, ingredientName = ?, actualAmount = ?, actualUnit = ?, inventoryLotID = ?, notes = ? WHERE batchIngredientID = ?`,
               [usageData.ingredientID, displayName, usageData.actualAmount, usageData.actualUnit.trim(), inventoryLotID, usageData.notes?.trim() || null, batchIngredientID]);
        
        console.log(`Recorded usage for ingredient "${ingredientTypeName}": ${usageData.actualAmount} ${usageData.actualUnit} of "${displayName}"`);
        
        db.run("COMMIT");
        
        return {
            success: true,
            message: `Recorded ${usageData.actualAmount} ${usageData.actualUnit} of "${displayName}" (planned: ${plannedAmount} ${plannedUnit})`,
            batchIngredientID,
            inventoryConsumed
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

function addBatchMeasurement(db, batchStageID, measurementData) {
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    if (!measurementData.measurementType || typeof measurementData.measurementType !== 'string' || measurementData.measurementType.trim() === '') {
        throw new Error('measurementType is required and must be a non-empty string');
    }
    
    const stageSql = `SELECT batchStageID, stageName FROM batchStages WHERE batchStageID = ?`;
    const stageResult = db.exec(stageSql, [batchStageID]);
    
    if (stageResult.length === 0 || stageResult[0].values.length === 0) {
        throw new Error(`Batch stage ID ${batchStageID} does not exist`);
    }
    
    const stageName = stageResult[0].values[0][1];
    
    const quantitativeTypes = ['SG', 'pH', 'temp', 'pressure'];
    const qualitativeTypes = ['color', 'taste', 'aroma', 'clarity'];
    
    const isQuantitative = quantitativeTypes.includes(measurementData.measurementType);
    const isQualitative = qualitativeTypes.includes(measurementData.measurementType);
    
    if (isQuantitative) {
        if (measurementData.value === undefined || measurementData.value === null) {
            throw new Error(`Quantitative measurement type "${measurementData.measurementType}" requires a value`);
        }
        if (typeof measurementData.value !== 'number') {
            throw new Error('Measurement value must be a number');
        }
        if (!measurementData.unit || typeof measurementData.unit !== 'string' || measurementData.unit.trim() === '') {
            throw new Error(`Quantitative measurement type "${measurementData.measurementType}" requires a unit`);
        }
    } else if (isQualitative && (!measurementData.notes || measurementData.notes.trim() === '')) {
        console.warn(`Qualitative measurement type "${measurementData.measurementType}" typically requires notes`);
    }
    
    if (measurementData.measurementDate !== undefined && typeof measurementData.measurementDate !== 'string') {
        throw new Error('measurementDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)');
    }
    
    try {
        const dateValue = measurementData.measurementDate || db.exec("SELECT DATETIME('now')")[0].values[0][0];
        
        db.run(`INSERT INTO batchMeasurements (batchStageID, measurementDate, measurementType, value, unit, notes) VALUES (?, ?, ?, ?, ?, ?)`,
               [batchStageID, dateValue, measurementData.measurementType.trim(), measurementData.value ?? null, measurementData.unit?.trim() || null, measurementData.notes?.trim() || null]);
        
        const [[measurementID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`Measurement recorded for stage "${stageName}": ${measurementData.measurementType}` + (measurementData.value !== undefined ? ` = ${measurementData.value} ${measurementData.unit}` : ''));
        
        return {
            success: true,
            message: `Measurement recorded: ${measurementData.measurementType}` + (measurementData.value !== undefined ? ` = ${measurementData.value} ${measurementData.unit}` : ''),
            measurementID
        };
    } catch (error) {
        console.error('Failed to add measurement:', error.message);
        throw new Error(`Failed to add measurement: ${error.message}`);
    }
}

function getBatchMeasurements(db, batchID, options = {}) {
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    try {
        let sql = `SELECT bm.measurementID, bm.batchStageID, bs.stageName, bs.stageOrder, bm.measurementDate, bm.measurementType, bm.value, bm.unit, bm.notes FROM batchMeasurements bm JOIN batchStages bs ON bm.batchStageID = bs.batchStageID WHERE bs.batchID = ?`;
        const params = [batchID];
        
        if (options.batchStageID !== undefined) {
            if (typeof options.batchStageID !== 'number' || options.batchStageID <= 0) {
                throw new Error('batchStageID must be a positive number');
            }
            sql += ' AND bm.batchStageID = ?';
            params.push(options.batchStageID);
        }
        
        if (options.measurementType !== undefined) {
            if (typeof options.measurementType !== 'string' || options.measurementType.trim() === '') {
                throw new Error('measurementType must be a non-empty string');
            }
            sql += ' AND bm.measurementType = ?';
            params.push(options.measurementType.trim());
        }
        
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
        
        sql += ' ORDER BY bm.measurementDate DESC';
        
        console.log(`Fetching measurements for batch ${batchID}`);
        
        const result = db.exec(sql, params);
        const measurements = resultToObjects(result);
        
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

function assignEquipmentToBatchStage(db, batchStageID, equipmentID, inUseDate = null) {
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    if (typeof equipmentID !== 'number' || equipmentID <= 0) {
        throw new Error('Invalid equipment ID (must be positive number)');
    }
    
    const stageSql = `SELECT bs.batchStageID, bs.stageName, bs.status as stageStatus, b.status as batchStatus, b.name as batchName FROM batchStages bs JOIN batches b ON bs.batchID = b.batchID WHERE bs.batchStageID = ?`;
    const stageResult = db.exec(stageSql, [batchStageID]);
    
    if (stageResult.length === 0 || stageResult[0].values.length === 0) {
        throw new Error(`Batch stage ID ${batchStageID} does not exist`);
    }
    
    const [_, stageName, stageStatus, batchStatus, batchName] = stageResult[0].values[0];
    
    if (batchStatus !== 'active') {
        throw new Error(`Cannot assign equipment: batch "${batchName}" is not active (status: ${batchStatus})`);
    }
    
    try {
        const result = assignEquipmentToStage(db, equipmentID, batchStageID, inUseDate);
        console.log(`Equipment ${equipmentID} assigned to batch "${batchName}", stage "${stageName}"`);
        return result;
    } catch (error) {
        console.error('Failed to assign equipment:', error.message);
        throw new Error(`Failed to assign equipment: ${error.message}`);
    }
}

function releaseEquipmentFromBatchStage(db, batchStageID, equipmentID, releaseDate = null) {
    if (typeof batchStageID !== 'number' || batchStageID <= 0) {
        throw new Error('Invalid batch stage ID (must be positive number)');
    }
    
    if (typeof equipmentID !== 'number' || equipmentID <= 0) {
        throw new Error('Invalid equipment ID (must be positive number)');
    }
    
    try {
        const result = releaseEquipmentFromStage(db, equipmentID, batchStageID, releaseDate);
        console.log(`Equipment ${equipmentID} released from batch stage ${batchStageID}`);
        return result;
    } catch (error) {
        console.error('Failed to release equipment:', error.message);
        throw new Error(`Failed to release equipment: ${error.message}`);
    }
}

function getBatchEquipment(db, batchID, options = {}) {
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    try {
        let sql = `SELECT eu.usageID, eu.equipmentID, e.name as equipmentName, e.type as equipmentType, e.capacityL, eu.batchStageID, bs.stageName, bs.stageOrder, eu.inUseDate, eu.releaseDate, eu.status FROM equipmentUsage eu JOIN equipment e ON eu.equipmentID = e.equipmentID JOIN batchStages bs ON eu.batchStageID = bs.batchStageID WHERE bs.batchID = ?`;
        const params = [batchID];
        
        if (options.batchStageID !== undefined) {
            if (typeof options.batchStageID !== 'number' || options.batchStageID <= 0) {
                throw new Error('batchStageID must be a positive number');
            }
            sql += ' AND eu.batchStageID = ?';
            params.push(options.batchStageID);
        }
        
        if (options.status !== undefined) {
            const validStatuses = ['in-use', 'available'];
            if (!validStatuses.includes(options.status)) {
                throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }
            sql += ' AND eu.status = ?';
            params.push(options.status);
        }
        
        sql += ' ORDER BY bs.stageOrder, eu.inUseDate DESC';
        
        console.log(`Fetching equipment for batch ${batchID}`);
        
        const result = db.exec(sql, params);
        const equipment = resultToObjects(result);
        
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

function getBatchTimeline(db, batchID) {
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    const batch = getBatch(db, batchID);
    if (!batch) throw new Error(`Batch ID ${batchID} does not exist`);
    
    try {
        const timeline = [];
        
        if (batch.startDate) {
            timeline.push({ date: batch.startDate, type: "batch_started", description: `Batch "${batch.name}" started` });
        }
        
        if (batch.endDate) {
            if (batch.status === 'completed') {
                timeline.push({ date: batch.endDate, type: "batch_completed", description: `Batch "${batch.name}" completed` });
            } else if (batch.status === 'abandoned') {
                timeline.push({ date: batch.endDate, type: "batch_abandoned", description: `Batch "${batch.name}" abandoned: ${batch.abandonReason}` });
            }
        }
        
        const stagesSql = `SELECT batchStageID, stageName, startDate, endDate, status FROM batchStages WHERE batchID = ? ORDER BY stageOrder`;
        const stagesResult = db.exec(stagesSql, [batchID]);
        const stages = resultToObjects(stagesResult);
        
        for (const stage of stages) {
            if (stage.startDate) {
                timeline.push({ date: stage.startDate, type: "stage_started", description: `Stage "${stage.stageName}" started`, stageID: stage.batchStageID });
            }
            
            if (stage.endDate) {
                if (stage.status === 'completed') {
                    timeline.push({ date: stage.endDate, type: "stage_completed", description: `Stage "${stage.stageName}" completed`, stageID: stage.batchStageID });
                } else if (stage.status === 'skipped') {
                    timeline.push({ date: stage.endDate || batch.endDate || new Date().toISOString(), type: "stage_skipped", description: `Stage "${stage.stageName}" skipped`, stageID: stage.batchStageID });
                }
            }
        }
        
        const measurements = getBatchMeasurements(db, batchID);
        for (const measurement of measurements) {
            let description = `${measurement.measurementType}`;
            if (measurement.value !== null) {
                description += ` = ${measurement.value} ${measurement.unit}`;
            }
            if (measurement.notes) {
                description += ` (${measurement.notes})`;
            }
            timeline.push({ date: measurement.measurementDate, type: "measurement", description, stageID: measurement.batchStageID, measurementID: measurement.measurementID });
        }
        
        const equipment = getBatchEquipment(db, batchID);
        for (const eq of equipment) {
            timeline.push({ date: eq.inUseDate, type: "equipment_assigned", description: `Equipment "${eq.equipmentName}" assigned to stage "${eq.stageName}"`, stageID: eq.batchStageID, equipmentID: eq.equipmentID });
            
            if (eq.releaseDate) {
                timeline.push({ date: eq.releaseDate, type: "equipment_released", description: `Equipment "${eq.equipmentName}" released from stage "${eq.stageName}"`, stageID: eq.batchStageID, equipmentID: eq.equipmentID });
            }
        }
        
        const ingredientsSql = `SELECT bi.batchIngredientID, bi.ingredientTypeName, bi.ingredientName, bi.actualAmount, bi.actualUnit, bs.batchStageID, bs.stageName, bs.startDate FROM batchIngredients bi JOIN batchStages bs ON bi.batchStageID = bs.batchStageID WHERE bs.batchID = ? AND bi.actualAmount IS NOT NULL`;
        const ingredientsResult = db.exec(ingredientsSql, [batchID]);
        const ingredients = resultToObjects(ingredientsResult);
        
        for (const ing of ingredients) {
            const date = ing.startDate || batch.startDate || new Date().toISOString();
            timeline.push({ date, type: "ingredient_used", description: `Used ${ing.actualAmount} ${ing.actualUnit} of ${ing.ingredientName || ing.ingredientTypeName}`, stageID: ing.batchStageID, ingredientID: ing.batchIngredientID });
        }
        
        timeline.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
        
        console.log(`Generated timeline with ${timeline.length} events for batch ${batchID}`);
        return timeline;
    } catch (error) {
        console.error('Failed to generate batch timeline:', error.message);
        throw new Error(`Failed to generate batch timeline: ${error.message}`);
    }
}

function getBatchCost(db, batchID) {
    if (typeof batchID !== 'number' || batchID <= 0) {
        throw new Error('Invalid batch ID (must be positive number)');
    }
    
    const batch = getBatch(db, batchID);
    if (!batch) throw new Error(`Batch ID ${batchID} does not exist`);
    
    try {
        const details = [];
        let ingredientCost = 0;
        const supplyCost = 0;
        
        const ingredientsSql = `SELECT bi.ingredientTypeName, bi.ingredientName, bi.actualAmount, bi.actualUnit, bi.inventoryLotID, il.costPerUnit, il.unit as lotUnit FROM batchIngredients bi JOIN batchStages bs ON bi.batchStageID = bs.batchStageID LEFT JOIN inventoryLots il ON bi.inventoryLotID = il.lotID WHERE bs.batchID = ? AND bi.actualAmount IS NOT NULL AND bi.inventoryLotID IS NOT NULL`;
        
        const ingredientsResult = db.exec(ingredientsSql, [batchID]);
        const ingredients = resultToObjects(ingredientsResult);
        
        for (const ing of ingredients) {
            let cost = 0;
            
            if (ing.costPerUnit !== null) {
                let amountInLotUnits = ing.actualAmount;
                
                if (ing.actualUnit !== ing.lotUnit) {
                    try {
                        const massUnits = ['mg', 'g', 'kg', 'tonne', 'gr', 'dr', 'oz', 'lb', 'ton'];
                        const volumeUnits = ['ml', 'l', 'cl', 'dl', 'm3', 'tsp', 'tbsp', 'fl-oz', 'cup', 'pt', 'qt', 'gal', 'imp-fl-oz', 'imp-pt', 'imp-qt', 'imp-gal'];
                        
                        let category;
                        if (massUnits.includes(ing.actualUnit.toLowerCase()) && massUnits.includes(ing.lotUnit.toLowerCase())) {
                            category = 'mass';
                        } else if (volumeUnits.includes(ing.actualUnit.toLowerCase()) && volumeUnits.includes(ing.lotUnit.toLowerCase())) {
                            category = 'volume';
                        } else {
                            console.warn(`Cannot convert ${ing.actualUnit} to ${ing.lotUnit} for ${ing.ingredientTypeName} - incompatible unit types`);
                            continue;
                        }
                        
                        amountInLotUnits = convert(ing.actualAmount, ing.actualUnit, ing.lotUnit, category);
                        console.log(`Converted ${ing.actualAmount} ${ing.actualUnit} to ${amountInLotUnits} ${ing.lotUnit}`);
                    } catch (convError) {
                        console.warn(`Unit conversion failed for ${ing.ingredientTypeName}: ${convError.message}`);
                        continue;
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
        
        const totalCost = ingredientCost + supplyCost;
        
        console.log(`Batch ${batchID} cost: ingredients ${ingredientCost.toFixed(2)}, supplies ${supplyCost.toFixed(2)}, total ${totalCost.toFixed(2)}`);
        
        return {
            ingredientCost: parseFloat(ingredientCost.toFixed(2)),
            supplyCost: parseFloat(supplyCost.toFixed(2)),
            totalCost: parseFloat(totalCost.toFixed(2)),
            details,
            note: details.length === 0 ? "No cost data available (ingredients not linked to inventory lots)" : null
        };
    } catch (error) {
        console.error('Failed to calculate batch cost:', error.message);
        throw new Error(`Failed to calculate batch cost: ${error.message}`);
    }
}

export {
    createBatch, getBatch, getBatchWithDetails, getAllBatches,
    updateBatchMetadata, deleteBatch, startBatch, completeBatch, abandonBatch,
    startBatchStage, completeBatchStage, skipBatchStage,
    recordIngredientUsage, addBatchMeasurement, getBatchMeasurements,
    assignEquipmentToBatchStage, releaseEquipmentFromBatchStage, getBatchEquipment,
    getBatchTimeline, getBatchCost
}
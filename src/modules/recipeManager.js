// recipeManager.js

import { resultToObjects } from './helpers.js';

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validates if an ingredient can be used in a specific stage
 * @param {Object} db - SQL.js database instance
 * @param {number} ingredientTypeID - The ingredient being added
 * @param {number} stageTypeID - The stage it's being added to
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateIngredientForStage(db, ingredientTypeID, stageTypeID) {
    // STEP 1: Get ingredient's contexts
    const ingredientContextsSql = `
        SELECT contextID 
        FROM ingredientTypeContexts 
        WHERE ingredientTypeID = ?
    `;
    
    const ingredientResult = db.exec(ingredientContextsSql, [ingredientTypeID]);
    
    // Convert result to simple array of contextIDs
    const ingredientContexts = ingredientResult.length > 0 
        ? ingredientResult[0].values.map(row => row[0]) 
        : [];
    
    console.log(`Ingredient ${ingredientTypeID} has contexts:`, ingredientContexts);

    // STEP 2: Get stage's contexts
    const stageContextSql = `
        SELECT contextID
        FROM stageTypeAllowedContexts
        WHERE stageTypeID = ?
    `;

    const stageResult = db.exec(stageContextSql, [stageTypeID]);

    // Convert result to simple array of contextIDs
    const stageContexts = stageResult.length > 0
    ? stageResult[0].values.map(row => row[0])
    : [];

    console.log(`Stage ${stageTypeID} has contexts:`, stageContexts)

    // Step 3: Compare and validate
    for (const contextID of ingredientContexts) {
        if (stageContexts.includes(contextID)) {
            return {isValid: true, error: null};
        }
    }

    //if no matches found
    return { isValid: false, error: `This ingredient cannot be used in this stage` };
}

/**
 * Validates that no stage type appears consecutively in a recipe
 * 
 * Business Rule: A stage type cannot immediately follow itself.
 * Example: Cannot have "Must Preparation" → "Must Preparation"
 * But CAN have "Must Preparation" → "Fermentation" → "Must Preparation"
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Array} stages - Array of stage objects with stageTypeID and stageOrder
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateNoConsecutiveDuplicates(db, stages) {
    // STEP 1: Sort stages by order
    const sortedStages = [...stages].sort((a, b) => a.stageOrder - b.stageOrder);

    // STEP 2: Check each stage against the previous one
    for (let i = 1; i < sortedStages.length; i++) {
        const currentStage = sortedStages[i];
        const previousStage = sortedStages[i - 1];
        
        if (currentStage.stageTypeID === previousStage.stageTypeID) {
            // Get the stage type name for a better error message
            const sql = `SELECT name FROM stageTypes WHERE stageTypeID = ?`;
            const result = db.exec(sql, [currentStage.stageTypeID]);
            const stageName = result[0].values[0][0];
            
            return { 
                isValid: false, 
                error: `Stage type '${stageName}' cannot appear consecutively (found at orders ${previousStage.stageOrder} and ${currentStage.stageOrder})` 
            };
        }
    }
    
    // STEP 3: No duplicates found - validation passed
    return { isValid: true, error: null };
}

/**
 * Validates fermentable ingredients in Flavour Adjustment stage
 * 
 * Business Rule: Fermentables can only be added during Flavour Adjustment if the recipe
 * has been stabilised first. This prevents restarting fermentation after adjusting flavour.
 * 
 * Validation Logic:
 * - If no Flavour Adjustment stage exists → Valid (nothing to check)
 * - If Flavour Adjustment has no fermentables → Valid (non-fermentables are always safe)
 * - If Flavour Adjustment has fermentables:
 *   - Stabilisation stage must exist
 *   - Stabilisation must come BEFORE Flavour Adjustment (lower stageOrder)
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Array} stages - Array of stage objects from recipe
 * @returns {Object} { isValid: boolean, error: string|null }
 * 
 * @example
 * // Valid: Stabilisation (order 40) before Flavour Adjustment (order 50)
 * const result = validateFlavourAdjustmentIngredients(db, [
 *   { stageTypeID: 4, stageOrder: 40 },  // Stabilisation
 *   { stageTypeID: 5, stageOrder: 50, ingredients: [...fermentables...] }
 * ]);
 * // result: { isValid: true, error: null }
 * 
 * @example
 * // Invalid: Fermentables without stabilisation
 * const result = validateFlavourAdjustmentIngredients(db, [
 *   { stageTypeID: 5, stageOrder: 50, ingredients: [...fermentables...] }
 * ]);
 * // result: { isValid: false, error: '...' }
 */
function validateFlavourAdjustmentIngredients(db, stages) {
    // STEP 1: LOCATE RELEVANT STAGES
    // Scan through all stages to find:
    // - Stabilisation (stageTypeID = 4)
    // - Flavour Adjustment (stageTypeID = 5)
    let stabilisationStage = null;
    let flavourAdjustmentStage = null;
    
    for (const stage of stages) {
        if (stage.stageTypeID === 4) {
            stabilisationStage = stage;
        }
        if (stage.stageTypeID === 5) {
            flavourAdjustmentStage = stage;
        }
    }
    
    // STEP 2: EARLY EXIT - NO FLAVOUR ADJUSTMENT
    // If recipe doesn't have a Flavour Adjustment stage,
    // there's nothing to validate
    if (flavourAdjustmentStage === null) {
        return { isValid: true, error: null };
    }

    // STEP 3: CHECK FOR FERMENTABLE INGREDIENTS
    // If Flavour Adjustment has no ingredients, or none are fermentable,
    // then there's no risk of restarting fermentation
    
    if (!flavourAdjustmentStage.ingredients || flavourAdjustmentStage.ingredients.length === 0) {
        return { isValid: true, error: null };
    }

    // Check each ingredient to see if any have the "fermentable" context
    let hasFermentables = false;

    for (const ingredient of flavourAdjustmentStage.ingredients) {
        // Query: Does this ingredient have "fermentable" context (contextID = 1)?
        const contextQuery = `
            SELECT contextID 
            FROM ingredientTypeContexts 
            WHERE ingredientTypeID = ? AND contextID = 1
        `;
        
        const result = db.exec(contextQuery, [ingredient.ingredientTypeID]);
        
        if (result.length > 0) {
            hasFermentables = true;
            break;  // Found one fermentable, no need to check more
        }
    }

    // If no fermentables found, recipe is safe
    if (!hasFermentables) {
        return { isValid: true, error: null };
    }

    // STEP 4: VALIDATE STABILISATION REQUIREMENTS
    // At this point we know Flavour Adjustment contains fermentables.
    // Check if stabilisation stage exists and comes first.

    // Case 1: No stabilisation stage exists
    if (stabilisationStage === null) {
        return { 
            isValid: false, 
            error: 'Flavour Adjustment cannot contain fermentables without prior Stabilisation stage' 
        };
    }

    // Case 2: Stabilisation exists but comes AFTER Flavour Adjustment
    // This would allow fermentation to restart before being stabilised
    if (stabilisationStage.stageOrder >= flavourAdjustmentStage.stageOrder) {
        return { 
            isValid: false, 
            error: 'Stabilisation stage must occur before Flavour Adjustment when using fermentables' 
        };
    }

    // Case 3: All good - stabilisation exists and comes first
    return { isValid: true, error: null };
}

/**
 * Validates that stage prerequisites are met
 * 
 * Business Rule: If a stage requires another stage, that prerequisite stage must:
 * 1. Exist in the recipe
 * 2. Come before the dependent stage (lower stageOrder)
 * 
 * Example: Stabilisation requires Fermentation, so Fermentation must exist and come first
 * 
 * Reads prerequisite rules from stageTypes.requiresStage in the schema.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Array} stages - Array of stage objects with stageTypeID and stageOrder
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateStagePrerequisites(db, stages) {
    // STEP 1: Extract stage type IDs
    const stageTypeIDs = stages.map(stage => stage.stageTypeID);
    
    // STEP 2: Create order lookup map
    const stageOrderMap = {};
    for (const stage of stages) {
        stageOrderMap[stage.stageTypeID] = stage.stageOrder;
    }
    
    // STEP 3: Get prerequisite rules from schema
    const placeholders = stageTypeIDs.map(() => '?').join(',');
    const sql = `
        SELECT stageTypeID, name, requiresStage
        FROM stageTypes
        WHERE stageTypeID IN (${placeholders})
        AND requiresStage IS NOT NULL
    `;
    
    const result = db.exec(sql, stageTypeIDs);
    const prerequisiteRules = resultToObjects(result);
    
    // Example result:
    // [
    //     { stageTypeID: 2, name: 'Fermentation', requiresStage: 1 },
    //     { stageTypeID: 4, name: 'Stabilisation', requiresStage: 2 }
    // ]

    // STEP 4: Check each prerequisite rule
    for (const rule of prerequisiteRules) {
        // Get the name of the required stage (we'll need it for error messages)
        const requiredStageSql = `SELECT name FROM stageTypes WHERE stageTypeID = ?`;
        const requiredResult = db.exec(requiredStageSql, [rule.requiresStage]);
        const requiredStageName = requiredResult[0].values[0][0];
        
        // CHECK 1: Does the required stage exist?
        if (!stageTypeIDs.includes(rule.requiresStage)) {
            return {
                isValid: false,
                error: `Stage '${rule.name}' requires prerequisite stage '${requiredStageName}' which is missing from the recipe`
            };
        }
        
        // CHECK 2: Does the required stage come first?
        const dependentOrder = stageOrderMap[rule.stageTypeID];
        const requiredOrder = stageOrderMap[rule.requiresStage];
        
        if (requiredOrder >= dependentOrder) {
            return {
                isValid: false,
                error: `Stage '${rule.name}' requires prerequisite stage '${requiredStageName}' to come before it (found at order ${requiredOrder}, needs to be before ${dependentOrder})`
            };
        }
    }

    // STEP 5: No issues found
    return { isValid: true, error: null };
}

/**
 * Validates that mutually exclusive stages don't coexist in a recipe
 * 
 * Business Rule: Some stages cannot exist together in the same recipe.
 * Example: Stabilisation (prevents fermentation) excludes Priming (requires fermentation)
 * 
 * Reads exclusion rules from stageTypes.excludesStage in the schema.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Array} stages - Array of stage objects with stageTypeID
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateStageExclusions(db, stages) {
    // STEP 1: Extract stage type IDs from the recipe
    const stageTypeIDs = stages.map(stage => stage.stageTypeID);
    
    // STEP 2: Get exclusion rules from schema for stages in this recipe
    const placeholders = stageTypeIDs.map(() => '?').join(',');
    const sql = `
        SELECT stageTypeID, name, excludesStage
        FROM stageTypes
        WHERE stageTypeID IN (${placeholders})
        AND excludesStage IS NOT NULL
    `;
    
    const result = db.exec(sql, stageTypeIDs);
    const exclusionRules = resultToObjects(result);
    
    // STEP 3: Check each exclusion rule
    for (const rule of exclusionRules) {
        // Does the recipe have the excluded stage?
        if (stageTypeIDs.includes(rule.excludesStage)) {
            // Get the name of the excluded stage
            const excludedStageSql = `SELECT name FROM stageTypes WHERE stageTypeID = ?`;
            const excludedResult = db.exec(excludedStageSql, [rule.excludesStage]);
            const excludedStageName = excludedResult[0].values[0][0];
            
            return {
                isValid: false,
                error: `Recipe cannot contain both '${rule.name}' and '${excludedStageName}' stages`
            };
        }
    }
    
    // STEP 4: No conflicts found
    return { isValid: true, error: null };
}

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Create a new recipe
 * 
 * Creates a complete recipe with stages and ingredients. All data is validated before insertion.
 * Supports both draft recipes (work in progress) and finalized recipes (ready to use).
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} recipeData - Recipe information
 * @param {string} recipeData.name - Recipe name (required)
 * @param {string} recipeData.type - Beverage type: Mead, Cider, Wine, Beer, Perry (required)
 * @param {string} [recipeData.description] - Recipe description (optional)
 * @param {number} [recipeData.batchSizeL] - Default batch size in litres (optional)
 * @param {string} [recipeData.author] - Recipe creator (optional)
 * @param {number} [recipeData.isDraft=1] - 1 = draft, 0 = finalised (optional)
 * @param {number} [recipeData.isStarter=0] - 1 = starter recipe, 0 = user-created (optional)
 * @param {Array} [recipeData.stages] - Array of stage objects with ingredients (optional for drafts)
 * @returns {Object} Complete recipe object with all generated IDs
 * @throws {Error} If validation fails or database operation fails
 * 
 * @example
 * const recipe = createRecipe(db, {
 *   name: "Traditional Cider",
 *   type: "Cider",
 *   batchSizeL: 5,
 *   isDraft: 0,
 *   stages: [
 *     {
 *       stageTypeID: 1,
 *       stageOrder: 10,
 *       instructions: "Add apple juice to the clean and sanitised fermentation vessel.",
 *       expectedDurationDays: 0,
 *       ingredients: [
 *         { ingredientTypeID: 1, amount: 5, unit: "L" }
 *       ]
 *     },
 *     {
 *       stageTypeID: 2,
 *       stageOrder: 20,
 *       instructions: "Ferment at 20°C",
 *       expectedDurationDays: 14,
 *       ingredients: [
 *         { ingredientTypeID: 15, 
 *              amount: 1, unit: "packet", 
 *              preferredVariant: "Lalvin 71B-1122", 
 *              notes: "Or substitute with EC-1118" 
 *          }
 *       ]
 *     }
 *   ]
 * });
 */
function createRecipe(db, recipeData) {
    // STEP 1: VALIDATE BASIC RECIPE INFO
    if (!recipeData.name || recipeData.name.trim() === '') {
        throw new Error('Recipe name is required');
    }
    
    if (!recipeData.type || recipeData.type.trim() === '') {
        throw new Error('Recipe type is required');
    }
    
    const validTypes = ['Mead', 'Cider', 'Wine', 'Beer', 'Perry'];
    if (!validTypes.includes(recipeData.type)) {
        throw new Error(`Invalid recipe type. Must be one of: ${validTypes.join(', ')}`);
    }
    
    // STEP 2: CHECK IF FINALISED RECIPE HAS STAGES
    if (recipeData.isDraft === 0) {
        if (!recipeData.stages || recipeData.stages.length === 0) {
            throw new Error('Cannot finalise recipe: stages are required for non-draft recipes');
        }
    }
    
    // STEP 3: IF STAGES PROVIDED, VALIDATE THEY ARE AN ARRAY
    if (recipeData.stages && !Array.isArray(recipeData.stages)) {
        throw new Error('Stages must be an array');
    }
    
    // STEP 4: PREPARE RECIPE DATA
    const recipe = {
        name: recipeData.name.trim(),
        type: recipeData.type.trim(),
        description: recipeData.description?.trim() || null,
        batchSizeL: recipeData.batchSizeL ?? null,
        author: recipeData.author?.trim() || null,
        isDraft: recipeData.isDraft ?? 1,
        isStarter: recipeData.isStarter ?? 0
    };
    
    try {
        // STEP 5: INSERT RECIPE (BASIC INFO)
        const sql = `
            INSERT INTO recipes (name, type, description, batchSizeL, author, isDraft, isStarter)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [
            recipe.name,
            recipe.type,
            recipe.description,
            recipe.batchSizeL,
            recipe.author,
            recipe.isDraft,
            recipe.isStarter
        ]);
        
        // STEP 6: GET THE NEW RECIPE ID
        const [[recipeID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`Recipe created successfully: ID ${recipeID}`);
        
        // STEP 7: PROCESS STAGES (if provided)
        const createdStages = [];
        
        if (recipeData.stages && recipeData.stages.length > 0) {
            console.log(`Processing ${recipeData.stages.length} stages...`);
            
            for (const stageData of recipeData.stages) {
                // VALIDATE STAGE
                if (!stageData.stageTypeID) {
                    throw new Error('Stage missing stageTypeID');
                }
                if (!stageData.stageOrder) {
                    throw new Error('Stage missing stageOrder');
                }
                
                // INSERT STAGE
                const stageSql = `
                    INSERT INTO recipeStages (recipeID, stageTypeID, stageOrder, instructions, expectedDurationDays)
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                db.run(stageSql, [
                    recipeID,
                    stageData.stageTypeID,
                    stageData.stageOrder,
                    stageData.instructions || null,
                    stageData.expectedDurationDays || null
                ]);
                
                // GET THE NEW STAGE ID
                const [[stageID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
                
                console.log(`  Stage ${stageData.stageOrder} created: ID ${stageID}`);
                
                // Store stage info for return object
                createdStages.push({
                    stageID: stageID,
                    stageTypeID: stageData.stageTypeID,
                    stageOrder: stageData.stageOrder,
                    instructions: stageData.instructions || null,
                    expectedDurationDays: stageData.expectedDurationDays || null,
                    ingredients: [] // We'll fill this in next
                });
                
                // PROCESS INGREDIENTS (if stage has them)
                const createdIngredients = [];

                if (stageData.ingredients && stageData.ingredients.length > 0) {
                    console.log(`    Processing ${stageData.ingredients.length} ingredients for stage ${stageData.stageOrder}...`);
                    
                    for (const ingredientData of stageData.ingredients) {
                        // VALIDATE INGREDIENT
                        if (!ingredientData.ingredientTypeID) {
                            throw new Error(`Ingredient missing ingredientTypeID in stage ${stageData.stageOrder}`);
                        }

                        // Validate ingredient context against stage requirements
                        const validation = validateIngredientForStage(db, ingredientData.ingredientTypeID, stageData.stageTypeID);
                        if (!validation.isValid) {
                            throw new Error(`Invalid ingredient in stage ${stageData.stageOrder}: ${validation.error}`);
                        }
                        
                        if (!ingredientData.amount || ingredientData.amount <= 0) {
                            throw new Error(`Ingredient must have amount > 0 in stage ${stageData.stageOrder}`);
                        }
                        if (!ingredientData.unit) {
                            throw new Error(`Ingredient missing unit in stage ${stageData.stageOrder}`);
                        }
                        
                        // Validate scalingMethod if provided
                        const validScalingMethods = ['linear', 'fixed', 'step'];
                        const scalingMethod = ingredientData.scalingMethod || 'linear';
                        if (!validScalingMethods.includes(scalingMethod)) {
                            throw new Error(`Invalid scalingMethod: ${scalingMethod}. Must be one of: ${validScalingMethods.join(', ')}`);
                        }
                        
                        // INSERT INGREDIENT
                        const ingredientSql = `
                            INSERT INTO recipeIngredients (stageID, ingredientTypeID, amount, unit, scalingMethod, preferredVariant, notes)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `;

                        db.run(ingredientSql, [
                            stageID,
                            ingredientData.ingredientTypeID,
                            ingredientData.amount,
                            ingredientData.unit,
                            scalingMethod,
                            ingredientData.preferredVariant || null,  // ADD THIS
                            ingredientData.notes || null
                        ]);

                        
                        // GET THE NEW INGREDIENT ID
                        const [[recipeIngredientID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
                        
                        console.log(`      Ingredient created: ID ${recipeIngredientID}`);
                        
                        // Store ingredient info
                        createdIngredients.push({
                            recipeIngredientID: recipeIngredientID,
                            ingredientTypeID: ingredientData.ingredientTypeID,
                            amount: ingredientData.amount,
                            unit: ingredientData.unit,
                            scalingMethod: scalingMethod,
                            preferredVariant: ingredientData.preferredVariant || null,  // ADD THIS
                            notes: ingredientData.notes || null
                        });
                    }
                }

                // Update the stage's ingredients array
                createdStages[createdStages.length - 1].ingredients = createdIngredients;
            }
        }
        
        // STEP 8: VALIDATE COMPLEX BUSINESS RULES
        if (recipeData.stages && recipeData.stages.length > 0) {
            const flavourValidation = validateFlavourAdjustmentIngredients(db, recipeData.stages);
            if (!flavourValidation.isValid) {
                throw new Error(flavourValidation.error);
            }
            
            const exclusionValidation = validateStageExclusions(db, recipeData.stages);
            if (!exclusionValidation.isValid) {
                throw new Error(exclusionValidation.error);
            }
            
            const duplicateValidation = validateNoConsecutiveDuplicates(db, recipeData.stages);
            if (!duplicateValidation.isValid) {
                throw new Error(duplicateValidation.error);
            }
            
            const prerequisiteValidation = validateStagePrerequisites(db, recipeData.stages);
            if (!prerequisiteValidation.isValid) {
                throw new Error(prerequisiteValidation.error);
            }
        }
        
        // STEP 9: RETURN COMPLETE OBJECT
        return {
            recipeID: recipeID,
            name: recipe.name,
            type: recipe.type,
            description: recipe.description,
            batchSizeL: recipe.batchSizeL,
            author: recipe.author,
            isDraft: recipe.isDraft,
            isStarter: recipe.isStarter,
            stages: createdStages
        };
        
    } catch (error) {
        console.error('Failed to create recipe:', error.message);
        throw new Error(`Failed to create recipe: ${error.message}`);
    }
}

/**
 * Get a single recipe by ID
 * 
 * Retrieves basic recipe information (metadata only).
 * Does NOT include stages, ingredients, or other related data.
 * Use getRecipeWithDetails() for complete recipe information.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} recipeID - ID of the recipe to retrieve
 * @returns {Object|null} Recipe object with basic info, or null if not found
 * @throws {Error} If recipeID is invalid or database operation fails
 * 
 * @example
 * // Get basic recipe info
 * const recipe = getRecipe(db, 5);
 * if (recipe) {
 *   console.log(recipe.name);        // "Traditional Cider"
 *   console.log(recipe.type);        // "Cider"
 *   console.log(recipe.batchSizeL);  // 5
 *   console.log(recipe.isDraft);     // 0 (finalized)
 * } else {
 *   console.log("Recipe not found");
 * }
 * 
 * @example
 * // Returns object with these properties:
 * {
 *   recipeID: 5,
 *   name: "Traditional Cider",
 *   author: "John Smith",
 *   type: "Cider",
 *   isStarter: 0,
 *   isDraft: 0,
 *   createdDate: "2025-11-05",
 *   modifiedDate: "2025-11-05",
 *   description: "A simple traditional cider recipe",
 *   batchSizeL: 5
 * }
 */
function getRecipe(db, recipeID) {
    // STEP 1: VALIDATE RECIPE ID
    // Ensure recipeID is a positive number to prevent invalid queries
    if (typeof recipeID !== 'number' || recipeID <= 0) {
        throw new Error('Invalid recipe ID (must be positive number)');
    }
    
    try {
        // STEP 2: QUERY DATABASE
        // Use parameterized query to prevent SQL injection
        // Returns only basic recipe metadata (no stages/ingredients)
        const sql = `SELECT * FROM recipes WHERE recipeID = ?`;
        const result = db.exec(sql, [recipeID]);
        
        // STEP 3: CONVERT RESULT TO OBJECT
        // db.exec() returns array format, convert to object for easier use
        const recipes = resultToObjects(result);
        
        // STEP 4: RETURN RESULT
        // Return recipe object if found, null if not found
        return recipes.length > 0 ? recipes[0] : null;
        
    } catch (error) {
        console.error('Failed to fetch recipe:', error.message);
        throw new Error(`Failed to fetch recipe: ${error.message}`);
    }
}

/**
 * Get complete recipe with all stages and ingredients
 * 
 * Returns a fully populated recipe object including all stages (in order)
 * and all ingredients for each stage.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} recipeID - Recipe to retrieve
 * @returns {Object|null} Complete recipe object or null if not found
 * @throws {Error} If database operation fails
 * 
 * @example
 * const recipe = getRecipeWithDetails(db, 5);
 * // Returns:
 * {
 *   recipeID: 5,
 *   name: "Traditional Cider",
 *   type: "Cider",
 *   ...metadata...,
 *   stages: [
 *     {
 *       stageID: 1,
 *       stageTypeID: 1,
 *       stageName: "Must Preparation",
 *       stageOrder: 10,
 *       instructions: "Mix juice",
 *       ingredients: [
 *         {
 *           recipeIngredientID: 1,
 *           ingredientTypeID: 1,
 *           ingredientTypeName: "Apple Juice",
 *           amount: 5,
 *           unit: "L",
 *           ...
 *         }
 *       ]
 *     },
 *     ...more stages...
 *   ]
 * }
 */
function getRecipeWithDetails(db, recipeID) {
    // STEP 1: GET BASIC RECIPE
    const recipe = getRecipe(db, recipeID);
    if (!recipe) {
        return null;  // Recipe doesn't exist
    }
    
    try {
        // STEP 2: GET ALL STAGES
        const stagesSql = `
            SELECT 
                rs.stageID,
                rs.stageTypeID,
                st.name as stageName,
                rs.stageOrder,
                rs.instructions,
                rs.expectedDurationDays
            FROM recipeStages rs
            JOIN stageTypes st ON rs.stageTypeID = st.stageTypeID
            WHERE rs.recipeID = ?
            ORDER BY rs.stageOrder
        `;
        
        const stagesResult = db.exec(stagesSql, [recipeID]);
        const stages = resultToObjects(stagesResult);
        
        // STEP 3: GET ALL INGREDIENTS (if stages exist)
        if (stages.length > 0) {
            // Get all stage IDs
            const stageIDs = stages.map(s => s.stageID);
            
            // Query all ingredients for all stages
            const ingredientsSql = `
                SELECT 
                    ri.recipeIngredientID,
                    ri.stageID,
                    ri.ingredientTypeID,
                    it.name as ingredientTypeName,
                    ri.amount,
                    ri.unit,
                    ri.scalingMethod,
                    ri.preferredVariant,
                    ri.notes
                FROM recipeIngredients ri
                JOIN ingredientTypes it ON ri.ingredientTypeID = it.ingredientTypeID
                WHERE ri.stageID IN (${stageIDs.join(',')})
                ORDER BY ri.recipeIngredientID
            `;
            
            const ingredientsResult = db.exec(ingredientsSql);
            const allIngredients = resultToObjects(ingredientsResult);
            
            // STEP 4: ATTACH INGREDIENTS TO STAGES
            for (const stage of stages) {
                stage.ingredients = allIngredients.filter(ing => ing.stageID === stage.stageID);
            }
        }
        
        // Always set stages (populated or empty)
        recipe.stages = stages;
        
        // STEP 5: RETURN COMPLETE RECIPE
        return recipe;
        
    } catch (error) {
        console.error('Failed to fetch recipe details:', error.message);
        throw new Error(`Failed to fetch recipe details: ${error.message}`);
    }
}

/**
 * Get all recipes with optional filters
 * @param {Object} db - SQL.js database instance
 * @param {Object} [options] - Filter options
 * @param {string} [options.type] - Filter by beverage type
 * @param {number} [options.isDraft] - Filter by draft status (0 or 1)
 * @returns {Array} Array of recipe objects
 */
function getAllRecipes(db, options = {}) {
    try {
        let sql = 'SELECT * FROM recipes';
        const conditions = [];
        
        // STEP 1: FILTER BY TYPE
        if (options.type) {
            const validTypes = ['Mead', 'Cider', 'Wine', 'Beer', 'Perry', 'Other'];
            if (!validTypes.includes(options.type)) {
                throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
            }
            conditions.push(`type = '${options.type}'`);
        }
        
        // STEP 2: FILTER BY DRAFT STATUS
        if (typeof options.isDraft === 'number') {
            // Validate isDraft is 0 or 1
            if (options.isDraft !== 0 && options.isDraft !== 1) {
                throw new Error('isDraft must be 0 or 1');
            }
            conditions.push(`isDraft = ${options.isDraft}`);
        }
        
        // STEP 3: Add WHERE clause if filters exist
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        // STEP 4: ADD ORDERING (NEWEST FIRST)
        sql += ' ORDER BY createdDate DESC';
        
        console.log(`Fetching recipes with query: ${sql}`);
        
        const result = db.exec(sql);
        const recipes = resultToObjects(result);
        
        console.log(`Found ${recipes.length} recipes`);
        return recipes;
        
    } catch (error) {
        console.error('Failed to fetch recipes:', error.message);
        throw new Error(`Failed to fetch recipes: ${error.message}`);
    }
}

/**
 * Update recipe metadata (basic information)
 * 
 * Updates non-structural recipe data. Cannot modify stages or ingredients.
 * Use addRecipeStage(), removeRecipeStage(), etc. for structural changes.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} recipeID - Recipe to update
 * @param {Object} updates - Fields to update (only provided fields are changed)
 * @param {string} [updates.name] - New recipe name
 * @param {string} [updates.description] - New description
 * @param {string} [updates.author] - New author
 * @param {number} [updates.batchSizeL] - New default batch size
 * @param {number} [updates.isDraft] - Draft status (0 or 1)
 * @returns {Object} { success: boolean, message: string, updatedFields: array }
 * @throws {Error} If recipe doesn't exist or validation fails
 */
function updateRecipeMetadata(db, recipeID, updates) {
    // STEP 1: Check if recipe exists
    const recipe = getRecipe(db, recipeID);
    if (!recipe) {
        throw new Error(`Recipe ID ${recipeID} does not exist`);
    }
    
    // STEP 2: VALIDATE FIELDS
    // Check if name is empty
    if ('name' in updates && (!updates.name || updates.name.trim() === '')) {
        throw new Error('Recipe name cannot be empty');
    }

    // Check if isDraft is 0 or 1
    if ('isDraft' in updates && updates.isDraft !== 0 && updates.isDraft !== 1) {
        throw new Error('isDraft must be 0 or 1');
    }

    // Check if batchSizeL is a positive number
    if ('batchSizeL' in updates && (typeof updates.batchSizeL !== 'number' || updates.batchSizeL <= 0)) {
        throw new Error('Batch size must be a positive number');
    }
    
    // STEP 3: BUILD DYNAMIC SQL (I'll give you this part)
    const allowedFields = ['name', 'description', 'author', 'batchSizeL', 'isDraft'];
    
    // Filter to allowed fields only
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
    
    // Build SET clause
    const setClauses = [];
    const values = [];
    
    for (const [key, value] of Object.entries(filteredUpdates)) {
        setClauses.push(`${key} = ?`);
        values.push(value);
    }
    
    setClauses.push(`modifiedDate = DATE('now')`);
    
    const sql = `UPDATE recipes SET ${setClauses.join(', ')} WHERE recipeID = ?`;
    values.push(recipeID);
    
    // STEP 4: EXECUTE
    try {
        db.run(sql, values);
        
        return {
            success: true,
            message: `Recipe "${recipe.name}" updated successfully`,
            updatedFields: Object.entries(filteredUpdates).map(([key, value]) => ({
                field: key,
                newValue: value
            }))
        };
    } catch (error) {
        console.error('Failed to update recipe:', error.message);
        throw new Error(`Failed to update recipe: ${error.message}`);
    }
}

/**
 * Add a new stage to an existing recipe
 * 
 * Automatically shifts existing stages if necessary to maintain order.
 * Does not validate stage prerequisites or exclusions (Phase 2 feature).
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} recipeID - Recipe to add stage to
 * @param {Object} stageData - Stage information
 * @param {number} stageData.stageTypeID - Type of stage (1-8)
 * @param {number} stageData.stageOrder - Order in workflow (10, 20, 30...)
 * @param {string} [stageData.instructions] - Instructions for this stage
 * @param {number} [stageData.expectedDurationDays] - Expected duration
 * @returns {Object} { success: boolean, stageID: number, stageName: string, stageOrder: number, message: string }
 * @throws {Error} If validation fails
 * 
 * @example
 * const result = addRecipeStage(db, 5, {
 *     stageTypeID: 4,
 *     stageOrder: 35,
 *     instructions: "Add stabilizer and wait 24 hours",
 *     expectedDurationDays: 1
 * });
 * // Returns: { success: true, stageID: 8, stageName: "Stabilization", stageOrder: 35, ... }
 */
function addRecipeStage(db, recipeID, stageData) {
    // STEP 1: VALIDATE RECIPE EXISTS
    const recipe = getRecipe(db, recipeID);
    if (!recipe) {
        throw new Error(`Recipe ID ${recipeID} does not exist`);
    }
    
    // STEP 2: VALIDATE REQUIRED FIELDS
    // Check stageTypeID is provided and is a positive number
    if (!stageData.stageTypeID || typeof stageData.stageTypeID !== 'number' || stageData.stageTypeID <= 0) {
        throw new Error('stageTypeID is required and must be a positive number');
    }

    // Check stageOrder is provided and is a positive number
    if (!stageData.stageOrder || typeof stageData.stageOrder !== 'number' || stageData.stageOrder <= 0) {
        throw new Error('stageOrder is required and must be a positive number');
    }
    
    // STEP 3: VALIDATE STAGE TYPE EXISTS
    const stageTypeSql = `SELECT name FROM stageTypes WHERE stageTypeID = ?`;
    const result = db.exec(stageTypeSql, [stageData.stageTypeID]);

    if (result.length === 0 || result[0].values.length === 0) {
        throw new Error(`stageTypeID ${stageData.stageTypeID} does not exist`);
    }

    const stageName = result[0].values[0][0];

    // STEP 4: VALIDATE BUSINESS RULES
    // Get all existing stages for this recipe
    const existingStagesSql = `
        SELECT stageID, stageTypeID, stageOrder 
        FROM recipeStages 
        WHERE recipeID = ?
    `;
    const existingResult = db.exec(existingStagesSql, [recipeID]);
    const existingStages = resultToObjects(existingResult);

    // Create simulated array with the new stage included
    const allStages = [
        ...existingStages,
        {
            stageTypeID: stageData.stageTypeID,
            stageOrder: stageData.stageOrder
        }
    ];

    // Validate business rules with the new stage
    const duplicateValidation = validateNoConsecutiveDuplicates(db, allStages);
    if (!duplicateValidation.isValid) {
        throw new Error(duplicateValidation.error);
    }

    const exclusionValidation = validateStageExclusions(db, allStages);
    if (!exclusionValidation.isValid) {
        throw new Error(exclusionValidation.error);
    }

    const prerequisiteValidation = validateStagePrerequisites(db, allStages);
    if (!prerequisiteValidation.isValid) {
        throw new Error(prerequisiteValidation.error);
    }
    
    try {
        // STEP 5: AUTO-ADJUST EXISTING STAGES
        // Shift any stages with order >= newStageOrder up by 10
        const shiftSql = `
            UPDATE recipeStages 
            SET stageOrder = stageOrder + 10 
            WHERE recipeID = ? AND stageOrder >= ?
        `;
        db.run(shiftSql, [recipeID, stageData.stageOrder]);
        
        // STEP 6: INSERT NEW STAGE
        const insertSql = `
            INSERT INTO recipeStages (recipeID, stageTypeID, stageOrder, instructions, expectedDurationDays)
            VALUES (?, ?, ?, ?, ?)
        `;
        db.run(insertSql, [
            recipeID,
            stageData.stageTypeID,
            stageData.stageOrder,
            stageData.instructions || null,
            stageData.expectedDurationDays || null
        ]);
        
        // Get the new stage ID
        const [[stageID]] = db.exec("SELECT last_insert_rowid() as id")[0].values;
        
        console.log(`Stage ${stageData.stageOrder} added to recipe ${recipeID}: ID ${stageID}`);
        
        // STEP 6: RETURN SUCCESS
        return {
            success: true,
            stageID: stageID,
            stageName: stageName,
            stageOrder: stageData.stageOrder,
            message: `Stage '${stageName}' added at order ${stageData.stageOrder}`
        };
        
    } catch (error) {
        console.error('Failed to add stage:', error.message);
        throw new Error(`Failed to add stage: ${error.message}`);
    }
}

/**
 * Update a recipe stage
 * 
 * Updates stage instructions and/or expected duration.
 * Cannot change stageTypeID or stageOrder (use remove/add for that).
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} stageID - Stage to update
 * @param {Object} updates - Fields to update
 * @param {string} [updates.instructions] - New instructions
 * @param {number} [updates.expectedDurationDays] - New expected duration
 * @returns {Object} { success: boolean, message: string, updatedFields: array }
 * @throws {Error} If stage doesn't exist or validation fails
 */
function updateRecipeStage(db, stageID, updates) {
    // STEP 1: VALIDATE STAGE EXISTS AND GET INFO
    const checkSql = `
        SELECT rs.stageID, st.name as stageName
        FROM recipeStages rs
        JOIN stageTypes st ON rs.stageTypeID = st.stageTypeID
        WHERE rs.stageID = ?
    `;
    const result = db.exec(checkSql, [stageID]);

    if (result.length === 0 || result[0].values.length === 0) {
        throw new Error(`Stage ID ${stageID} does not exist`);
    }
    
    const stageName = result[0].values[0][1];

    // STEP 2: VALIDATE FIELDS
    const allowedFields = ['instructions', 'expectedDurationDays'];
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

    // STEP 3: BUILD DYNAMIC SQL
    const setClauses = [];
    const values = [];

    for (const [key, value] of Object.entries(filteredUpdates)) {
        setClauses.push(`${key} = ?`);
        values.push(value);
    }

    const sql = `UPDATE recipeStages SET ${setClauses.join(', ')} WHERE stageID = ?`;
    values.push(stageID);

    // STEP 4: EXECUTE
    try {
        db.run(sql, values);
        
        return {
            success: true,
            message: `Stage '${stageName}' updated successfully`,
            updatedFields: Object.entries(filteredUpdates).map(([key, value]) => ({
                field: key,
                newValue: value
            }))
        };
    } catch (error) {
        console.error('Failed to update stage:', error.message);
        throw new Error(`Failed to update stage: ${error.message}`);
    }
}

/**
 * Reorder stages in a recipe
 * 
 * Updates the stageOrder for multiple stages at once.
 * Useful when user drags/drops stages in UI to reorder them.
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} recipeID - Recipe containing the stages
 * @param {Array} newOrder - Array of {stageID, newOrder} objects
 * @returns {Object} { success: boolean, message: string, updatedStages: number }
 * @throws {Error} If validation fails
 * 
 * @example
 * // Swap stages 2 and 3
 * reorderRecipeStages(db, 5, [
 *   { stageID: 1, newOrder: 10 },
 *   { stageID: 3, newOrder: 20 },  // Was at 30, now at 20
 *   { stageID: 2, newOrder: 30 },  // Was at 20, now at 30
 *   { stageID: 4, newOrder: 40 }
 * ]);
 */
function reorderRecipeStages(db, recipeID, newOrder) {
    // STEP 1: Validate recipe exists
    const recipe = getRecipe(db, recipeID);
    if (!recipe) {
        throw new Error(`Recipe ID ${recipeID} does not exist`);
    }
    
    // STEP 2: Get all current stages for this recipe
    const stagesSql = `
        SELECT stageID, stageTypeID, stageOrder 
        FROM recipeStages 
        WHERE recipeID = ?
        ORDER BY stageOrder
    `;
    const result = db.exec(stagesSql, [recipeID]);
    const currentStages = resultToObjects(result);
    
    // STEP 3: Validate newOrder array
    const newStageIDs = newOrder.map(item => item.stageID);
    const newOrders = newOrder.map(item => item.newOrder);
    const currentStageIDs = currentStages.map(stage => stage.stageID);

    const missingStages = currentStageIDs.filter(id => !newStageIDs.includes(id));
    const invalidStages = newStageIDs.filter(id => !currentStageIDs.includes(id));
    const duplicateOrders = newOrders.filter((item, index) => newOrders.indexOf(item) !== index);

    if (missingStages.length > 0) {
        throw new Error(`Missing stages in new order: ${missingStages.join(', ')}`);
    }
    if (invalidStages.length > 0) {
        throw new Error(`Invalid stages not in recipe: ${invalidStages.join(', ')}`);
    }
    if (duplicateOrders.length > 0) {
        throw new Error(`Duplicate stage orders found: ${duplicateOrders.join(', ')}`);
    }
    
    // STEP 4: Reconstruct stages with new order for validation
    const reconstructedStages = newOrder.map(item => {
        const stage = currentStages.find(s => s.stageID === item.stageID);
        return {
            stageID: stage.stageID,
            stageTypeID: stage.stageTypeID,
            stageOrder: item.newOrder
        };
    });

    // Validate business rules
    const duplicateValidation = validateNoConsecutiveDuplicates(db, reconstructedStages);
    if (!duplicateValidation.isValid) {
        throw new Error(duplicateValidation.error);
    }

    const exclusionValidation = validateStageExclusions(db, reconstructedStages);
    if (!exclusionValidation.isValid) {
        throw new Error(exclusionValidation.error);
    }

    const prerequisiteValidation = validateStagePrerequisites(db, reconstructedStages);
    if (!prerequisiteValidation.isValid) {
        throw new Error(prerequisiteValidation.error);
    }
    
    // STEP 5: Update all stages
    try {
        db.run("BEGIN TRANSACTION");
        
        const updateSql = `UPDATE recipeStages SET stageOrder = ? WHERE stageID = ?`;
        for (const item of newOrder) {
            db.run(updateSql, [item.newOrder, item.stageID]);
        }
        
        db.run("COMMIT");
        
        console.log(`Reordered ${newOrder.length} stages for recipe ${recipeID}`);
        
        return { 
            success: true, 
            message: `Reordered ${newOrder.length} stages successfully`, 
            updatedStages: newOrder.length 
        };
        
    } catch (error) {
        db.run("ROLLBACK");
        console.error('Failed to reorder stages:', error.message);
        throw new Error(`Failed to reorder stages: ${error.message}`);
    }
}

/**
 * Remove a stage from a recipe
 * 
 * Deletes the stage and all its ingredients (CASCADE).
 * Cannot delete required stages (Must Preparation, Fermentation, Packaging).
 * Does not validate stage dependencies (Phase 2 feature).
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} stageID - Stage to remove
 * @returns {Object} { success: boolean, message: string }
 * @throws {Error} If stage doesn't exist or is a required stage
 * 
 * @example
 * const result = removeRecipeStage(db, 5);
 * // Returns: { success: true, message: "Stage 'Stabilization' removed successfully" }
 */
function removeRecipeStage(db, stageID) {
    // STEP 1: VALIDATE STAGE ID
    if (typeof stageID !== 'number' || stageID <= 0) {
        throw new Error('Invalid stage ID (must be positive number)');
    }
    
    // STEP 2: CHECK IF STAGE EXISTS
    const checkSql = `SELECT stageTypeID FROM recipeStages WHERE stageID = ?`;
    const result = db.exec(checkSql, [stageID]);

    if (result.length === 0 || result[0].values.length === 0) {
        throw new Error(`Stage ID ${stageID} does not exist`);
    }
    
    // STEP 3: CHECK IF STAGE IS REQUIRED
    const stageName = typeResult[0].values[0][0];
    const isRequired = typeResult[0].values[0][1];

    if (isRequired === 1) {
        throw new Error(`Cannot delete required stage '${stageName}'`);
    }

    // STEP 4: CHECK IF OTHER STAGES DEPEND ON THIS ONE
    const recipeIDSql = `SELECT recipeID FROM recipeStages WHERE stageID = ?`;
    const recipeIDResult = db.exec(recipeIDSql, [stageID]);
    const recipeID = recipeIDResult[0].values[0][0];

    const dependentCheckSql = `
        SELECT rs.stageID, st.name
        FROM recipeStages rs
        JOIN stageTypes st ON rs.stageTypeID = st.stageTypeID
        WHERE rs.recipeID = ?
        AND st.requiresStage = ?
        AND rs.stageID != ?
    `;
    const dependentResult = db.exec(dependentCheckSql, [recipeID, stageTypeID, stageID]);

    if (dependentResult.length > 0 && dependentResult[0].values.length > 0) {
        const dependents = resultToObjects(dependentResult);
        const dependentNames = dependents.map(d => d.name).join(', ');
        throw new Error(`Cannot remove stage '${stageName}' because these stages depend on it: ${dependentNames}`);
    }
    
    try {
        // STEP 5: DELETE STAGE
        const deleteSql = `DELETE FROM recipeStages WHERE stageID = ?`;
        db.run(deleteSql, [stageID]);

        console.log(`Stage ${stageID} deleted successfully`);
        
        // STEP 6: RETURN SUCCESS
        return { 
            success: true, 
            message: `Stage '${stageName}' removed successfully` 
        };
        
    } catch (error) {
        console.error('Failed to remove stage:', error.message);
        throw new Error(`Failed to remove stage: ${error.message}`);
    }
}

/**
 * Delete a recipe
 * 
 * @param {Object} db - SQL.js database instance
 * @param {number} recipeID - Recipe to delete
 * @param {Object} [options] - Delete options
 * @param {boolean} [options.allowStarter=false] - Allow deleting starter recipes
 * @returns {Object} { success: boolean, message: string }
 * @throws {Error} If recipe doesn't exist or is protected
 */
function deleteRecipe(db, recipeID, options = {}) {
    // STEP 1: VALIDATE RECIPE ID
    if (typeof recipeID !== 'number' || recipeID <= 0) {
        throw new Error('Invalid recipe ID (must be positive number)');
    }
    
    try {
        // STEP 2: CHECK IF RECIPE EXISTS
        const checkSql = `SELECT recipeID, isStarter FROM recipes WHERE recipeID = ?`;
        const result = db.exec(checkSql, [recipeID]);
        
        if (result.length === 0 || result[0].values.length === 0) {
            throw new Error(`Recipe ID ${recipeID} does not exist`);
        }
        
        const isStarter = result[0].values[0][1];
        
        // STEP 3: CHECK IF STARTER RECIPE
        if (isStarter === 1 && !options.allowStarter) {
            throw new Error('Cannot delete starter recipe. Use { allowStarter: true } to override');
        }
        
        // STEP 4: DELETE RECIPE
        // CASCADE will automatically delete:
        // - recipeStages
        // - recipeIngredients
        const deleteSql = `DELETE FROM recipes WHERE recipeID = ?`;
        db.run(deleteSql, [recipeID]);
        
        console.log(`Recipe ID ${recipeID} deleted successfully`);
        
        // STEP 5: RETURN SUCCESS
        return { 
            success: true, 
            message: `Recipe "${result[0].values[0][0]}" deleted successfully` 
        };
        
    } catch (error) {
        console.error('Failed to delete recipe:', error.message);
        throw new Error(`Failed to delete recipe: ${error.message}`);
    }
}

export { 
    validateIngredientForStage,
    validateFlavourAdjustmentIngredients,
    validateNoConsecutiveDuplicates,
    validateStagePrerequisites,
    validateStageExclusions,
    createRecipe, 
    getRecipe,
    getRecipeWithDetails, 
    getAllRecipes,
    updateRecipeMetadata,
    addRecipeStage,
    updateRecipeStage,
    reorderRecipeStages,
    removeRecipeStage,
    deleteRecipe
};
// brewcode.js
// Unified API entry point for the BrewCode application

import { initDb, exportDb, importDb } from './initDB.js';
import { resultToObjects } from './helpers.js';
import * as batchManager from './batchManager.js';
import * as recipeManager from './recipeManager.js';
import * as equipmentManager from './equipmentManager.js';
import * as inventoryManager from './inventoryManager.js';
import * as itemManager from './itemManager.js';
import * as ingredientTypeManager from './ingredientTypeManager.js';
import * as supplyTypeManager from './supplyTypeManager.js';
import * as subtypeManager from './subtypeManager.js';
import * as conversions from './conversions.js';
import * as fermentation from './fermentation.js';
import * as userSettings from './userSettings.js';

/**
 * BrewCode - Unified API for brewing management
 * 
 * @example
 * // Initialize
 * await BrewCode.init();
 * 
 * // Create an item (ingredient, supply, or both)
 * const item = BrewCode.item.create({
 *   name: "Apple Juice",
 *   unit: "L",
 *   brand: "K Classic",
 *   onDemand: 0
 * });
 * 
 * // Add ingredient role
 * BrewCode.item.addRole(item.itemID, 'ingredient', 5, 1);
 * 
 * // Create a batch
 * const batch = BrewCode.batch.create({
 *   recipeID: 5,
 *   name: "Traditional Mead - Batch #1",
 *   actualBatchSizeL: 10
 * });
 */
class BrewCodeAPI {
    constructor() {
        this.db = null;
        this.initialized = false;
    }

    // ============================================
    // LIFECYCLE METHODS
    // ============================================

    /**
     * Initialize the BrewCode database
     * @returns {Promise<Object>} Database instance
     */
    async init() {
        if (this.initialized) {
            console.warn('BrewCode already initialized');
            return this.db;
        }

        console.log('Initializing BrewCode...');
        this.db = await initDb();
        this.initialized = true;
        
        // Initialize user settings with locale-based defaults if first run
        try {
            const settings = userSettings.getUserSettings(this.db);
            console.log('User settings loaded:', settings);
        } catch (error) {
            console.log('Initializing default settings...');
            userSettings.initializeDefaultSettings(this.db);
        }
        
        console.log('BrewCode initialized successfully');
        
        return this.db;
    }

    /**
     * Export database to file
     * @param {string} filename - Export filename (default: 'brewcode.db')
     */
    export(filename = 'brewcode.db') {
        this._requireInit();
        exportDb(this.db, filename);
    }

    /**
     * Import database from file
     * @param {File} file - Database file to import
     * @returns {Promise<Object>} New database instance
     */
    async import(file) {
        console.log('Importing database...');
        this.db = await importDb(file);
        this.initialized = true;
        console.log('Database imported successfully');
        return this.db;
    }

    /**
     * Get raw database instance (for advanced usage)
     * @returns {Object} SQL.js database instance
     */
    getDb() {
        this._requireInit();
        return this.db;
    }

    /**
     * Check if BrewCode is initialized
     * @returns {boolean}
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Execute raw SQL query (advanced users only)
     * @param {string} sql - SQL query
     * @param {Array} [params] - Query parameters
     * @returns {Array} Query results
     */
    query(sql, params = []) {
        this._requireInit();
        const result = this.db.exec(sql, params);
        return resultToObjects(result);
    }

    // ============================================
    // UNIFIED ITEM MANAGEMENT
    // ============================================

    item = {
        /**
         * Create a new item (can be ingredient, supply, or both)
         */
        create: (itemData) => {
            this._requireInit();
            return itemManager.createItem(this.db, itemData);
        },

        /**
         * Get item by ID with type information
         */
        get: (itemID) => {
            this._requireInit();
            return itemManager.getItem(this.db, itemID);
        },

        /**
         * Get all items with optional filters
         */
        getAll: (options = {}) => {
            this._requireInit();
            return itemManager.getAllItems(this.db, options);
        },

        /**
         * Update item (brand, name, unit, onDemand pricing, notes, subtypes)
         */
        update: (itemID, updates) => {
            this._requireInit();
            return itemManager.updateItem(this.db, itemID, updates);
        },

        /**
         * Set item active status
         */
        setStatus: (itemID, isActive) => {
            this._requireInit();
            return itemManager.setItemStatus(this.db, itemID, isActive);
        }
    };

    // ============================================
    // INGREDIENT TYPE MANAGEMENT
    // ============================================

    ingredientType = {
        /**
         * Create ingredient type
         */
        create: (ingredientTypeData) => {
            this._requireInit();
            return ingredientTypeManager.createIngredientType(this.db, ingredientTypeData);
        },

        /**
         * Get ingredient type by ID
         */
        get: (ingredientTypeID) => {
            this._requireInit();
            return ingredientTypeManager.getIngredientType(this.db, ingredientTypeID);
        },

        /**
         * Get all ingredient types
         */
        getAll: (options = {}) => {
            this._requireInit();
            return ingredientTypeManager.getAllIngredientTypes(this.db, options);
        },

        /**
         * Update ingredient type
         */
        update: (ingredientTypeID, updates) => {
            this._requireInit();
            return ingredientTypeManager.updateIngredientType(this.db, ingredientTypeID, updates);
        },

        /**
         * Set ingredient type active status
         */
        setStatus: (ingredientTypeID, isActive) => {
            this._requireInit();
            return ingredientTypeManager.setIngredientTypeStatus(this.db, ingredientTypeID, isActive);
        }
    };

    // ============================================
    // SUPPLY TYPE MANAGEMENT
    // ============================================

    supplyType = {
        /**
         * Create supply type
         */
        create: (supplyTypeData) => {
            this._requireInit();
            return supplyTypeManager.createSupplyType(this.db, supplyTypeData);
        },

        /**
         * Get supply type by ID
         */
        get: (supplyTypeID) => {
            this._requireInit();
            return supplyTypeManager.getSupplyType(this.db, supplyTypeID);
        },

        /**
         * Get all supply types
         */
        getAll: (options = {}) => {
            this._requireInit();
            return supplyTypeManager.getAllSupplyTypes(this.db, options);
        },

        /**
         * Update supply type
         */
        update: (supplyTypeID, updates) => {
            this._requireInit();
            return supplyTypeManager.updateSupplyType(this.db, supplyTypeID, updates);
        },

        /**
         * Set supply type active status
         */
        setStatus: (supplyTypeID, isActive) => {
            this._requireInit();
            return supplyTypeManager.setSupplyTypeStatus(this.db, supplyTypeID, isActive);
        }
    };

    // ============================================
    // SUBTYPE MANAGEMENT
    // ============================================

    subtype = {
        /**
         * Create ingredient subtype
         */
        create: (subtypeData) => {
            this._requireInit();
            return subtypeManager.createIngredientSubtype(this.db, subtypeData);
        },

        /**
         * Get ingredient subtype by ID
         */
        get: (ingredientSubtypeID) => {
            this._requireInit();
            return subtypeManager.getIngredientSubtype(this.db, ingredientSubtypeID);
        },

        /**
         * Get all ingredient subtypes
         */
        getAll: (options = {}) => {
            this._requireInit();
            return subtypeManager.getAllIngredientSubtypes(this.db, options);
        },

        /**
         * Update ingredient subtype
         */
        update: (ingredientSubtypeID, updates) => {
            this._requireInit();
            return subtypeManager.updateIngredientSubtype(this.db, ingredientSubtypeID, updates);
        },

        /**
         * Set ingredient subtype active status
         */
        setStatus: (ingredientSubtypeID, isActive) => {
            this._requireInit();
            return subtypeManager.setIngredientSubtypeStatus(this.db, ingredientSubtypeID, isActive);
        }
    };

    // ============================================
    // BATCH MANAGEMENT
    // ============================================

    batch = {
        /**
         * Create a new batch from a recipe
         */
        create: (batchData) => {
            this._requireInit();
            return batchManager.createBatch(this.db, batchData);
        },

        /**
         * Get batch by ID (metadata only)
         */
        get: (batchID) => {
            this._requireInit();
            return batchManager.getBatch(this.db, batchID);
        },

        /**
         * Get batch with complete details (stages, ingredients, measurements, equipment)
         */
        getWithDetails: (batchID) => {
            this._requireInit();
            return batchManager.getBatchWithDetails(this.db, batchID);
        },

        /**
         * Get all batches with optional filters
         */
        getAll: (options = {}) => {
            this._requireInit();
            return batchManager.getAllBatches(this.db, options);
        },

        /**
         * Update batch metadata (name, notes)
         */
        update: (batchID, updates) => {
            this._requireInit();
            return batchManager.updateBatchMetadata(this.db, batchID, updates);
        },

        /**
         * Delete a batch (only if status='planned')
         */
        delete: (batchID, options = {}) => {
            this._requireInit();
            return batchManager.deleteBatch(this.db, batchID, options);
        },

        /**
         * Start a batch (planned → active)
         */
        start: (batchID, options = {}) => {
            this._requireInit();
            return batchManager.startBatch(this.db, batchID, options);
        },

        /**
         * Complete a batch (active → completed)
         */
        complete: (batchID, options = {}) => {
            this._requireInit();
            return batchManager.completeBatch(this.db, batchID, options);
        },

        /**
         * Abandon a batch (any → abandoned)
         */
        abandon: (batchID, reason, options = {}) => {
            this._requireInit();
            return batchManager.abandonBatch(this.db, batchID, reason, options);
        },

        /**
         * Get batch timeline (complete history)
         */
        getTimeline: (batchID) => {
            this._requireInit();
            return batchManager.getBatchTimeline(this.db, batchID);
        },

        /**
         * Calculate batch cost
         */
        getCost: (batchID) => {
            this._requireInit();
            return batchManager.getBatchCost(this.db, batchID);
        }
    };

    // ============================================
    // BATCH STAGE MANAGEMENT
    // ============================================

    stage = {
        /**
         * Start a batch stage (pending → active)
         */
        start: (batchStageID, options = {}) => {
            this._requireInit();
            return batchManager.startBatchStage(this.db, batchStageID, options);
        },

        /**
         * Complete a batch stage (active → completed)
         */
        complete: (batchStageID, options = {}) => {
            this._requireInit();
            return batchManager.completeBatchStage(this.db, batchStageID, options);
        },

        /**
         * Skip a batch stage (pending → skipped)
         */
        skip: (batchStageID) => {
            this._requireInit();
            return batchManager.skipBatchStage(this.db, batchStageID);
        }
    };

    // ============================================
    // MEASUREMENT TRACKING
    // ============================================

    measurement = {
        /**
         * Add a measurement to a batch stage
         */
        add: (batchStageID, measurementData) => {
            this._requireInit();
            return batchManager.addBatchMeasurement(this.db, batchStageID, measurementData);
        },

        /**
         * Get measurements for a batch
         */
        getForBatch: (batchID, options = {}) => {
            this._requireInit();
            return batchManager.getBatchMeasurements(this.db, batchID, options);
        }
    };

    // ============================================
    // EQUIPMENT MANAGEMENT
    // ============================================

    equipment = {
        /**
         * Create new equipment
         */
        create: (equipmentData) => {
            this._requireInit();
            return equipmentManager.createEquipment(this.db, equipmentData);
        },

        /**
         * Get equipment by ID
         */
        get: (equipmentID) => {
            this._requireInit();
            return equipmentManager.getEquipment(this.db, equipmentID);
        },

        /**
         * Get all equipment
         */
        getAll: (options = {}) => {
            this._requireInit();
            return equipmentManager.getAllEquipment(this.db, options);
        },

        /**
         * Get available equipment (not in use)
         */
        getAvailable: (options = {}) => {
            this._requireInit();
            return equipmentManager.getAvailableEquipment(this.db, options);
        },

        /**
         * Update equipment
         */
        update: (equipmentID, updates) => {
            this._requireInit();
            return equipmentManager.updateEquipment(this.db, equipmentID, updates);
        },

        /**
         * Set equipment active status
         */
        setStatus: (equipmentID, isActive) => {
            this._requireInit();
            return equipmentManager.setEquipmentStatus(this.db, equipmentID, isActive);
        },

        /**
         * Assign equipment to batch stage
         */
        assignToStage: (batchStageID, equipmentID, inUseDate = null) => {
            this._requireInit();
            return batchManager.assignEquipmentToBatchStage(this.db, batchStageID, equipmentID, inUseDate);
        },

        /**
         * Release equipment from batch stage
         */
        releaseFromStage: (batchStageID, equipmentID, releaseDate = null) => {
            this._requireInit();
            return batchManager.releaseEquipmentFromBatchStage(this.db, batchStageID, equipmentID, releaseDate);
        },

        /**
         * Get equipment for a batch
         */
        getForBatch: (batchID, options = {}) => {
            this._requireInit();
            return batchManager.getBatchEquipment(this.db, batchID, options);
        },

        /**
         * Get equipment assigned to a specific stage
         */
        getForStage: (batchStageID, options = {}) => {
            this._requireInit();
            return equipmentManager.getEquipmentForStage(this.db, batchStageID, options);
        },

        /**
         * Get current usage info for equipment
         */
        getCurrentUsage: (equipmentID) => {
            this._requireInit();
            return equipmentManager.getEquipmentCurrentUsage(this.db, equipmentID);
        }
    };

    // ============================================
    // RECIPE MANAGEMENT
    // ============================================

    recipe = {
        /**
         * Create a new recipe
         */
        create: (recipeData) => {
            this._requireInit();
            return recipeManager.createRecipe(this.db, recipeData);
        },

        /**
         * Get recipe by ID (metadata only)
         */
        get: (recipeID) => {
            this._requireInit();
            return recipeManager.getRecipe(this.db, recipeID);
        },

        /**
         * Get recipe with complete details (stages, ingredients)
         */
        getWithDetails: (recipeID) => {
            this._requireInit();
            return recipeManager.getRecipeWithDetails(this.db, recipeID);
        },

        /**
         * Get all recipes
         */
        getAll: (options = {}) => {
            this._requireInit();
            return recipeManager.getAllRecipes(this.db, options);
        },

        /**
         * Update recipe metadata
         */
        update: (recipeID, updates) => {
            this._requireInit();
            return recipeManager.updateRecipeMetadata(this.db, recipeID, updates);
        },

        /**
         * Delete a recipe
         */
        delete: (recipeID, options = {}) => {
            this._requireInit();
            return recipeManager.deleteRecipe(this.db, recipeID, options);
        },

        /**
         * Add stage to recipe
         */
        addStage: (recipeID, stageData) => {
            this._requireInit();
            return recipeManager.addRecipeStage(this.db, recipeID, stageData);
        },

        /**
         * Update recipe stage
         */
        updateStage: (stageID, updates) => {
            this._requireInit();
            return recipeManager.updateRecipeStage(this.db, stageID, updates);
        },

        /**
         * Remove stage from recipe
         */
        removeStage: (stageID) => {
            this._requireInit();
            return recipeManager.removeRecipeStage(this.db, stageID);
        },

        /**
         * Reorder recipe stages
         */
        reorderStages: (recipeID, newOrder) => {
            this._requireInit();
            return recipeManager.reorderRecipeStages(this.db, recipeID, newOrder);
        }
    };

    // ============================================
    // INVENTORY MANAGEMENT
    // ============================================

    inventory = {
        /**
         * Add inventory lot for a tracked item
         */
        addLot: (lotData) => {
            this._requireInit();
            return inventoryManager.addInventoryLot(this.db, lotData);
        },

        /**
         * Get inventory lot by ID
         */
        getLot: (lotID) => {
            this._requireInit();
            return inventoryManager.getInventoryLot(this.db, lotID);
        },

        /**
         * Get inventory for an item (FIFO ordered)
         */
        getForItem: (itemID, options = {}) => {
            this._requireInit();
            return inventoryManager.getInventoryForItem(this.db, itemID, options);
        },

        /**
         * Get all inventory
         */
        getAll: (options = {}) => {
            this._requireInit();
            return inventoryManager.getAllInventory(this.db, options);
        },

        /**
         * Consume from inventory (FIFO)
         */
        consume: (itemID, quantity, unit) => {
            this._requireInit();
            return inventoryManager.consumeFromInventory(this.db, itemID, quantity, unit);
        },

        /**
         * Mark lot as expired
         */
        markExpired: (lotID) => {
            this._requireInit();
            return inventoryManager.markLotExpired(this.db, lotID);
        },

        /**
         * Get inventory history (consumed/expired)
         */
        getHistory: (options = {}) => {
            this._requireInit();
            return inventoryManager.getInventoryHistory(this.db, options);
        }
    };

    // ============================================
    // CALCULATION UTILITIES
    // ============================================

    calculate = {
        /**
         * Calculate ABV from gravity readings
         */
        abv: (params) => {
            return fermentation.abv(params);
        },

        /**
         * Calculate priming sugar needed for carbonation
         */
        priming: (params) => {
            return fermentation.priming(params);
        },

        /**
         * Convert units
         */
        convert: (value, fromUnit, toUnit, category) => {
            return conversions.convert(value, fromUnit, toUnit, category);
        },

        /**
         * Apply temperature correction to density reading
         */
        densityCorrection: (value, sampleTemp, calibrationTemp, temperatureUnit, densityUnit) => {
            return conversions.densityCorrection(value, sampleTemp, calibrationTemp, temperatureUnit, densityUnit);
        }
    };

    // ============================================
    // RECIPE VALIDATION
    // ============================================

    validate = {
        /**
         * Validate if ingredient can be used in a stage
         */
        ingredientForStage: (ingredientTypeID, stageTypeID) => {
            this._requireInit();
            return recipeManager.validateIngredientForStage(this.db, ingredientTypeID, stageTypeID);
        },

        /**
         * Validate flavour adjustment ingredients
         */
        flavourAdjustment: (stages) => {
            this._requireInit();
            return recipeManager.validateFlavourAdjustmentIngredients(this.db, stages);
        },

        /**
         * Validate no consecutive duplicate stages
         */
        noConsecutiveDuplicates: (stages) => {
            this._requireInit();
            return recipeManager.validateNoConsecutiveDuplicates(this.db, stages);
        },

        /**
         * Validate stage prerequisites
         */
        stagePrerequisites: (stages) => {
            this._requireInit();
            return recipeManager.validateStagePrerequisites(this.db, stages);
        },

        /**
         * Validate stage exclusions
         */
        stageExclusions: (stages) => {
            this._requireInit();
            return recipeManager.validateStageExclusions(this.db, stages);
        }
    };

    // ============================================
    // USER SETTINGS
    // ============================================

    settings = {
        /**
         * Get user settings
         */
        get: () => {
            this._requireInit();
            return userSettings.getUserSettings(this.db);
        },

        /**
         * Update user settings
         */
        update: (updates) => {
            this._requireInit();
            return userSettings.updateUserSettings(this.db, updates);
        },

        /**
         * Reset settings to defaults
         */
        reset: () => {
            this._requireInit();
            return userSettings.resetUserSettings(this.db);
        },

        /**
         * Initialize default settings (auto-called on first init)
         */
        initializeDefaults: () => {
            this._requireInit();
            return userSettings.initializeDefaultSettings(this.db);
        }
    };

    // ============================================
    // UTILITIES
    // ============================================

    utils = {
        /**
         * Convert SQL.js result to array of objects
         */
        resultToObjects: (result) => {
            return resultToObjects(result);
        }
    };

    // ============================================
    // INTERNAL HELPERS
    // ============================================

    _requireInit() {
        if (!this.initialized) {
            throw new Error('BrewCode not initialized. Call BrewCode.init() first.');
        }
    }
}

// Create singleton instance
const BrewCode = new BrewCodeAPI();

// Export singleton
export default BrewCode;
-- =============================================================================
-- BREWCODE DATABASE SCHEMA
-- =============================================================================
-- This database manages recipes, batches, ingredients, equipment, and inventory
-- for wine, mead, and cider production.
--
-- Key Concepts:
-- - RECIPES: Templates with stages and ingredient requirements
-- - BATCHES: Actual production runs following a recipe (snapshot at creation)
-- - INGREDIENTS: Consumables used IN the beverage (juice, honey, yeast)
-- - SUPPLIES: Consumables used FOR production (bottles, sanitizer, caps)
-- - EQUIPMENT: Reusable items (fermenters, carboys)
-- =============================================================================

PRAGMA foreign_keys = ON;

-- =============================================================================
-- FOUNDATION TABLES (No dependencies)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Item Categories
-- -----------------------------------------------------------------------------
-- Defines high-level categories for all items (ingredients, supplies, equipment).
-- Examples: Fruits, Honeys, Yeasts, Bottles, Cleaners
-- 
-- Purpose: Groups items logically for UI navigation and filtering
-- Note: Categories determine which usage contexts are allowed
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS itemCategories (
  categoryID   INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL UNIQUE,       -- Display name (e.g., "Fruits", "Yeasts")
  description  TEXT,                       -- Helpful explanation for users
  sortOrder    INTEGER DEFAULT 0           -- Display order in UI (lower = first)
);

-- -----------------------------------------------------------------------------
-- Usage Contexts
-- -----------------------------------------------------------------------------
-- Defines how ingredients can be used in different recipe stages.
-- Examples: fermentable, primer, nutrient, sanitiser
--
-- Purpose: Prevents invalid combinations (e.g., sanitizer in Must Preparation)
-- Business Logic: Each stage type allows only certain contexts
-- Example: "Priming" stage only accepts context "primer" (not "stabiliser")
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usageContexts (
  contextID    INTEGER PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,        -- Internal key (e.g., "fermentable")
  description  TEXT                         -- User-friendly explanation
);

-- -----------------------------------------------------------------------------
-- Stage Types
-- -----------------------------------------------------------------------------
-- Defines the standardized stages in a fermentation workflow.
-- Examples: Must Preparation, Fermentation, Stabilisation, Packaging
--
-- Purpose: Provides consistent workflow structure across all recipes
-- Note: System-defined, not user-editable (ensures data consistency)
--
-- isRequired: 1 = stage must be in every recipe, 0 = optional
-- requiresStage: This stage can only be used if another stage exists first
--   Example: Stabilisation requires Fermentation first
-- excludesStage: This stage cannot coexist with another stage
--   Example: Priming excludes Stabilisation (carbonation vs. still)
-- sortOrder: Natural workflow order (10, 20, 30... allows insertion later)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stageTypes (
  stageTypeID   INTEGER PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,        -- Display name (e.g., "Fermentation")
  description   TEXT,                        -- What happens in this stage
  isRequired    INTEGER NOT NULL DEFAULT 0,  -- 1 = mandatory in all recipes
  sortOrder     INTEGER NOT NULL DEFAULT 0,  -- Workflow order (10, 20, 30...)
  requiresStage INTEGER,                     -- FK: Must have this stage first
  excludesStage INTEGER,                     -- FK: Cannot use with this stage
  FOREIGN KEY (requiresStage) REFERENCES stageTypes(stageTypeID),
  FOREIGN KEY (excludesStage) REFERENCES stageTypes(stageTypeID)
);

-- -----------------------------------------------------------------------------
-- Stage Type Allowed Contexts (Many-to-Many)
-- -----------------------------------------------------------------------------
-- Defines which usage contexts are valid for each stage type.
-- Examples: 
--   - Must Preparation allows "fermentable", "salt", "nutrient" contexts
--   - Fermentation allows "fermenter", "nutrient" contexts
--   - Stabilisation allows only "stabiliser" context
--
-- Purpose: Enforces business rules about what ingredients can be used in each stage
-- Note: Some stages have additional validation beyond these basic rules (handled in code)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stageTypeAllowedContexts (
  stageTypeID  INTEGER NOT NULL,
  contextID    INTEGER NOT NULL,
  PRIMARY KEY (stageTypeID, contextID),
  FOREIGN KEY (stageTypeID) REFERENCES stageTypes(stageTypeID),
  FOREIGN KEY (contextID) REFERENCES usageContexts(contextID)
);

-- =============================================================================
-- CORE TYPES TABLES (Depend on Foundation Tables)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Category Allowed Contexts (Many-to-Many)
-- -----------------------------------------------------------------------------
-- Defines which usage contexts are valid for each category.
-- Examples: 
--   - Fruits category allows "fermentable" and "primer" contexts
--   - Cleaners category allows "cleaner" and "sanitiser" contexts
--
-- Purpose: Enforces business rules about what can be used where
-- Example: Prevents user from adding "Bottle" to Must Preparation stage
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categoryAllowedContexts (
  categoryID  INTEGER NOT NULL,
  contextID   INTEGER NOT NULL,
  PRIMARY KEY (categoryID, contextID),
  FOREIGN KEY (categoryID) REFERENCES itemCategories(categoryID),
  FOREIGN KEY (contextID) REFERENCES usageContexts(contextID)
);

-- -----------------------------------------------------------------------------
-- Ingredient Types
-- -----------------------------------------------------------------------------
-- Generic ingredient types that recipes reference.
-- Examples: "Apple Juice", "Honey (Wildflower)", "Pale Malt", "Muscadine Grapes"
--
-- Purpose: Provides the right level of specificity for recipes
-- - Too broad: "Fruit" (not helpful)
-- - Too specific: "K Classic Apfel Saft" (brand-locked)
-- - Just right: "Apple Juice" (any brand works)
--
-- beverageTypes: JSON array of beverage types this ingredient can produce
--   Examples: ["Cider"], ["Mead", "Melomel"], ["Wine"]
-- isPrimaryRequired: 1 = must be >50% of fermentables for that beverage type
--   Example: Apple Juice must be primary for Cider (not just 10% apple)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingredientTypes (
  ingredientTypeID    INTEGER PRIMARY KEY AUTOINCREMENT,
  categoryID          INTEGER NOT NULL,
  name                TEXT NOT NULL UNIQUE,    -- "Apple Juice", "Honey (Wildflower)"
  description         TEXT,                    -- Helpful info for users
  beverageTypes       TEXT,                    -- JSON: ["Cider"], ["Mead"]
  isPrimaryRequired   INTEGER DEFAULT 0,       -- 1 = must be >50% for beverage type
  isActive            INTEGER DEFAULT 1,       -- 1 = active, 0 = deprecated
  FOREIGN KEY (categoryID) REFERENCES itemCategories(categoryID)
);

-- -----------------------------------------------------------------------------
-- Supply Types
-- -----------------------------------------------------------------------------
-- Generic supply types for consumables used FOR production (not in beverage).
-- Examples: "Sanitizer (Star San)", "Bottle (750ml)", "Crown Cap #26", "Cork (#9)"
--
-- Purpose: Track consumables that support the brewing process
-- - Cleaning/sanitizing agents (PBW, StarSan, Iodophor)
-- - Packaging materials (bottles, caps, corks, labels)
-- - Other consumables (shrink wrap, carrier boxes)
--
-- Key Difference from ingredientTypes:
-- - Supplies are used FOR production (sanitize equipment, package product)
-- - Ingredients are used IN production (become part of the beverage)
--
-- Note: Supplies do NOT have usage contexts (they don't go in recipe stages)
-- Note: Supplies do NOT have beverageTypes (not part of the beverage)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplyTypes (
  supplyTypeID    INTEGER PRIMARY KEY AUTOINCREMENT,
  categoryID      INTEGER NOT NULL,           -- FK to itemCategories (Bottles, Cleaners, etc.)
  name            TEXT NOT NULL UNIQUE,       -- "Sanitizer (Star San)", "Bottle (750ml)"
  description     TEXT,                       -- Usage info, specifications
  isActive        INTEGER DEFAULT 1,          -- 1 = active, 0 = deprecated
  FOREIGN KEY (categoryID) REFERENCES itemCategories(categoryID)
);

-- -----------------------------------------------------------------------------
-- Equipment
-- -----------------------------------------------------------------------------
-- Tracks brewing equipment - both batch-occupying and general tools.
--
-- Two Categories of Equipment:
--
-- 1. BATCH-OCCUPYING EQUIPMENT (canBeOccupied = 1)
--    Equipment that is tied to a batch for an extended period:
--    - Fermentation vessels: buckets, carboys, kegs (used as fermenters)
--    - Monitoring devices: TILT hydrometers, Inkbird controllers, iSpindel
--    Purpose: Prevent scheduling conflicts ("All my fermenters are full!")
--    Tracked in: equipmentUsage table (links to batches)
--
-- 2. GENERAL TOOLS (canBeOccupied = 0)
--    Equipment used briefly and returned to storage:
--    - Measurement tools: hydrometers, refractometers, pH meters, thermometers
--    - Processing tools: scales, auto-siphons, bottle fillers, cappers
--    Purpose: Inventory tracking only (not tied to specific batches)
--    Not tracked for occupancy
--
-- capacityL: Volume capacity in liters
--   - Required for fermentation vessels (5L, 25L, etc.)
--   - NULL for monitors and tools
--
-- material: Construction material
--   - Vessels: "Glass", "Plastic", "Stainless Steel"
--   - Monitors: "Electronic", "Plastic"
--   - Tools: varies by tool type
--   - NULL if not applicable
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment (
  equipmentID         INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT NOT NULL,         -- User-defined name: "Primary Fermenter #1", "TILT Blue"
  type                TEXT NOT NULL,         -- "fermenter", "carboy", "monitor", "hydrometer", "scale"
  canBeOccupied       INTEGER DEFAULT 0,     -- 1 = tracked for batch occupancy, 0 = general tool
  capacityL           REAL,                  -- Volume capacity (NULL for non-vessels)
  material            TEXT,                  -- "Glass", "Plastic", "Stainless Steel", "Silicone"
  notes               TEXT,                  -- Maintenance notes, specifications, etc.
  isActive            INTEGER DEFAULT 1      -- 1 = in use, 0 = retired/broken
);

-- -----------------------------------------------------------------------------
-- Recipes
-- -----------------------------------------------------------------------------
-- Recipe templates that define ingredients, stages, and instructions.
-- Recipes are copied/snapshotted when a batch is created, so changes to
-- recipes don't affect active batches.
--
-- type: Beverage category (e.g., "Mead", "Cider", "Wine", "Beer", "Perry")
-- isStarter: 1 = pre-built recipe shipped with app, 0 = user-created
-- isDraft: 1 = work in progress, 0 = finalized and ready to use
-- batchSizeL: Default/recommended batch size (users can scale when starting batch)
--
-- Dates: SQLite stores as TEXT in ISO 8601 format (YYYY-MM-DD)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipes (
  recipeID        INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  author          TEXT,                          -- Recipe creator (optional)
  type            TEXT NOT NULL,                 -- "Mead", "Cider", "Wine", "Beer", "Perry"
  isStarter       INTEGER DEFAULT 0,             -- 1 = starter recipe, 0 = user-created
  isDraft         INTEGER DEFAULT 1,             -- 1 = draft, 0 = finalized
  createdDate     TEXT DEFAULT (DATE('now')),    -- ISO 8601: YYYY-MM-DD
  modifiedDate    TEXT DEFAULT (DATE('now')),    -- ISO 8601: YYYY-MM-DD
  description     TEXT,                          -- Recipe notes, flavour profile, etc.
  batchSizeL      REAL                           -- Default batch size in liters
);

-- -----------------------------------------------------------------------------
-- Ingredient Type Contexts (Many-to-Many)
-- -----------------------------------------------------------------------------
-- Links ingredient types to their usage contexts.
-- Defines which recipe stages an ingredient can be used in.
--
-- Purpose: Enforces business rules and prevents invalid ingredient usage
-- Examples:
--   - Apple Juice → contexts: fermentable, primer
--     ✓ Can use in Must Preparation (accepts fermentable)
--     ✓ Can use in Priming (accepts primer)
--     ❌ Cannot use in Stabilisation (needs stabiliser context)
--
--   - Potassium Sorbate → context: stabiliser
--     ✓ Can use in Stabilisation
--     ❌ Cannot use in Must Preparation (not fermentable)
--
-- Composite Primary Key: The combination (ingredientTypeID, contextID) must be unique
--   - Prevents duplicate assignments (can't add "fermentable" to Apple Juice twice)
--
-- ON DELETE CASCADE: If ingredient type is deleted, remove all its context links
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingredientTypeContexts (
  ingredientTypeID  INTEGER NOT NULL,
  contextID         INTEGER NOT NULL,
  PRIMARY KEY (ingredientTypeID, contextID),
  FOREIGN KEY (ingredientTypeID) REFERENCES ingredientTypes(ingredientTypeID) ON DELETE CASCADE,
  FOREIGN KEY (contextID) REFERENCES usageContexts(contextID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Ingredient Type Extended Data
-- -----------------------------------------------------------------------------
-- Stores type-specific technical data for ingredients using flexible JSON format.
-- Allows different ingredient categories to have specialized fields without
-- creating separate tables for each type.
--
-- dataType: Category of extended data
--   - "yeast": Fermentation characteristics
--   - "hop": Bittering and aroma properties
--   - "honey": Fermentability and composition
--   - "fruit": Sugar content and acidity
--   - "malt": Extract potential and color contribution
--
-- jsonData: Flexible JSON object containing type-specific fields
--
-- JSON Schema Examples:
--
-- YEAST:
-- {
--   "strain": "Lalvin 71B-1122",
--   "form": "dry",
--   "attenuation": 75,
--   "alcoholTolerance": 14,
--   "temperatureRange": {"min": 15, "max": 30, "unit": "C"},
--   "flocculation": "medium",
--   "notes": "Reduces acidity, produces fruity esters"
-- }
--
-- HOP:
-- {
--   "alphaAcid": 12.5,
--   "betaAcid": 4.2,
--   "form": "pellet",
--   "origin": "US",
--   "profile": ["citrus", "pine", "resinous"],
--   "notes": "Classic American IPA hop"
-- }
--
-- HONEY:
-- {
--   "variety": "wildflower",
--   "fermentability": 100,
--   "moistureContent": 18,
--   "color": "amber",
--   "notes": "Multi-floral, varies by season"
-- }
--
-- FRUIT:
-- {
--   "sugarContent": 15.2,
--   "acidity": 3.4,
--   "pH": 3.3,
--   "notes": "Typical values, varies by variety and ripeness"
-- }
--
-- MALT:
-- {
--   "potentialSG": 1.037,
--   "ppg": 37,
--   "colorSRM": 3,
--   "notes": "Base malt for pale ales"
-- }
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingredientTypeExtendedData (
  ingredientTypeID  INTEGER PRIMARY KEY,
  dataType          TEXT NOT NULL,       -- "yeast", "hop", "honey", "fruit", "malt"
  jsonData          TEXT NOT NULL,       -- JSON object with type-specific fields
  FOREIGN KEY (ingredientTypeID) REFERENCES ingredientTypes(ingredientTypeID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------
-- Specific branded products that users actually buy and use.
-- Links to generic ingredientTypes - products are "instances" of types.
--
-- Examples:
--   ingredientType: "Apple Juice"
--     ├─ product: brandName="K Classic", productName="Apfel Saft"
--     ├─ product: brandName="Wesergold", productName="Naturtrüb"
--     └─ product: brandName=NULL, productName="My homemade pressed juice"
--
--   ingredientType: "Honey (Wildflower)"
--     ├─ product: brandName="Kirkland", productName="Wildflower Honey"
--     └─ product: brandName=NULL, productName="Local beekeeper honey"
--
-- brandName: NULL for homemade or generic items
-- packageSize/Unit: NULL for bulk or non-standardized items
--
-- Purpose: Allows inventory tracking at the product level while keeping
-- recipes at the generic ingredient type level
--
-- ON DELETE CASCADE: If ingredient type deleted, remove all its products
-- Note: Batch history preserved via productName snapshot in batchIngredients
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  productID           INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredientTypeID    INTEGER NOT NULL,
  brandName           TEXT,                     -- NULL for homemade/generic
  productName         TEXT NOT NULL,            -- User-defined name
  packageSize         REAL,                     -- NULL if not standardized
  packageUnit         TEXT,                     -- "L", "kg", "g", "lb", etc.
  notes               TEXT,                     -- User notes
  isActive            INTEGER DEFAULT 1,        -- 1 = available, 0 = discontinued
  FOREIGN KEY (ingredientTypeID) REFERENCES ingredientTypes(ingredientTypeID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Supplies
-- -----------------------------------------------------------------------------
-- Specific branded supplies that users actually buy and use.
-- Links to generic supplyTypes - supplies are "instances" of types.
-- 
-- Key Difference from Products:
-- - Products: Ingredients used IN the beverage (juice, honey, yeast)
-- - Supplies: Consumables used FOR production (bottles, sanitizer, caps)
--
-- Examples:
--   supplyType: "Sanitizer (Star San)"
--     ├─ supply: brandName="Five Star", productName="Star San 32oz"
--     └─ supply: brandName="Five Star", productName="Star San 1 gallon"
--
--   supplyType: "Bottle (750ml Wine, Bordeaux)"
--     ├─ supply: brandName="Midwest Supplies", productName="Bordeaux 750ml (case of 12)"
--     └─ supply: brandName=NULL, productName="Recycled wine bottles"
--
--   supplyType: "Crown Cap (26mm)"
--     ├─ supply: brandName="Oxygen Barrier", productName="Gold oxygen barrier caps"
--     └─ supply: brandName=NULL, productName="Standard crown caps"
--
-- brandName: NULL for generic or unbranded items
-- packageSize/Unit: NULL for bulk or non-standardized items
--
-- Purpose: Track consumable supplies separately from recipe ingredients
-- Note: Supplies do NOT appear in recipes (only ingredients do)
--
-- ON DELETE CASCADE: If supply type deleted, remove all its supplies
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplies (
  supplyID            INTEGER PRIMARY KEY AUTOINCREMENT,
  supplyTypeID        INTEGER NOT NULL,
  brandName           TEXT,                     -- NULL for generic
  productName         TEXT NOT NULL,            -- User-defined name
  packageSize         REAL,                     -- NULL if not standardized
  packageUnit         TEXT,                     -- "L", "kg", "g", "oz", "count"
  notes               TEXT,                     -- User notes, specifications
  isActive            INTEGER DEFAULT 1,        -- 1 = available, 0 = discontinued
  FOREIGN KEY (supplyTypeID) REFERENCES supplyTypes(supplyTypeID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Recipe Stages
-- -----------------------------------------------------------------------------
-- Defines the workflow stages for each recipe.
-- Each recipe is composed of ordered stages (Must Preparation → Fermentation → etc.)
--
-- stageTypeID: Links to standardized stage types (system-defined)
-- stageOrder: Sequence within the recipe (1, 2, 3...)
-- instructions: Recipe-specific guidance for this stage
--   Example: "Mix juice and honey, measure SG, pitch yeast at 20°C"
-- expectedDurationDays: How long this stage typically takes
--   Example: Fermentation might be 14 days, Aging might be 90 days
--
-- Note: When a batch is created, these stages are COPIED to batchStages
-- This allows recipes to be modified without affecting active batches
--
-- ON DELETE CASCADE: If recipe deleted, remove all its stages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipeStages (
  stageID             INTEGER PRIMARY KEY AUTOINCREMENT,
  recipeID            INTEGER NOT NULL,
  stageTypeID         INTEGER NOT NULL,
  stageOrder          INTEGER NOT NULL,        -- Sequence: 1, 2, 3...
  instructions        TEXT,                    -- Recipe-specific instructions
  expectedDurationDays INTEGER,                -- Typical duration for this stage
  FOREIGN KEY (recipeID) REFERENCES recipes(recipeID) ON DELETE CASCADE,
  FOREIGN KEY (stageTypeID) REFERENCES stageTypes(stageTypeID)
);

-- -----------------------------------------------------------------------------
-- Recipe Ingredients
-- -----------------------------------------------------------------------------
-- Defines ingredients needed for each recipe stage.
-- Links to generic ingredientTypes (not specific products).
--
-- Example:
--   Recipe: "Traditional Cider"
--   Stage: "Must Preparation"
--     ├─ Ingredient: 5L Apple Juice (any brand)
--     ├─ Ingredient: 1 packet Yeast
--     └─ Ingredient: 5g Yeast Nutrient
--
-- ingredientTypeID: Links to generic ingredient (e.g., "Apple Juice")
--   - NOT a specific product (e.g., "K Classic Apfel Saft")
--   - Users select specific product when starting a batch
--
-- scalingMethod: How ingredient scales when batch size changes
--   - "linear": Scale proportionally (5L juice for 10L batch → 10L for 20L batch)
--   - "fixed": Always same amount (1 yeast packet regardless of batch size)
--   - "step": Scale in steps (1 packet per 20L, so 2 packets for 30L batch)
--
-- ON DELETE CASCADE: If recipe stage deleted, remove its ingredients
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipeIngredients (
  recipeIngredientID  INTEGER PRIMARY KEY AUTOINCREMENT,
  stageID             INTEGER NOT NULL,
  ingredientTypeID    INTEGER NOT NULL,
  amount              REAL NOT NULL,
  unit                TEXT NOT NULL,
  scalingMethod       TEXT NOT NULL DEFAULT 'linear',  -- linear, fixed, step
  preferredVariant    TEXT,                            -- Optional: specific strain/variety recommendation
  notes               TEXT,                            -- Usage notes, substitutions
  FOREIGN KEY (stageID) REFERENCES recipeStages(stageID) ON DELETE CASCADE,
  FOREIGN KEY (ingredientTypeID) REFERENCES ingredientTypes(ingredientTypeID)
);

-- -----------------------------------------------------------------------------
-- Recipe Ingredient Alternatives
-- -----------------------------------------------------------------------------
-- Groups alternative ingredient types together using OR logic.
-- Allows recipes to specify: "Use ingredient A OR B OR C"
--
-- Purpose: Provides flexibility when ingredients are interchangeable
--
-- Example 1: Base Malt Options
--   Recipe: "Pale Ale" needs 4kg base malt
--   Alternative Group: "Base malt options"
--     ├─ Option 1: Pale Malt (preferred, sortOrder: 1)
--     ├─ Option 2: Light DME (sortOrder: 2)
--     └─ Option 3: Light LME (sortOrder: 3)
--   User picks ONE option when starting batch
--
-- Example 2: Sweetening Options
--   Recipe: "Sweet Cider" needs 200g sweetener
--   Alternative Group: "Sweetening options"
--     ├─ Option 1: Table Sugar
--     ├─ Option 2: Honey
--     └─ Option 3: Apple Juice Concentrate
--
-- description: Helpful text explaining the alternatives
--   Example: "Choose your preferred base malt for extract or all-grain brewing"
--
-- Note: The actual ingredient type options are stored in
--       recipeIngredientAlternativeOptions (next table)
--
-- ON DELETE CASCADE: If recipe ingredient deleted, remove its alternative groups
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipeIngredientAlternatives (
  alternativeGroupID  INTEGER PRIMARY KEY AUTOINCREMENT,
  recipeIngredientID  INTEGER NOT NULL,
  description         TEXT,                     -- "Base malt options", "Sweetening choices"
  FOREIGN KEY (recipeIngredientID) REFERENCES recipeIngredients(recipeIngredientID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Recipe Ingredient Alternative Options
-- -----------------------------------------------------------------------------
-- Links ingredient types as options within an alternative group.
-- Allows recipes to specify multiple interchangeable ingredients.
--
-- Example:
--   Alternative Group: "Base malt options"
--     ├─ Option: Pale Malt (ingredientTypeID=1, sortOrder=1)
--     ├─ Option: Light DME (ingredientTypeID=2, sortOrder=2)
--     └─ Option: Light LME (ingredientTypeID=3, sortOrder=3)
--
-- sortOrder: Display order within the alternative options
--   Example: Preferred options listed first
-- ON DELETE CASCADE: If alternative group deleted, remove its options
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipeIngredientAlternativeOptions (
  alternativeGroupID  INTEGER NOT NULL,
  ingredientTypeID    INTEGER NOT NULL,
  sortOrder           INTEGER NOT NULL DEFAULT 0,  -- Display order within alternatives
  PRIMARY KEY (alternativeGroupID, ingredientTypeID),
  FOREIGN KEY (alternativeGroupID) REFERENCES recipeIngredientAlternatives(alternativeGroupID) ON DELETE CASCADE,
  FOREIGN KEY (ingredientTypeID) REFERENCES ingredientTypes(ingredientTypeID) On DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Batches
-- -----------------------------------------------------------------------------
-- Actual production runs based on recipes.
-- When a batch is created, recipe data is SNAPSHOTTED (copied) so changes
-- to the recipe don't affect active batches.
--
-- recipeID: Reference to original recipe (for "based on" information)
-- recipeName: Snapshot of recipe name (preserved even if recipe deleted)
-- actualBatchSizeL: User can scale from recipe's default batch size
-- startDate: NULL if status='planned'
-- endDate: When batch completed or abandoned
-- status: Lifecycle tracking
--   - planned: Created but not started (no ingredients used)
--   - active: In progress (any stage from Must Prep → Packaging)
--   - completed: Successfully finished all stages
--   - abandoned: Stopped before completion
-- currentStageID: Links to batchStages (which stage is active)
-- abandonReason: Why batch was abandoned (infection, off-flavour, accident)
--
-- ON DELETE SET NULL: If recipe deleted, keep batch but nullify recipeID
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batches (
  batchID           INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  recipeID          INTEGER NOT NULL,
  recipeName        TEXT NOT NULL,              -- Snapshot of recipe name
  actualBatchSizeL  REAL NOT NULL,
  startDate         TEXT,                       -- NULL if status='planned'
  endDate           TEXT,                       -- When completed or abandoned
  currentStageID    INTEGER,                    -- FK to batchStages
  status            TEXT NOT NULL DEFAULT 'planned',  -- planned, active, completed, abandoned
  abandonReason     TEXT,                       -- Why abandoned (if applicable)
  notes             TEXT,                       -- General batch notes
  FOREIGN KEY (recipeID) REFERENCES recipes(recipeID) ON DELETE SET NULL,
  FOREIGN KEY (currentStageID) REFERENCES batchStages(batchStageID)
);

-- -----------------------------------------------------------------------------
-- Batch Stages
-- -----------------------------------------------------------------------------
-- Snapshot of recipe stages for each batch.
-- Copied from recipeStages when batch is created, so recipe changes don't
-- affect active batches.
--
-- stageTypeID: Links to system stage type (for context/validation)
-- stageName: Snapshot of stage type name (preserved even if type renamed)
-- stageOrder: Sequence within batch (1, 2, 3...)
-- instructions: Snapshot from recipe stage (user can modify per batch)
-- expectedDurationDays: From recipe (user can track actual vs expected)
-- startDate: When user started this stage (NULL if not started)
-- endDate: When user completed this stage (NULL if not completed)
-- status: Stage lifecycle
--   - pending: Not started yet
--   - active: Currently in progress
--   - completed: Finished
--   - skipped: Optional stage user chose not to do
--
-- ON DELETE CASCADE: If batch deleted, remove all its stages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batchStages (
  batchStageID        INTEGER PRIMARY KEY AUTOINCREMENT,
  batchID             INTEGER NOT NULL,
  stageTypeID         INTEGER NOT NULL,
  stageName           TEXT NOT NULL,              -- Snapshot of stage type name
  stageOrder          INTEGER NOT NULL,
  instructions        TEXT,                       -- Snapshot from recipe
  expectedDurationDays INTEGER,                   -- From recipe
  startDate           TEXT,                       -- When stage started
  endDate             TEXT,                       -- When stage ended
  status              TEXT NOT NULL DEFAULT 'pending',  -- pending, active, completed, skipped
  allowMultipleAdditions INTEGER DEFAULT 0,        -- Allows step feeding of ingredients in a stage
  notes               TEXT,                       -- User notes for this stage
  FOREIGN KEY (batchID) REFERENCES batches(batchID) ON DELETE CASCADE,
  FOREIGN KEY (stageTypeID) REFERENCES stageTypes(stageTypeID)
);

-- -----------------------------------------------------------------------------
-- Batch Ingredients
-- -----------------------------------------------------------------------------
-- Snapshot of ingredients for each batch stage.
-- Tracks what was planned (from recipe) vs what was actually used.
--
-- Hierarchy: batch → batchStage → batchIngredients
--   Example: Cider batch, Must Preparation stage, needs 5L Apple Juice
--
-- ingredientTypeID: Generic type from recipe (e.g., "Apple Juice")
-- ingredientTypeName: Snapshot (preserved if type renamed/deleted)
-- productID: Specific product user selected (e.g., "K Classic Apfel Saft")
-- productName: Snapshot (preserved if product deleted)
--
-- plannedAmount/Unit: From recipe, scaled to actual batch size
--   Example: Recipe says 5L for 5L batch, user makes 10L → planned: 10L
-- actualAmount/Unit: What user actually used (may differ)
--   Example: User had 10.2L available, used it all → actual: 10.2L
--
-- inventoryLotID: Optional link to inventory for FIFO tracking
--
-- ON DELETE CASCADE (batchStageID): If stage deleted, remove ingredients
-- ON DELETE SET NULL (productID): If product deleted, keep snapshot name
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batchIngredients (
  batchIngredientID   INTEGER PRIMARY KEY AUTOINCREMENT,
  batchStageID        INTEGER NOT NULL,              -- Links to batch stage, not batch
  ingredientTypeID    INTEGER NOT NULL,
  ingredientTypeName  TEXT NOT NULL,                 -- Snapshot
  productID           INTEGER,                       -- Specific product used (nullable)
  productName         TEXT,                          -- Snapshot (nullable if not selected)
  plannedAmount       REAL NOT NULL,                 -- From recipe (scaled)
  plannedUnit         TEXT NOT NULL,
  actualAmount        REAL,                          -- What was actually used
  actualUnit          TEXT,
  inventoryLotID      INTEGER,                       -- Optional: FIFO tracking
  notes               TEXT,                          -- Per-batch notes
  FOREIGN KEY (batchStageID) REFERENCES batchStages(batchStageID) ON DELETE CASCADE,
  FOREIGN KEY (ingredientTypeID) REFERENCES ingredientTypes(ingredientTypeID),
  FOREIGN KEY (productID) REFERENCES products(productID) ON DELETE SET NULL,
  FOREIGN KEY (inventoryLotID) REFERENCES inventoryLots(lotID) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Batch Measurements
-- -----------------------------------------------------------------------------
-- Records all measurements and observations taken during batch production.
-- Tracks fermentation progress, troubleshoots issues, calculates ABV.
--
-- measurementType: Category of measurement
--   Quantitative (with value/unit):
--     - "SG": Specific Gravity (value: 1.050, unit: "SG")
--     - "pH": Acidity (value: 3.4, unit: "pH")
--     - "temp": Temperature (value: 20, unit: "°C" or "°F")
--     - "pressure": For kegging (value: 12, unit: "PSI")
--   
--   Qualitative (no value/unit, use notes):
--     - "color": Visual appearance (notes: "Deep amber, clear")
--     - "taste": Flavor profile (notes: "Fruity, slightly tart")
--     - "aroma": Smell (notes: "Floral honey notes")
--     - "clarity": Transparency (notes: "Hazy, settling slowly")
--
-- value/unit: For quantitative measurements (NULL for qualitative)
-- notes: Additional observations, context, or full description for qualitative
--
-- measurementDate: Auto-set to current datetime if not provided
--
-- Example Usage:
--   Day 0: SG 1.100, temp 20°C → "Pitched yeast"
--   Day 3: SG 1.080, temp 22°C → "Fermentation active, krausen forming"
--   Day 14: SG 1.000, taste → "Dry, clean finish, ready to package"
--
-- ON DELETE CASCADE: If batch stage deleted, remove its measurements
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batchMeasurements (
  measurementID       INTEGER PRIMARY KEY AUTOINCREMENT,
  batchStageID        INTEGER NOT NULL,
  measurementDate     TEXT NOT NULL DEFAULT (DATETIME('now')),  -- ISO 8601: YYYY-MM-DD HH:MM:SS
  measurementType     TEXT NOT NULL,              -- "SG", "pH", "temp", "color", "taste", "aroma"
  value               REAL,                       -- NULL for qualitative measurements
  unit                TEXT,                       -- "SG", "pH", "°C", "°F", NULL for qualitative
  notes               TEXT,                       -- Observations, context
  FOREIGN KEY (batchStageID) REFERENCES batchStages(batchStageID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Equipment Usage
-- -----------------------------------------------------------------------------
-- Tracks which equipment is occupied during which batch stages.
-- Only applies to equipment where canBeOccupied = 1 (fermenters, monitors).
-- Prevents scheduling conflicts - user can see what's available.
--
-- Stage-Level Tracking:
--   Equipment is tied to STAGES, not entire batches
--   Example: Fermenter used during Fermentation stage, then freed for next batch
--            Same fermenter might be reused in Aging stage of same batch
--
-- Workflow:
--   1. User starts stage → assign equipment → status: "in-use"
--   2. Stage progresses → equipment remains "in-use"
--   3. User completes stage → release equipment → status: "available"
--
-- inUseDate: When equipment assigned to this stage (auto-set if not provided)
-- releaseDate: When equipment freed from this stage (NULL while still in use)
-- status: Current state
--   - "in-use": Currently assigned to this stage
--   - "available": Freed and ready for reassignment
--
-- Example:
--   Batch: "Traditional Mead"
--   Stage: Fermentation (started Oct 1)
--     Equipment: Primary Fermenter #1
--     inUseDate: 2025-10-01 10:00:00
--     releaseDate: NULL
--     status: in-use
--   
--   User completes Fermentation stage on Oct 15
--     releaseDate: 2025-10-15 14:30:00
--     status: available
--   
--   Now Primary Fermenter #1 can be assigned to another batch's stage!
--
-- Multiple Equipment Per Stage:
--   One stage can have multiple equipment records
--   Example: Fermentation stage uses both fermenter + TILT monitor
--
-- ON DELETE CASCADE: If equipment or batch stage deleted, remove usage records
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipmentUsage (
  usageID             INTEGER PRIMARY KEY AUTOINCREMENT,
  equipmentID         INTEGER NOT NULL,
  batchStageID        INTEGER NOT NULL,
  inUseDate           TEXT NOT NULL DEFAULT (DATETIME('now')),  -- When assigned
  releaseDate         TEXT,                                     -- NULL if still in use
  status              TEXT NOT NULL DEFAULT 'in-use',           -- "in-use", "available"
  FOREIGN KEY (equipmentID) REFERENCES equipment(equipmentID) ON DELETE CASCADE,
  FOREIGN KEY (batchStageID) REFERENCES batchStages(batchStageID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Inventory Lots
-- -----------------------------------------------------------------------------
-- Tracks individual purchases/acquisitions of products and supplies.
-- Implements FIFO (First In, First Out) inventory management.
--
-- Lot Lifecycle:
--   1. Created: status = "active", quantityRemaining > 0
--   2. In Use: quantityRemaining decreases as used in batches
--   3. Consumed: quantityRemaining = 0, status = "consumed"
--   4. Expired: Past expirationDate, status = "expired"
--
-- Historical Data Retention:
--   Consumed/expired lots are NOT deleted - they're archived (status changed)
--   This preserves:
--     - Cost tracking: Calculate production costs per batch
--     - Usage analytics: Track consumption patterns over time
--     - Supplier history: Compare quality and pricing
--     - Audit trail: Troubleshoot issues with specific batches
--     - Tax records: For commercial producers
--
-- FIFO Query Pattern:
--   SELECT * FROM inventoryLots 
--   WHERE productID = ? 
--   AND status = 'active'
--   AND quantityRemaining > 0
--   ORDER BY purchaseDate ASC
--
-- One table handles both products (ingredients) and supplies (bottles, etc.)
-- Exactly ONE of productID or supplyID must be set (enforced by CHECK constraint)
--
-- quantityPurchased: Original amount bought
-- quantityRemaining: Current amount left (decreases as used)
-- purchaseDate: When acquired (used for FIFO ordering)
-- expirationDate: NULL for non-perishable items
-- costPerUnit: Price paid per unit (for cost tracking and analytics)
-- supplier: Where purchased (compare suppliers over time)
--
-- Example 1: Product (Honey) - Active
--   productID: 5 ("Honey (Wildflower)")
--   supplyID: NULL
--   quantityPurchased: 10.0
--   quantityRemaining: 7.5
--   unit: "kg"
--   purchaseDate: 2025-09-15
--   costPerUnit: 8.99
--   supplier: "Local beekeeper"
--   status: "active"
--
-- Example 2: Product (Honey) - Consumed
--   quantityPurchased: 10.0
--   quantityRemaining: 0.0
--   status: "consumed"
--   (Preserved for cost tracking in batches that used this lot)
--
-- Example 3: Supply (Bottles) - Expired
--   supplyID: 8
--   expirationDate: 2025-08-01
--   status: "expired"
--   (User decided not to use expired bottles)
--
-- ON DELETE CASCADE: If product/supply deleted, remove inventory lots
--   Note: Only delete product/supply if no batches reference it
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventoryLots (
  lotID               INTEGER PRIMARY KEY AUTOINCREMENT,
  productID           INTEGER,                       -- For ingredients
  supplyID            INTEGER,                       -- For supplies
  quantityPurchased   REAL NOT NULL,                 -- Original amount
  quantityRemaining   REAL NOT NULL,                 -- Current amount left
  unit                TEXT NOT NULL,                 -- "kg", "L", "count", etc.
  purchaseDate        TEXT NOT NULL,                 -- ISO 8601: YYYY-MM-DD
  expirationDate      TEXT,                          -- NULL if non-perishable
  costPerUnit         REAL,                          -- Price paid per unit
  supplier            TEXT,                          -- Where purchased
  status              TEXT NOT NULL DEFAULT 'active', -- "active", "consumed", "expired"
  notes               TEXT,                          -- User notes
  FOREIGN KEY (productID) REFERENCES products(productID) ON DELETE CASCADE,
  FOREIGN KEY (supplyID) REFERENCES supplies(supplyID) ON DELETE CASCADE,
  CHECK ((productID IS NOT NULL AND supplyID IS NULL) OR (productID IS NULL AND supplyID IS NOT NULL))
);


-- =============================================================================
-- SEED DATA (Reference data that ships with every new database)
-- =============================================================================

-- Item Categories
-- Note: sortOrder has gaps (1-7, then 20-23) to allow adding categories later
INSERT OR IGNORE INTO itemCategories (name, description, sortOrder) VALUES 
  -- INGREDIENTS (consumables used IN the beverage)
  ('Fruits', 'Fresh or processed fruits used in fermentation', 1),
  ('Grains & Malts', 'Base malts, specialty malts, and adjunct grains', 2),
  ('Honeys, Syrups & Sugars', 'Sweeteners of various types', 3),
  ('Flavorants', 'Spices, herbs, woods, and extracts', 4),
  ('Hops', 'Hop varieties for bitterness, flavour, and aroma', 5),
  ('Additives', 'Nutrients, salts, stabilisers, fining agents', 6),
  ('Yeasts & Microbes', 'Yeast strains and microbial cultures', 7),
  
  -- SUPPLIES (consumables used FOR production, not in beverage)
  ('Cleaners & Sanitizers', 'Cleaning and sanitising agents', 20),
  ('Bottles', 'Glass or plastic bottles for packaging', 21),
  ('Closures', 'Corks, caps, screw caps for sealing', 22),
  ('Other Packaging', 'Labels, carriers, boxes, packaging materials', 23);

-- Usage Contexts
INSERT OR IGNORE INTO usageContexts (contextID, name, description) VALUES
(1, 'fermentable', 'Provides fermentable sugars for alcohol production'),
(2, 'primer', 'Adds fermentables for carbonation (bottle conditioning)'),
(3, 'nonfermentable', 'Adds flavour or body without fermenting'),
(4, 'nutrient', 'Provides nutrients for yeast or microbes'),
(5, 'salt', 'Adjusts ionic strength or water chemistry'),
(6, 'cleaner', 'Used to clean equipment before use'),
(7, 'sanitiser', 'Used to sanitise equipment before use'),
(8, 'prefermentation-treatment', 'Treats must before fermentation (kills wild microbes)'),
(9, 'fining', 'Clarifies and removes particulates'),
(10, 'packaging', 'Used to package the final product'),
(11, 'fermenter', 'Yeast or microbes that perform fermentation'),
(12, 'malolactic', 'Lactic acid bacteria for malolactic fermentation'),
(13, 'stabiliser', 'Prevents fermentation restart after fermentation');

-- Category Allowed Contexts
-- Defines which contexts each category can have
INSERT OR IGNORE INTO categoryAllowedContexts (categoryID, contextID)
SELECT c.categoryID, u.contextID
FROM itemCategories c, usageContexts u
WHERE 
  -- Fruits can be fermentable or used for priming
  (c.name = 'Fruits' AND u.name IN ('fermentable', 'primer')) OR
  
  -- Grains & Malts can be fermentable or used for priming
  (c.name = 'Grains & Malts' AND u.name IN ('fermentable', 'primer')) OR
  
  -- Honeys, Syrups & Sugars can be fermentable or used for priming
  (c.name = 'Honeys, Syrups & Sugars' AND u.name IN ('fermentable', 'primer')) OR
  
  -- Flavorants add flavour but don't ferment
  (c.name = 'Flavorants' AND u.name = 'nonfermentable') OR
  
  -- Hops add flavour/bitterness but don't ferment
  (c.name = 'Hops' AND u.name = 'nonfermentable') OR
  
  -- Yeasts & Microbes are fermenters or malolactic bacteria
  (c.name = 'Yeasts & Microbes' AND u.name IN ('fermenter', 'malolactic')) OR
  
  -- Additives can be nutrients, salts, stabilisers, prefermentation treatments, or fining agents
  (c.name = 'Additives' AND u.name IN ('nutrient', 'salt', 'stabiliser', 'prefermentation-treatment', 'fining')) OR
  
  -- Cleaners & Sanitizers clean and sanitise equipment
  (c.name = 'Cleaners & Sanitizers' AND u.name IN ('cleaner', 'sanitiser')) OR
  
  -- Packaging items are used for packaging
  (c.name = 'Bottles' AND u.name = 'packaging') OR
  (c.name = 'Closures' AND u.name = 'packaging') OR
  (c.name = 'Other Packaging' AND u.name = 'packaging');

-- Stage Types
-- Note: sortOrder has gaps (10, 20, 30...) to allow inserting stages later
-- Note: Three stages are required (isRequired=1): Must Preparation, Fermentation, Packaging
INSERT OR IGNORE INTO stageTypes 
(stageTypeID, name, description, isRequired, sortOrder, requiresStage, excludesStage) VALUES
(1, 'Must Preparation', 'Prepare the must (mix ingredients, measure SG/pH)', 1, 10, NULL, NULL),
(2, 'Fermentation', 'Active fermentation with yeast/microbes', 1, 20, 1, NULL),
(3, 'Malolactic Fermentation', 'Secondary microbial fermentation to reduce acidity', 0, 30, 2, NULL),
(4, 'Stabilisation', 'Prevent further fermentation (chemical, pasteurisation, etc.)', 0, 40, 2, 7),
(5, 'Flavor Adjustment', 'Add sugars/sweeteners/flavourants to adjust final taste', 0, 50, 2, NULL),
(6, 'Clarification & Aging', 'Fining, clearing, or bulk aging for stability and clarity', 0, 60, 2, NULL),
(7, 'Priming', 'Add fermentables before packaging for carbonation', 0, 70, 2, 4),
(8, 'Packaging', 'Final packaging into bottles, kegs, or other containers', 1, 80, 2, NULL);

-- ingredientTypes Seed Data
INSERT OR IGNORE INTO ingredientTypes (name, categoryID, description, beverageTypes, isPrimaryRequired) VALUES
  -- Fruits
  ('Apple Juice', 1, 'Any apple juice (filtered or unfiltered)', '["Cider"]', 1),
  ('Pear Juice', 1, 'Pear juice for perry or blended ciders', '["Perry", "Cider"]', 1),
  ('Grape Juice (Concord)', 1, 'Concord grape juice for wine', '["Wine"]', 1),
  ('Grape Juice (Muscadine)', 1, 'Muscadine grape juice for wine', '["Wine"]', 1),
  ('Blackberry (Fresh)', 1, 'Fresh blackberries for fruit wines', '["Wine"]', 1),
  
  -- Honeys
  ('Honey (Wildflower)', 3, 'Wildflower honey - most common for mead', '["Mead", "Melomel"]', 1),
  ('Honey (Orange Blossom)', 3, 'Orange blossom honey - mild flavour', '["Mead", "Melomel"]', 1),
  ('Honey (Buckwheat)', 3, 'Buckwheat honey - strong, dark flavour', '["Mead", "Melomel"]', 1),
  
  -- Sugars (adjunct, never required for primary)
  ('Table Sugar (Sucrose)', 3, 'White table sugar for boosting ABV', '["Mead", "Cider", "Wine"]', 0),
  ('Dextrose (Corn Sugar)', 3, 'Corn sugar, 100% fermentable', '["Mead", "Cider", "Wine", "Beer"]', 0),
  
  -- Yeasts (broad categories)
  ('Wine Yeast', 7, 'General wine yeast for fermentation', '["Wine", "Mead"]', 0),
  ('Champagne Yeast', 7, 'High alcohol tolerance, neutral profile', '["Wine", "Mead", "Cider"]', 0),
  ('Ale Yeast', 7, 'Top-fermenting beer yeast', '["Beer"]', 0),
  ('Lager Yeast', 7, 'Bottom-fermenting beer yeast', '["Beer"]', 0),
  ('Cider Yeast', 7, 'Yeast specifically for cider production', '["Cider"]', 0),

  -- Bacteria
  ('Lactic Acid Bacteria (LAB)', 7, 'For malolactic fermentation - converts malic to lactic acid', '["Wine", "Cider"]', 0),

  -- Additives
  ('Potassium Metabisulfite (K-meta)', 6, 'Pre-fermentation antiseptic, kills wild yeast/bacteria', NULL, 0),
  ('Campden Tablets', 6, 'Potassium or sodium metabisulfite tablets for must treatment', NULL, 0),
  ('Potassium Sorbate', 6, 'Post-fermentation stabiliser, prevents yeast reproduction', NULL, 0);
  
-- Supply Types Seed Data
INSERT OR IGNORE INTO supplyTypes (name, categoryID, description) VALUES
  -- Cleaners & Sanitizers
  ('Sanitizer (Star San)', 8, 'Acid-based no-rinse sanitiser'),
  ('Sanitizer (Iodophor)', 8, 'Iodine-based sanitiser'),
  ('Cleaner (PBW)', 8, 'Powdered Brewery Wash - alkaline cleaner'),
  ('Cleaner (OxiClean)', 8, 'Oxygen-based cleaner'),
  
  -- Bottles
  ('Bottle (750ml Wine, Bordeaux)', 9, 'Standard wine bottle, Bordeaux shape'),
  ('Bottle (750ml Wine, Burgundy)', 9, 'Standard wine bottle, Burgundy shape'),
  ('Bottle (375ml Split)', 9, 'Half bottle for smaller batches'),
  ('Bottle (12oz Beer, Brown)', 9, 'Standard brown beer bottle'),
  
  -- Closures
  ('Cork (#9 Straight)', 10, 'Standard straight cork for wine bottles'),
  ('Cork (#8 Tapered)', 10, 'Tapered cork for smaller bottles'),
  ('Crown Cap (26mm)', 10, 'Standard crown cap for beer bottles'),
  ('Screw Cap (30x60mm)', 10, 'Screw cap with liner'),
  
  -- Other Packaging
  ('Label (Wine, 4x3 inch)', 11, 'Self-adhesive wine labels'),
  ('Shrink Capsule (Burgundy)', 11, 'Heat-shrink capsules for wine bottles'),
  ('Carrier (6-bottle)', 11, 'Cardboard carrier for transport');

-- Ingredient Type Contexts Seed Data
-- Assigns usage contexts to ingredient types
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE
  -- Fruit juices: fermentable and can prime
  (it.name IN ('Apple Juice', 'Pear Juice', 'Grape Juice (Concord)', 'Grape Juice (Muscadine)') 
   AND uc.name IN ('fermentable', 'primer')) OR
  
  -- Fresh fruits: fermentable only (don't typically prime with whole fruit)
  (it.name = 'Blackberry (Fresh)' AND uc.name = 'fermentable') OR
  
  -- Honeys: fermentable and can prime
  (it.name LIKE 'Honey%' AND uc.name IN ('fermentable', 'primer')) OR
  
  -- Sugars: fermentable and can prime
  (it.name IN ('Table Sugar (Sucrose)', 'Dextrose (Corn Sugar)') 
   AND uc.name IN ('fermentable', 'primer')) OR
  
  -- Yeasts: fermenters
  (it.name IN ('Wine Yeast', 'Champagne Yeast', 'Ale Yeast', 'Lager Yeast', 'Cider Yeast') 
  AND uc.name = 'fermenter') OR
  
  -- LAB: malolactic
  (it.name = 'Lactic Acid Bacteria (LAB)' AND uc.name = 'malolactic') OR

  -- Pre-fermentation treatments AND post-fermentation stabilisers (sulfites do both)
(it.name IN ('Potassium Metabisulfite (K-meta)', 'Campden Tablets') 
 AND uc.name IN ('prefermentation-treatment', 'stabiliser')) OR

  -- Post-fermentation stabilisers
  (it.name = 'Potassium Sorbate' AND uc.name = 'stabiliser');

-- Stage Type Allowed Contexts
-- Defines which ingredient contexts are valid for each stage type
INSERT OR IGNORE INTO stageTypeAllowedContexts (stageTypeID, contextID)
SELECT st.stageTypeID, uc.contextID
FROM stageTypes st, usageContexts uc
WHERE
  -- Must Preparation: fermentables, water chemistry, nutrients, prefermentation treatments, flavourants
  (st.name = 'Must Preparation' 
  AND uc.name IN ('fermentable', 'salt', 'nutrient', 'prefermentation-treatment', 'nonfermentable')) OR
  
  -- Fermentation: yeast/microbes, nutrients (step feeding)
  (st.name = 'Fermentation' AND uc.name IN ('fermenter', 'nutrient')) OR
  
  -- Malolactic Fermentation: only LAB (malolactic context)
  (st.name = 'Malolactic Fermentation' AND uc.name = 'malolactic') OR
  
  -- Stabilisation: only stabilisers
  (st.name = 'Stabilisation' AND uc.name = 'stabiliser') OR
  
  -- Flavor Adjustment: sweeteners and flavourants (no nutrients - encourages unwanted fermentation)
  (st.name = 'Flavor Adjustment' AND uc.name IN ('fermentable', 'nonfermentable')) OR
  
  -- Clarification & Aging: fining agents
  (st.name = 'Clarification & Aging' AND uc.name = 'fining') OR
  
  -- Priming: priming sugars
  (st.name = 'Priming' AND uc.name = 'primer') OR
  
  -- Packaging: packaging materials
  (st.name = 'Packaging' AND uc.name = 'packaging');
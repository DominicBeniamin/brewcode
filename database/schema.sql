-- =============================================================================
-- BREWCODE DATABASE SCHEMA
-- =============================================================================
-- This database manages recipes, batches, ingredients, equipment, and inventory
-- for wine, mead, and cider ingrediention.
--
-- Key Concepts:
-- - RECIPES: Templates with stages and ingredient requirements
-- - BATCHES: Actual ingrediention runs following a recipe (snapshot at creation)
-- - INGREDIENTS: Consumables used IN the beverage (juice, honey, yeast)
-- - SUPPLIES: Consumables used FOR ingrediention (bottles, sanitizer, caps)
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
-- Generic supply types for consumables used FOR ingrediention (not in beverage).
-- Examples: "Sanitizer (Star San)", "Bottle (750ml)", "Crown Cap #26", "Cork (#9)"
--
-- Purpose: Track consumables that support the brewing process
-- - Cleaning/sanitizing agents (PBW, StarSan, Iodophor)
-- - Packaging materials (bottles, caps, corks, labels)
-- - Other consumables (shrink wrap, carrier boxes)
--
-- Key Difference from ingredientTypes:
-- - Supplies are used FOR ingrediention (sanitize equipment, package ingredient)
-- - Ingredients are used IN ingrediention (become part of the beverage)
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
  type                TEXT NOT NULL,         -- "fermentation Vessel", "monitoring device", "measurement", "processing"
  canBeOccupied       INTEGER DEFAULT 0,     -- 1 = tracked for batch occupancy, 0 = general tool
  capacityL           REAL,                  -- Volume capacity (NULL for non-vessels)
  material            TEXT,                  -- "Glass", "Plastic", "Stainless Steel", "Silicone"
  notes               TEXT,                  -- Maintenance notes, specifications, etc.
  isActive            INTEGER DEFAULT 1,     -- 1 = in use, 0 = retired/broken
  calibrationTemp     REAL,                  -- Calibration temperature in °C (if applicable)
  calibrationTempUnit TEXT                   -- "C" or "F" (if applicable)
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

CREATE TABLE IF NOT EXISTS items (
  itemID                INTEGER PRIMARY KEY AUTOINCREMENT,
  brand                 TEXT,                     -- NULL for homemade/generic
  name                  TEXT NOT NULL,            -- User-defined name
  unit                  TEXT NOT NULL,            -- How measured: "g", "L", "count", etc.
  onDemand              INTEGER DEFAULT 0,        -- 1 = buy/make as needed, 0 = track stock
  onDemandPrice         REAL,                     -- Cost for the quantity in onDemandPriceQty
  onDemandPriceQty      REAL,                     -- Quantity that price applies to
  reorderPoint          REAL,                     -- When to reorder/make more
  reorderQuantity       REAL,                     -- How much to reorder/make
  autoAlert             INTEGER DEFAULT 1,        -- 1 = notify when below reorderPoint
  notes                 TEXT,                     -- User notes
  isActive              INTEGER DEFAULT 1,        -- 1 = available, 0 = discontinued
  createdDate           TEXT DEFAULT (DATE('now')),
  modifiedDate          TEXT DEFAULT (DATE('now'))
);

CREATE TABLE IF NOT EXISTS itemRoles (
  itemID                INTEGER NOT NULL,
  roleType              TEXT NOT NULL,            -- 'ingredient' or 'supply'
  itemTypeID            INTEGER NOT NULL,         -- FK to ingredientTypes or supplyTypes
  categoryID            INTEGER NOT NULL,         -- FK to itemCategories (context for UI)
  PRIMARY KEY (itemID, roleType),
  FOREIGN KEY (itemID) REFERENCES items(itemID) ON DELETE CASCADE,
  FOREIGN KEY (categoryID) REFERENCES itemCategories(categoryID)
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
-- Links to generic ingredientTypes (not specific ingredients).
--
-- Example:
--   Recipe: "Traditional Cider"
--   Stage: "Must Preparation"
--     ├─ Ingredient: 5L Apple Juice (any brand)
--     ├─ Ingredient: 1 packet Yeast
--     └─ Ingredient: 5g Yeast Nutrient
--
-- ingredientTypeID: Links to generic ingredient (e.g., "Apple Juice")
--   - NOT a specific ingredient (e.g., "K Classic Apfel Saft")
--   - Users select specific ingredient when starting a batch
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
-- Actual ingrediention runs based on recipes.
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
-- ingredientID: Specific ingredient user selected (e.g., "K Classic Apfel Saft")
-- ingredientName: Snapshot (preserved if ingredient deleted)
--
-- plannedAmount/Unit: From recipe, scaled to actual batch size
--   Example: Recipe says 5L for 5L batch, user makes 10L → planned: 10L
-- actualAmount/Unit: What user actually used (may differ)
--   Example: User had 10.2L available, used it all → actual: 10.2L
--
-- inventoryLotID: Optional link to inventory for FIFO tracking
--
-- ON DELETE CASCADE (batchStageID): If stage deleted, remove ingredients
-- ON DELETE SET NULL (ingredientID): If ingredient deleted, keep snapshot name
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batchIngredients (
  batchIngredientID   INTEGER PRIMARY KEY AUTOINCREMENT,
  batchStageID        INTEGER NOT NULL,
  ingredientTypeID    INTEGER NOT NULL,
  ingredientTypeName  TEXT NOT NULL,
  itemID              INTEGER,                          -- Specific item used
  itemName            TEXT,                             -- Snapshot
  plannedAmount       REAL NOT NULL,
  plannedUnit         TEXT NOT NULL,
  actualAmount        REAL,
  actualUnit          TEXT,
  inventoryLotID      INTEGER,
  notes               TEXT,
  FOREIGN KEY (batchStageID) REFERENCES batchStages(batchStageID) ON DELETE CASCADE,
  FOREIGN KEY (ingredientTypeID) REFERENCES ingredientTypes(ingredientTypeID),
  FOREIGN KEY (itemID) REFERENCES items(itemID) ON DELETE SET NULL,
  FOREIGN KEY (inventoryLotID) REFERENCES inventoryLots(lotID) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Batch Measurements
-- -----------------------------------------------------------------------------
-- Records all measurements and observations taken during batch ingrediention.
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
-- Tracks individual purchases/acquisitions of ingredients and supplies.
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
--     - Cost tracking: Calculate ingrediention costs per batch
--     - Usage analytics: Track consumption patterns over time
--     - Supplier history: Compare quality and pricing
--     - Audit trail: Troubleshoot issues with specific batches
--     - Tax records: For commercial producers
--
-- FIFO Query Pattern:
--   SELECT * FROM inventoryLots 
--   WHERE ingredientID = ? 
--   AND status = 'active'
--   AND quantityRemaining > 0
--   ORDER BY purchaseDate ASC
--
-- One table handles both ingredients (ingredients) and supplies (bottles, etc.)
-- Exactly ONE of ingredientID or supplyID must be set (enforced by CHECK constraint)
--
-- quantityPurchased: Original amount bought
-- quantityRemaining: Current amount left (decreases as used)
-- purchaseDate: When acquired (used for FIFO ordering)
-- expirationDate: NULL for non-perishable items
-- costPerUnit: Price paid per unit (for cost tracking and analytics)
-- supplier: Where purchased (compare suppliers over time)
--
-- Example 1: ingredient (Honey) - Active
--   ingredientID: 5 ("Honey (Wildflower)")
--   supplyID: NULL
--   quantityPurchased: 10.0
--   quantityRemaining: 7.5
--   unit: "kg"
--   purchaseDate: 2025-09-15
--   costPerUnit: 8.99
--   supplier: "Local beekeeper"
--   status: "active"
--
-- Example 2: ingredient (Honey) - Consumed
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
-- ON DELETE CASCADE: If ingredient/supply deleted, remove inventory lots
--   Note: Only delete ingredient/supply if no batches reference it
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventoryLots (
  lotID               INTEGER PRIMARY KEY AUTOINCREMENT,
  itemID              INTEGER NOT NULL,                 -- FK to items (replaces ingredientID/supplyID)
  quantityPurchased   REAL NOT NULL,
  quantityRemaining   REAL NOT NULL,
  unit                TEXT NOT NULL,
  purchaseDate        TEXT NOT NULL,
  expirationDate      TEXT,
  costPerUnit         REAL,
  supplier            TEXT,
  status              TEXT NOT NULL DEFAULT 'active',
  notes               TEXT,
  FOREIGN KEY (itemID) REFERENCES items(itemID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- User Settings
-- -----------------------------------------------------------------------------
-- Stores user preferences for units, formats, and display options.
-- Single row table (settingsID always = 1) for simplicity.
--
-- Units:
--   temperatureUnit: "c" (Celsius) or "f" (Fahrenheit)
--   measurementSystem: "metric", "imperial", or "us"
--   densityUnit: "sg", "brix", "plato", etc.
--
-- Formats:
--   dateFormat: "iso" (YYYY-MM-DD), "us" (MM/DD/YYYY), "uk" (DD/MM/YYYY)
--   timeFormat: "24h" or "12h"
--
-- Display:
--   theme: "light", "dark", "auto"
--   language: "en", "de", etc. (future use)
--
-- Defaults are set based on browser locale on first load
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS userSettings (
  settingsID        INTEGER PRIMARY KEY DEFAULT 1,
  temperatureUnit   TEXT NOT NULL DEFAULT 'c',
  measurementSystem TEXT NOT NULL DEFAULT 'metric',
  densityUnit       TEXT NOT NULL DEFAULT 'sg',
  dateFormat        TEXT NOT NULL DEFAULT 'iso',
  timeFormat        TEXT NOT NULL DEFAULT '24h',
  theme             TEXT NOT NULL DEFAULT 'dark',
  language          TEXT NOT NULL DEFAULT 'en',
  currencySymbol    TEXT DEFAULT '€',
  CHECK (settingsID = 1),
  CHECK (temperatureUnit IN ('c', 'f')),
  CHECK (measurementSystem IN ('metric', 'imperial', 'us')),
  CHECK (dateFormat IN ('iso', 'us', 'uk')),
  CHECK (timeFormat IN ('24h', '12h')),
  CHECK (theme IN ('light', 'dark', 'auto'))
);

-- Insert default settings
INSERT OR IGNORE INTO userSettings (settingsID) VALUES (1);

-- =============================================================================
-- BREWCODE SEED DATA (COMPLETE REFACTOR)
-- =============================================================================
-- This seed data is designed to:
-- 1. Establish a working foundation for a new brewcode database
-- 2. Avoid duplicate entries and referential integrity issues
-- 3. Support wine, mead, cider, and beer recipe creation
-- 4. Use a simplified, maintainable structure
-- =============================================================================

-- =============================================================================
-- FOUNDATION: ITEM CATEGORIES
-- =============================================================================
-- Purpose: High-level grouping for all items (ingredients & supplies)
-- Note: sortOrder has gaps to allow insertion later without reordering
-- Note: CategoryID values are sequential (1-12) based on insert order
-- =============================================================================

INSERT OR IGNORE INTO itemCategories (name, description, sortOrder) VALUES 
  -- INGREDIENTS (consumables used IN the beverage)
  ('Water', 'Brewing water for fermentation and dilution', 1),
  ('Fruits & Juices', 'Fresh or processed fruits used in fermentation', 2),
  ('Grains & Malts', 'Base malts, specialty malts, and adjunct grains', 3),
  ('Honeys, Syrups & Sugars', 'Sweeteners of various types', 4),
  ('Flavorants', 'Spices, herbs, woods, and extracts', 5),
  ('Hops', 'Hop varieties for bitterness, flavour, and aroma', 6),
  ('Additives', 'Nutrients, salts, stabilisers, fining agents', 7),
  ('Yeasts & Microbes', 'Yeast strains and microbial cultures', 8),
  
  -- SUPPLIES (consumables used FOR ingrediention, not in beverage)
  ('Cleaners & Sanitizers', 'Cleaning and sanitising agents', 20),
  ('Bottles & Vessels', 'Glass or plastic bottles and kegs for packaging', 21),
  ('Closures', 'Corks, caps, screw caps for sealing', 22),
  ('Packaging Materials', 'Labels, carriers, boxes, shrink capsules', 23);

-- =============================================================================
-- FOUNDATION: USAGE CONTEXTS
-- =============================================================================
-- Purpose: Define how ingredients can be used in recipe stages
-- Note: These are intentionally fixed contextID values to match stage validation
-- =============================================================================

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
(10, 'packaging', 'Used to package the final beverage'),
(11, 'fermenter', 'Yeast or microbes that perform fermentation'),
(12, 'malolactic', 'Lactic acid bacteria for malolactic fermentation'),
(13, 'stabiliser', 'Prevents fermentation restart after fermentation');

-- =============================================================================
-- FOUNDATION: STAGE TYPES
-- =============================================================================
-- Purpose: Define standardized stages in fermentation workflow
-- Note: isRequired=1 means stage must be in every recipe
-- =============================================================================

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

-- =============================================================================
-- CATEGORY ALLOWED CONTEXTS
-- =============================================================================
-- Purpose: Define which contexts are valid for each ingredient/supply category
-- CategoryID Reference:
--   1=Water, 2=Fruits & Juices, 3=Grains & Malts, 4=Honeys Syrups Sugars
--   5=Flavorants, 6=Hops, 7=Additives, 8=Yeasts & Microbes
--   9=Cleaners & Sanitizers, 10=Bottles & Vessels, 11=Closures, 12=Packaging Materials
-- =============================================================================

INSERT OR IGNORE INTO categoryAllowedContexts (categoryID, contextID) VALUES
  -- Water: fermentable (primary base) and salt (water chemistry)
  (1, 1), (1, 5),
  -- Fruits & Juices: fermentable and primer
  (2, 1), (2, 2),
  -- Grains & Malts: fermentable and primer
  (3, 1), (3, 2),
  -- Honeys, Syrups & Sugars: fermentable and primer
  (4, 1), (4, 2),
  -- Flavorants: nonfermentable
  (5, 3),
  -- Hops: nonfermentable
  (6, 3),
  -- Yeasts & Microbes: fermenter and malolactic
  (8, 11), (8, 12),
  -- Additives: nutrient, salt, stabiliser, prefermentation-treatment, fining
  (7, 4), (7, 5), (7, 13), (7, 8), (7, 9),
  -- Cleaners & Sanitizers: cleaner and sanitiser
  (9, 6), (9, 7),
  -- Bottles & Vessels: packaging
  (10, 10),
  -- Closures: packaging
  (11, 10),
  -- Packaging Materials: packaging
  (12, 10);

-- =============================================================================
-- STAGE TYPE ALLOWED CONTEXTS
-- =============================================================================
-- Purpose: Define which contexts are valid for each stage type
-- =============================================================================

INSERT OR IGNORE INTO stageTypeAllowedContexts (stageTypeID, contextID) VALUES
  -- Must Preparation: fermentable, salt, nutrient, prefermentation-treatment, nonfermentable
  (1, 1), (1, 5), (1, 4), (1, 8), (1, 3),
  -- Fermentation: fermenter, nutrient
  (2, 11), (2, 4),
  -- Malolactic Fermentation: malolactic
  (3, 12),
  -- Stabilisation: stabiliser
  (4, 13),
  -- Flavor Adjustment: fermentable, nonfermentable
  (5, 1), (5, 3),
  -- Clarification & Aging: fining
  (6, 9),
  -- Priming: primer
  (7, 2),
  -- Packaging: packaging
  (8, 10);

-- =============================================================================
-- INGREDIENT TYPES
-- =============================================================================
-- Purpose: Generic ingredient types that recipes reference
-- Note: beverageTypes is JSON array of compatible beverage types
-- CategoryID Reference:
--   1=Water, 2=Fruits & Juices, 3=Grains & Malts, 4=Honeys Syrups Sugars
--   5=Flavorants, 6=Hops, 7=Additives, 8=Yeasts & Microbes
-- =============================================================================

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired) VALUES
  -- Water (primary for all beverages)
  (1, 'Water', 'Brewing water for fermentation and dilution', '["Mead", "Beer", "Cider", "Wine"]', 0),
  
  -- Fruits & Juices (primary fermentables for cider/wine/perry)
  (2, 'Apple Juice', 'Any apple juice (filtered or unfiltered)', '["Cider"]', 1),
  (2, 'Pear Juice', 'Pear juice for perry or blended ciders', '["Perry", "Cider"]', 1),
  (2, 'Grape Juice (Concord)', 'Concord grape juice for wine', '["Wine"]', 1),
  (2, 'Grape Juice (Muscadine)', 'Muscadine grape juice for wine', '["Wine"]', 1),
  (2, 'Blackberry', 'Fresh or frozen blackberries for fruit wines', '["Wine"]', 0),
  
  -- Grains & Malts (for beer, or adjuncts for other beverages)
  (3, 'Pale Malt', 'Base malt for pale ales and lagers', '["Beer"]', 1),
  (3, 'Munich Malt', 'Base malt with mild bread/biscuit character', '["Beer"]', 1),
  (3, 'Chocolate Malt', 'Roasted malt for color and chocolate notes', '["Beer"]', 0),
  (3, 'Caramel Malt (20L)', 'Crystal malt for sweetness and body', '["Beer"]', 0),
  
  -- Honeys (primary fermentables for mead)
  (4, 'Honey: Wildflower', 'Mixed floral honey - most common for mead', '["Mead", "Melomel"]', 1),
  (4, 'Honey: Orange Blossom', 'Orange blossom honey - mild, citrus notes', '["Mead", "Melomel"]', 1),
  (4, 'Honey: Buckwheat', 'Buckwheat honey - strong, molasses-like flavor', '["Mead", "Melomel"]', 1),
  
  -- Sugars & Adjuncts (never primary, used for boosting/priming)
  (4, 'Table Sugar (Sucrose)', 'White table sugar for boosting ABV or priming', '["Mead", "Cider", "Wine", "Beer"]', 0),
  (4, 'Dextrose (Corn Sugar)', 'Corn sugar - 100% fermentable, ideal for priming', '["Mead", "Cider", "Wine", "Beer"]', 0),
  
  -- Flavorants
  (5, 'Ginger Root', 'Fresh or dried ginger for spice character', '["Mead", "Cider", "Wine"]', 0),
  (5, 'Cinnamon', 'Cinnamon bark or powder for warm spice notes', '["Mead", "Cider", "Wine"]', 0),
  (5, 'Oak Chips', 'Oak for aging character and vanilla/oak notes', '["Wine", "Mead"]', 0),
  
  -- Hops (for beer, sometimes used in mead)
  (6, 'Cascade Hops', 'American hop with floral/citrus notes', '["Beer"]', 0),
  (6, 'Saaz Hops', 'Noble hop with spicy/herbal character', '["Beer"]', 0),
  
  -- Yeasts (generic types, not specific strains)
  (8, 'Wine Yeast', 'Wine yeast', '["Wine", "Mead", "Cider"]', 0),
  (8, 'Ale Yeast', 'Ale yeast - clean, crisp, reliable', '["Beer"]', 0),
  (8, 'Cider Yeast', 'Champagne yeast - high tolerance, neutral', '["Wine", "Mead", "Cider"]', 0),
  (8, 'Lager Yeast', 'Lager yeast - clean, malty', '["Beer"]', 0),
  (8, 'Champagne Yeast', 'High alcohol tolerance, neutral profile', '["Wine", "Mead", "Cider"]', 0),
  (8, 'Mead Yeast', 'Specialized yeast for mead fermentation', '["Mead"]', 0),
  
  -- Microbes (for malolactic fermentation)
  (8, 'Lactic Acid Bacteria (LAB)', 'Malolactic bacteria - converts malic to lactic acid', '["Wine", "Cider"]', 0),
  
  -- Additives
  (7, 'Potassium Metabisulfite (K-Meta)', 'Pre-fermentation antiseptic and post-fermentation stabiliser', NULL, 0),
  (7, 'Campden Tablets', 'Potassium metabisulfite tablets for must treatment', NULL, 0),
  (7, 'Potassium Sorbate', 'Post-fermentation stabiliser - prevents yeast reinitiation', NULL, 0),
  (7, 'Yeast Nutrient', 'DAP and other nutrients for strong fermentation', NULL, 0);

-- =============================================================================
-- INGREDIENT TYPE CONTEXTS
-- =============================================================================
-- Purpose: Define which contexts (usage methods) apply to each ingredient
-- ContextID Reference:
--   1=fermentable, 2=primer, 3=nonfermentable, 4=nutrient, 5=salt
--   6=cleaner, 7=sanitiser, 8=prefermentation-treatment, 9=fining
--   10=packaging, 11=fermenter, 12=malolactic, 13=stabiliser
-- =============================================================================

INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, 1 FROM ingredientTypes it WHERE it.name IN (
  'Water', 'Apple Juice', 'Pear Juice', 'Grape Juice (Concord)', 'Grape Juice (Muscadine)',
  'Pale Malt', 'Munich Malt', 'Chocolate Malt', 'Caramel Malt (20L)',
  'Honey: Wildflower', 'Honey: Orange Blossom', 'Honey: Buckwheat',
  'Table Sugar (Sucrose)', 'Dextrose (Corn Sugar)'
)
UNION ALL
SELECT it.ingredientTypeID, 2 FROM ingredientTypes it WHERE it.name IN (
  'Apple Juice', 'Pear Juice', 'Grape Juice (Concord)', 'Grape Juice (Muscadine)',
  'Pale Malt', 'Munich Malt', 'Chocolate Malt', 'Caramel Malt (20L)',
  'Honey: Wildflower', 'Honey: Orange Blossom', 'Honey: Buckwheat',
  'Table Sugar (Sucrose)', 'Dextrose (Corn Sugar)'
)
UNION ALL
SELECT it.ingredientTypeID, 3 FROM ingredientTypes it WHERE it.name IN (
  'Ginger Root', 'Cinnamon', 'Oak Chips', 'Cascade Hops', 'Saaz Hops'
)
UNION ALL
SELECT it.ingredientTypeID, 5 FROM ingredientTypes it WHERE it.name = 'Water'
UNION ALL
SELECT it.ingredientTypeID, 4 FROM ingredientTypes it WHERE it.name = 'Yeast Nutrient'
UNION ALL
SELECT it.ingredientTypeID, 8 FROM ingredientTypes it WHERE it.name IN (
  'Potassium Metabisulfite (K-Meta)', 'Campden Tablets'
)
UNION ALL
SELECT it.ingredientTypeID, 13 FROM ingredientTypes it WHERE it.name IN (
  'Potassium Metabisulfite (K-Meta)', 'Campden Tablets', 'Potassium Sorbate'
)
UNION ALL
SELECT it.ingredientTypeID, 11 FROM ingredientTypes it WHERE it.name IN (
  'Lalvin 71B-1122', 'Lalvin QA23', 'Wyeast 1118 Champagne',
  'SafAle S-04', 'Wyeast 2001 California Lager', 'Lalvin EC-1118'
)
UNION ALL
SELECT it.ingredientTypeID, 12 FROM ingredientTypes it WHERE it.name = 'Lactic Acid Bacteria (LAB)';

-- =============================================================================
-- SUPPLY TYPES
-- =============================================================================
-- Purpose: Generic supply types for consumables used FOR ingrediention
-- CategoryID Reference:
--   9=Cleaners & Sanitizers, 10=Bottles & Vessels, 11=Closures, 12=Packaging Materials
-- =============================================================================

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description) VALUES
  -- Cleaners & Sanitizers
  (9, 'Sanitizer (No-Rinse Acid)', 'Acid-based no-rinse sanitiser like Star San'),
  (9, 'Cleaner (PBW)', 'Powdered Brewery Wash - alkaline cleaner'),
  (9, 'Potassium Metabisulfite', 'K-Meta used for sanitizing equipment'),
  
  -- Bottles & Vessels
  (10, 'Bottle (750ml Glass)', '750ml glass wine bottle'),
  (10, 'Bottle (12oz Glass)', '12oz standard beer bottle'),
  (10, 'Keg (5 Gallon)', '5 gallon Cornelius-style keg'),
  (10, 'Barrel (5 Gallon Oak)', '5 gallon wooden barrel for aging'),
  
  -- Closures
  (11, 'Cork (Standard #9)', 'Standard #9 straight cork for wine'),
  (11, 'Crown Cap (#26)', '#26 crown cap for beer bottles'),
  (11, 'Screw Cap (Plastic Lined)', 'Screw cap with plastic liner for wine'),
  
  -- Packaging Materials
  (12, 'Label (Self-Adhesive)', 'Self-adhesive wine or beer labels'),
  (12, 'Shrink Capsule (PVC)', 'Heat-shrink PVC capsules for wine bottles'),
  (12, 'Carrier Box (12 Bottle)', 'Box for carrying/storing 12 bottles');

-- =============================================================================
-- NOTES ON DUAL-PURPOSE ITEMS
-- =============================================================================
-- Some items serve both as ingredients and supplies:
--   - Potassium Metabisulfite (K-Meta): Used IN recipes AND FOR sanitizing
--   - Water: Used IN recipes AND FOR cleaning (if needed as supply)
--
-- These are handled via itemRoles:
--   1. Create a single item entry in 'items' table
--   2. Add TWO rows to itemRoles (one as 'ingredient', one as 'supply')
--
-- Example for K-Meta:
--   INSERT INTO items (brand, name, unit, notes) 
--   VALUES (NULL, 'Potassium Metabisulfite', 'g', 'Dual purpose: ingredient + sanitiser');
--   
--   INSERT INTO itemRoles (itemID, roleType, itemTypeID, categoryID)
--   VALUES 
--     (1, 'ingredient', <K-Meta ingredientTypeID>, 7),
--     (1, 'supply', <K-Meta supplyTypeID>, 9);
--
-- This allows tracking one physical item with one inventory lot,
-- but using it in multiple contexts.
-- =============================================================================
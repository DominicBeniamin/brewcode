-- =============================================================================
-- BREWCODE DATABASE SCHEMA (UPDATED)
-- =============================================================================
-- This database manages recipes, batches, ingredients, equipment, and inventory
-- for wine, mead, and cider production.
--
-- Key Concepts:
-- - RECIPES: Templates with stages and ingredient requirements
-- - BATCHES: Actual production runs following a recipe (snapshot at creation)
-- - CONSUMABLES: Items consumed during production (ingredients and supplies)
-- - EQUIPMENT: Reusable items (fermenters, carboys)
-- =============================================================================

PRAGMA foreign_keys = ON;

-- -----------------------------------------------------------------------------
-- Item Categories
-- -----------------------------------------------------------------------------
-- Defines high-level categories for all consumables (ingredients, supplies).
-- Examples: Fruits, Honeys, Yeasts, Bottles, Cleaners
-- 
-- Purpose: Groups items logically for UI navigation and filtering
-- Note: Categories determine which usage contexts are allowed
--
-- Hierarchy Position:
--   Role -> Category -> Type -> Subtype -> Consumable
--   Each category belongs to exactly one role (ingredient or supply)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS itemCategories (
  categoryID   INTEGER PRIMARY KEY AUTOINCREMENT,
  roleID       TEXT NOT NULL,              -- 'ingredient' or 'supply'
  name         TEXT NOT NULL UNIQUE,       -- Display name (e.g., "Fruits", "Yeasts")
  description  TEXT,                       -- Helpful explanation for users
  sortOrder    INTEGER DEFAULT 0,          -- Display order in UI (lower = first)
  hasBeenUsed  INTEGER DEFAULT 0           -- 1 = used in batches, locked from editing
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
-- Stage Type Capacity Rules
-- -----------------------------------------------------------------------------
-- Defines vessel capacity rules for each stage type.
-- Purpose: Prevent overfilling fermenters (safety) and guide best practices
--
-- recommendedMaxPercent: Show warning if exceeded (e.g., 80% for fermentation)
-- absoluteMaxPercent: Hard limit, cannot exceed (e.g., 100% - physics!)
-- allowMultipleVessels: 1 = can split batch across vessels, 0 = single vessel only
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stageTypeCapacityRules (
  stageTypeID           INTEGER PRIMARY KEY,
  recommendedMaxPercent REAL NOT NULL DEFAULT 80,
  absoluteMaxPercent    REAL NOT NULL DEFAULT 100,
  allowMultipleVessels  INTEGER DEFAULT 0,
  FOREIGN KEY (stageTypeID) REFERENCES stageTypes(stageTypeID)
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
  hasBeenUsed         INTEGER DEFAULT 0,       -- 1 = locked from major edits
  FOREIGN KEY (categoryID) REFERENCES itemCategories(categoryID)
);

-- -----------------------------------------------------------------------------
-- Ingredient Subtypes
-- -----------------------------------------------------------------------------
-- Defines optional subtypes within ingredient types for more specific categorization.
-- Examples: 
--   - Type "Honey" -> Subtypes: "Wildflower", "Orange Blossom", "Clover"
--   - Type "Grape" -> Subtypes: "Merlot", "Chardonnay", "Cabernet Sauvignon"
--   - Type "Wine Yeast" -> Subtypes: "Red Wine Yeast", "White Wine Yeast"
--
-- Purpose: Allows recipes to specify at different levels of granularity:
--   - Recipe wants "any honey" -> specifies Type only (accepts all subtypes)
--   - Recipe wants "Orange Blossom honey" -> specifies Subtype (more specific)
--
-- Inheritance: Subtypes inherit beverageTypes and other properties from parent Type
-- Optional: Not all types need subtypes (e.g., "Water" doesn't need varieties)
-- Note: Supply types do NOT have subtypes (only ingredients need this specificity)
--
-- UNIQUE(ingredientTypeID, name): Prevents duplicate subtype names within same type
--   Example: Can't have two "Wildflower" subtypes under "Honey"
--   But CAN have "Red" under both "Wine Yeast" and "Apple" (different parent types)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingredientSubtypes (
  ingredientSubtypeID INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredientTypeID    INTEGER NOT NULL,
  name                TEXT NOT NULL,
  isActive            INTEGER DEFAULT 1,        -- 1 = active, 0 = deprecated
  createdAt           TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt           TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ingredientTypeID) REFERENCES ingredientTypes(ingredientTypeID) ON DELETE CASCADE,
  UNIQUE(ingredientTypeID, name)
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
  hasBeenUsed     INTEGER DEFAULT 0,          -- 1 = locked from major edits
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
  calibrationTemp     REAL,                  -- Calibration temperature (if applicable)
  calibrationTempUnit TEXT                   -- "c" or "f" (if applicable)
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
--   - Apple Juice -> contexts: fermentable, primer
--     ✓ Can use in Must Preparation (accepts fermentable)
--     ✓ Can use in Priming (accepts primer)
--     ✗ Cannot use in Stabilisation (needs stabiliser context)
--
--   - Potassium Sorbate -> context: stabiliser
--     ✓ Can use in Stabilisation
--     ✗ Cannot use in Must Preparation (not fermentable)
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
-- Consumables
-- -----------------------------------------------------------------------------
-- Tracks all physical consumables in inventory (ingredients and supplies).
-- Consumables represent actual products that can be purchased, tracked, and used.
--
-- Role Determination:
--   - Ingredient-only: ingredientTypeID set, supplyTypeID NULL
--   - Supply-only: supplyTypeID set, ingredientTypeID NULL
--   - Dual-purpose: Both ingredientTypeID and supplyTypeID set
--
-- Type Hierarchy:
--   Consumable -> Type -> Category -> Role
--   Example: "Nature Nate's Wildflower Honey" -> Honey -> Honeys, Syrups & Sugars -> Ingredient
--
-- Subtypes (Optional):
--   Consumables can optionally specify a subtype for more granular categorization
--   Example: Type "Honey" with Subtype "Wildflower"
--   If no subtype exists or applies, ingredientSubtypeID is NULL
--   Subtypes only apply to ingredients (supplies don't use subtypes)
--
-- Inventory Tracking:
--   onDemand = 0: Track stock levels via inventoryLots (default)
--   onDemand = 1: Buy/make as needed, use onDemandPrice for cost calculations
--
-- Stock Alerts:
--   reorderPoint: Threshold for low stock notifications (NULL if onDemand)
--   autoAlert: Enable/disable notifications for this item
--
-- brand: NULL for homemade or generic items
-- unit: Primary unit of measure (g, L, count, etc.)
--
-- hasBeenUsed: 1 = locked from major edits (type/category changes)
--   - Can still edit: brand, name, notes (cosmetic)
--   - Cannot edit: types, subtypes, unit (structural)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumables (
  consumableID          INTEGER PRIMARY KEY AUTOINCREMENT,
  brand                 TEXT,                     -- NULL for homemade/generic
  name                  TEXT NOT NULL,            -- User-defined name
  unit                  TEXT NOT NULL,            -- How measured: "g", "L", "count", etc.
  ingredientTypeID      INTEGER,                  -- FK to ingredientTypes (required if ingredient role)
  ingredientSubtypeID   INTEGER,                  -- FK to ingredientSubtypes (optional, NULL if no subtype)
  supplyTypeID          INTEGER,                  -- FK to supplyTypes (required if supply role)
  onDemand              INTEGER DEFAULT 0,        -- 1 = buy/make as needed, 0 = track stock
  onDemandPrice         REAL,                     -- Cost for the quantity in onDemandPriceQty
  onDemandPriceQty      REAL,                     -- Quantity that price applies to
  reorderPoint          REAL,                     -- When to reorder/make more
  reorderQuantity       REAL,                     -- How much to reorder/make
  autoAlert             INTEGER DEFAULT 1,        -- 1 = notify when below reorderPoint
  notes                 TEXT,                     -- User notes
  isActive              INTEGER DEFAULT 1,        -- 1 = available, 0 = discontinued
  hasBeenUsed           INTEGER DEFAULT 0,        -- 1 = locked from structural edits
  createdDate           TEXT DEFAULT (DATE('now')),
  modifiedDate          TEXT DEFAULT (DATE('now')),
  FOREIGN KEY (ingredientTypeID) REFERENCES ingredientTypes(ingredientTypeID) ON DELETE SET NULL,
  FOREIGN KEY (ingredientSubtypeID) REFERENCES ingredientSubtypes(ingredientSubtypeID) ON DELETE SET NULL,
  FOREIGN KEY (supplyTypeID) REFERENCES supplyTypes(supplyTypeID) ON DELETE SET NULL,
  CHECK (ingredientTypeID IS NOT NULL OR supplyTypeID IS NOT NULL)  -- At least one role required
);

-- -----------------------------------------------------------------------------
-- Consumable Properties: Yeast
-- -----------------------------------------------------------------------------
-- Stores yeast-specific properties for fermentation planning.
--
-- alcoholTolerance: Maximum ABV the yeast can handle (5-25%)
-- tempRangeMin/Max: Optimal fermentation temperature range (stored in Celsius)
-- flocculation: How well yeast settles after fermentation
-- attenuation: Percentage of sugars typically consumed (50-100%)
--
-- All fields are optional - user may not have manufacturer specs
-- All fields are editable - user can correct errors
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumablePropertiesYeast (
  consumableID        INTEGER PRIMARY KEY,
  alcoholTolerance    REAL CHECK(alcoholTolerance IS NULL OR (alcoholTolerance BETWEEN 5 AND 25)),
  tempRangeMin        REAL CHECK(tempRangeMin IS NULL OR (tempRangeMin BETWEEN 0 AND 40)),
  tempRangeMax        REAL CHECK(tempRangeMax IS NULL OR (tempRangeMax BETWEEN 0 AND 40)),
  flocculation        TEXT CHECK(flocculation IS NULL OR flocculation IN ('low', 'medium', 'high')),
  attenuation         REAL CHECK(attenuation IS NULL OR (attenuation BETWEEN 50 AND 100)),
  FOREIGN KEY (consumableID) REFERENCES consumables(consumableID) ON DELETE CASCADE,
  CHECK(tempRangeMin IS NULL OR tempRangeMax IS NULL OR tempRangeMax >= tempRangeMin)
);

-- -----------------------------------------------------------------------------
-- Consumable Properties: Fermentable
-- -----------------------------------------------------------------------------
-- Stores properties for fermentable ingredients (honey, juice, malt, sugar).
--
-- density: Specific gravity (1.0-2.0) - used to calculate potential ABV
-- sugarContentPercent: Sugar by weight (0-100%) - alternative to density
-- acidity: pH value (0-14) - track must acidity
-- colorSRM: Color in SRM units - mainly for malt, NULL for honey/juice
--
-- All fields are optional and editable
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumablePropertiesFermentable (
  consumableID        INTEGER PRIMARY KEY,
  density             REAL CHECK(density IS NULL OR (density BETWEEN 1.0 AND 2.0)),
  sugarContentPercent REAL CHECK(sugarContentPercent IS NULL OR (sugarContentPercent BETWEEN 0 AND 100)),
  acidity             REAL CHECK(acidity IS NULL OR (acidity BETWEEN 0 AND 14)),
  colorSRM            REAL CHECK(colorSRM IS NULL OR colorSRM >= 0),
  FOREIGN KEY (consumableID) REFERENCES consumables(consumableID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Consumable Properties: Hops
-- -----------------------------------------------------------------------------
-- Stores hop-specific properties for bitterness and aroma calculations.
--
-- alphaAcid: Alpha acid percentage (0-30%) - determines bitterness potential
-- betaAcid: Beta acid percentage (0-30%) - affects aroma and stability
-- hopType: Usage category - helps users select appropriate hops
--
-- All fields are optional and editable
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumablePropertiesHops (
  consumableID        INTEGER PRIMARY KEY,
  alphaAcid           REAL CHECK(alphaAcid IS NULL OR (alphaAcid BETWEEN 0 AND 30)),
  betaAcid            REAL CHECK(betaAcid IS NULL OR (betaAcid BETWEEN 0 AND 30)),
  hopType             TEXT CHECK(hopType IS NULL OR hopType IN ('bittering', 'aroma', 'dual-purpose')),
  FOREIGN KEY (consumableID) REFERENCES consumables(consumableID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Consumable Properties: Water
-- -----------------------------------------------------------------------------
-- Stores water chemistry profile for brewing calculations.
--
-- All mineral values in ppm (parts per million)
-- pH: Water pH value (0-14)
--
-- Purpose: Water chemistry significantly affects final beverage character
-- Example: High sulfate-to-chloride ratio enhances hop bitterness
--
-- All fields are optional and editable
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumablePropertiesWater (
  consumableID        INTEGER PRIMARY KEY,
  calcium             REAL CHECK(calcium IS NULL OR calcium >= 0),
  magnesium           REAL CHECK(magnesium IS NULL OR magnesium >= 0),
  sodium              REAL CHECK(sodium IS NULL OR sodium >= 0),
  chloride            REAL CHECK(chloride IS NULL OR chloride >= 0),
  sulfate             REAL CHECK(sulfate IS NULL OR sulfate >= 0),
  bicarbonate         REAL CHECK(bicarbonate IS NULL OR bicarbonate >= 0),
  pH                  REAL CHECK(pH IS NULL OR (pH BETWEEN 0 AND 14)),
  FOREIGN KEY (consumableID) REFERENCES consumables(consumableID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Consumable Properties: Bottle
-- -----------------------------------------------------------------------------
-- Stores bottle specifications for packaging planning.
--
-- capacityML: Volume in milliliters (750, 330, 500, etc.)
-- glassColor: UV protection level ('Clear', 'Green', 'Brown', 'Blue')
--
-- Compatible closures are defined separately in bottleCompatibleClosures table
-- This allows bottles to be added before closures exist
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumablePropertiesBottle (
  consumableID        INTEGER PRIMARY KEY,
  capacityML          REAL CHECK(capacityML IS NULL OR capacityML > 0),
  glassColor          TEXT,
  FOREIGN KEY (consumableID) REFERENCES consumables(consumableID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Consumable Properties: Closure
-- -----------------------------------------------------------------------------
-- Stores closure specifications for bottle compatibility.
--
-- closureType: Main category ('Cork', 'Crown Cap', 'Screw Cap', 'Swing-top')
-- closureSize: Specific size ('24mm x 45mm', '26mm', '28mm')
--
-- Purpose: Helps users identify which closures fit which bottles
-- Compatibility is defined in bottleCompatibleClosures junction table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumablePropertiesClosure (
  consumableID        INTEGER PRIMARY KEY,
  closureType         TEXT,
  closureSize         TEXT,
  FOREIGN KEY (consumableID) REFERENCES consumables(consumableID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Bottle Compatible Closures (Many-to-Many)
-- -----------------------------------------------------------------------------
-- Links bottles to closures that fit them.
--
-- Purpose: Track which closures work with which bottles
-- User workflow:
--   1. Add bottles (no closures required initially)
--   2. Add closures (no bottles required initially)
--   3. Link them together (edit at any time)
--
-- Example:
--   Bordeaux 750ml accepts: Cork 24mm x 45mm
--   Champagne 750ml accepts: Cork 24mm x 45mm AND Crown Cap 26mm
--
-- Optional and fully editable - users can update compatibility anytime
-- Deleting bottle/closure removes compatibility mappings (CASCADE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bottleCompatibleClosures (
  bottleConsumableID   INTEGER NOT NULL,
  closureConsumableID  INTEGER NOT NULL,
  PRIMARY KEY (bottleConsumableID, closureConsumableID),
  FOREIGN KEY (bottleConsumableID) REFERENCES consumables(consumableID) ON DELETE CASCADE,
  FOREIGN KEY (closureConsumableID) REFERENCES consumables(consumableID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Recipe Stages
-- -----------------------------------------------------------------------------
-- Defines the workflow stages for each recipe.
-- Each recipe is composed of ordered stages (Must Preparation -> Fermentation -> etc.)
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
-- Links to generic ingredientTypes (not specific consumables).
--
-- Type Hierarchy in Recipes:
--   Recipes specify requirements at the Type or Subtype level:
--   - Type only: "Any Honey" (accepts all honey subtypes)
--   - Type + Subtype: "Orange Blossom Honey" (specific subtype required)
--   - Type + Multiple Subtypes: Use recipeIngredientAlternatives for OR logic
--
-- ingredientTypeID: Links to generic ingredient type (e.g., "Honey", "Apple")
--   - NOT a specific consumable (e.g., "Nature Nate's Wildflower Honey")
--   - Users select specific consumables when starting a batch
--
-- ingredientSubtypeID: Optional subtype specification
--   - NULL = any subtype of this type is acceptable
--   - Set = only consumables with this specific subtype are acceptable
--
-- scalingMethod: How ingredient scales when batch size changes
--   - "linear": Scale proportionally (5L juice for 10L batch -> 10L for 20L batch)
--   - "fixed": Always same amount (1 yeast packet regardless of batch size)
--   - "step": Scale in steps using stepMinBatchSize/stepMaxBatchSize ranges
--
-- stepMinBatchSize/stepMaxBatchSize: For step scaling only
--   Example: Yeast packet covers 4.5L-23L (1 packet)
--            23.1L-46L needs 2 packets, etc.
--
-- ON DELETE CASCADE: If recipe stage deleted, remove its ingredients
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipeIngredients (
  recipeIngredientID  INTEGER PRIMARY KEY AUTOINCREMENT,
  stageID             INTEGER NOT NULL,
  ingredientTypeID    INTEGER NOT NULL,
  ingredientSubtypeID INTEGER,                            -- NULL = any subtype acceptable
  amount              REAL NOT NULL,
  unit                TEXT NOT NULL,
  scalingMethod       TEXT NOT NULL DEFAULT 'linear',     -- linear, fixed, step
  stepMinBatchSize    REAL,                               -- For step scaling: min batch size
  stepMaxBatchSize    REAL,                               -- For step scaling: max batch size
  preferredVariant    TEXT,                               -- Optional: specific strain/variety recommendation
  notes               TEXT,                               -- Usage notes, substitutions
  FOREIGN KEY (stageID) REFERENCES recipeStages(stageID) ON DELETE CASCADE,
  FOREIGN KEY (ingredientTypeID) REFERENCES ingredientTypes(ingredientTypeID),
  FOREIGN KEY (ingredientSubtypeID) REFERENCES ingredientSubtypes(ingredientSubtypeID) ON DELETE SET NULL
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
--   - active: In progress (any stage from Must Prep -> Packaging)
--   - completed: Successfully finished all stages
--   - abandoned: Stopped before completion
-- currentStageID: Links to batchStages (which stage is active)
-- abandonReason: Why batch was abandoned (infection, off-flavour, accident)
-- canArchive: 1 = old enough to archive (completed/abandoned >3 months ago)
--
-- ON DELETE SET NULL: If recipe deleted, keep batch but nullify recipeID
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batches (
  batchID           INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  recipeID          INTEGER,
  recipeName        TEXT NOT NULL,              -- Snapshot of recipe name
  actualBatchSizeL  REAL NOT NULL,
  startDate         TEXT,                       -- NULL if status='planned'
  endDate           TEXT,                       -- When completed or abandoned
  currentStageID    INTEGER,                    -- FK to batchStages
  status            TEXT NOT NULL DEFAULT 'planned',  -- planned, active, completed, abandoned
  abandonReason     TEXT,                       -- Why abandoned (if applicable)
  notes             TEXT,                       -- General batch notes
  canArchive        INTEGER DEFAULT 0,          -- 1 = eligible for archiving
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
-- startingVolumeL: Volume at start of stage (for tracking loss)
-- endingVolumeL: Volume at end of stage (for tracking loss)
--   lossVolumeL is calculated: startingVolumeL - endingVolumeL
-- allowMultipleAdditions: 1 = allows step feeding of ingredients in a stage
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
  startingVolumeL     REAL,                       -- Volume at start
  endingVolumeL       REAL,                       -- Volume at end
  allowMultipleAdditions INTEGER DEFAULT 0,       -- Allows step feeding
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
-- Hierarchy: batch -> batchStage -> batchIngredients
--   Example: Cider batch, Must Preparation stage, needs 5L Apple Juice
--
-- Type and Subtype Snapshots:
--   When a batch is created, recipe requirements are copied here:
--   - ingredientTypeID/Name: Generic type from recipe (e.g., "Honey")
--   - ingredientSubtypeID/Name: Specific subtype from recipe (e.g., "Wildflower")
--   - Names are preserved even if types/subtypes are renamed or deleted
--
-- Consumable Selection:
--   User selects specific consumable that matches the type/subtype requirements:
--   - consumableID: The actual consumable used (e.g., "Nature Nate's Wildflower Honey")
--   - consumableName: Snapshot preserved if consumable is deleted
--
-- Planned vs Actual:
--   plannedAmount/Unit: From recipe, scaled to actual batch size
--     Example: Recipe says 3kg for 5L batch, user makes 10L -> planned: 6kg
--   actualAmount/Unit: What user actually used (may differ)
--     Example: User had 6.2kg available, used it all -> actual: 6.2kg
--
-- Subtype Validation:
--   If recipe specified a subtype (ingredientSubtypeID not NULL):
--     -> User must select a consumable with matching subtype
--   If recipe didn't specify subtype (ingredientSubtypeID is NULL):
--     -> User can select any consumable of that type, regardless of subtype
--
-- inventoryLotID: Optional link to inventory for FIFO tracking
--
-- ON DELETE CASCADE (batchStageID): If stage deleted, remove ingredients
-- ON DELETE SET NULL (consumableID): If consumable deleted, keep snapshot name
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batchIngredients (
  batchIngredientID     INTEGER PRIMARY KEY AUTOINCREMENT,
  batchStageID          INTEGER NOT NULL,
  ingredientTypeID      INTEGER NOT NULL,
  ingredientTypeName    TEXT NOT NULL,               -- Snapshot
  ingredientSubtypeID   INTEGER,                     -- NULL if no subtype specified in recipe
  ingredientSubtypeName TEXT,                        -- Snapshot (NULL if no subtype)
  consumableID          INTEGER,                     -- Specific consumable used
  consumableName        TEXT,                        -- Snapshot
  plannedAmount         REAL NOT NULL,
  plannedUnit           TEXT NOT NULL,
  actualAmount          REAL,
  actualUnit            TEXT,
  inventoryLotID        INTEGER,
  notes                 TEXT,
  FOREIGN KEY (batchStageID) REFERENCES batchStages(batchStageID) ON DELETE CASCADE,
  FOREIGN KEY (ingredientTypeID) REFERENCES ingredientTypes(ingredientTypeID),
  FOREIGN KEY (ingredientSubtypeID) REFERENCES ingredientSubtypes(ingredientSubtypeID) ON DELETE SET NULL,
  FOREIGN KEY (consumableID) REFERENCES consumables(consumableID) ON DELETE SET NULL,
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
--   Day 0: SG 1.100, temp 20°C -> "Pitched yeast"
--   Day 3: SG 1.080, temp 22°C -> "Fermentation active, krausen forming"
--   Day 14: SG 1.000, taste -> "Dry, clean finish, ready to package"
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
-- Volume Tracking:
--   volumeL: How much liquid volume is in this vessel (NULL for non-vessels)
--   Purpose: Track splits when batch is divided across multiple vessels
--   Validation: SUM(volumeL) for all equipment in stage = stage startingVolumeL
--
-- Workflow:
--   1. User starts stage -> assign equipment -> status: "in-use"
--   2. Stage progresses -> equipment remains "in-use"
--   3. User completes stage -> release equipment -> status: "available"
--
-- inUseDate: When equipment assigned to this stage (auto-set if not provided)
-- releaseDate: When equipment freed from this stage (NULL while still in use)
-- status: Current state
--   - "in-use": Currently assigned to this stage
--   - "available": Freed and ready for reassignment
--
-- Multiple Equipment Per Stage:
--   One stage can have multiple equipment records
--   Example: Fermentation stage uses both fermenter + TILT monitor
--   Example: Aging stage split into 2 carboys (12L + 8L = 20L total)
--
-- ON DELETE CASCADE: If equipment or batch stage deleted, remove usage records
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipmentUsage (
  usageID             INTEGER PRIMARY KEY AUTOINCREMENT,
  equipmentID         INTEGER NOT NULL,
  batchStageID        INTEGER NOT NULL,
  volumeL             REAL,                                     -- Volume in this vessel (NULL for non-vessels)
  inUseDate           TEXT NOT NULL DEFAULT (DATETIME('now')), -- When assigned
  releaseDate         TEXT,                                     -- NULL if still in use
  status              TEXT NOT NULL DEFAULT 'in-use',          -- "in-use", "available"
  FOREIGN KEY (equipmentID) REFERENCES equipment(equipmentID) ON DELETE CASCADE,
  FOREIGN KEY (batchStageID) REFERENCES batchStages(batchStageID) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Inventory Lots
-- -----------------------------------------------------------------------------
-- Tracks individual purchases/acquisitions of consumables.
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
--
-- FIFO Query Pattern:
--   SELECT * FROM inventoryLots 
--   WHERE consumableID = ? 
--   AND status = 'active'
--   AND quantityRemaining > 0
--   ORDER BY purchaseDate ASC
--
-- quantityPurchased: Original amount bought
-- quantityRemaining: Current amount left (decreases as used)
-- purchaseDate: When acquired (used for FIFO ordering)
-- expirationDate: NULL for non-perishable items
-- costPerUnit: Price paid per unit (for cost tracking and analytics)
-- supplier: Where purchased (compare suppliers over time)
-- canDelete: 0 = lot has been used in batches (locked), 1 = unused (can delete/dump)
--
-- ON DELETE CASCADE: If consumable deleted, remove inventory lots
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventoryLots (
  lotID               INTEGER PRIMARY KEY AUTOINCREMENT,
  consumableID        INTEGER NOT NULL,
  quantityPurchased   REAL NOT NULL,
  quantityRemaining   REAL NOT NULL,
  unit                TEXT NOT NULL,
  purchaseDate        TEXT NOT NULL,
  expirationDate      TEXT,
  costPerUnit         REAL,
  supplier            TEXT,
  status              TEXT NOT NULL DEFAULT 'active',
  canDelete           INTEGER DEFAULT 1,          -- 0 = used in batches, 1 = can delete
  notes               TEXT,
  FOREIGN KEY (consumableID) REFERENCES consumables(consumableID) ON DELETE CASCADE
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
--   abvMethod: "abv-basic", "abv-berry", "abv-hall", "abv-hmrc"
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
  abvMethod         TEXT NOT NULL DEFAULT 'abv-basic',
  dateFormat        TEXT NOT NULL DEFAULT 'iso',
  timeFormat        TEXT NOT NULL DEFAULT '24h',
  theme             TEXT NOT NULL DEFAULT 'dark',
  language          TEXT NOT NULL DEFAULT 'en',
  currencySymbol    TEXT DEFAULT '€',
  numberFormat      TEXT NOT NULL DEFAULT 'anglo',
  CHECK (settingsID = 1),
  CHECK (temperatureUnit IN ('c', 'f')),
  CHECK (measurementSystem IN ('metric', 'imperial', 'us')),
  CHECK (abvMethod IN ('abv-basic', 'abv-berry', 'abv-hall', 'abv-hmrc')),
  CHECK (dateFormat IN ('iso', 'us', 'uk')),
  CHECK (timeFormat IN ('24h', '12h')),
  CHECK (theme IN ('light', 'dark', 'auto')),
  CHECK (numberFormat IN ('anglo', 'continental', 'international'))
);

-- Insert default settings
INSERT OR IGNORE INTO userSettings (settingsID) VALUES (1);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Consumables: Filter by type
CREATE INDEX IF NOT EXISTS idx_consumables_ingredientType ON consumables(ingredientTypeID);
CREATE INDEX IF NOT EXISTS idx_consumables_supplyType ON consumables(supplyTypeID);

-- Inventory: FIFO queries (consumable + status + date)
CREATE INDEX IF NOT EXISTS idx_inventoryLots_fifo 
  ON inventoryLots(consumableID, status, purchaseDate);

-- Batches: Filter by status
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);

-- Batch Stages: Find by batch
CREATE INDEX IF NOT EXISTS idx_batchStages_batch ON batchStages(batchID);

-- Batch Ingredients: Group by stage
CREATE INDEX IF NOT EXISTS idx_batchIngredients_stage ON batchIngredients(batchStageID);

-- Equipment Usage: Check availability
CREATE INDEX IF NOT EXISTS idx_equipmentUsage_equipment_status 
  ON equipmentUsage(equipmentID, status);

-- =============================================================================
-- SEED DATA
-- =============================================================================

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
(10, 'packaging', 'Used to package the final beverage'),
(11, 'fermenter', 'Yeast or microbes that perform fermentation'),
(12, 'malolactic', 'Lactic acid bacteria for malolactic fermentation'),
(13, 'stabiliser', 'Prevents fermentation restart after fermentation');

-- Stage Types
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

-- Stage Type Capacity Rules
INSERT OR IGNORE INTO stageTypeCapacityRules VALUES
  (1, 80, 100, 0),  -- Must Preparation: warn 80%, block 100%, single vessel
  (2, 80, 100, 0),  -- Fermentation: warn 80%, block 100%, single vessel
  (3, 90, 100, 0),  -- Malolactic: warn 90%, block 100%, single vessel
  (4, 90, 100, 1),  -- Stabilisation: warn 90%, block 100%, can split
  (5, 90, 100, 1),  -- Flavor Adjustment: warn 90%, block 100%, can split
  (6, 90, 100, 1),  -- Clarification/Aging: warn 90%, block 100%, can split
  (7, 90, 100, 1),  -- Priming: warn 90%, block 100%, can split
  (8, 100, 100, 1); -- Packaging: no warning, block 100%, can split

-- Stage Type Allowed Contexts
INSERT OR IGNORE INTO stageTypeAllowedContexts (stageTypeID, contextID) VALUES
  -- Must Preparation
  (1, 1), (1, 5), (1, 4), (1, 8), (1, 3),
  -- Fermentation
  (2, 11), (2, 4),
  -- Malolactic Fermentation
  (3, 12),
  -- Stabilisation
  (4, 13),
  -- Flavor Adjustment
  (5, 1), (5, 3),
  -- Clarification & Aging
  (6, 9),
  -- Priming
  (7, 2),
  -- Packaging
  (8, 10);

-- Item Categories
INSERT OR IGNORE INTO itemCategories (roleID, name, description, sortOrder) VALUES 
  -- INGREDIENTS
  ('ingredient', 'Water', 'Brewing water for fermentation and dilution', 1),
  ('ingredient', 'Fruits & Juices', 'Fresh or processed fruits used in fermentation', 2),
  ('ingredient', 'Grains & Malts', 'Base malts, specialty malts, and adjunct grains', 3),
  ('ingredient', 'Honeys, Syrups & Sugars', 'Sweeteners of various types', 4),
  ('ingredient', 'Flavorants', 'Spices, herbs, woods, and extracts', 5),
  ('ingredient', 'Hops', 'Hop varieties for bitterness, flavour, and aroma', 6),
  ('ingredient', 'Additives', 'Nutrients, salts, stabilisers, fining agents', 7),
  ('ingredient', 'Yeasts & Microbes', 'Yeast strains and microbial cultures', 8),
  
  -- SUPPLIES
  ('supply', 'Cleaners & Sanitizers', 'Cleaning and sanitising agents', 20),
  ('supply', 'Bottles & Vessels', 'Glass or plastic bottles and kegs for packaging', 21),
  ('supply', 'Closures', 'Corks, caps, screw caps for sealing', 22),
  ('supply', 'Packaging Materials', 'Labels, carriers, boxes, shrink capsules', 23);

-- Category Allowed Contexts
INSERT OR IGNORE INTO categoryAllowedContexts (categoryID, contextID) VALUES
  (1, 1), (1, 5),     -- Water
  (2, 1), (2, 2),     -- Fruits & Juices
  (3, 1), (3, 2),     -- Grains & Malts
  (4, 1), (4, 2),     -- Honeys, Syrups & Sugars
  (5, 3),             -- Flavorants
  (6, 3),             -- Hops
  (8, 11), (8, 12),   -- Yeasts & Microbes
  (7, 4), (7, 5), (7, 13), (7, 8), (7, 9),  -- Additives
  (9, 6), (9, 7),     -- Cleaners & Sanitizers
  (10, 10),           -- Bottles & Vessels
  (11, 10),           -- Closures
  (12, 10);           -- Packaging Materials
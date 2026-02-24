// =============================================================================
// INVENTORY TYPES
// =============================================================================
// Mirrors the database schema for consumables, inventory lots, and their
// supporting lookup structures (categories, ingredient types, supply types).
//
// Role model:
//   Ingredient-only:  ingredientTypeID set, supplyTypeID null
//   Supply-only:      supplyTypeID set, ingredientTypeID null
//   Dual-purpose:     both set
//
// Schema constraint: at least one of ingredientTypeID / supplyTypeID must be
// non-null. This is enforced at the database level and validated in the DB layer.
// =============================================================================

// -----------------------------------------------------------------------------
// Lookup / Reference Types
// -----------------------------------------------------------------------------

/** Mirrors itemCategories table */
export interface ItemCategory {
  categoryID: number;
  roleID: 'ingredient' | 'supply';
  name: string;
  description: string | null;
  sortOrder: number;
  hasBeenUsed: boolean;
}

/** Mirrors ingredientTypes table */
export interface IngredientType {
  ingredientTypeID: number;
  categoryID: number;
  categoryName: string;         // Joined from itemCategories
  name: string;
  description: string | null;
  beverageTypes: string[];      // Parsed from JSON column
  isPrimaryRequired: boolean;
  isActive: boolean;
  hasBeenUsed: boolean;
}

/** Mirrors ingredientSubtypes table */
export interface IngredientSubtype {
  ingredientSubtypeID: number;
  ingredientTypeID: number;
  name: string;
  isActive: boolean;
}

/** Mirrors supplyTypes table */
export interface SupplyType {
  supplyTypeID: number;
  categoryID: number;
  categoryName: string;         // Joined from itemCategories
  name: string;
  description: string | null;
  isActive: boolean;
  hasBeenUsed: boolean;
}

// -----------------------------------------------------------------------------
// Consumable
// -----------------------------------------------------------------------------

/** Mirrors consumables table with joined type/category names */
export interface Consumable {
  consumableID: number;
  brand: string | null;
  name: string;
  unit: string;

  // Ingredient role (null if supply-only)
  ingredientTypeID: number | null;
  ingredientTypeName: string | null;    // Joined
  ingredientSubtypeID: number | null;
  ingredientSubtypeName: string | null; // Joined
  ingredientCategoryID: number | null;  // Joined via ingredientType
  ingredientCategoryName: string | null;

  // Supply role (null if ingredient-only)
  supplyTypeID: number | null;
  supplyTypeName: string | null;        // Joined
  supplyCategoryID: number | null;      // Joined via supplyType
  supplyCategoryName: string | null;

  // Inventory behaviour
  onDemand: boolean;
  onDemandPrice: number | null;
  onDemandPriceQty: number | null;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  autoAlert: boolean;

  notes: string | null;
  isActive: boolean;
  hasBeenUsed: boolean;
  createdDate: string;
  modifiedDate: string;
}

/**
 * Consumable with computed stock summary fields.
 * Used in list views where per-lot detail is not needed.
 */
export interface ConsumableWithStock extends Consumable {
  totalStock: number;          // SUM of active lot quantityRemaining
  activeLotCount: number;      // COUNT of active lots
  oldestActiveLotDate: string | null;  // Earliest purchaseDate among active lots
  stockStatus: StockStatus;
}

/** Stock status derived from totalStock vs reorderPoint */
export type StockStatus =
  | 'on-demand'   // consumable.onDemand = true
  | 'in-stock'    // totalStock > reorderPoint (or no reorder point set)
  | 'low-stock'   // 0 < totalStock <= reorderPoint
  | 'out-of-stock'; // totalStock = 0

// -----------------------------------------------------------------------------
// Inventory Lots
// -----------------------------------------------------------------------------

/** Valid lot lifecycle statuses (matches schema implicit values) */
export type LotStatus = 'active' | 'consumed' | 'expired';

/** Mirrors inventoryLots table */
export interface InventoryLot {
  lotID: number;
  consumableID: number;
  quantityPurchased: number;
  quantityRemaining: number;
  unit: string;
  purchaseDate: string;         // ISO 8601: YYYY-MM-DD
  expirationDate: string | null;
  costPerUnit: number | null;
  supplier: string | null;
  status: LotStatus;
  canDelete: boolean;
  notes: string | null;
}

// -----------------------------------------------------------------------------
// Form Data Types
// -----------------------------------------------------------------------------

/**
 * Data shape for the Add / Edit Consumable form.
 * String values for numeric fields to allow empty input state.
 */
export interface ConsumableFormData {
  brand: string;
  name: string;
  unit: string;

  // Type selection
  ingredientTypeID: string;       // '' if not an ingredient
  ingredientSubtypeID: string;    // '' if no subtype
  supplyTypeID: string;           // '' if not a supply

  // Inventory behaviour
  onDemand: boolean;
  onDemandPrice: string;
  onDemandPriceQty: string;
  reorderPoint: string;
  reorderQuantity: string;
  autoAlert: boolean;

  notes: string;
}

/**
 * Data shape for the Add Lot form.
 * Numeric fields as strings to allow empty input state.
 */
export interface LotFormData {
  quantityPurchased: string;
  unit: string;
  purchaseDate: string;
  expirationDate: string;
  costPerUnit: string;
  supplier: string;
  notes: string;
}

// -----------------------------------------------------------------------------
// Stat Summary (for page header stats bar)
// -----------------------------------------------------------------------------

export interface InventoryStats {
  totalConsumables: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  onDemandCount: number;
}

// -----------------------------------------------------------------------------
// Filter / Sort State
// -----------------------------------------------------------------------------

export type InventorySortOption =
  | 'name-asc'
  | 'name-desc'
  | 'stock-asc'
  | 'stock-desc'
  | 'category';

export type InventoryRoleFilter = 'all' | 'ingredient' | 'supply';

export type InventoryStockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'on-demand';
// src/lib/inventoryDb.ts

import type { Database, SqlValue } from 'sql.js';
import { resultToObjects } from './dbHelpers';
import type {
  Consumable,
  ConsumableWithStock,
  InventoryLot,
  IngredientType,
  IngredientSubtype,
  SupplyType,
  ItemCategory,
  LotStatus,
} from '../types/inventory';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateConsumableData {
  brand?: string;
  name: string;
  unit: string;
  ingredientTypeID?: number;
  ingredientSubtypeID?: number;
  supplyTypeID?: number;
  onDemand?: 0 | 1;
  onDemandPrice?: number;
  onDemandPriceQty?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  autoAlert?: 0 | 1;
  notes?: string;
}

export interface UpdateConsumableData {
  brand?: string | null;
  name?: string;
  unit?: string;
  ingredientTypeID?: number | null;
  ingredientSubtypeID?: number | null;
  supplyTypeID?: number | null;
  onDemand?: 0 | 1;
  onDemandPrice?: number | null;
  onDemandPriceQty?: number | null;
  reorderPoint?: number | null;
  reorderQuantity?: number | null;
  autoAlert?: 0 | 1;
  notes?: string | null;
  isActive?: 0 | 1;
}

export interface CreateLotData {
  consumableID: number;
  quantityPurchased: number;
  unit: string;
  purchaseDate: string;
  expirationDate?: string;
  costPerUnit?: number;
  supplier?: string;
  notes?: string;
}

export interface UpdateLotData {
  quantityPurchased?: number;
  quantityRemaining?: number;
  purchaseDate?: string;
  expirationDate?: string | null;
  costPerUnit?: number | null;
  supplier?: string | null;
  status?: LotStatus;
  notes?: string | null;
}

// =============================================================================
// PRIVATE SQL HELPERS
// =============================================================================

/**
 * The SELECT clause used whenever a full Consumable object is needed.
 * Joins ingredientTypes, ingredientSubtypes, supplyTypes, and itemCategories
 * to produce all joined name/category fields defined on the Consumable interface.
 */
const CONSUMABLE_SELECT = `
  SELECT
    c.consumableID,
    c.brand,
    c.name,
    c.unit,

    c.ingredientTypeID,
    it.name                 AS ingredientTypeName,
    c.ingredientSubtypeID,
    ist.name                AS ingredientSubtypeName,
    it.categoryID           AS ingredientCategoryID,
    ic.name                 AS ingredientCategoryName,

    c.supplyTypeID,
    st.name                 AS supplyTypeName,
    st.categoryID           AS supplyCategoryID,
    sc.name                 AS supplyCategoryName,

    c.onDemand,
    c.onDemandPrice,
    c.onDemandPriceQty,
    c.reorderPoint,
    c.reorderQuantity,
    c.autoAlert,
    c.notes,
    c.isActive,
    c.hasBeenUsed,
    c.createdDate,
    c.modifiedDate
  FROM consumables c
  LEFT JOIN ingredientTypes it   ON c.ingredientTypeID    = it.ingredientTypeID
  LEFT JOIN ingredientSubtypes ist ON c.ingredientSubtypeID = ist.ingredientSubtypeID
  LEFT JOIN itemCategories ic    ON it.categoryID          = ic.categoryID
  LEFT JOIN supplyTypes st       ON c.supplyTypeID         = st.supplyTypeID
  LEFT JOIN itemCategories sc    ON st.categoryID          = sc.categoryID
`;

/**
 * The SELECT clause for ConsumableWithStock.
 * Extends CONSUMABLE_SELECT with aggregated lot summary columns.
 */
const CONSUMABLE_WITH_STOCK_SELECT = `
  SELECT
    c.consumableID,
    c.brand,
    c.name,
    c.unit,

    c.ingredientTypeID,
    it.name                 AS ingredientTypeName,
    c.ingredientSubtypeID,
    ist.name                AS ingredientSubtypeName,
    it.categoryID           AS ingredientCategoryID,
    ic.name                 AS ingredientCategoryName,

    c.supplyTypeID,
    st.name                 AS supplyTypeName,
    st.categoryID           AS supplyCategoryID,
    sc.name                 AS supplyCategoryName,

    c.onDemand,
    c.onDemandPrice,
    c.onDemandPriceQty,
    c.reorderPoint,
    c.reorderQuantity,
    c.autoAlert,
    c.notes,
    c.isActive,
    c.hasBeenUsed,
    c.createdDate,
    c.modifiedDate,

    COALESCE(lot.totalStock, 0)       AS totalStock,
    COALESCE(lot.activeLotCount, 0)   AS activeLotCount,
    lot.oldestActiveLotDate           AS oldestActiveLotDate
  FROM consumables c
  LEFT JOIN ingredientTypes it   ON c.ingredientTypeID    = it.ingredientTypeID
  LEFT JOIN ingredientSubtypes ist ON c.ingredientSubtypeID = ist.ingredientSubtypeID
  LEFT JOIN itemCategories ic    ON it.categoryID          = ic.categoryID
  LEFT JOIN supplyTypes st       ON c.supplyTypeID         = st.supplyTypeID
  LEFT JOIN itemCategories sc    ON st.categoryID          = sc.categoryID
  LEFT JOIN (
    SELECT
      consumableID,
      SUM(quantityRemaining)  AS totalStock,
      COUNT(*)                AS activeLotCount,
      MIN(purchaseDate)       AS oldestActiveLotDate
    FROM inventoryLots
    WHERE status = 'active'
    GROUP BY consumableID
  ) lot ON c.consumableID = lot.consumableID
`;

/**
 * Derive stockStatus from a raw database row.
 * Called after querying to attach the computed field.
 */
function deriveStockStatus(
  row: Omit<ConsumableWithStock, 'stockStatus'>
): ConsumableWithStock['stockStatus'] {
  if (row.onDemand) return 'on-demand';
  if (row.totalStock === 0) return 'out-of-stock';
  if (row.reorderPoint !== null && row.totalStock <= row.reorderPoint) return 'low-stock';
  return 'in-stock';
}

/**
 * Map raw SQL.js rows (where booleans are stored as 0/1 integers) to
 * properly-typed Consumable objects.
 */
function mapConsumable(raw: Record<string, SqlValue>): Consumable {
  return {
    ...(raw as unknown as Consumable),
    onDemand: raw.onDemand === 1,
    autoAlert: raw.autoAlert === 1,
    isActive: raw.isActive === 1,
    hasBeenUsed: raw.hasBeenUsed === 1,
  };
}

function mapConsumableWithStock(raw: Record<string, SqlValue>): ConsumableWithStock {
  const base = mapConsumable(raw);
  const partial = {
    ...base,
    totalStock: (raw.totalStock as number) ?? 0,
    activeLotCount: (raw.activeLotCount as number) ?? 0,
    oldestActiveLotDate: (raw.oldestActiveLotDate as string) ?? null,
  };
  return {
    ...partial,
    stockStatus: deriveStockStatus(partial),
  };
}

/**
 * Map raw SQL.js row to InventoryLot, converting canDelete integer to boolean.
 */
function mapLot(raw: Record<string, SqlValue>): InventoryLot {
  return {
    ...(raw as unknown as InventoryLot),
    canDelete: raw.canDelete === 1,
  };
}

// =============================================================================
// LOOKUP QUERIES
// =============================================================================

/**
 * Get all ingredient categories (roleID = 'ingredient').
 */
export function getIngredientCategories(db: Database): ItemCategory[] {
  try {
    const sql = `
      SELECT categoryID, roleID, name, description, sortOrder, hasBeenUsed
      FROM itemCategories
      WHERE roleID = 'ingredient'
      ORDER BY sortOrder ASC, name ASC
    `;
    const result = db.exec(sql);
    return resultToObjects<ItemCategory>(result).map(row => ({
      ...row,
      hasBeenUsed: (row.hasBeenUsed as unknown as number) === 1,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch ingredient categories:', message);
    throw new Error(`Failed to fetch ingredient categories: ${message}`);
  }
}

/**
 * Get all supply categories (roleID = 'supply').
 */
export function getSupplyCategories(db: Database): ItemCategory[] {
  try {
    const sql = `
      SELECT categoryID, roleID, name, description, sortOrder, hasBeenUsed
      FROM itemCategories
      WHERE roleID = 'supply'
      ORDER BY sortOrder ASC, name ASC
    `;
    const result = db.exec(sql);
    return resultToObjects<ItemCategory>(result).map(row => ({
      ...row,
      hasBeenUsed: (row.hasBeenUsed as unknown as number) === 1,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch supply categories:', message);
    throw new Error(`Failed to fetch supply categories: ${message}`);
  }
}

/**
 * Get all active ingredient types, joined with their category name.
 */
export function getIngredientTypes(db: Database): IngredientType[] {
  try {
    const sql = `
      SELECT
        it.ingredientTypeID,
        it.categoryID,
        ic.name AS categoryName,
        it.name,
        it.description,
        it.beverageTypes,
        it.isPrimaryRequired,
        it.isActive,
        it.hasBeenUsed
      FROM ingredientTypes it
      JOIN itemCategories ic ON it.categoryID = ic.categoryID
      WHERE it.isActive = 1
      ORDER BY ic.sortOrder ASC, it.name ASC
    `;
    const result = db.exec(sql);
    return resultToObjects<IngredientType>(result).map(row => ({
      ...row,
      // beverageTypes is stored as a JSON string in the database
      beverageTypes: row.beverageTypes
        ? JSON.parse(row.beverageTypes as unknown as string)
        : [],
      isPrimaryRequired: (row.isPrimaryRequired as unknown as number) === 1,
      isActive: (row.isActive as unknown as number) === 1,
      hasBeenUsed: (row.hasBeenUsed as unknown as number) === 1,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch ingredient types:', message);
    throw new Error(`Failed to fetch ingredient types: ${message}`);
  }
}

/**
 * Get all active ingredient subtypes for a given ingredient type.
 */
export function getIngredientSubtypes(
  db: Database,
  ingredientTypeID: number
): IngredientSubtype[] {
  if (typeof ingredientTypeID !== 'number' || ingredientTypeID <= 0) {
    throw new Error('Invalid ingredientTypeID (must be a positive number)');
  }

  try {
    const sql = `
      SELECT ingredientSubtypeID, ingredientTypeID, name, isActive
      FROM ingredientSubtypes
      WHERE ingredientTypeID = ?
        AND isActive = 1
      ORDER BY name ASC
    `;
    const result = db.exec(sql, [ingredientTypeID]);
    return resultToObjects<IngredientSubtype>(result).map(row => ({
      ...row,
      isActive: (row.isActive as unknown as number) === 1,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to fetch subtypes for ingredient type ${ingredientTypeID}:`, message);
    throw new Error(`Failed to fetch ingredient subtypes: ${message}`);
  }
}

/**
 * Get all active supply types, joined with their category name.
 */
export function getSupplyTypes(db: Database): SupplyType[] {
  try {
    const sql = `
      SELECT
        st.supplyTypeID,
        st.categoryID,
        ic.name AS categoryName,
        st.name,
        st.description,
        st.isActive,
        st.hasBeenUsed
      FROM supplyTypes st
      JOIN itemCategories ic ON st.categoryID = ic.categoryID
      WHERE st.isActive = 1
      ORDER BY ic.sortOrder ASC, st.name ASC
    `;
    const result = db.exec(sql);
    return resultToObjects<SupplyType>(result).map(row => ({
      ...row,
      isActive: (row.isActive as unknown as number) === 1,
      hasBeenUsed: (row.hasBeenUsed as unknown as number) === 1,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch supply types:', message);
    throw new Error(`Failed to fetch supply types: ${message}`);
  }
}

// =============================================================================
// LOOKUP MUTATIONS
// =============================================================================

export interface CreateIngredientTypeData {
  categoryID: number;
  name: string;
  beverageTypes?: string; // JSON string, e.g. '["Mead","Wine"]'
  isPrimaryRequired?: 0 | 1;
  description?: string;
}

export interface CreateSupplyTypeData {
  categoryID: number;
  name: string;
  description?: string;
}

/**
 * Create a new ingredient type within a given category.
 * Used by the inline "+ New" type creation flow in the consumable form.
 */
export function createIngredientType(
  db: Database,
  data: CreateIngredientTypeData
): IngredientType {
  if (typeof data.categoryID !== 'number' || data.categoryID <= 0) {
    throw new Error('Invalid categoryID (must be a positive number)');
  }
  if (!data.name || data.name.trim() === '') {
    throw new Error('Ingredient type name is required');
  }

  try {
    db.run(
      `INSERT INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.categoryID,
        data.name.trim(),
        data.description?.trim() ?? null,
        data.beverageTypes ?? '[]',
        data.isPrimaryRequired ?? 0,
      ]
    );

    const newID = (db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0]) as number;

    const result = db.exec(
      `SELECT it.ingredientTypeID, it.categoryID, ic.name AS categoryName,
              it.name, it.description, it.beverageTypes,
              it.isPrimaryRequired, it.isActive, it.hasBeenUsed
       FROM ingredientTypes it
       JOIN itemCategories ic ON it.categoryID = ic.categoryID
       WHERE it.ingredientTypeID = ?`,
      [newID]
    );

    const rows = resultToObjects<IngredientType>(result);
    if (rows.length === 0) {
      throw new Error('Ingredient type was inserted but could not be retrieved');
    }

    const row = rows[0];
    console.log(`Created ingredient type ID ${newID}: "${data.name}"`);
    return {
      ...row,
      beverageTypes: row.beverageTypes
        ? JSON.parse(row.beverageTypes as unknown as string)
        : [],
      isPrimaryRequired: (row.isPrimaryRequired as unknown as number) === 1,
      isActive:          (row.isActive          as unknown as number) === 1,
      hasBeenUsed:       (row.hasBeenUsed       as unknown as number) === 1,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create ingredient type:', message);
    throw new Error(`Failed to create ingredient type: ${message}`);
  }
}

/**
 * Create a new supply type within a given category.
 * Used by the inline "+ New" type creation flow in the consumable form.
 */
export function createSupplyType(
  db: Database,
  data: CreateSupplyTypeData
): SupplyType {
  if (typeof data.categoryID !== 'number' || data.categoryID <= 0) {
    throw new Error('Invalid categoryID (must be a positive number)');
  }
  if (!data.name || data.name.trim() === '') {
    throw new Error('Supply type name is required');
  }

  try {
    db.run(
      `INSERT INTO supplyTypes (categoryID, name, description)
       VALUES (?, ?, ?)`,
      [
        data.categoryID,
        data.name.trim(),
        data.description?.trim() ?? null,
      ]
    );

    const newID = (db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0]) as number;

    const result = db.exec(
      `SELECT st.supplyTypeID, st.categoryID, ic.name AS categoryName,
              st.name, st.description, st.isActive, st.hasBeenUsed
       FROM supplyTypes st
       JOIN itemCategories ic ON st.categoryID = ic.categoryID
       WHERE st.supplyTypeID = ?`,
      [newID]
    );

    const rows = resultToObjects<SupplyType>(result);
    if (rows.length === 0) {
      throw new Error('Supply type was inserted but could not be retrieved');
    }

    const row = rows[0];
    console.log(`Created supply type ID ${newID}: "${data.name}"`);
    return {
      ...row,
      isActive:    (row.isActive    as unknown as number) === 1,
      hasBeenUsed: (row.hasBeenUsed as unknown as number) === 1,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create supply type:', message);
    throw new Error(`Failed to create supply type: ${message}`);
  }
}

// =============================================================================
// CONSUMABLE QUERIES
// =============================================================================

/**
 * Get a single consumable by ID with full joined fields.
 */
export function getConsumable(db: Database, consumableID: number): Consumable | null {
  if (typeof consumableID !== 'number' || consumableID <= 0) {
    throw new Error('Invalid consumableID (must be a positive number)');
  }

  try {
    const sql = `${CONSUMABLE_SELECT} WHERE c.consumableID = ?`;
    const result = db.exec(sql, [consumableID]);
    const rows = resultToObjects<Record<string, SqlValue>>(result);

    if (rows.length === 0) return null;

    return mapConsumable(rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to fetch consumable ${consumableID}:`, message);
    throw new Error(`Failed to fetch consumable: ${message}`);
  }
}

/**
 * Get all consumables with computed stock summary fields.
 * Used for the inventory list view.
 * Returns active consumables only by default.
 */
export function getConsumablesWithStock(
  db: Database,
  includeInactive = false
): ConsumableWithStock[] {
  try {
    let sql = CONSUMABLE_WITH_STOCK_SELECT;
    if (!includeInactive) {
      sql += ' WHERE c.isActive = 1';
    }
    sql += ' ORDER BY c.name ASC';

    const result = db.exec(sql);
    const rows = resultToObjects<Record<string, SqlValue>>(result);

    console.log(`Found ${rows.length} consumables`);
    return rows.map(mapConsumableWithStock);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch consumables with stock:', message);
    throw new Error(`Failed to fetch consumables: ${message}`);
  }
}

/**
 * Create a new consumable.
 * At least one of ingredientTypeID or supplyTypeID must be provided,
 * enforcing the schema CHECK constraint at the application layer before
 * the database has a chance to reject the insert.
 */
export function createConsumable(
  db: Database,
  data: CreateConsumableData
): Consumable {
  // STEP 1: VALIDATE REQUIRED FIELDS
  if (!data.name || data.name.trim() === '') {
    throw new Error('Consumable name is required');
  }

  if (!data.unit || data.unit.trim() === '') {
    throw new Error('Consumable unit is required');
  }

  // STEP 2: ENFORCE ROLE CONSTRAINT
  if (!data.ingredientTypeID && !data.supplyTypeID) {
    throw new Error(
      'At least one of ingredientTypeID or supplyTypeID must be provided'
    );
  }

  // STEP 3: VALIDATE NUMERIC FIELDS
  if (data.onDemandPrice !== undefined && data.onDemandPrice !== null) {
    if (typeof data.onDemandPrice !== 'number' || data.onDemandPrice < 0) {
      throw new Error('onDemandPrice must be a non-negative number');
    }
  }

  if (data.onDemandPriceQty !== undefined && data.onDemandPriceQty !== null) {
    if (typeof data.onDemandPriceQty !== 'number' || data.onDemandPriceQty <= 0) {
      throw new Error('onDemandPriceQty must be a positive number');
    }
  }

  if (data.reorderPoint !== undefined && data.reorderPoint !== null) {
    if (typeof data.reorderPoint !== 'number' || data.reorderPoint < 0) {
      throw new Error('reorderPoint must be a non-negative number');
    }
  }

  if (data.reorderQuantity !== undefined && data.reorderQuantity !== null) {
    if (typeof data.reorderQuantity !== 'number' || data.reorderQuantity <= 0) {
      throw new Error('reorderQuantity must be a positive number');
    }
  }

  // STEP 4: INSERT
  try {
    const sql = `
      INSERT INTO consumables (
        brand, name, unit,
        ingredientTypeID, ingredientSubtypeID, supplyTypeID,
        onDemand, onDemandPrice, onDemandPriceQty,
        reorderPoint, reorderQuantity, autoAlert,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
      data.brand?.trim() ?? null,
      data.name.trim(),
      data.unit.trim(),
      data.ingredientTypeID ?? null,
      data.ingredientSubtypeID ?? null,
      data.supplyTypeID ?? null,
      data.onDemand ?? 0,
      data.onDemandPrice ?? null,
      data.onDemandPriceQty ?? null,
      data.reorderPoint ?? null,
      data.reorderQuantity ?? null,
      data.autoAlert ?? 1,
      data.notes?.trim() ?? null,
    ]);

    const idResult = db.exec('SELECT last_insert_rowid() AS id');
    const newID = idResult[0].values[0][0] as number;

    console.log(`Created consumable ID ${newID}: "${data.name}"`);

    const consumable = getConsumable(db, newID);
    if (!consumable) {
      throw new Error('Consumable was inserted but could not be retrieved');
    }
    return consumable;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create consumable:', message);
    throw new Error(`Failed to create consumable: ${message}`);
  }
}

/**
 * Update an existing consumable.
 * Structural fields (unit, type IDs) are locked if hasBeenUsed = 1.
 */
export function updateConsumable(
  db: Database,
  consumableID: number,
  updates: UpdateConsumableData
): Consumable {
  // STEP 1: VALIDATE ID
  if (typeof consumableID !== 'number' || consumableID <= 0) {
    throw new Error('Invalid consumableID (must be a positive number)');
  }

  // STEP 2: CHECK EXISTS
  const existing = getConsumable(db, consumableID);
  if (!existing) {
    throw new Error(`Consumable ID ${consumableID} does not exist`);
  }

  // STEP 3: ENFORCE hasBeenUsed LOCK on structural fields
  if (existing.hasBeenUsed) {
    const structuralFields: (keyof UpdateConsumableData)[] = [
      'unit',
      'ingredientTypeID',
      'ingredientSubtypeID',
      'supplyTypeID',
    ];
    for (const field of structuralFields) {
      if (field in updates) {
        throw new Error(
          `Cannot update "${field}" on a consumable that has been used in batches`
        );
      }
    }
  }

  // STEP 4: VALIDATE ROLE CONSTRAINT if type IDs are being changed
  const newIngredientTypeID =
    'ingredientTypeID' in updates ? updates.ingredientTypeID : existing.ingredientTypeID;
  const newSupplyTypeID =
    'supplyTypeID' in updates ? updates.supplyTypeID : existing.supplyTypeID;

  if (!newIngredientTypeID && !newSupplyTypeID) {
    throw new Error(
      'At least one of ingredientTypeID or supplyTypeID must remain set'
    );
  }

  // STEP 5: VALIDATE NUMERIC FIELDS
  if ('onDemandPrice' in updates && updates.onDemandPrice !== null && updates.onDemandPrice !== undefined) {
    if (typeof updates.onDemandPrice !== 'number' || updates.onDemandPrice < 0) {
      throw new Error('onDemandPrice must be a non-negative number');
    }
  }

  if ('onDemandPriceQty' in updates && updates.onDemandPriceQty !== null && updates.onDemandPriceQty !== undefined) {
    if (typeof updates.onDemandPriceQty !== 'number' || updates.onDemandPriceQty <= 0) {
      throw new Error('onDemandPriceQty must be a positive number');
    }
  }

  if ('reorderPoint' in updates && updates.reorderPoint !== null && updates.reorderPoint !== undefined) {
    if (typeof updates.reorderPoint !== 'number' || updates.reorderPoint < 0) {
      throw new Error('reorderPoint must be a non-negative number');
    }
  }

  if ('reorderQuantity' in updates && updates.reorderQuantity !== null && updates.reorderQuantity !== undefined) {
    if (typeof updates.reorderQuantity !== 'number' || updates.reorderQuantity <= 0) {
      throw new Error('reorderQuantity must be a positive number');
    }
  }

  // STEP 6: BUILD UPDATE STATEMENT
  try {
    const setClauses: string[] = [];
    const params: SqlValue[] = [];

    const addField = (col: string, val: SqlValue) => {
      setClauses.push(`${col} = ?`);
      params.push(val);
    };

    if ('brand' in updates) addField('brand', updates.brand ?? null);
    if ('name' in updates && updates.name) addField('name', updates.name.trim());
    if ('unit' in updates && updates.unit) addField('unit', updates.unit.trim());
    if ('ingredientTypeID' in updates) addField('ingredientTypeID', updates.ingredientTypeID ?? null);
    if ('ingredientSubtypeID' in updates) addField('ingredientSubtypeID', updates.ingredientSubtypeID ?? null);
    if ('supplyTypeID' in updates) addField('supplyTypeID', updates.supplyTypeID ?? null);
    if ('onDemand' in updates && updates.onDemand !== undefined) addField('onDemand', updates.onDemand);
    if ('onDemandPrice' in updates) addField('onDemandPrice', updates.onDemandPrice ?? null);
    if ('onDemandPriceQty' in updates) addField('onDemandPriceQty', updates.onDemandPriceQty ?? null);
    if ('reorderPoint' in updates) addField('reorderPoint', updates.reorderPoint ?? null);
    if ('reorderQuantity' in updates) addField('reorderQuantity', updates.reorderQuantity ?? null);
    if ('autoAlert' in updates && updates.autoAlert !== undefined) addField('autoAlert', updates.autoAlert);
    if ('notes' in updates) addField('notes', updates.notes ?? null);
    if ('isActive' in updates && updates.isActive !== undefined) addField('isActive', updates.isActive);

    if (setClauses.length === 0) {
      console.warn('updateConsumable called with no fields to update');
      return existing;
    }

    // Always update modifiedDate
    setClauses.push("modifiedDate = DATE('now')");
    params.push(consumableID);

    const sql = `UPDATE consumables SET ${setClauses.join(', ')} WHERE consumableID = ?`;
    db.run(sql, params);

    console.log(`Updated consumable ID ${consumableID}`);

    const updated = getConsumable(db, consumableID);
    if (!updated) {
      throw new Error('Consumable was updated but could not be retrieved');
    }
    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to update consumable ${consumableID}:`, message);
    throw new Error(`Failed to update consumable: ${message}`);
  }
}

/**
 * Delete a consumable.
 * Only permitted if hasBeenUsed = 0.
 * ON DELETE CASCADE in the schema will remove all associated lots.
 */
export function deleteConsumable(db: Database, consumableID: number): void {
  // STEP 1: VALIDATE ID
  if (typeof consumableID !== 'number' || consumableID <= 0) {
    throw new Error('Invalid consumableID (must be a positive number)');
  }

  // STEP 2: CHECK EXISTS
  const existing = getConsumable(db, consumableID);
  if (!existing) {
    throw new Error(`Consumable ID ${consumableID} does not exist`);
  }

  // STEP 3: ENFORCE hasBeenUsed LOCK
  if (existing.hasBeenUsed) {
    throw new Error(
      `Cannot delete "${existing.name}" because it has been used in one or more batches. ` +
      `Set it as inactive instead.`
    );
  }

  // STEP 4: DELETE
  try {
    db.run('DELETE FROM consumables WHERE consumableID = ?', [consumableID]);
    console.log(`Deleted consumable ID ${consumableID}: "${existing.name}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to delete consumable ${consumableID}:`, message);
    throw new Error(`Failed to delete consumable: ${message}`);
  }
}

// =============================================================================
// INVENTORY LOT QUERIES
// =============================================================================

/**
 * Get all lots for a consumable.
 * By default returns only active lots in FIFO order (oldest purchaseDate first).
 * Pass includeArchived = true to include consumed and expired lots.
 */
export function getLotsForConsumable(
  db: Database,
  consumableID: number,
  includeArchived = false
): InventoryLot[] {
  if (typeof consumableID !== 'number' || consumableID <= 0) {
    throw new Error('Invalid consumableID (must be a positive number)');
  }

  try {
    let sql = `
      SELECT
        lotID, consumableID,
        quantityPurchased, quantityRemaining, unit,
        purchaseDate, expirationDate,
        costPerUnit, supplier,
        status, canDelete, notes
      FROM inventoryLots
      WHERE consumableID = ?
    `;

    if (!includeArchived) {
      sql += ` AND status = 'active'`;
    }

    // Active lots: FIFO order. Archived lots: most recent first.
    sql += includeArchived
      ? ' ORDER BY status ASC, purchaseDate DESC'
      : ' ORDER BY purchaseDate ASC';

    const result = db.exec(sql, [consumableID]);
    const rows = resultToObjects<Record<string, SqlValue>>(result);

    console.log(
      `Found ${rows.length} lot(s) for consumable ${consumableID}` +
      (includeArchived ? ' (including archived)' : '')
    );

    return rows.map(mapLot);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to fetch lots for consumable ${consumableID}:`, message);
    throw new Error(`Failed to fetch inventory lots: ${message}`);
  }
}

/**
 * Get a single lot by ID.
 */
export function getLot(db: Database, lotID: number): InventoryLot | null {
  if (typeof lotID !== 'number' || lotID <= 0) {
    throw new Error('Invalid lotID (must be a positive number)');
  }

  try {
    const sql = `
      SELECT
        lotID, consumableID,
        quantityPurchased, quantityRemaining, unit,
        purchaseDate, expirationDate,
        costPerUnit, supplier,
        status, canDelete, notes
      FROM inventoryLots
      WHERE lotID = ?
    `;
    const result = db.exec(sql, [lotID]);
    const rows = resultToObjects<Record<string, SqlValue>>(result);

    if (rows.length === 0) return null;

    return mapLot(rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to fetch lot ${lotID}:`, message);
    throw new Error(`Failed to fetch lot: ${message}`);
  }
}

/**
 * Add a new inventory lot for a consumable.
 * quantityRemaining is initialised to quantityPurchased.
 */
export function addLot(db: Database, data: CreateLotData): InventoryLot {
  // STEP 1: VALIDATE consumableID
  if (typeof data.consumableID !== 'number' || data.consumableID <= 0) {
    throw new Error('Invalid consumableID (must be a positive number)');
  }

  // STEP 2: CHECK CONSUMABLE EXISTS
  const consumable = getConsumable(db, data.consumableID);
  if (!consumable) {
    throw new Error(`Consumable ID ${data.consumableID} does not exist`);
  }

  if (!consumable.isActive) {
    throw new Error(`Cannot add a lot to inactive consumable "${consumable.name}"`);
  }

  if (consumable.onDemand) {
    throw new Error(
      `Cannot add a lot to on-demand consumable "${consumable.name}". ` +
      `Change the consumable to tracked inventory first.`
    );
  }

  // STEP 3: VALIDATE QUANTITIES
  if (typeof data.quantityPurchased !== 'number' || data.quantityPurchased <= 0) {
    throw new Error('quantityPurchased must be a positive number');
  }

  if (!data.unit || data.unit.trim() === '') {
    throw new Error('Lot unit is required');
  }

  // STEP 4: VALIDATE DATES
  if (!data.purchaseDate || data.purchaseDate.trim() === '') {
    throw new Error('purchaseDate is required');
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(data.purchaseDate)) {
    throw new Error('purchaseDate must be in ISO 8601 format (YYYY-MM-DD)');
  }

  if (data.expirationDate !== undefined && data.expirationDate !== null && data.expirationDate !== '') {
    if (!dateRegex.test(data.expirationDate)) {
      throw new Error('expirationDate must be in ISO 8601 format (YYYY-MM-DD)');
    }
    if (data.expirationDate <= data.purchaseDate) {
      throw new Error('expirationDate must be after purchaseDate');
    }
  }

  // STEP 5: VALIDATE OPTIONAL NUMERICS
  if (data.costPerUnit !== undefined && data.costPerUnit !== null) {
    if (typeof data.costPerUnit !== 'number' || data.costPerUnit < 0) {
      throw new Error('costPerUnit must be a non-negative number');
    }
  }

  // STEP 6: INSERT
  try {
    const sql = `
      INSERT INTO inventoryLots (
        consumableID,
        quantityPurchased, quantityRemaining, unit,
        purchaseDate, expirationDate,
        costPerUnit, supplier,
        status, canDelete, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, ?)
    `;

    db.run(sql, [
      data.consumableID,
      data.quantityPurchased,
      data.quantityPurchased, // quantityRemaining starts equal to quantityPurchased
      data.unit.trim(),
      data.purchaseDate,
      data.expirationDate?.trim() ?? null,
      data.costPerUnit ?? null,
      data.supplier?.trim() ?? null,
      data.notes?.trim() ?? null,
    ]);

    const idResult = db.exec('SELECT last_insert_rowid() AS id');
    const newID = idResult[0].values[0][0] as number;

    console.log(
      `Added lot ID ${newID} for consumable ID ${data.consumableID}: ` +
      `${data.quantityPurchased} ${data.unit}`
    );

    const lot = getLot(db, newID);
    if (!lot) {
      throw new Error('Lot was inserted but could not be retrieved');
    }
    return lot;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to add lot:', message);
    throw new Error(`Failed to add lot: ${message}`);
  }
}

/**
 * Update a lot's metadata.
 * Quantity fields and status can be updated only if the lot has not been
 * used in any batch (canDelete = 1).
 */
export function updateLot(
  db: Database,
  lotID: number,
  updates: UpdateLotData
): InventoryLot {
  // STEP 1: VALIDATE ID
  if (typeof lotID !== 'number' || lotID <= 0) {
    throw new Error('Invalid lotID (must be a positive number)');
  }

  // STEP 2: CHECK EXISTS
  const existing = getLot(db, lotID);
  if (!existing) {
    throw new Error(`Lot ID ${lotID} does not exist`);
  }

  // STEP 3: ENFORCE canDelete LOCK for quantity/status changes
  const quantityFields: (keyof UpdateLotData)[] = ['quantityPurchased', 'quantityRemaining'];
  if (!existing.canDelete) {
    for (const field of quantityFields) {
      if (field in updates) {
        throw new Error(
          `Cannot update "${field}" on a lot that has been used in a batch`
        );
      }
    }
  }

  // STEP 4: VALIDATE QUANTITIES
  if ('quantityPurchased' in updates && updates.quantityPurchased !== undefined) {
    if (typeof updates.quantityPurchased !== 'number' || updates.quantityPurchased <= 0) {
      throw new Error('quantityPurchased must be a positive number');
    }
  }

  if ('quantityRemaining' in updates && updates.quantityRemaining !== undefined) {
    if (typeof updates.quantityRemaining !== 'number' || updates.quantityRemaining < 0) {
      throw new Error('quantityRemaining must be a non-negative number');
    }
    const purchased = updates.quantityPurchased ?? existing.quantityPurchased;
    if (updates.quantityRemaining > purchased) {
      throw new Error('quantityRemaining cannot exceed quantityPurchased');
    }
  }

  // STEP 5: VALIDATE DATES
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if ('purchaseDate' in updates && updates.purchaseDate) {
    if (!dateRegex.test(updates.purchaseDate)) {
      throw new Error('purchaseDate must be in ISO 8601 format (YYYY-MM-DD)');
    }
  }

  if ('expirationDate' in updates && updates.expirationDate) {
    if (!dateRegex.test(updates.expirationDate)) {
      throw new Error('expirationDate must be in ISO 8601 format (YYYY-MM-DD)');
    }
    const effectivePurchaseDate = updates.purchaseDate ?? existing.purchaseDate;
    if (updates.expirationDate <= effectivePurchaseDate) {
      throw new Error('expirationDate must be after purchaseDate');
    }
  }

  // STEP 6: VALIDATE OPTIONAL NUMERICS
  if ('costPerUnit' in updates && updates.costPerUnit !== null && updates.costPerUnit !== undefined) {
    if (typeof updates.costPerUnit !== 'number' || updates.costPerUnit < 0) {
      throw new Error('costPerUnit must be a non-negative number');
    }
  }

  // STEP 7: VALIDATE STATUS
  const validStatuses: LotStatus[] = ['active', 'consumed', 'expired'];
  if ('status' in updates && updates.status && !validStatuses.includes(updates.status)) {
    throw new Error(`Invalid lot status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // STEP 8: BUILD UPDATE STATEMENT
  try {
    const setClauses: string[] = [];
    const params: SqlValue[] = [];

    const addField = (col: string, val: SqlValue) => {
      setClauses.push(`${col} = ?`);
      params.push(val);
    };

    if ('quantityPurchased' in updates && updates.quantityPurchased !== undefined) addField('quantityPurchased', updates.quantityPurchased);
    if ('quantityRemaining' in updates && updates.quantityRemaining !== undefined) addField('quantityRemaining', updates.quantityRemaining);
    if ('purchaseDate' in updates && updates.purchaseDate) addField('purchaseDate', updates.purchaseDate);
    if ('expirationDate' in updates) addField('expirationDate', updates.expirationDate ?? null);
    if ('costPerUnit' in updates) addField('costPerUnit', updates.costPerUnit ?? null);
    if ('supplier' in updates) addField('supplier', updates.supplier ?? null);
    if ('status' in updates && updates.status) addField('status', updates.status);
    if ('notes' in updates) addField('notes', updates.notes ?? null);

    if (setClauses.length === 0) {
      console.warn('updateLot called with no fields to update');
      return existing;
    }

    params.push(lotID);
    const sql = `UPDATE inventoryLots SET ${setClauses.join(', ')} WHERE lotID = ?`;
    db.run(sql, params);

    console.log(`Updated lot ID ${lotID}`);

    const updated = getLot(db, lotID);
    if (!updated) {
      throw new Error('Lot was updated but could not be retrieved');
    }
    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to update lot ${lotID}:`, message);
    throw new Error(`Failed to update lot: ${message}`);
  }
}

/**
 * Delete a lot.
 * Only permitted if canDelete = 1 (lot has not been used in any batch).
 */
export function deleteLot(db: Database, lotID: number): void {
  // STEP 1: VALIDATE ID
  if (typeof lotID !== 'number' || lotID <= 0) {
    throw new Error('Invalid lotID (must be a positive number)');
  }

  // STEP 2: CHECK EXISTS
  const existing = getLot(db, lotID);
  if (!existing) {
    throw new Error(`Lot ID ${lotID} does not exist`);
  }

  // STEP 3: ENFORCE canDelete LOCK
  if (!existing.canDelete) {
    throw new Error(
      'Cannot delete a lot that has been used in a batch. ' +
      'Mark it as consumed or expired instead.'
    );
  }

  // STEP 4: DELETE
  try {
    db.run('DELETE FROM inventoryLots WHERE lotID = ?', [lotID]);
    console.log(`Deleted lot ID ${lotID}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to delete lot ${lotID}:`, message);
    throw new Error(`Failed to delete lot: ${message}`);
  }
}

// =============================================================================
// STATS
// =============================================================================

/**
 * Compute summary statistics for the inventory page header.
 * Queries the database directly rather than deriving from an already-fetched
 * list, to keep this callable independently (e.g., for a dashboard widget).
 */
export function getInventoryStats(db: Database) {
  try {
    const sql = `
      SELECT
        COUNT(*)                                                      AS totalConsumables,
        SUM(CASE WHEN c.onDemand = 1 THEN 1 ELSE 0 END)             AS onDemandCount,
        SUM(CASE
          WHEN c.onDemand = 0
           AND COALESCE(lot.totalStock, 0) = 0
          THEN 1 ELSE 0 END)                                         AS outOfStockCount,
        SUM(CASE
          WHEN c.onDemand = 0
           AND COALESCE(lot.totalStock, 0) > 0
           AND c.reorderPoint IS NOT NULL
           AND COALESCE(lot.totalStock, 0) <= c.reorderPoint
          THEN 1 ELSE 0 END)                                         AS lowStockCount,
        SUM(CASE
          WHEN c.onDemand = 0
           AND COALESCE(lot.totalStock, 0) > 0
           AND (c.reorderPoint IS NULL
                OR COALESCE(lot.totalStock, 0) > c.reorderPoint)
          THEN 1 ELSE 0 END)                                         AS inStockCount
      FROM consumables c
      LEFT JOIN (
        SELECT consumableID, SUM(quantityRemaining) AS totalStock
        FROM inventoryLots
        WHERE status = 'active'
        GROUP BY consumableID
      ) lot ON c.consumableID = lot.consumableID
      WHERE c.isActive = 1
    `;

    const result = db.exec(sql);
    const rows = resultToObjects<Record<string, SqlValue>>(result);

    if (rows.length === 0) {
      return {
        totalConsumables: 0,
        inStockCount: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        onDemandCount: 0,
      };
    }

    const row = rows[0];
    return {
      totalConsumables: (row.totalConsumables as number) ?? 0,
      inStockCount: (row.inStockCount as number) ?? 0,
      lowStockCount: (row.lowStockCount as number) ?? 0,
      outOfStockCount: (row.outOfStockCount as number) ?? 0,
      onDemandCount: (row.onDemandCount as number) ?? 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch inventory stats:', message);
    throw new Error(`Failed to fetch inventory stats: ${message}`);
  }
}
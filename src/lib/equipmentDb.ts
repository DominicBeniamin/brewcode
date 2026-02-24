// src/lib/equipmentDb.ts

import type { Database, SqlValue } from 'sql.js';
import { resultToObjects } from './dbHelpers';
import type {
  Equipment,
  EquipmentWithUsage,
  EquipmentCurrentUsage,
  CreateEquipmentData,
  UpdateEquipmentData,
  GetEquipmentOptions,
  GetAvailableEquipmentOptions,
  GetEquipmentForStageOptions,
  EquipmentOperationResult,
  EquipmentMaterial,
  TemperatureUnit,
} from '../types/equipment';

/**
 * Create a new piece of equipment
 */
export function createEquipment(
  db: Database,
  equipmentData: CreateEquipmentData
): Equipment {
  // STEP 1: VALIDATE REQUIRED FIELDS
  if (!equipmentData.name || equipmentData.name.trim() === '') {
    throw new Error('Equipment name is required');
  }

  if (!equipmentData.type || equipmentData.type.trim() === '') {
    throw new Error('Equipment type is required');
  }

  // STEP 2: VALIDATE canBeOccupied
  if (equipmentData.canBeOccupied !== undefined) {
    if (equipmentData.canBeOccupied !== 0 && equipmentData.canBeOccupied !== 1) {
      throw new Error('canBeOccupied must be 0 or 1');
    }
  }

  // STEP 3: VALIDATE capacityL (if provided)
  if (equipmentData.capacityL !== undefined && equipmentData.capacityL !== null) {
    if (typeof equipmentData.capacityL !== 'number' || equipmentData.capacityL <= 0) {
      throw new Error('Capacity must be a positive number');
    }
  }

  // STEP 4: VALIDATE calibrationTemp and calibrationTempUnit
  const requiresCalibration = ['hydrometer', 'refractometer'].includes(
    equipmentData.type.toLowerCase()
  );

  if (
    equipmentData.calibrationTemp !== undefined &&
    equipmentData.calibrationTemp !== null
  ) {
    if (typeof equipmentData.calibrationTemp !== 'number') {
      throw new Error('Calibration temperature must be a number');
    }

    // If calibrationTemp provided, calibrationTempUnit is required
    if (
      !equipmentData.calibrationTempUnit ||
      equipmentData.calibrationTempUnit.trim() === ''
    ) {
      throw new Error(
        'Calibration temperature unit is required when calibration temperature is provided'
      );
    }

    // Validate unit
    const validUnits: TemperatureUnit[] = ['c', 'f'];
    if (!validUnits.includes(equipmentData.calibrationTempUnit.toLowerCase() as TemperatureUnit)) {
      throw new Error('Calibration temperature unit must be "c" or "f"');
    }
  }

  // Warn if hydrometer/refractometer missing calibration
  if (requiresCalibration && !equipmentData.calibrationTemp) {
    console.warn(
      `Warning: ${equipmentData.type} typically requires calibration temperature`
    );
  }

  // STEP 5: BUSINESS RULE - Vessels should have capacity
  const vesselTypes = ['fermenter', 'carboy', 'keg'];
  if (vesselTypes.includes(equipmentData.type.toLowerCase())) {
    if (!equipmentData.capacityL) {
      console.warn(`Warning: ${equipmentData.type} typically requires capacityL`);
    }
  }

  // STEP 6: PREPARE DATA
  const equipment = {
    name: equipmentData.name.trim(),
    type: equipmentData.type.trim(),
    canBeOccupied: equipmentData.canBeOccupied ?? 0,
    capacityL: equipmentData.capacityL ?? null,
    material: (equipmentData.material?.trim() || null) as EquipmentMaterial | null,
    calibrationTemp: equipmentData.calibrationTemp ?? null,
    calibrationTempUnit: (equipmentData.calibrationTempUnit?.toLowerCase() || null) as TemperatureUnit | null,
    notes: equipmentData.notes?.trim() || null,
  };

  try {
    // STEP 7: INSERT EQUIPMENT
    const sql = `
      INSERT INTO equipment (name, type, canBeOccupied, capacityL, material, calibrationTemp, calibrationTempUnit, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
      equipment.name,
      equipment.type,
      equipment.canBeOccupied,
      equipment.capacityL,
      equipment.material,
      equipment.calibrationTemp,
      equipment.calibrationTempUnit,
      equipment.notes,
    ]);

    // STEP 8: GET THE NEW EQUIPMENT ID
    const result = db.exec('SELECT last_insert_rowid() as id');
    const equipmentID = result[0].values[0][0] as number;

    console.log(`Equipment created successfully: ID ${equipmentID}`);

    // STEP 9: RETURN COMPLETE OBJECT
    return {
      equipmentID,
      name: equipment.name,
      type: equipment.type,
      canBeOccupied: equipment.canBeOccupied,
      capacityL: equipment.capacityL,
      material: equipment.material,
      calibrationTemp: equipment.calibrationTemp,
      calibrationTempUnit: equipment.calibrationTempUnit,
      notes: equipment.notes,
      isActive: 1,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create equipment:', message);
    throw new Error(`Failed to create equipment: ${message}`);
  }
}

/**
 * Get a single piece of equipment by ID
 */
export function getEquipment(db: Database, equipmentID: number): Equipment | null {
  if (typeof equipmentID !== 'number' || equipmentID <= 0) {
    throw new Error('Invalid equipment ID (must be positive number)');
  }

  try {
    const sql = 'SELECT * FROM equipment WHERE equipmentID = ?';
    const result = db.exec(sql, [equipmentID]);
    const equipment = resultToObjects<Equipment>(result);

    if (equipment.length === 0) {
      return null;
    }

    return equipment[0];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch equipment:', message);
    throw new Error(`Failed to fetch equipment: ${message}`);
  }
}

/**
 * Get all equipment with optional filters
 */
export function getAllEquipment(
  db: Database,
  options: GetEquipmentOptions = {}
): Equipment[] {
  try {
    let sql = 'SELECT * FROM equipment';
    const conditions: string[] = [];
    const params: SqlValue[] = [];

    if (options.type !== undefined) {
      if (typeof options.type !== 'string' || options.type.trim() === '') {
        throw new Error('type must be a non-empty string');
      }
      conditions.push('type = ?');
      params.push(options.type.trim());
    }

    if (options.canBeOccupied !== undefined) {
      if (options.canBeOccupied !== 0 && options.canBeOccupied !== 1) {
        throw new Error('canBeOccupied must be 0 or 1');
      }
      conditions.push('canBeOccupied = ?');
      params.push(options.canBeOccupied);
    }

    if (options.isActive !== undefined) {
      if (options.isActive !== 0 && options.isActive !== 1) {
        throw new Error('isActive must be 0 or 1');
      }
      conditions.push('isActive = ?');
      params.push(options.isActive);
    }

    if (options.minCapacityL !== undefined) {
      if (
        typeof options.minCapacityL !== 'number' ||
        options.minCapacityL <= 0
      ) {
        throw new Error('minCapacityL must be a positive number');
      }
      conditions.push('capacityL >= ?');
      params.push(options.minCapacityL);
    }

    if (options.maxCapacityL !== undefined) {
      if (
        typeof options.maxCapacityL !== 'number' ||
        options.maxCapacityL <= 0
      ) {
        throw new Error('maxCapacityL must be a positive number');
      }
      conditions.push('capacityL <= ?');
      params.push(options.maxCapacityL);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY type ASC, name ASC';

    console.log(`Fetching equipment with query: ${sql}`);

    const result = db.exec(sql, params);
    const equipment = resultToObjects<Equipment>(result);

    console.log(`Found ${equipment.length} equipment items`);
    return equipment;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch equipment:', message);
    throw new Error(`Failed to fetch equipment: ${message}`);
  }
}

/**
 * Update equipment
 */
export function updateEquipment(
  db: Database,
  equipmentID: number,
  updates: UpdateEquipmentData
): EquipmentOperationResult {
  // STEP 1: VALIDATE EQUIPMENT ID
  if (typeof equipmentID !== 'number' || equipmentID <= 0) {
    throw new Error('Invalid equipment ID (must be positive number)');
  }

  // STEP 2: CHECK IF EQUIPMENT EXISTS
  const equipment = getEquipment(db, equipmentID);
  if (!equipment) {
    throw new Error(`Equipment ID ${equipmentID} does not exist`);
  }

  // STEP 3: VALIDATE FIELDS
  if ('name' in updates && (!updates.name || updates.name.trim() === '')) {
    throw new Error('Equipment name cannot be empty');
  }

  if ('type' in updates && (!updates.type || updates.type.trim() === '')) {
    throw new Error('Equipment type cannot be empty');
  }

  if ('canBeOccupied' in updates) {
    if (updates.canBeOccupied !== 0 && updates.canBeOccupied !== 1) {
      throw new Error('canBeOccupied must be 0 or 1');
    }
  }

  if ('capacityL' in updates && updates.capacityL !== null) {
    if (typeof updates.capacityL !== 'number' || updates.capacityL <= 0) {
      throw new Error('Capacity must be a positive number or null');
    }
  }

  // STEP 4: VALIDATE CALIBRATION FIELDS
  if ('calibrationTemp' in updates && updates.calibrationTemp !== null) {
    if (typeof updates.calibrationTemp !== 'number') {
      throw new Error('Calibration temperature must be a number or null');
    }

    const finalUnit = updates.calibrationTempUnit || equipment.calibrationTempUnit;
    if (!finalUnit) {
      throw new Error(
        'Calibration temperature unit is required when calibration temperature is provided'
      );
    }
  }

  if ('calibrationTempUnit' in updates && updates.calibrationTempUnit !== null) {
    if (typeof updates.calibrationTempUnit !== 'string') {
      throw new Error('Calibration temperature unit must be a string or null');
    }

    const validUnits: TemperatureUnit[] = ['c', 'f'];
    if (!validUnits.includes(updates.calibrationTempUnit.toLowerCase() as TemperatureUnit)) {
      throw new Error('Calibration temperature unit must be "c" or "f"');
    }
  }

  // STEP 5: FILTER TO ALLOWED FIELDS
  const allowedFields: Array<keyof UpdateEquipmentData> = [
    'name',
    'type',
    'canBeOccupied',
    'capacityL',
    'material',
    'calibrationTemp',
    'calibrationTempUnit',
    'notes',
  ];

  const filteredUpdates: Partial<UpdateEquipmentData> = {};
  const unauthorizedFields: string[] = [];

  for (const key of Object.keys(updates) as Array<keyof UpdateEquipmentData>) {
    if (allowedFields.includes(key)) {
      filteredUpdates[key] = updates[key] as never;
    } else {
      unauthorizedFields.push(key);
    }
  }

  if (unauthorizedFields.length > 0) {
    console.warn(
      `Attempted to update unauthorized fields: ${unauthorizedFields.join(', ')}`
    );
  }

  if (Object.keys(filteredUpdates).length === 0) {
    throw new Error('No valid fields to update');
  }

  // STEP 6: PREPARE DATA AND BUILD SQL
  const setClauses: string[] = [];
  const values: SqlValue[] = [];

  for (const [key, value] of Object.entries(filteredUpdates)) {
    if (['name', 'type', 'material', 'notes'].includes(key)) {
      setClauses.push(`${key} = ?`);
      values.push(value ? (value as string).trim() : null);
    } else if (key === 'calibrationTempUnit') {
      setClauses.push(`${key} = ?`);
      values.push(value ? (value as string).toLowerCase().trim() : null);
    } else {
      setClauses.push(`${key} = ?`);
      values.push(value as SqlValue);
    }
  }

  const sql = `UPDATE equipment SET ${setClauses.join(', ')} WHERE equipmentID = ?`;
  values.push(equipmentID);

  try {
    // STEP 7: EXECUTE UPDATE
    db.run(sql, values);

    console.log(`Equipment ${equipmentID} updated successfully`);

    // STEP 8: RETURN SUCCESS
    return {
      success: true,
      message: `Equipment "${equipment.name}" updated successfully`,
      updatedFields: Object.entries(filteredUpdates).map(([field, newValue]) => ({
        field,
        newValue,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to update equipment:', message);
    throw new Error(`Failed to update equipment: ${message}`);
  }
}

/**
 * Set equipment active status
 */
export function setEquipmentStatus(
  db: Database,
  equipmentID: number,
  isActive: 0 | 1
): EquipmentOperationResult {
  if (typeof equipmentID !== 'number' || equipmentID <= 0) {
    throw new Error('Invalid equipment ID (must be positive number)');
  }

  if (isActive !== 0 && isActive !== 1) {
    throw new Error('isActive must be 0 or 1');
  }

  const equipment = getEquipment(db, equipmentID);
  if (!equipment) {
    throw new Error(`Equipment ID ${equipmentID} does not exist`);
  }

  if (equipment.isActive === isActive) {
    const status = isActive === 1 ? 'active' : 'inactive';
    return {
      success: true,
      message: `Equipment "${equipment.name}" is already ${status}`,
    };
  }

  try {
    const sql = 'UPDATE equipment SET isActive = ? WHERE equipmentID = ?';
    db.run(sql, [isActive, equipmentID]);

    const status = isActive === 1 ? 'activated' : 'deactivated';
    console.log(`Equipment "${equipment.name}" ${status}`);

    return {
      success: true,
      message: `Equipment "${equipment.name}" ${status} successfully`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to update equipment status:', message);
    throw new Error(`Failed to update equipment status: ${message}`);
  }
}

/**
 * Get available equipment (not currently in use)
 */
export function getAvailableEquipment(
  db: Database,
  options: GetAvailableEquipmentOptions = {}
): Equipment[] {
  try {
    let sql = `
      SELECT e.*
      FROM equipment e
      LEFT JOIN (
        SELECT equipmentID, status, 
               ROW_NUMBER() OVER (PARTITION BY equipmentID ORDER BY inUseDate DESC) as rn
        FROM equipmentUsage
      ) latest ON e.equipmentID = latest.equipmentID AND latest.rn = 1
      WHERE e.isActive = 1
      AND (latest.status IS NULL OR latest.status = 'available')
    `;

    const conditions: string[] = [];
    const params: SqlValue[] = [];

    if (options.type !== undefined) {
      if (typeof options.type !== 'string' || options.type.trim() === '') {
        throw new Error('type must be a non-empty string');
      }
      conditions.push('e.type = ?');
      params.push(options.type.trim());
    }

    if (options.canBeOccupied !== undefined) {
      if (options.canBeOccupied !== 0 && options.canBeOccupied !== 1) {
        throw new Error('canBeOccupied must be 0 or 1');
      }
      conditions.push('e.canBeOccupied = ?');
      params.push(options.canBeOccupied);
    }

    if (options.minCapacityL !== undefined) {
      if (
        typeof options.minCapacityL !== 'number' ||
        options.minCapacityL <= 0
      ) {
        throw new Error('minCapacityL must be a positive number');
      }
      conditions.push('e.capacityL >= ?');
      params.push(options.minCapacityL);
    }

    if (options.maxCapacityL !== undefined) {
      if (
        typeof options.maxCapacityL !== 'number' ||
        options.maxCapacityL <= 0
      ) {
        throw new Error('maxCapacityL must be a positive number');
      }
      conditions.push('e.capacityL <= ?');
      params.push(options.maxCapacityL);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY e.type ASC, e.name ASC';

    console.log(`Fetching available equipment with query: ${sql}`);

    const result = db.exec(sql, params);
    const equipment = resultToObjects<Equipment>(result);

    console.log(`Found ${equipment.length} available equipment items`);
    return equipment;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch available equipment:', message);
    throw new Error(`Failed to fetch available equipment: ${message}`);
  }
}

/**
 * Assign equipment to a batch stage
 */
export function assignEquipmentToStage(
  db: Database,
  equipmentID: number,
  batchStageID: number,
  inUseDate: string | null = null
): EquipmentOperationResult {
  if (typeof equipmentID !== 'number' || equipmentID <= 0) {
    throw new Error('Invalid equipment ID (must be positive number)');
  }

  if (typeof batchStageID !== 'number' || batchStageID <= 0) {
    throw new Error('Invalid batch stage ID (must be positive number)');
  }

  const equipment = getEquipment(db, equipmentID);
  if (!equipment) {
    throw new Error(`Equipment ID ${equipmentID} does not exist`);
  }

  if (equipment.isActive === 0) {
    throw new Error(`Equipment "${equipment.name}" is not active`);
  }

  if (equipment.canBeOccupied !== 1) {
    throw new Error(
      `Equipment "${equipment.name}" cannot be occupied (canBeOccupied = 0)`
    );
  }

  const stageSql =
    'SELECT batchStageID, stageName FROM batchStages WHERE batchStageID = ?';
  const stageResult = db.exec(stageSql, [batchStageID]);

  if (stageResult.length === 0 || stageResult[0].values.length === 0) {
    throw new Error(`Batch stage ID ${batchStageID} does not exist`);
  }

  const stageName = stageResult[0].values[0][1] as string;

  const checkSql = `
    SELECT usageID, status 
    FROM equipmentUsage 
    WHERE equipmentID = ? 
    ORDER BY inUseDate DESC 
    LIMIT 1
  `;
  const checkResult = db.exec(checkSql, [equipmentID]);

  if (checkResult.length > 0 && checkResult[0].values.length > 0) {
    const latestStatus = checkResult[0].values[0][1] as string;
    if (latestStatus === 'in-use') {
      throw new Error(
        `Equipment "${equipment.name}" is currently in use. Release it first before reassigning.`
      );
    }
  }

  if (inUseDate !== null) {
    if (typeof inUseDate !== 'string') {
      throw new Error(
        'inUseDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)'
      );
    }
  }

  try {
    const sql = `
      INSERT INTO equipmentUsage (equipmentID, batchStageID, inUseDate, status)
      VALUES (?, ?, ?, 'in-use')
    `;

    const dateValue =
      inUseDate || (db.exec("SELECT DATETIME('now')")[0].values[0][0] as string);

    db.run(sql, [equipmentID, batchStageID, dateValue, 'in-use']);

    const result = db.exec('SELECT last_insert_rowid() as id');
    const usageID = result[0].values[0][0] as number;

    console.log(
      `Equipment "${equipment.name}" assigned to stage "${stageName}": usage ID ${usageID}`
    );

    return {
      success: true,
      usageID,
      message: `Equipment "${equipment.name}" assigned to stage "${stageName}"`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to assign equipment:', message);
    throw new Error(`Failed to assign equipment: ${message}`);
  }
}

/**
 * Release equipment from a batch stage
 */
export function releaseEquipmentFromStage(
  db: Database,
  equipmentID: number,
  batchStageID: number,
  releaseDate: string | null = null
): EquipmentOperationResult {
  if (typeof equipmentID !== 'number' || equipmentID <= 0) {
    throw new Error('Invalid equipment ID (must be positive number)');
  }

  if (typeof batchStageID !== 'number' || batchStageID <= 0) {
    throw new Error('Invalid batch stage ID (must be positive number)');
  }

  const equipment = getEquipment(db, equipmentID);
  if (!equipment) {
    throw new Error(`Equipment ID ${equipmentID} does not exist`);
  }

  const stageSql =
    'SELECT batchStageID, stageName FROM batchStages WHERE batchStageID = ?';
  const stageResult = db.exec(stageSql, [batchStageID]);

  if (stageResult.length === 0 || stageResult[0].values.length === 0) {
    throw new Error(`Batch stage ID ${batchStageID} does not exist`);
  }

  const stageName = stageResult[0].values[0][1] as string;

  const usageSql = `
    SELECT usageID, status, releaseDate
    FROM equipmentUsage
    WHERE equipmentID = ? AND batchStageID = ?
    ORDER BY inUseDate DESC
    LIMIT 1
  `;
  const usageResult = db.exec(usageSql, [equipmentID, batchStageID]);

  if (usageResult.length === 0 || usageResult[0].values.length === 0) {
    throw new Error(
      `Equipment "${equipment.name}" is not assigned to stage "${stageName}"`
    );
  }

  const [usageID, status, currentReleaseDate] = usageResult[0].values[0];

  if (status === 'available' && currentReleaseDate !== null) {
    return {
      success: true,
      message: `Equipment "${equipment.name}" was already released from stage "${stageName}" on ${currentReleaseDate}`,
    };
  }

  if (releaseDate !== null) {
    if (typeof releaseDate !== 'string') {
      throw new Error(
        'releaseDate must be a string in ISO 8601 format (YYYY-MM-DD HH:MM:SS)'
      );
    }
  }

  try {
    const updateSql = `
      UPDATE equipmentUsage 
      SET releaseDate = ?, status = 'available'
      WHERE usageID = ?
    `;

    const dateValue =
      releaseDate || (db.exec("SELECT DATETIME('now')")[0].values[0][0] as string);

    db.run(updateSql, [dateValue, usageID]);

    console.log(`Equipment "${equipment.name}" released from stage "${stageName}"`);

    return {
      success: true,
      message: `Equipment "${equipment.name}" released from stage "${stageName}" and is now available`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to release equipment:', message);
    throw new Error(`Failed to release equipment: ${message}`);
  }
}

/**
 * Get equipment assigned to a batch stage
 */
export function getEquipmentForStage(
  db: Database,
  batchStageID: number,
  options: GetEquipmentForStageOptions = {}
): EquipmentWithUsage[] {
  if (typeof batchStageID !== 'number' || batchStageID <= 0) {
    throw new Error('Invalid batch stage ID (must be positive number)');
  }

  try {
    let sql = `
      SELECT 
        e.*,
        eu.usageID,
        eu.inUseDate,
        eu.releaseDate,
        eu.status as usageStatus
      FROM equipment e
      JOIN equipmentUsage eu ON e.equipmentID = eu.equipmentID
      WHERE eu.batchStageID = ?
    `;

    const params: SqlValue[] = [batchStageID];

    if (options.status !== undefined) {
      const validStatuses = ['in-use', 'available'];
      if (!validStatuses.includes(options.status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
      sql += ' AND eu.status = ?';
      params.push(options.status);
    }

    sql += ' ORDER BY eu.inUseDate DESC';

    console.log(`Fetching equipment for batch stage ${batchStageID}`);

    const result = db.exec(sql, params);
    const equipment = resultToObjects<EquipmentWithUsage>(result);

    console.log(`Found ${equipment.length} equipment items for stage`);
    return equipment;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch equipment for stage:', message);
    throw new Error(`Failed to fetch equipment for stage: ${message}`);
  }
}

/**
 * Get current usage information for equipment
 */
export function getEquipmentCurrentUsage(
  db: Database,
  equipmentID: number
): EquipmentCurrentUsage | null {
  if (typeof equipmentID !== 'number' || equipmentID <= 0) {
    throw new Error('Invalid equipment ID (must be positive number)');
  }

  try {
    const sql = `
      SELECT 
        eu.usageID,
        eu.equipmentID,
        eu.batchStageID,
        eu.inUseDate,
        eu.releaseDate,
        eu.status,
        bs.stageName,
        bs.stageOrder,
        b.batchID,
        b.name as batchName,
        b.recipeName
      FROM equipmentUsage eu
      JOIN batchStages bs ON eu.batchStageID = bs.batchStageID
      JOIN batches b ON bs.batchID = b.batchID
      WHERE eu.equipmentID = ?
      AND eu.status = 'in-use'
      ORDER BY eu.inUseDate DESC
      LIMIT 1
    `;

    const result = db.exec(sql, [equipmentID]);
    const usage = resultToObjects<EquipmentCurrentUsage>(result);

    if (usage.length === 0) {
      console.log(`Equipment ${equipmentID} is not currently in use`);
      return null;
    }

    console.log(
      `Equipment ${equipmentID} is in use by batch ${usage[0].batchName}, stage ${usage[0].stageName}`
    );
    return usage[0];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch equipment current usage:', message);
    throw new Error(`Failed to fetch equipment current usage: ${message}`);
  }
}
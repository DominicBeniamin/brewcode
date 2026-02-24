// src/types/equipment.ts

/**
 * Equipment category classifications
 */
export type EquipmentCategory = 'vessel' | 'monitoring' | 'lab' | 'other' | 'custom';

/**
 * Equipment status for usage tracking
 */
export type EquipmentStatus = 'in-use' | 'available';

/**
 * Temperature unit for calibration
 */
export type TemperatureUnit = 'c' | 'f';

/**
 * Equipment material types
 */
export type EquipmentMaterial = 'Plastic' | 'Glass' | 'Stainless Steel' | '';

/**
 * Core equipment record from database
 */
export interface Equipment {
  equipmentID: number;
  name: string;
  type: string;
  canBeOccupied: 0 | 1;
  capacityL: number | null;
  material: EquipmentMaterial | null;
  calibrationTemp: number | null;
  calibrationTempUnit: TemperatureUnit | null;
  notes: string | null;
  isActive: 0 | 1;
}

/**
 * Equipment with current usage information
 */
export interface EquipmentWithUsage extends Equipment {
  usageID?: number;
  inUseDate?: string;
  releaseDate?: string | null;
  usageStatus?: EquipmentStatus;
}

/**
 * Equipment current usage details
 */
export interface EquipmentCurrentUsage {
  usageID: number;
  equipmentID: number;
  batchStageID: number;
  inUseDate: string;
  releaseDate: string | null;
  status: EquipmentStatus;
  stageName: string;
  stageOrder: number;
  batchID: number;
  batchName: string;
  recipeName: string;
}

/**
 * Data for creating new equipment
 */
export interface CreateEquipmentData {
  name: string;
  type: string;
  canBeOccupied?: 0 | 1;
  capacityL?: number;
  material?: EquipmentMaterial;
  calibrationTemp?: number;
  calibrationTempUnit?: TemperatureUnit;
  notes?: string;
}

/**
 * Data for updating existing equipment
 */
export interface UpdateEquipmentData {
  name?: string;
  type?: string;
  canBeOccupied?: 0 | 1;
  capacityL?: number | null;
  material?: EquipmentMaterial | null;
  calibrationTemp?: number | null;
  calibrationTempUnit?: TemperatureUnit | null;
  notes?: string | null;
}

/**
 * Filter options for querying equipment
 */
export interface GetEquipmentOptions {
  type?: string;
  canBeOccupied?: 0 | 1;
  isActive?: 0 | 1;
  minCapacityL?: number;
  maxCapacityL?: number;
}

/**
 * Filter options for available equipment
 */
export interface GetAvailableEquipmentOptions {
  type?: string;
  canBeOccupied?: 0 | 1;
  minCapacityL?: number;
  maxCapacityL?: number;
}

/**
 * Filter options for equipment assigned to a stage
 */
export interface GetEquipmentForStageOptions {
  status?: EquipmentStatus;
}

/**
 * Equipment form data for UI
 */
export interface EquipmentFormData {
  equipmentType: EquipmentCategory;
  customTypeName: string;
  name: string;
  quantity: number;
  capacity: string;
  capacityUnit: 'l' | 'gal' | 'imp-gal';
  material: EquipmentMaterial;
  calibrationTemp: string;
  calibrationTempUnit: TemperatureUnit;
  notes: string;
}

/**
 * Result from equipment operations
 */
export interface EquipmentOperationResult {
  success: boolean;
  message: string;
  updatedFields?: Array<{
    field: string;
    newValue: unknown;
  }>;
  usageID?: number;
}

/**
 * Equipment statistics for dashboard
 */
export interface EquipmentStats {
  vessels: Equipment[];
  monitoring: Equipment[];
  lab: Equipment[];
  other: Equipment[];
}
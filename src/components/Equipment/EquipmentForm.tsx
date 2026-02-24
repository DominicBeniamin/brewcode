// src/components/Equipment/EquipmentForm.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../hooks/useToast';
import { convert } from '../../lib/conversions';
import { createEquipment, updateEquipment, getEquipment } from '../../lib/equipmentDb';
import {
  CompactNumberField,
  CompactSelectField,
  INPUT_WIDTHS,
} from '../common/FormComponents';
import type {
  EquipmentCategory,
  EquipmentFormData,
  TemperatureUnit,
  EquipmentMaterial,
} from '../../types/equipment';

interface EquipmentFormProps {
  mode: 'add' | 'edit';
  equipmentID?: number;
  onComplete: () => void;
}

type EquipmentTypeOption = {
  value: EquipmentCategory;
  label: string;
};

const equipmentTypeOptions: EquipmentTypeOption[] = [
  { value: 'vessel', label: 'Fermentation Vessel (Bucket, Carboy, Keg, etc)' },
  { value: 'monitoring', label: 'Monitoring Device (TILT, Inkbird Controller, etc)' },
  { value: 'lab', label: 'Lab Equipment (Hydrometer, Refractometer, pH Meter, etc)' },
  { value: 'other', label: 'Other (Auto-siphon, corker, etc)' },
  { value: 'custom', label: 'Custom (specify below)' },
];

const placeholders: Record<EquipmentCategory, string> = {
  vessel: 'e.g., Primary Fermenter #1',
  monitoring: 'e.g., TILT Blue',
  lab: 'e.g., Triple Scale Hydrometer',
  other: 'e.g., Auto-Siphon',
  custom: 'e.g., My Custom Equipment',
};

export const EquipmentForm: React.FC<EquipmentFormProps> = ({ mode, equipmentID, onComplete }) => {
  const { db, markDirty } = useDatabase();
  const { settings } = useSettings();
  const toast = useToast();

  const [formData, setFormData] = useState<EquipmentFormData>({
    equipmentType: '' as EquipmentCategory,
    customTypeName: '',
    name: '',
    quantity: 1,
    capacity: '',
    capacityUnit: 'l',
    material: '',
    calibrationTemp: '',
    calibrationTempUnit: 'c',
    notes: '',
  });

  const [showDynamicFields, setShowDynamicFields] = useState(mode === 'edit');
  const [isLoadingData, setIsLoadingData] = useState(mode === 'edit');

  // Load existing equipment for edit mode
  useEffect(() => {
    if (mode === 'edit' && equipmentID && db && settings) {
      try {
        const equipment = getEquipment(db, equipmentID);
        if (!equipment) {
          toast.error('Equipment not found');
          onComplete();
          return;
        }

        // Determine equipment type category
        let equipmentType: EquipmentCategory = 'other';
        const type = equipment.type.toLowerCase();
        if (['vessel', 'bucket', 'carboy', 'keg', 'fermenter'].some((v) => type.includes(v))) {
          equipmentType = 'vessel';
        } else if (
          ['monitoring', 'tilt', 'inkbird', 'controller', 'monitor'].some((v) =>
            type.includes(v)
          )
        ) {
          equipmentType = 'monitoring';
        } else if (
          ['lab', 'hydrometer', 'refractometer', 'ph meter'].some((v) => type.includes(v))
        ) {
          equipmentType = 'lab';
        } else if (!['vessel', 'monitoring', 'lab', 'other'].includes(type)) {
          equipmentType = 'custom';
        }

        // Convert capacity to user's preferred unit
        let displayCapacity = '';
        let displayCapacityUnit: 'l' | 'gal' | 'imp-gal' = 'l';
        if (equipment.capacityL) {
          if (settings.measurementSystem === 'us') {
            displayCapacity = convert(equipment.capacityL, 'l', 'gal', 'volume').toFixed(1);
            displayCapacityUnit = 'gal';
          } else if (settings.measurementSystem === 'imperial') {
            displayCapacity = convert(equipment.capacityL, 'l', 'imp-gal', 'volume').toFixed(
              1
            );
            displayCapacityUnit = 'imp-gal';
          } else {
            displayCapacity = equipment.capacityL.toFixed(1);
          }
        }

        setFormData({
          equipmentType,
          customTypeName: equipmentType === 'custom' ? equipment.type : '',
          name: equipment.name,
          quantity: 1,
          capacity: displayCapacity,
          capacityUnit: displayCapacityUnit,
          material: equipment.material || '',
          calibrationTemp: equipment.calibrationTemp?.toString() || '',
          calibrationTempUnit: equipment.calibrationTempUnit || 'c',
          notes: equipment.notes || '',
        });
        
        setIsLoadingData(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to load equipment: ${message}`);
        onComplete();
      }
    } else if (mode === 'add') {
      setIsLoadingData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, equipmentID, db, settings]);

  // Set default capacity unit based on measurement system (only on mount for add mode)
  useEffect(() => {
    if (mode === 'add' && settings) {
      if (settings.measurementSystem === 'us') {
        setFormData((prev) => ({ ...prev, capacityUnit: 'gal' }));
      } else if (settings.measurementSystem === 'imperial') {
        setFormData((prev) => ({ ...prev, capacityUnit: 'imp-gal' }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const handleEquipmentTypeChange = useCallback((value: string) => {
    const equipmentType = value as EquipmentCategory;
    setFormData((prev) => ({ ...prev, equipmentType }));

    if (value) {
      setShowDynamicFields(true);
    } else {
      setShowDynamicFields(false);
    }
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!db) {
        toast.error('Database not available');
        return;
      }

      // Determine the equipment type
      let equipmentType = formData.equipmentType;
      if (equipmentType === 'custom') {
        equipmentType = formData.customTypeName as EquipmentCategory;
      }

      // Prepare base equipment data
      const equipmentData: {
        type: string;
        canBeOccupied: 0 | 1;
        notes?: string;
        name?: string;
        capacityL?: number;
        material?: EquipmentMaterial;
        calibrationTemp?: number;
        calibrationTempUnit?: TemperatureUnit;
      } = {
        type: equipmentType,
        canBeOccupied:
          equipmentType === 'vessel' || equipmentType === 'monitoring' ? 1 : 0,
        notes: formData.notes || undefined,
      };

      // Add name (only for edit mode, add mode handles quantity differently)
      if (mode === 'edit') {
        equipmentData.name = formData.name;
      }

      // Add capacity if vessel (convert to liters for storage)
      if (equipmentType === 'vessel') {
        const capacity = parseFloat(formData.capacity);
        const unit = formData.capacityUnit;

        if (capacity) {
          equipmentData.capacityL =
            unit === 'l' ? capacity : convert(capacity, unit, 'l', 'volume');
        }

        // Add material if specified
        if (formData.material) {
          equipmentData.material = formData.material as EquipmentMaterial;
        }
      }

      // Add calibration temp if lab equipment and value provided
      if (equipmentType === 'lab') {
        const calibTemp = formData.calibrationTemp;
        if (calibTemp && calibTemp.trim() !== '') {
          const tempValue = parseFloat(calibTemp);
          const tempUnit = formData.calibrationTempUnit;

          equipmentData.calibrationTemp = tempValue;
          equipmentData.calibrationTempUnit = tempUnit;
        }
      }

      try {
        if (mode === 'add') {
          // Add mode: create multiple items based on quantity
          const quantity = formData.quantity;
          const baseName = formData.name;

          for (let i = 0; i < quantity; i++) {
            const itemName = quantity > 1 ? `${baseName} #${i + 1}` : baseName;

            createEquipment(db, {
              ...equipmentData,
              name: itemName,
            });
          }

          toast.success(
            `✓ Successfully added ${quantity} equipment item${quantity > 1 ? 's' : ''}`
          );
        } else if (equipmentID) {
          // Edit mode: update existing equipment
          updateEquipment(db, equipmentID, equipmentData);
          toast.success('✓ Equipment updated successfully');
        }

        // Mark database as dirty to trigger auto-save
        markDirty();

        // Navigate back to equipment list
        onComplete();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to ${mode} equipment: ${message}`);
      }
    },
    [db, formData, mode, equipmentID, onComplete, toast]
  );

  const isVesselType = formData.equipmentType === 'vessel';
  const isLabType = formData.equipmentType === 'lab';
  const isCustomType = formData.equipmentType === 'custom';

  // Show loading state while data is being loaded in edit mode
  if (isLoadingData) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-2xl font-semibold text-white mb-6">Loading...</h3>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h3 className="text-2xl font-semibold text-white mb-6">
        {mode === 'add' ? 'Add Equipment' : 'Edit Equipment'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Equipment Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Equipment Type <span className="text-red-500">*</span>
          </label>
          <CompactSelectField
            id="equipmentType"
            label=""
            value={formData.equipmentType}
            onChange={(e) => handleEquipmentTypeChange(e.target.value)}
            options={
              mode === 'add'
                ? [{ value: '', label: 'Select equipment type...' }, ...equipmentTypeOptions]
                : equipmentTypeOptions
            }
          />
        </div>

        {/* Dynamic fields container */}
        {showDynamicFields && (
          <div className="space-y-6">
            {/* Custom Type Name (only for custom) */}
            {isCustomType && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Custom Type Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customTypeName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customTypeName: e.target.value }))
                  }
                  placeholder="e.g., Bottle Filler"
                  required={isCustomType}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                />
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={
                  formData.equipmentType
                    ? placeholders[formData.equipmentType]
                    : 'Select equipment type first'
                }
                required
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Give this equipment a unique, descriptive name to identify it
              </p>
            </div>

            {/* Quantity (only for add mode) */}
            {mode === 'add' && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <CompactNumberField
                  id="quantity"
                  label=""
                  value={formData.quantity.toString()}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))
                  }
                  min={1}
                  max={99}
                  fieldType={INPUT_WIDTHS.SHORT}
                />
              </div>
            )}

            {/* Capacity (only for vessels) */}
            {isVesselType && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Capacity <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <CompactNumberField
                    id="capacityValue"
                    label=""
                    value={formData.capacity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value }))}
                    placeholder="0.0"
                    step="0.1"
                    min={0.1}
                    fieldType={INPUT_WIDTHS.MEDIUM}
                    required={isVesselType}
                  />
                  <CompactSelectField
                    id="capacityUnit"
                    label=""
                    value={formData.capacityUnit}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        capacityUnit: e.target.value as 'l' | 'gal' | 'imp-gal',
                      }))
                    }
                    options={[
                      { value: 'l', label: 'Litres (L)' },
                      { value: 'gal', label: 'US Gallons (gal)' },
                      { value: 'imp-gal', label: 'Imperial Gallons (gal)' },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* Material (only for vessels) */}
            {isVesselType && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Material
                </label>
                <CompactSelectField
                  id="material"
                  label=""
                  value={formData.material}
                  onChange={(e) => setFormData((prev) => ({ ...prev, material: e.target.value as EquipmentMaterial }))}
                  options={[
                    { value: '', label: 'Not specified' },
                    { value: 'Plastic', label: 'Plastic' },
                    { value: 'Glass', label: 'Glass' },
                    { value: 'Stainless Steel', label: 'Stainless Steel' },
                  ]}
                />
              </div>
            )}

            {/* Calibration Temperature (only for lab) */}
            {isLabType && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Calibration Temperature
                </label>
                <div className="flex gap-2">
                  <CompactNumberField
                    id="calibrationTemp"
                    label=""
                    value={formData.calibrationTemp}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, calibrationTemp: e.target.value }))
                    }
                    placeholder="--"
                    step="0.1"
                    fieldType={INPUT_WIDTHS.SHORT}
                  />
                  <CompactSelectField
                    id="calibrationTempUnit"
                    label=""
                    value={formData.calibrationTempUnit}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        calibrationTempUnit: e.target.value as TemperatureUnit,
                      }))
                    }
                    options={[
                      { value: 'c', label: '°C' },
                      { value: 'f', label: '°F' },
                    ]}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank if not applicable or unknown
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Maintenance notes, specifications, or other details..."
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {mode === 'add' ? 'Add Equipment' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={onComplete}
                className="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
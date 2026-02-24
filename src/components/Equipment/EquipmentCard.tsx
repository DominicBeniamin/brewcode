// src/components/Equipment/EquipmentCard.tsx

import React from 'react';
import type { Equipment, EquipmentCategory } from '../../types/equipment';
import type { Formatters } from '../../lib/formatHelpers';
import { convert } from '../../lib/conversions';
import type { UserSettings } from '../../types/settings';

const BARREL_IMAGE = '/images/wooden-barrel.png';

interface EquipmentCardProps {
  equipment: Equipment;
  formatters: Formatters;
  settings: UserSettings;
  category: EquipmentCategory;
  isAvailable: boolean | null;
  onEdit: (equipmentID: number) => void;
}

const categoryColors: Record<EquipmentCategory, string> = {
  vessel: 'border-blue-500 bg-blue-900/10',
  monitoring: 'border-green-500 bg-green-900/10',
  lab: 'border-purple-500 bg-purple-900/10',
  other: 'border-gray-500 bg-gray-700/10',
  custom: 'border-gray-500 bg-gray-700/10',
};

const categoryIcons: Record<EquipmentCategory, React.ReactNode> = {
  vessel: <img src={BARREL_IMAGE} alt="Barrel" className="w-12 h-12 object-contain" />,
  monitoring: '📊',
  lab: '🔬',
  other: '🔧',
  custom: '🔧',
};

export const EquipmentCard: React.FC<EquipmentCardProps> = ({
  equipment,
  formatters,
  settings,
  category,
  isAvailable,
  onEdit,
}) => {
  const cardColor = categoryColors[category] || 'border-gray-500 bg-gray-800';
  const icon = categoryIcons[category] || '🔧';

  // Format calibration temperature if present
  let calibrationTempDisplay: string | null = null;
  if (equipment.calibrationTemp !== null && equipment.calibrationTemp !== undefined) {
    const tempUnit = equipment.calibrationTempUnit || 'c';

    // Convert to user's preferred unit
    if (tempUnit !== settings.temperatureUnit) {
      try {
        const converted = convert(
          equipment.calibrationTemp,
          tempUnit,
          settings.temperatureUnit,
          'temperature'
        );
        calibrationTempDisplay = formatters.temperature(converted);
      } catch (error) {
        // Fallback to stored value if conversion fails
        calibrationTempDisplay = `${equipment.calibrationTemp}°${tempUnit.toUpperCase()}`;
      }
    } else {
      calibrationTempDisplay = formatters.temperature(equipment.calibrationTemp);
    }
  }

  return (
    <div
      className={`bg-gray-800 rounded-lg border ${cardColor} p-6 hover:shadow-lg transition-shadow`}
      data-equipment-id={equipment.equipmentID}
      data-equipment-category={category}
      data-equipment-name={equipment.name.toLowerCase()}
      data-equipment-type={equipment.type.toLowerCase()}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl flex items-center justify-center">{icon}</span>
            <div>
              <h3 className="text-xl font-bold text-white">{equipment.name}</h3>
              <div className="text-sm text-gray-400">{equipment.type}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(equipment.equipmentID)}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Equipment Details */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        {category === 'vessel' && isAvailable !== null && (
          <div>
            <div className="text-gray-400">Availability</div>
            <div className="text-white font-medium">
              {isAvailable ? '✅ Available' : '🔒 In Use'}
            </div>
          </div>
        )}

        {equipment.capacityL && (
          <div>
            <div className="text-gray-400">Capacity</div>
            <div className="text-white font-medium">
              {formatters.volume(equipment.capacityL)}
            </div>
          </div>
        )}

        {equipment.material && (
          <div>
            <div className="text-gray-400">Material</div>
            <div className="text-white font-medium">{equipment.material}</div>
          </div>
        )}

        {calibrationTempDisplay && (
          <div>
            <div className="text-gray-400">Calibration</div>
            <div className="text-white font-medium">{calibrationTempDisplay}</div>
          </div>
        )}
      </div>

      {equipment.notes && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Notes:</div>
          <div className="text-sm text-gray-300">{equipment.notes}</div>
        </div>
      )}
    </div>
  );
};
// src/components/Equipment/EquipmentPage.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useFormatters } from '../../hooks/useFormatters';
import { getAllEquipment } from '../../lib/equipmentDb';
import { EmptyState } from '../common/UIComponents';
import { FilterDropdown, MultiSelectDropdown } from '../common/FilterComponents';
import { EquipmentCard } from './EquipmentCard';
import { EquipmentForm } from './EquipmentForm';
import type { Equipment, EquipmentCategory, EquipmentStats } from '../../types/equipment';

type SortOption = 'name-asc' | 'name-desc' | 'type';
type EquipmentView = 'list' | 'add' | 'edit';

export const EquipmentPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<EquipmentView>('list');
  const [editingEquipmentID, setEditingEquipmentID] = useState<number | undefined>();
  const { db } = useDatabase();
  const { settings } = useSettings();
  const formatters = useFormatters();

  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Load equipment from database
  useEffect(() => {
    if (!db) return;

    try {
      const equipment = getAllEquipment(db);
      setAllEquipment(equipment);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to load equipment:', message);
    }
  }, [db]);

  // Categorize equipment by type
  const categorizeEquipmentType = useCallback((type: string): EquipmentCategory => {
    const typeLower = type.toLowerCase();

    if (['vessel', 'bucket', 'carboy', 'keg', 'fermenter'].some((v) => typeLower.includes(v))) {
      return 'vessel';
    } else if (
      ['monitoring', 'tilt', 'inkbird', 'controller', 'monitor'].some((v) =>
        typeLower.includes(v)
      )
    ) {
      return 'monitoring';
    } else if (
      ['lab', 'hydrometer', 'refractometer', 'ph meter', 'thermometer', 'scale'].some((v) =>
        typeLower.includes(v)
      )
    ) {
      return 'lab';
    } else {
      return 'other';
    }
  }, []);

  // Calculate equipment stats
  const stats: EquipmentStats = useMemo(() => {
    const vessels = allEquipment.filter((e) => categorizeEquipmentType(e.type) === 'vessel');
    const monitoring = allEquipment.filter(
      (e) => categorizeEquipmentType(e.type) === 'monitoring'
    );
    const lab = allEquipment.filter((e) => categorizeEquipmentType(e.type) === 'lab');
    const other = allEquipment.filter((e) => categorizeEquipmentType(e.type) === 'other');

    return { vessels, monitoring, lab, other };
  }, [allEquipment, categorizeEquipmentType]);

  // Check if vessel is available (not currently used in active batch)
  const isVesselAvailable = useCallback(
    (equipmentID: number): boolean | null => {
      if (!db) return null;

      try {
        const result = db.exec(
          `
          SELECT COUNT(*) as count 
          FROM equipmentUsage eu
          INNER JOIN batchStages bs ON eu.batchStageID = bs.batchStageID
          INNER JOIN batches b ON bs.batchID = b.batchID
          WHERE eu.equipmentID = ? 
          AND eu.status = 'in-use'
          AND b.status IN ('planning', 'active')
          AND bs.status IN ('pending', 'active')
        `,
          [equipmentID]
        );

        if (result.length === 0 || result[0].values.length === 0) {
          return true;
        }

        const count = result[0].values[0][0] as number;
        return count === 0;
      } catch (error) {
        console.warn('Could not check vessel availability:', error);
        return null;
      }
    },
    [db]
  );

  // Filter and sort equipment
  const filteredAndSortedEquipment = useMemo(() => {
    let filtered = allEquipment.filter((equipment) => {
      const category = categorizeEquipmentType(equipment.type);
      const name = equipment.name.toLowerCase();
      const type = equipment.type.toLowerCase();

      // Apply type filter
      if (selectedTypes.length > 0 && !selectedTypes.includes('all')) {
        if (!selectedTypes.includes(category)) return false;
      }

      // Apply search filter
      if (searchQuery && !name.includes(searchQuery.toLowerCase()) && !type.includes(searchQuery.toLowerCase())) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'type': {
          const typeOrder: Record<EquipmentCategory, number> = {
            vessel: 1,
            monitoring: 2,
            lab: 3,
            other: 4,
            custom: 5,
          };
          const catA = categorizeEquipmentType(a.type);
          const catB = categorizeEquipmentType(b.type);
          const orderDiff = typeOrder[catA] - typeOrder[catB];
          if (orderDiff !== 0) return orderDiff;
          return a.name.localeCompare(b.name);
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [allEquipment, selectedTypes, searchQuery, sortBy, categorizeEquipmentType]);

  const handleAddEquipment = useCallback(() => {
    setCurrentView('add');
    setEditingEquipmentID(undefined);
  }, []);

  const handleEditEquipment = useCallback(
    (equipmentID: number) => {
      setCurrentView('edit');
      setEditingEquipmentID(equipmentID);
    },
    []
  );

  const handleBackToList = useCallback(() => {
    setCurrentView('list');
    setEditingEquipmentID(undefined);
    // Reload equipment after add/edit
    if (db) {
      try {
        const equipment = getAllEquipment(db);
        setAllEquipment(equipment);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to reload equipment:', message);
      }
    }
  }, [db]);

  const handleTypeToggle = useCallback((values: string[]) => {
    setSelectedTypes(values);
  }, []);

  // Show form views
  if (currentView === 'add') {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <button
          onClick={handleBackToList}
          className="text-amber-400 hover:text-amber-300 mb-4 inline-block"
        >
          ← Back to Equipment
        </button>
        <EquipmentForm mode="add" onComplete={handleBackToList} />
      </div>
    );
  }

  if (currentView === 'edit' && editingEquipmentID) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <button
          onClick={handleBackToList}
          className="text-amber-400 hover:text-amber-300 mb-4 inline-block"
        >
          ← Back to Equipment
        </button>
        <EquipmentForm mode="edit" equipmentID={editingEquipmentID} onComplete={handleBackToList} />
      </div>
    );
  }

  // Empty state
  if (allEquipment.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white">Equipment</h2>
            <button
              onClick={handleAddEquipment}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              + Add Equipment
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">0</div>
              <div className="text-sm text-gray-400">Fermentation Vessels</div>
            </div>
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">0</div>
              <div className="text-sm text-gray-400">Monitoring Devices</div>
            </div>
            <div className="bg-purple-900/20 border border-purple-500 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">0</div>
              <div className="text-sm text-gray-400">Lab Equipment</div>
            </div>
            <div className="bg-gray-700/20 border border-gray-500 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-400">0</div>
              <div className="text-sm text-gray-400">Other</div>
            </div>
          </div>

          {/* Search Bar (Disabled) */}
          <div className="mb-6">
            <input
              type="text"
              value=""
              placeholder="Search equipment by name or type..."
              disabled
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 opacity-50 cursor-not-allowed"
            />
          </div>

          {/* Filters (Disabled) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 opacity-50 pointer-events-none">
            <FilterDropdown
              value="name-asc"
              onChange={() => {}}
              options={[
                { value: 'name-asc', label: 'Name, A-Z' },
                { value: 'name-desc', label: 'Name, Z-A' },
                { value: 'type', label: 'Type' },
              ]}
            />

            <MultiSelectDropdown
              label="Type"
              options={[
                { value: 'vessel', label: 'Vessels (0)' },
                { value: 'monitoring', label: 'Monitoring (0)' },
                { value: 'lab', label: 'Lab (0)' },
                { value: 'other', label: 'Other (0)' },
              ]}
              selectedValues={[]}
              onChange={() => {}}
            />
          </div>

          <EmptyState
            icon="🔧"
            title="No Equipment Yet"
            description="Start tracking your brewing equipment like fermenters, hydrometers, and monitoring devices."
            action={{
              label: "+ Add Your First Equipment",
              onClick: handleAddEquipment
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-white">Equipment</h2>
          <button
            onClick={handleAddEquipment}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            + Add Equipment
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.vessels.length}</div>
            <div className="text-sm text-gray-400">Fermentation Vessels</div>
          </div>
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{stats.monitoring.length}</div>
            <div className="text-sm text-gray-400">Monitoring Devices</div>
          </div>
          <div className="bg-purple-900/20 border border-purple-500 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">{stats.lab.length}</div>
            <div className="text-sm text-gray-400">Lab Equipment</div>
          </div>
          <div className="bg-gray-700/20 border border-gray-500 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-400">{stats.other.length}</div>
            <div className="text-sm text-gray-400">Other</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search equipment by name or type..."
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap gap-3 mb-6">
          <FilterDropdown
            value={sortBy}
            onChange={(value) => setSortBy(value as SortOption)}
            options={[
              { value: 'name-asc', label: 'Name, A-Z' },
              { value: 'name-desc', label: 'Name, Z-A' },
              { value: 'type', label: 'Type' },
            ]}
          />

          <MultiSelectDropdown
            label="Type"
            options={[
              { value: 'vessel', label: `Vessels (${stats.vessels.length})` },
              { value: 'monitoring', label: `Monitoring (${stats.monitoring.length})` },
              { value: 'lab', label: `Lab (${stats.lab.length})` },
              { value: 'other', label: `Other (${stats.other.length})` },
            ]}
            selectedValues={selectedTypes}
            onChange={handleTypeToggle}
          />
        </div>

        {/* Equipment List */}
        <div className="space-y-4">
          {filteredAndSortedEquipment.map((equipment) => {
            const category = categorizeEquipmentType(equipment.type);
            const isAvailable =
              category === 'vessel' ? isVesselAvailable(equipment.equipmentID) : null;

            return (
              <EquipmentCard
                key={equipment.equipmentID}
                equipment={equipment}
                formatters={formatters}
                settings={settings!}
                category={category}
                isAvailable={isAvailable}
                onEdit={handleEditEquipment}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
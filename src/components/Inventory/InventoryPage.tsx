// src/components/Inventory/InventoryPage.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { getConsumablesWithStock, getInventoryStats } from '../../lib/inventoryDb';
import { EmptyState } from '../common/UIComponents';
import { FilterDropdown } from '../common/FilterComponents';
import { ConsumableCard } from './ConsumableCard';
import { ConsumableForm } from './ConsumableForm';
import { ConsumableDetail } from './ConsumableDetail';
import { LotForm } from './LotForm';
import type {
  ConsumableWithStock,
  InventoryStats,
  InventorySortOption,
  InventoryRoleFilter,
  InventoryStockFilter,
} from '../../types/inventory';


// ============================================================================
// VIEW TYPE
// ============================================================================

type InventoryView = 'list' | 'add' | 'edit' | 'detail' | 'addLot';

// ============================================================================
// COMPONENT
// ============================================================================

export const InventoryPage: React.FC = () => {
  const { db } = useDatabase();

  // -- View state -----------------------------------------------------------
  const [currentView, setCurrentView] = useState<InventoryView>('list');
  const [editingConsumableID, setEditingConsumableID] = useState<number | undefined>();
  const [detailConsumableID, setDetailConsumableID] = useState<number | undefined>();

  // -- Data state -----------------------------------------------------------
  const [allConsumables, setAllConsumables] = useState<ConsumableWithStock[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalConsumables: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    onDemandCount: 0,
  });

  // -- Filter / sort state --------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<InventorySortOption>('name-asc');
  const [roleFilter, setRoleFilter] = useState<InventoryRoleFilter>('all');
  const [stockFilter, setStockFilter] = useState<InventoryStockFilter>('all');

  // =========================================================================
  // DATA LOADING
  // =========================================================================

  const loadData = useCallback(() => {
    if (!db) return;

    try {
      const consumables = getConsumablesWithStock(db);
      setAllConsumables(consumables);

      const inventoryStats = getInventoryStats(db);
      setStats(inventoryStats);

      console.log(`Loaded ${consumables.length} consumables`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to load inventory:', message);
    }
  }, [db]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =========================================================================
  // FILTER & SORT
  // =========================================================================

  const filteredAndSorted = useMemo(() => {
    let result = allConsumables.filter(c => {
      // Role filter
      if (roleFilter === 'ingredient' && !c.ingredientTypeID) return false;
      if (roleFilter === 'supply' && !c.supplyTypeID) return false;

      // Stock filter
      if (stockFilter !== 'all' && c.stockStatus !== stockFilter) return false;

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = c.name.toLowerCase().includes(q);
        const brandMatch = c.brand?.toLowerCase().includes(q) ?? false;
        const typeMatch =
          c.ingredientTypeName?.toLowerCase().includes(q) ??
          c.supplyTypeName?.toLowerCase().includes(q) ??
          false;
        if (!nameMatch && !brandMatch && !typeMatch) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'stock-asc':
          return a.totalStock - b.totalStock;
        case 'stock-desc':
          return b.totalStock - a.totalStock;
        case 'category': {
          const catA = a.ingredientCategoryName ?? a.supplyCategoryName ?? '';
          const catB = b.ingredientCategoryName ?? b.supplyCategoryName ?? '';
          const catDiff = catA.localeCompare(catB);
          return catDiff !== 0 ? catDiff : a.name.localeCompare(b.name);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [allConsumables, searchQuery, sortBy, roleFilter, stockFilter]);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleAddConsumable = useCallback(() => {
    setCurrentView('add');
    setEditingConsumableID(undefined);
  }, []);

  const handleEditConsumable = useCallback((consumableID: number) => {
    setEditingConsumableID(consumableID);
    setCurrentView('edit');
  }, []);

  const handleViewDetail = useCallback((consumableID: number) => {
    setDetailConsumableID(consumableID);
    setCurrentView('detail');
  }, []);

  const handleBackToList = useCallback(() => {
    setCurrentView('list');
    setEditingConsumableID(undefined);
    setDetailConsumableID(undefined);
    loadData();
  }, [loadData]);

  // =========================================================================
  // VIEW: ADD
  // =========================================================================

  if (currentView === 'add') {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <button
          onClick={handleBackToList}
          className="text-amber-400 hover:text-amber-300 mb-4 inline-block"
        >
          ← Back to Inventory
        </button>
        {/* ConsumableForm — Step 4 */}
        <ConsumableForm mode="add" onComplete={handleBackToList} />
      </div>
    );
  }

  // =========================================================================
  // VIEW: EDIT
  // =========================================================================

  if (currentView === 'edit' && editingConsumableID) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <button
          onClick={handleBackToList}
          className="text-amber-400 hover:text-amber-300 mb-4 inline-block"
        >
          ← Back to Inventory
        </button>
        {/* ConsumableForm — Step 4 */}
        <ConsumableForm mode="edit" consumableID={editingConsumableID} onComplete={handleBackToList} />
      </div>
    );
  }

  // =========================================================================
  // VIEW: DETAIL (lot management)
  // =========================================================================

  if (currentView === 'detail' && detailConsumableID) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <button
          onClick={handleBackToList}
          className="text-amber-400 hover:text-amber-300 mb-4 inline-block"
        >
          ← Back to Inventory
        </button>
        <ConsumableDetail
          consumableID={detailConsumableID}
          onEdit={handleEditConsumable}
          onAddLot={id => { setDetailConsumableID(id); setCurrentView('addLot'); }}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  if (currentView === 'addLot' && detailConsumableID) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <button
          onClick={() => { setCurrentView('detail'); }}
          className="text-amber-400 hover:text-amber-300 mb-4 inline-block"
        >
          ← Back to Item
        </button>
        <LotForm
          consumableID={detailConsumableID}
          onComplete={() => { setCurrentView('detail'); }}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW: EMPTY STATE
  // =========================================================================

  if (allConsumables.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-white">Inventory</h2>
          <button
            onClick={handleAddConsumable}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            + Add Consumable
          </button>
        </div>

        {/* Stats bar — zeroed */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard value={0} label="Total" color="gray" />
          <StatCard value={0} label="In Stock" color="green" />
          <StatCard value={0} label="Low Stock" color="yellow" />
          <StatCard value={0} label="Out of Stock" color="red" />
          <StatCard value={0} label="On Demand" color="blue" />
        </div>

        <EmptyState
          icon="📦"
          title="No consumables yet"
          description="Add your first consumable to start tracking ingredients and supplies."
          action={{ label: '+ Add Consumable', onClick: handleAddConsumable }}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW: LIST
  // =========================================================================

  return (
    <div className="min-h-screen bg-gray-900 p-8">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Inventory</h2>
        <button
          onClick={handleAddConsumable}
          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          + Add Consumable
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard value={stats.totalConsumables} label="Total"        color="gray"   />
        <StatCard value={stats.inStockCount}     label="In Stock"     color="green"  />
        <StatCard value={stats.lowStockCount}    label="Low Stock"    color="yellow" />
        <StatCard value={stats.outOfStockCount}  label="Out of Stock" color="red"    />
        <StatCard value={stats.onDemandCount}    label="On Demand"    color="blue"   />
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name, brand, or type..."
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
        />
      </div>

      {/* Filters and sort */}
      <div className="flex flex-wrap gap-3 mb-6">
        <FilterDropdown
          value={sortBy}
          onChange={val => setSortBy(val as InventorySortOption)}
          options={[
            { value: 'name-asc',   label: 'Name, A–Z'      },
            { value: 'name-desc',  label: 'Name, Z–A'      },
            { value: 'stock-asc',  label: 'Stock, Low–High' },
            { value: 'stock-desc', label: 'Stock, High–Low' },
            { value: 'category',   label: 'Category'        },
          ]}
        />

        <FilterDropdown
          label="Role"
          value={roleFilter}
          onChange={val => setRoleFilter(val as InventoryRoleFilter)}
          options={[
            { value: 'all',        label: 'All Roles'   },
            { value: 'ingredient', label: 'Ingredients' },
            { value: 'supply',     label: 'Supplies'    },
          ]}
        />

        <FilterDropdown
          label="Stock"
          value={stockFilter}
          onChange={val => setStockFilter(val as InventoryStockFilter)}
          options={[
            { value: 'all',          label: 'All Stock'    },
            { value: 'in-stock',     label: 'In Stock'     },
            { value: 'low-stock',    label: 'Low Stock'    },
            { value: 'out-of-stock', label: 'Out of Stock' },
            { value: 'on-demand',    label: 'On Demand'    },
          ]}
        />
      </div>

      {/* Results count */}
      {filteredAndSorted.length !== allConsumables.length && (
        <p className="text-sm text-gray-400 mb-4">
          Showing {filteredAndSorted.length} of {allConsumables.length} consumables
        </p>
      )}

      {/* Consumable list */}
      {filteredAndSorted.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
          <p className="text-gray-400">No consumables match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSorted.map(consumable => (
            <ConsumableCard
              key={consumable.consumableID}
              consumable={consumable}
              onSelect={handleViewDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STAT CARD (internal helper)
// ============================================================================

type StatColor = 'gray' | 'green' | 'yellow' | 'red' | 'blue';

const statColorClasses: Record<StatColor, { border: string; text: string; bg: string }> = {
  gray:   { border: 'border-gray-500',  text: 'text-gray-400',  bg: 'bg-gray-700/20'   },
  green:  { border: 'border-green-500', text: 'text-green-400', bg: 'bg-green-900/20'  },
  yellow: { border: 'border-yellow-500',text: 'text-yellow-400',bg: 'bg-yellow-900/20' },
  red:    { border: 'border-red-500',   text: 'text-red-400',   bg: 'bg-red-900/20'    },
  blue:   { border: 'border-blue-500',  text: 'text-blue-400',  bg: 'bg-blue-900/20'   },
};

interface StatCardProps {
  value: number;
  label: string;
  color: StatColor;
}

function StatCard({ value, label, color }: StatCardProps) {
  const { border, text, bg } = statColorClasses[color];
  return (
    <div className={`${bg} border ${border} rounded-lg p-4`}>
      <div className={`text-2xl font-bold ${text}`}>{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

// (ConsumableCard is defined in ./ConsumableCard.tsx)
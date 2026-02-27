// src/components/Inventory/ConsumableDetail.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useToast } from '../../hooks/useToast';
import { useFormatters } from '../../hooks/useFormatters';
import {
  getConsumable,
  getLotsForConsumable,
  deleteLot,
  updateLot,
  updateConsumable,
  deleteConsumable,
} from '../../lib/inventoryDb';
import type { Consumable, InventoryLot } from '../../types/inventory';

// ============================================================================
// TYPES
// ============================================================================

interface ConsumableDetailProps {
  consumableID: number;
  onEdit: (consumableID: number) => void;
  onAddLot: (consumableID: number) => void;
  onBack: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  'in-stock':     { label: 'In Stock',     cls: 'bg-green-900/30 text-green-400 border border-green-700'   },
  'low-stock':    { label: 'Low Stock',    cls: 'bg-yellow-900/30 text-yellow-400 border border-yellow-700' },
  'out-of-stock': { label: 'Out of Stock', cls: 'bg-red-900/30 text-red-400 border border-red-700'          },
  'on-demand':    { label: 'On Demand',    cls: 'bg-blue-900/30 text-blue-400 border border-blue-700'       },
};

function roleSummary(c: Consumable): string {
  const parts: string[] = [];
  if (c.ingredientCategoryName && c.ingredientTypeName) {
    const sub = c.ingredientSubtypeName ? ` › ${c.ingredientSubtypeName}` : '';
    parts.push(`${c.ingredientCategoryName} › ${c.ingredientTypeName}${sub}`);
  }
  if (c.supplyCategoryName && c.supplyTypeName) {
    parts.push(`${c.supplyCategoryName} › ${c.supplyTypeName}`);
  }
  return parts.join('  ·  ');
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ConsumableDetail: React.FC<ConsumableDetailProps> = ({
  consumableID,
  onEdit,
  onAddLot,
  onBack,
}) => {
  const { db, markDirty } = useDatabase();
  const toast = useToast();
  const fmt = useFormatters();

  const [consumable, setConsumable]   = useState<Consumable | null>(null);
  const [lots, setLots]               = useState<InventoryLot[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [lotsExpanded, setLotsExpanded] = useState(false);

  // Confirmation state for destructive actions
  const [confirmDelete, setConfirmDelete]           = useState(false);
  const [confirmDeactivate, setConfirmDeactivate]   = useState(false);
  const [confirmDeleteLotID, setConfirmDeleteLotID] = useState<number | null>(null);
  const [confirmDumpLotID, setConfirmDumpLotID]     = useState<number | null>(null);

  // =========================================================================
  // LOAD
  // =========================================================================

  const load = useCallback(() => {
    if (!db) return;
    try {
      const c = getConsumable(db, consumableID);
      if (!c) { toast.error('Consumable not found'); onBack(); return; }
      setConsumable(c);
      setLots(getLotsForConsumable(db, consumableID));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load consumable');
      onBack();
    } finally {
      setIsLoading(false);
    }
  }, [db, consumableID, onBack, toast]);

  useEffect(() => { load(); }, [load]);

  // =========================================================================
  // DERIVED
  // =========================================================================

  const totalStock   = lots.reduce((s, l) => s + l.quantityRemaining, 0);
  const activeLots   = lots.filter(l => l.status === 'active');

  // Most recently purchased active lot for price display
  const latestLot = activeLots.length > 0
    ? [...activeLots].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))[0]
    : null;

  const stockStatus = consumable
    ? consumable.onDemand
      ? 'on-demand'
      : totalStock === 0
        ? 'out-of-stock'
        : consumable.reorderPoint !== null && totalStock <= consumable.reorderPoint
          ? 'low-stock'
          : 'in-stock'
    : 'out-of-stock';

  // =========================================================================
  // ACTIONS
  // =========================================================================

  const handleDelete = useCallback(() => {
    if (!db || !consumable) return;
    try {
      deleteConsumable(db, consumable.consumableID);
      markDirty();
      toast.success(`"${consumable.name}" deleted`);
      onBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete consumable');
    } finally {
      setConfirmDelete(false);
    }
  }, [db, consumable, markDirty, onBack, toast]);

  const handleDeactivate = useCallback(() => {
    if (!db || !consumable) return;
    try {
      updateConsumable(db, consumableID, { isActive: 0 });
      markDirty();
      toast.success(`"${consumable.name}" has been deactivated`);
      onBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to deactivate consumable');
    } finally {
      setConfirmDeactivate(false);
    }
  }, [db, consumable, consumableID, markDirty, onBack, toast]);

  const handleDeleteLot = useCallback((lotID: number) => {
    if (!db) return;
    try {
      deleteLot(db, lotID);
      markDirty();
      toast.success('Lot deleted');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete lot');
    } finally {
      setConfirmDeleteLotID(null);
    }
  }, [db, markDirty, load, toast]);

  const handleDumpLot = useCallback((lotID: number) => {
    if (!db) return;
    try {
      updateLot(db, lotID, { status: 'expired', quantityRemaining: 0 });
      markDirty();
      toast.success('Lot marked as expired');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to dump lot');
    } finally {
      setConfirmDumpLotID(null);
    }
  }, [db, markDirty, load, toast]);

  // =========================================================================
  // RENDER: LOADING
  // =========================================================================

  if (isLoading || !consumable) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-3xl">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  const displayName = consumable.brand
    ? `${consumable.brand} ${consumable.name}`
    : consumable.name;

  const badge = STATUS_BADGE[stockStatus];

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="max-w-3xl space-y-6">

      {/* ================================================================
          HEADER CARD: identity + stock summary
      ================================================================ */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="text-2xl font-semibold text-white">{displayName}</h3>
          <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        {/* Role breadcrumb */}
        <p className="text-sm text-gray-400 mb-5">{roleSummary(consumable)}</p>

        {/* Identity grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
          <InfoCell label="Unit"   value={consumable.unit} />
          {consumable.brand && <InfoCell label="Brand" value={consumable.brand} />}
          {consumable.notes && (
            <div className="col-span-2 sm:col-span-3">
              <InfoCell label="Notes" value={consumable.notes} />
            </div>
          )}
        </div>

        <hr className="border-gray-700 mb-5" />

        {/* Stock summary — tracked items */}
        {!consumable.onDemand && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <InfoCell
              label="Total Stock"
              value={`${totalStock.toLocaleString()} ${consumable.unit}`}
              highlight
            />
            <InfoCell
              label="Active Lots"
              value={activeLots.length.toString()}
            />
            {consumable.reorderPoint !== null && (
              <InfoCell
                label="Reorder Point"
                value={`${consumable.reorderPoint.toLocaleString()} ${consumable.unit}`}
              />
            )}
            {consumable.reorderQuantity !== null && (
              <InfoCell
                label="Reorder Qty"
                value={`${consumable.reorderQuantity.toLocaleString()} ${consumable.unit}`}
              />
            )}
            {latestLot?.costPerUnit !== null && latestLot?.costPerUnit !== undefined && (
              <InfoCell
                label="Price / Unit (latest lot)"
                value={fmt.currency(latestLot.costPerUnit)}
              />
            )}
          </div>
        )}

        {/* On-demand pricing */}
        {consumable.onDemand && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
            {consumable.onDemandPrice !== null && consumable.onDemandPriceQty !== null && (
              <>
                <InfoCell
                  label="Price"
                  value={fmt.currency(consumable.onDemandPrice)}
                />
                <InfoCell
                  label="Per Quantity"
                  value={`${consumable.onDemandPriceQty} ${consumable.unit}`}
                />
                <InfoCell
                  label="Unit Cost"
                  value={fmt.currency(consumable.onDemandPrice / consumable.onDemandPriceQty)}
                  highlight
                />
              </>
            )}
            {(consumable.onDemandPrice === null || consumable.onDemandPriceQty === null) && (
              <p className="text-sm text-gray-500 col-span-3">No pricing information set.</p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onEdit(consumableID)}
            className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Edit Item
          </button>

          {!consumable.onDemand && (
            <button
              onClick={() => onAddLot(consumableID)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              + Add Lot
            </button>
          )}

          <div className="ml-auto flex items-center gap-3">
            {confirmDelete ? (
              <>
                <span className="text-sm text-gray-400">
                  {consumable.hasBeenUsed
                    ? 'Used in batches — deactivate instead?'
                    : 'Permanently delete this item?'}
                </span>
                {consumable.hasBeenUsed ? (
                  <button
                    onClick={handleDeactivate}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={handleDelete}
                    className="bg-red-700 hover:bg-red-600 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors"
                  >
                    Confirm Delete
                  </button>
                )}
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : confirmDeactivate ? (
              <>
                <span className="text-sm text-gray-400">Deactivate this item?</span>
                <button
                  onClick={handleDeactivate}
                  className="bg-red-700 hover:bg-red-600 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDeactivate(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setConfirmDeactivate(true)}
                  className="text-sm text-gray-500 hover:text-red-400 transition-colors"
                >
                  Deactivate
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm text-gray-500 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          LOTS — collapsible
      ================================================================ */}
      {!consumable.onDemand && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">

          {/* Collapse toggle */}
          <button
            onClick={() => setLotsExpanded(p => !p)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-700/50 transition-colors"
          >
            <span className="font-semibold text-white">
              Active Lots
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({activeLots.length})
              </span>
            </span>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${lotsExpanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {lotsExpanded && (
            <div className="px-6 pb-6">
              {activeLots.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No active lots. Add a lot to start tracking stock.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeLots.map(lot => (
                    <LotRow
                      key={lot.lotID}
                      lot={lot}
                      unit={consumable.unit}
                      fmt={fmt}
                      confirmDeleteID={confirmDeleteLotID}
                      confirmDumpID={confirmDumpLotID}
                      onRequestDelete={id => {
                        setConfirmDumpLotID(null);
                        setConfirmDeleteLotID(id);
                      }}
                      onRequestDump={id => {
                        setConfirmDeleteLotID(null);
                        setConfirmDumpLotID(id);
                      }}
                      onCancelConfirm={() => {
                        setConfirmDeleteLotID(null);
                        setConfirmDumpLotID(null);
                      }}
                      onConfirmDelete={handleDeleteLot}
                      onConfirmDump={handleDumpLot}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// INFO CELL — small label/value display
// ============================================================================

function InfoCell({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-amber-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

// ============================================================================
// LOT ROW
// ============================================================================

interface LotRowProps {
  lot: InventoryLot;
  unit: string;
  fmt: ReturnType<typeof useFormatters>;
  confirmDeleteID: number | null;
  confirmDumpID: number | null;
  onRequestDelete: (id: number) => void;
  onRequestDump: (id: number) => void;
  onCancelConfirm: () => void;
  onConfirmDelete: (id: number) => void;
  onConfirmDump: (id: number) => void;
}

function LotRow({
  lot,
  unit,
  fmt,
  confirmDeleteID,
  confirmDumpID,
  onRequestDelete,
  onRequestDump,
  onCancelConfirm,
  onConfirmDelete,
  onConfirmDump,
}: LotRowProps) {
  const isConfirmingDelete = confirmDeleteID === lot.lotID;
  const isConfirmingDump   = confirmDumpID   === lot.lotID;

  return (
    <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
      <div className="flex items-start justify-between gap-4">

        {/* Lot data */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 flex-1 text-sm">
          <InfoCell
            label="Remaining"
            value={`${lot.quantityRemaining.toLocaleString()} ${unit}`}
            highlight
          />
          <InfoCell
            label="Purchased"
            value={`${lot.quantityPurchased.toLocaleString()} ${unit}`}
          />
          <InfoCell
            label="Date"
            value={fmt.date(lot.purchaseDate)}
          />
          {lot.costPerUnit !== null && (
            <InfoCell
              label={`Cost / ${unit}`}
              value={fmt.currency(lot.costPerUnit)}
            />
          )}
          {lot.supplier && (
            <InfoCell label="Supplier" value={lot.supplier} />
          )}
          {lot.expirationDate && (
            <InfoCell label="Expires" value={fmt.date(lot.expirationDate)} />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {!isConfirmingDelete && !isConfirmingDump && (
            <>
              {lot.canDelete && (
                <button
                  onClick={() => onRequestDelete(lot.lotID)}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => onRequestDump(lot.lotID)}
                className="text-xs text-gray-500 hover:text-yellow-400 transition-colors"
              >
                Dump
              </button>
            </>
          )}

          {isConfirmingDelete && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-400">Delete this lot?</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onConfirmDelete(lot.lotID)}
                  className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={onCancelConfirm}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isConfirmingDump && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-400">Mark as expired?</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onConfirmDump(lot.lotID)}
                  className="text-xs bg-yellow-700 hover:bg-yellow-600 text-white px-2 py-1 rounded transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={onCancelConfirm}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {lot.notes && (
        <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-600">{lot.notes}</p>
      )}
    </div>
  );
}
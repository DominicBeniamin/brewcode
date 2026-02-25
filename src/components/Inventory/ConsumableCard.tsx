// src/components/Inventory/ConsumableCard.tsx

import React, { useState } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useFormatters } from '../../hooks/useFormatters';
import { useToast } from '../../hooks/useToast';
import { deleteConsumable, updateConsumable } from '../../lib/inventoryDb';
import type { ConsumableWithStock } from '../../types/inventory';

// ============================================================================
// TYPES
// ============================================================================

interface ConsumableCardProps {
  consumable: ConsumableWithStock;
  onEdit: (consumableID: number) => void;
  onManageStock: (consumableID: number) => void;
  onDeleted: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STOCK_STATUS_BADGE: Record<
  ConsumableWithStock['stockStatus'],
  { label: string; className: string }
> = {
  'in-stock':     { label: 'In Stock',     className: 'bg-green-900/40 text-green-400 border border-green-700'    },
  'low-stock':    { label: 'Low Stock',    className: 'bg-yellow-900/40 text-yellow-400 border border-yellow-700' },
  'out-of-stock': { label: 'Out of Stock', className: 'bg-red-900/40 text-red-400 border border-red-700'          },
  'on-demand':    { label: 'On Demand',    className: 'bg-blue-900/40 text-blue-400 border border-blue-700'       },
};

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  ingredient: { label: 'Ingredient', className: 'bg-amber-900/40 text-amber-400 border border-amber-700'    },
  supply:     { label: 'Supply',     className: 'bg-purple-900/40 text-purple-400 border border-purple-700' },
  dual:       { label: 'Dual-Use',   className: 'bg-teal-900/40 text-teal-400 border border-teal-700'       },
};

// ============================================================================
// HELPERS
// ============================================================================

function getRoleBadge(c: ConsumableWithStock) {
  if (c.ingredientTypeID && c.supplyTypeID) return ROLE_BADGE.dual;
  if (c.ingredientTypeID) return ROLE_BADGE.ingredient;
  return ROLE_BADGE.supply;
}

/**
 * Build the category › type › subtype classification string.
 * Uses ingredient path if present, falls back to supply path.
 */
function buildClassification(c: ConsumableWithStock): string {
  if (c.ingredientCategoryName && c.ingredientTypeName) {
    const parts = [c.ingredientCategoryName, c.ingredientTypeName];
    if (c.ingredientSubtypeName) parts.push(c.ingredientSubtypeName);
    return parts.join(' › ');
  }
  if (c.supplyCategoryName && c.supplyTypeName) {
    return `${c.supplyCategoryName} › ${c.supplyTypeName}`;
  }
  return '—';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ConsumableCard: React.FC<ConsumableCardProps> = ({
  consumable: c,
  onEdit,
  onManageStock,
  onDeleted,
}) => {
  const { db, markDirty } = useDatabase();
  const formatters = useFormatters();
  const toast = useToast();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const stockBadge = STOCK_STATUS_BADGE[c.stockStatus];
  const roleBadge = getRoleBadge(c);
  const classification = buildClassification(c);
  const displayName = c.brand ? `${c.brand} — ${c.name}` : c.name;

  // -- Border colour by stock status ----------------------------------------
  const borderColor =
    c.stockStatus === 'in-stock'     ? 'border-gray-700' :
    c.stockStatus === 'low-stock'    ? 'border-yellow-700' :
    c.stockStatus === 'out-of-stock' ? 'border-red-900' :
    'border-gray-700'; // on-demand

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleDeactivate = () => {
    if (!db) return;
    try {
      updateConsumable(db, c.consumableID, { isActive: 0 });
      markDirty();
      toast.success(`"${c.name}" marked as inactive`);
      onDeleted();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to deactivate: ${message}`);
    }
  };

  const handleDelete = async () => {
    if (!db) return;
    setIsDeleting(true);
    try {
      deleteConsumable(db, c.consumableID);
      markDirty();
      toast.success(`"${c.name}" deleted`);
      onDeleted();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      // If deletion is blocked because hasBeenUsed, offer deactivation instead
      if (message.includes('has been used')) {
        toast.error(message);
      } else {
        toast.error(`Failed to delete: ${message}`);
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // =========================================================================
  // RENDER: DELETE CONFIRMATION
  // =========================================================================

  if (showDeleteConfirm) {
    return (
      <div className="bg-gray-800 rounded-lg border border-red-700 p-5">
        <p className="text-white font-semibold mb-1">
          Delete &ldquo;{displayName}&rdquo;?
        </p>

        {c.hasBeenUsed ? (
          <>
            <p className="text-sm text-gray-400 mb-4">
              This consumable has been used in batches and cannot be deleted. You can mark it as
              inactive instead — it will be hidden from the active inventory but preserved for
              historical records.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeactivate}
                className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold py-2 px-4 rounded transition-colors"
              >
                Mark as Inactive
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">
              This will permanently delete the consumable and all of its stock lots. This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-700 hover:bg-red-600 disabled:bg-gray-600 text-white text-sm font-semibold py-2 px-4 rounded transition-colors"
              >
                {isDeleting ? 'Deleting…' : 'Delete Permanently'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER: NORMAL
  // =========================================================================

  return (
    <div
      className={`bg-gray-800 rounded-lg border ${borderColor} p-5 hover:shadow-lg transition-shadow`}
      data-consumable-id={c.consumableID}
    >
      {/* Header row */}
      <div className="flex justify-between items-start gap-4">

        {/* Left: name, badges, classification */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white leading-tight">{displayName}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${roleBadge.className}`}>
              {roleBadge.label}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${stockBadge.className}`}>
              {stockBadge.label}
            </span>
          </div>
          <p className="text-sm text-gray-400 truncate">{classification}</p>
        </div>

        {/* Right: action buttons */}
        <div className="flex gap-2 shrink-0">
          {!c.onDemand && (
            <button
              onClick={() => onManageStock(c.consumableID)}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded transition-colors whitespace-nowrap"
            >
              Manage Stock
            </button>
          )}
          <button
            onClick={() => onEdit(c.consumableID)}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-gray-700 hover:bg-red-800 text-gray-400 hover:text-red-300 text-sm py-2 px-3 rounded transition-colors"
            aria-label="Delete consumable"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Detail row */}
      <div className="mt-3 pt-3 border-t border-gray-700 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {!c.onDemand ? (
          <>
            <span className="text-gray-400">
              Stock:{' '}
              <span className="text-white font-medium">
                {c.totalStock} {c.unit}
              </span>
            </span>

            {c.activeLotCount > 0 && (
              <span className="text-gray-400">
                Lots:{' '}
                <span className="text-white font-medium">{c.activeLotCount}</span>
              </span>
            )}

            {c.reorderPoint !== null && (
              <span className="text-gray-400">
                Reorder at:{' '}
                <span className={`font-medium ${c.stockStatus === 'low-stock' ? 'text-yellow-400' : 'text-white'}`}>
                  {c.reorderPoint} {c.unit}
                </span>
              </span>
            )}

            {c.oldestActiveLotDate && (
              <span className="text-gray-400">
                Oldest lot:{' '}
                <span className="text-white font-medium">
                  {formatters.date(c.oldestActiveLotDate)}
                </span>
              </span>
            )}
          </>
        ) : (
          <>
            <span className="text-gray-400">
              Purchased as needed
            </span>
            {c.onDemandPrice !== null && c.onDemandPriceQty !== null && (
              <span className="text-gray-400">
                Price:{' '}
                <span className="text-white font-medium">
                  {formatters.currency(c.onDemandPrice)} / {c.onDemandPriceQty} {c.unit}
                </span>
              </span>
            )}
          </>
        )}

        {/* Dual-use: show supply type alongside ingredient info */}
        {c.ingredientTypeID && c.supplyTypeID && c.supplyTypeName && (
          <span className="text-gray-400">
            Also supply:{' '}
            <span className="text-white font-medium">{c.supplyTypeName}</span>
          </span>
        )}
      </div>

      {c.notes && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <span className="text-xs text-gray-500">Notes: </span>
          <span className="text-xs text-gray-400">{c.notes}</span>
        </div>
      )}
    </div>
  );
};
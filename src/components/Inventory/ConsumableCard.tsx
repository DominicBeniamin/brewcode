// src/components/Inventory/ConsumableCard.tsx

import React from 'react';
import { useFormatters } from '../../hooks/useFormatters';
import type { ConsumableWithStock } from '../../types/inventory';

// ============================================================================
// TYPES
// ============================================================================

interface ConsumableCardProps {
  consumable: ConsumableWithStock;
  onSelect: (consumableID: number) => void;
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
  onSelect,
}) => {
  const stockBadge = STOCK_STATUS_BADGE[c.stockStatus];
  const roleBadge = getRoleBadge(c);
  const classification = buildClassification(c);
  const displayName = c.brand ? `${c.brand} — ${c.name}` : c.name;

  const fmt = useFormatters();

  const borderColor =
    c.stockStatus === 'low-stock'    ? 'border-yellow-700' :
    c.stockStatus === 'out-of-stock' ? 'border-red-900' :
    'border-gray-700';

  return (
    <button
      type="button"
      onClick={() => onSelect(c.consumableID)}
      className={`w-full text-left bg-gray-800 rounded-lg border ${borderColor} p-5 hover:bg-gray-750 hover:border-amber-600 transition-colors cursor-pointer`}
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

        {/* Right: chevron affordance */}
        <svg
          className="w-5 h-5 text-gray-500 shrink-0 mt-1"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
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
                  {fmt.date(c.oldestActiveLotDate)}
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
                  {fmt.currency(c.onDemandPrice)} / {c.onDemandPriceQty} {c.unit}
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
    </button>
  );
};
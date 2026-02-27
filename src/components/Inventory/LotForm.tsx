// src/components/Inventory/LotForm.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useToast } from '../../hooks/useToast';
import { getConsumable, addLot } from '../../lib/inventoryDb';
import type { Consumable } from '../../types/inventory';

// ============================================================================
// CONSTANTS
// ============================================================================

const UNIT_OPTIONS = [
  { value: 'g',      label: 'Grams (g)' },
  { value: 'kg',     label: 'Kilograms (kg)' },
  { value: 'mg',     label: 'Milligrams (mg)' },
  { value: 'oz',     label: 'Ounces (oz)' },
  { value: 'lb',     label: 'Pounds (lb)' },
  { value: 'ml',     label: 'Millilitres (ml)' },
  { value: 'l',      label: 'Litres (L)' },
  { value: 'fl oz',  label: 'Fluid Ounces (fl oz)' },
  { value: 'gal',    label: 'US Gallons (gal)' },
  { value: 'tsp',    label: 'Teaspoons (tsp)' },
  { value: 'tbsp',   label: 'Tablespoons (tbsp)' },
  { value: 'count',  label: 'Count (each)' },
  { value: 'pack',   label: 'Pack' },
  { value: 'sachet', label: 'Sachet' },
];

/** ISO 8601 date string for today, in local time. */
function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ============================================================================
// TYPES
// ============================================================================

type CostMode = 'perUnit' | 'total';

interface FormState {
  quantityPurchased: string;
  unit: string;
  purchaseDate: string;
  expirationDate: string;
  costMode: CostMode;
  costValue: string;     // raw input — either per-unit or total depending on costMode
  supplier: string;
  notes: string;
}

interface LotFormProps {
  consumableID: number;
  onComplete: () => void;   // navigates back to ConsumableDetail
}

// ============================================================================
// HELPERS
// ============================================================================

/** Resolve costPerUnit from form state. Returns null when the field is blank. */
function resolveCostPerUnit(
  costValue: string,
  costMode: CostMode,
  quantityPurchased: string
): number | null {
  const raw = parseFloat(costValue);
  if (isNaN(raw) || raw < 0) return null;

  if (costMode === 'perUnit') return raw;

  const qty = parseFloat(quantityPurchased);
  if (isNaN(qty) || qty <= 0) return null;
  return raw / qty;
}

/** Derive a preview string for the non-entered cost side. */
function derivedCostPreview(
  costValue: string,
  costMode: CostMode,
  quantityPurchased: string
): string {
  const raw = parseFloat(costValue);
  const qty = parseFloat(quantityPurchased);

  if (isNaN(raw) || raw < 0) return '—';

  if (costMode === 'perUnit') {
    if (isNaN(qty) || qty <= 0) return '—';
    return `$${(raw * qty).toFixed(2)}`;
  } else {
    if (isNaN(qty) || qty <= 0) return '—';
    return `$${(raw / qty).toFixed(4)}`;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export const LotForm: React.FC<LotFormProps> = ({ consumableID, onComplete }) => {
  const { db, markDirty } = useDatabase();
  const toast = useToast();

  const [consumable, setConsumable]   = useState<Consumable | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<FormState>({
    quantityPurchased: '',
    unit: '',
    purchaseDate: todayISO(),
    expirationDate: '',
    costMode: 'perUnit',
    costValue: '',
    supplier: '',
    notes: '',
  });

  // =========================================================================
  // LOAD CONSUMABLE (to get default unit and display name)
  // =========================================================================

  useEffect(() => {
    if (!db) return;
    try {
      const c = getConsumable(db, consumableID);
      if (!c) throw new Error(`Consumable ID ${consumableID} not found`);
      setConsumable(c);
      setForm(prev => ({ ...prev, unit: c.unit }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load consumable');
    } finally {
      setIsLoading(false);
    }
  }, [db, consumableID]); // eslint-disable-line react-hooks/exhaustive-deps

  // =========================================================================
  // FIELD HELPERS
  // =========================================================================

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setForm(prev => ({ ...prev, [key]: value })),
    []
  );

  const inputCls =
    'w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 ' +
    'focus:border-amber-500 focus:outline-none';

  // =========================================================================
  // SUBMIT
  // =========================================================================

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!db || !consumable) { toast.error('Database not available'); return; }

      // --- Validate required fields ---
      const qty = parseFloat(form.quantityPurchased);
      if (!form.quantityPurchased || isNaN(qty) || qty <= 0) {
        toast.error('Quantity must be a positive number');
        return;
      }
      if (!form.unit) {
        toast.error('Unit is required');
        return;
      }
      if (!form.purchaseDate) {
        toast.error('Acquisition date is required');
        return;
      }

      // --- Validate expiration date (if provided) ---
      if (form.expirationDate && form.expirationDate <= form.purchaseDate) {
        toast.error('Expiration date must be after the acquisition date');
        return;
      }

      // --- Validate cost (if provided) ---
      if (form.costValue.trim() !== '') {
        const rawCost = parseFloat(form.costValue);
        if (isNaN(rawCost) || rawCost < 0) {
          toast.error('Cost must be a non-negative number');
          return;
        }
        if (form.costMode === 'total' && (isNaN(qty) || qty <= 0)) {
          toast.error('A valid quantity is required to calculate cost per unit from total cost');
          return;
        }
      }

      setIsSubmitting(true);

      try {
        const costPerUnit = form.costValue.trim() !== ''
          ? resolveCostPerUnit(form.costValue, form.costMode, form.quantityPurchased)
          : undefined;

        addLot(db, {
          consumableID,
          quantityPurchased: qty,
          unit: form.unit,
          purchaseDate: form.purchaseDate,
          expirationDate: form.expirationDate || undefined,
          costPerUnit:    costPerUnit ?? undefined,
          supplier:       form.supplier.trim() || undefined,
          notes:          form.notes.trim() || undefined,
        });

        markDirty();
        toast.success('Lot added');
        onComplete();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to add lot');
      } finally {
        setIsSubmitting(false);
      }
    },
    [db, consumable, form, consumableID, markDirty, onComplete, toast]
  );

  // =========================================================================
  // RENDER: LOADING
  // =========================================================================

  if (isLoading || !consumable) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-2xl">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  const displayName = consumable.brand
    ? `${consumable.brand} ${consumable.name}`
    : consumable.name;

  const costPreview = derivedCostPreview(form.costValue, form.costMode, form.quantityPurchased);
  const previewLabel = form.costMode === 'perUnit' ? 'Total cost' : 'Cost per unit';

  // =========================================================================
  // RENDER: FORM
  // =========================================================================

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-2xl">
      <h3 className="text-2xl font-semibold text-white mb-1">Add Lot</h3>
      <p className="text-sm text-gray-400 mb-6">{displayName}</p>

      <form onSubmit={handleSubmit} noValidate>

        {/* ------------------------------------------------------------------ */}
        {/* QUANTITY + UNIT                                                      */}
        {/* ------------------------------------------------------------------ */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Quantity <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="decimal"
              value={form.quantityPurchased}
              onChange={e => set('quantityPurchased', e.target.value)}
              placeholder="0"
              min={0}
              step="any"
              required
              className="w-32 bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
            />
            <select
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              className="w-auto bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
            >
              {UNIT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* DATES                                                               */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Acquisition Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={e => set('purchaseDate', e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Expiration Date <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={form.expirationDate}
              onChange={e => set('expirationDate', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* COST                                                                */}
        {/* ------------------------------------------------------------------ */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Cost <span className="text-gray-500 font-normal">(optional)</span>
          </label>

          {/* Radio toggle */}
          <div className="flex items-center gap-4 mb-3">
            {(['perUnit', 'total'] as CostMode[]).map(mode => (
              <label key={mode} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="costMode"
                  value={mode}
                  checked={form.costMode === mode}
                  onChange={() => set('costMode', mode)}
                  className="accent-amber-500"
                />
                <span className="text-sm text-gray-300">
                  {mode === 'perUnit' ? 'Per unit' : 'Total cost'}
                </span>
              </label>
            ))}
          </div>

          {/* Cost input + derived preview */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={form.costValue}
                onChange={e => set('costValue', e.target.value)}
                placeholder="0.00"
                min={0}
                step="any"
                className="w-32 bg-gray-700 text-white rounded-lg pl-7 pr-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="text-sm text-gray-400">
              {previewLabel}:&nbsp;
              <span className="font-mono text-green-400">{costPreview}</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SUPPLIER                                                            */}
        {/* ------------------------------------------------------------------ */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Supplier <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={form.supplier}
            onChange={e => set('supplier', e.target.value)}
            placeholder="e.g. MoreBeer, local homebrew shop…"
            className={inputCls}
          />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* NOTES                                                               */}
        {/* ------------------------------------------------------------------ */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Notes <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Batch number, lot code, quality observations…"
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* ACTIONS                                                             */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-900 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isSubmitting ? 'Saving…' : 'Add Lot'}
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={isSubmitting}
            className="bg-gray-700 hover:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
};
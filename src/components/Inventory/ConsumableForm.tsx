// src/components/Inventory/ConsumableForm.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useToast } from '../../hooks/useToast';
import {
  getConsumable,
  createConsumable,
  updateConsumable,
  getIngredientTypes,
  getIngredientSubtypes,
  getSupplyTypes,
  createIngredientType,
  createSupplyType,
} from '../../lib/inventoryDb';
import { CompactNumberField, INPUT_WIDTHS } from '../common/FormComponents';
import type {
  ConsumableFormData,
  IngredientType,
  IngredientSubtype,
  SupplyType,
  ItemCategory,
} from '../../types/inventory';

// ============================================================================
// TYPES
// ============================================================================

type ItemRole = 'ingredient' | 'supply' | 'dual' | '';

interface ConsumableFormProps {
  mode: 'add' | 'edit';
  consumableID?: number;
  onComplete: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EMPTY_FORM: ConsumableFormData = {
  brand: '',
  name: '',
  unit: '',
  ingredientTypeID: '',
  ingredientSubtypeID: '',
  supplyTypeID: '',
  onDemand: false,
  onDemandPrice: '',
  onDemandPriceQty: '',
  reorderPoint: '',
  reorderQuantity: '',
  autoAlert: true,
  notes: '',
};

const UNIT_OPTIONS = [
  { value: '',       label: 'Select unit…' },
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

// ============================================================================
// HELPERS
// ============================================================================

/** Extract unique categories from a list of typed items. */
function extractCategories(
  items: Array<{ categoryID: number; categoryName: string }>
): ItemCategory[] {
  const seen = new Set<number>();
  const cats: ItemCategory[] = [];
  for (const item of items) {
    if (!seen.has(item.categoryID)) {
      seen.add(item.categoryID);
      // Cast to satisfy the type — only the fields used in the form are needed
      cats.push({
        categoryID: item.categoryID,
        name: item.categoryName,
        roleID: 'ingredient', // placeholder; not used for logic
        description: null,
        sortOrder: 0,
        hasBeenUsed: false,
      });
    }
  }
  return cats;
}

// ============================================================================
// SUB-COMPONENT: INLINE TYPE CREATION ROW
// ============================================================================

interface InlineTypeCreateProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const InlineTypeCreate: React.FC<InlineTypeCreateProps> = ({ onConfirm, onCancel }) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div className="flex gap-2 mt-2">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') onCancel(); }}
        placeholder="New type name"
        className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
      />
      <button
        type="button"
        onClick={handleConfirm}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        Add
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        Cancel
      </button>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ConsumableForm: React.FC<ConsumableFormProps> = ({
  mode,
  consumableID,
  onComplete,
}) => {
  const { db, markDirty } = useDatabase();
  const toast = useToast();

  // -- Form state -----------------------------------------------------------
  const [formData, setFormData] = useState<ConsumableFormData>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -- Role / cascading selection -------------------------------------------
  const [itemRole, setItemRole] = useState<ItemRole>('');
  const [ingredientCategoryID, setIngredientCategoryID] = useState<string>('');
  const [supplyCategoryID, setSupplyCategoryID] = useState<string>('');

  // -- Lookup data ----------------------------------------------------------
  const [allIngredientTypes, setAllIngredientTypes] = useState<IngredientType[]>([]);
  const [allSupplyTypes, setAllSupplyTypes]         = useState<SupplyType[]>([]);
  const [ingredientSubtypes, setIngredientSubtypes] = useState<IngredientSubtype[]>([]);

  // -- Inline type creation -------------------------------------------------
  const [showIngTypeCreate, setShowIngTypeCreate] = useState(false);
  const [showSupTypeCreate, setShowSupTypeCreate] = useState(false);

  // -- Edit-mode structural lock --------------------------------------------
  const [structuralLocked, setStructuralLocked] = useState(false);

  // =========================================================================
  // DERIVED LISTS
  // =========================================================================

  const ingredientCategories = extractCategories(allIngredientTypes);
  const supplyCategories     = extractCategories(allSupplyTypes);

  const filteredIngredientTypes = ingredientCategoryID
    ? allIngredientTypes.filter(t => t.categoryID === parseInt(ingredientCategoryID, 10))
    : [];

  const filteredSupplyTypes = supplyCategoryID
    ? allSupplyTypes.filter(t => t.categoryID === parseInt(supplyCategoryID, 10))
    : [];

  // =========================================================================
  // LOAD LOOKUP DATA
  // =========================================================================

  useEffect(() => {
    if (!db) return;
    try {
      setAllIngredientTypes(getIngredientTypes(db));
      setAllSupplyTypes(getSupplyTypes(db));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to load type options: ${msg}`);
    }
  }, [db]);

  // =========================================================================
  // LOAD EXISTING CONSUMABLE (edit mode)
  // =========================================================================

  useEffect(() => {
    if (mode !== 'edit' || !consumableID || !db) return;

    try {
      const c = getConsumable(db, consumableID);
      if (!c) { toast.error('Consumable not found'); onComplete(); return; }

      setStructuralLocked(c.hasBeenUsed);

      // Determine role
      const hasBoth = c.ingredientTypeID != null && c.supplyTypeID != null;
      const role: ItemRole = hasBoth
        ? 'dual'
        : c.ingredientTypeID != null
          ? 'ingredient'
          : 'supply';
      setItemRole(role);

      // Restore category selections from joined data
      if (c.ingredientCategoryID) setIngredientCategoryID(c.ingredientCategoryID.toString());
      if (c.supplyCategoryID)     setSupplyCategoryID(c.supplyCategoryID.toString());

      setFormData({
        brand:               c.brand ?? '',
        name:                c.name,
        unit:                c.unit,
        ingredientTypeID:    c.ingredientTypeID?.toString() ?? '',
        ingredientSubtypeID: c.ingredientSubtypeID?.toString() ?? '',
        supplyTypeID:        c.supplyTypeID?.toString() ?? '',
        onDemand:            c.onDemand,
        onDemandPrice:       c.onDemandPrice?.toString() ?? '',
        onDemandPriceQty:    c.onDemandPriceQty?.toString() ?? '',
        reorderPoint:        c.reorderPoint?.toString() ?? '',
        reorderQuantity:     c.reorderQuantity?.toString() ?? '',
        autoAlert:           c.autoAlert,
        notes:               c.notes ?? '',
      });

      if (c.ingredientTypeID) {
        setIngredientSubtypes(getIngredientSubtypes(db, c.ingredientTypeID));
      }

      setIsLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to load consumable: ${msg}`);
      onComplete();
    }
  }, [mode, consumableID, db]);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const set = useCallback(
    <K extends keyof ConsumableFormData>(key: K, value: ConsumableFormData[K]) => {
      setFormData(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  // Role change — resets all cascading selections
  const handleRoleChange = useCallback((role: ItemRole) => {
    setItemRole(role);
    setIngredientCategoryID('');
    setSupplyCategoryID('');
    setFormData(prev => ({
      ...prev,
      ingredientTypeID: '',
      ingredientSubtypeID: '',
      supplyTypeID: '',
    }));
    setIngredientSubtypes([]);
    setShowIngTypeCreate(false);
    setShowSupTypeCreate(false);
  }, []);

  // Ingredient category change — resets type and subtype
  const handleIngCategoryChange = useCallback((catID: string) => {
    setIngredientCategoryID(catID);
    setFormData(prev => ({ ...prev, ingredientTypeID: '', ingredientSubtypeID: '' }));
    setIngredientSubtypes([]);
  }, []);

  // Supply category change — resets supply type
  const handleSupCategoryChange = useCallback((catID: string) => {
    setSupplyCategoryID(catID);
    setFormData(prev => ({ ...prev, supplyTypeID: '' }));
  }, []);

  // Ingredient type change — load subtypes
  const handleIngTypeChange = useCallback((typeID: string) => {
    set('ingredientTypeID', typeID);
    set('ingredientSubtypeID', '');
    setIngredientSubtypes([]);
    if (!typeID || !db) return;
    try {
      setIngredientSubtypes(getIngredientSubtypes(db, parseInt(typeID, 10)));
    } catch (err) {
      console.error('Failed to load subtypes:', err);
    }
  }, [db, set]);

  // Track stock toggle — mirror to onDemand (inverted)
  const handleTrackStockChange = useCallback((trackStock: boolean) => {
    setFormData(prev => ({
      ...prev,
      onDemand: !trackStock,
      reorderPoint:     trackStock ? prev.reorderPoint : '',
      reorderQuantity:  trackStock ? prev.reorderQuantity : '',
      onDemandPrice:    trackStock ? '' : prev.onDemandPrice,
      onDemandPriceQty: trackStock ? '' : prev.onDemandPriceQty,
    }));
  }, []);

  // Inline type creation — ingredient
  const handleCreateIngType = useCallback((name: string) => {
    if (!db || !ingredientCategoryID) return;
    try {
      const newType = createIngredientType(db, {
        categoryID: parseInt(ingredientCategoryID, 10),
        name,
        beverageTypes: JSON.stringify([]),
        isPrimaryRequired: 0,
      });
      setAllIngredientTypes(prev => [...prev, newType]);
      set('ingredientTypeID', newType.ingredientTypeID.toString());
      setIngredientSubtypes([]);
      markDirty();
      toast.success(`✓ Type "${name}" created`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to create type: ${msg}`);
    } finally {
      setShowIngTypeCreate(false);
    }
  }, [db, ingredientCategoryID, set, markDirty, toast]);

  // Inline type creation — supply
  const handleCreateSupType = useCallback((name: string) => {
    if (!db || !supplyCategoryID) return;
    try {
      const newType = createSupplyType(db, {
        categoryID: parseInt(supplyCategoryID, 10),
        name,
      });
      setAllSupplyTypes(prev => [...prev, newType]);
      set('supplyTypeID', newType.supplyTypeID.toString());
      markDirty();
      toast.success(`✓ Type "${name}" created`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to create type: ${msg}`);
    } finally {
      setShowSupTypeCreate(false);
    }
  }, [db, supplyCategoryID, set, markDirty, toast]);

  // =========================================================================
  // SUBMIT
  // =========================================================================

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!db) { toast.error('Database not available'); return; }

      // Validation
      if (!itemRole) { toast.error('Please select an item role'); return; }
      if (!formData.name.trim()) { toast.error('Name is required'); return; }
      if (!formData.unit) { toast.error('Unit is required'); return; }

      const needsIngType = itemRole === 'ingredient' || itemRole === 'dual';
      const needsSupType = itemRole === 'supply'     || itemRole === 'dual';
      if (needsIngType && !formData.ingredientTypeID) {
        toast.error('Please select an ingredient type'); return;
      }
      if (needsSupType && !formData.supplyTypeID) {
        toast.error('Please select a supply type'); return;
      }

      if (formData.onDemand) {
        if (formData.onDemandPrice && isNaN(parseFloat(formData.onDemandPrice))) {
          toast.error('On-demand price must be a valid number'); return;
        }
        if (formData.onDemandPriceQty && isNaN(parseFloat(formData.onDemandPriceQty))) {
          toast.error('On-demand price quantity must be a valid number'); return;
        }
      } else {
        if (formData.reorderPoint && isNaN(parseFloat(formData.reorderPoint))) {
          toast.error('Reorder point must be a valid number'); return;
        }
        if (formData.reorderQuantity && isNaN(parseFloat(formData.reorderQuantity))) {
          toast.error('Reorder quantity must be a valid number'); return;
        }
      }

      setIsSubmitting(true);

      try {
        const ingTypeID = formData.ingredientTypeID ? parseInt(formData.ingredientTypeID, 10) : undefined;
        const ingSubID  = formData.ingredientSubtypeID ? parseInt(formData.ingredientSubtypeID, 10) : undefined;
        const supTypeID = formData.supplyTypeID ? parseInt(formData.supplyTypeID, 10) : undefined;

        if (mode === 'add') {
          createConsumable(db, {
            brand:            formData.brand.trim() || undefined,
            name:             formData.name.trim(),
            unit:             formData.unit,
            ingredientTypeID: ingTypeID,
            ingredientSubtypeID: ingSubID,
            supplyTypeID:     supTypeID,
            onDemand:         formData.onDemand ? 1 : 0,
            onDemandPrice:    formData.onDemandPrice    ? parseFloat(formData.onDemandPrice)    : undefined,
            onDemandPriceQty: formData.onDemandPriceQty ? parseFloat(formData.onDemandPriceQty) : undefined,
            reorderPoint:     formData.reorderPoint     ? parseFloat(formData.reorderPoint)     : undefined,
            reorderQuantity:  formData.reorderQuantity  ? parseFloat(formData.reorderQuantity)  : undefined,
            autoAlert:        formData.autoAlert ? 1 : 0,
            notes:            formData.notes.trim() || undefined,
          });
          markDirty();
          toast.success(`✓ "${formData.name.trim()}" added to inventory`);

        } else if (consumableID) {
          const updates = structuralLocked
            ? {
                brand:            formData.brand.trim() || null,
                name:             formData.name.trim(),
                onDemand:         formData.onDemand ? 1 as const : 0 as const,
                onDemandPrice:    formData.onDemandPrice    ? parseFloat(formData.onDemandPrice)    : null,
                onDemandPriceQty: formData.onDemandPriceQty ? parseFloat(formData.onDemandPriceQty) : null,
                reorderPoint:     formData.reorderPoint     ? parseFloat(formData.reorderPoint)     : null,
                reorderQuantity:  formData.reorderQuantity  ? parseFloat(formData.reorderQuantity)  : null,
                autoAlert:        formData.autoAlert ? 1 as const : 0 as const,
                notes:            formData.notes.trim() || null,
              }
            : {
                brand:               formData.brand.trim() || null,
                name:                formData.name.trim(),
                unit:                formData.unit,
                ingredientTypeID:    ingTypeID ?? null,
                ingredientSubtypeID: ingSubID  ?? null,
                supplyTypeID:        supTypeID ?? null,
                onDemand:            formData.onDemand ? 1 as const : 0 as const,
                onDemandPrice:       formData.onDemandPrice    ? parseFloat(formData.onDemandPrice)    : null,
                onDemandPriceQty:    formData.onDemandPriceQty ? parseFloat(formData.onDemandPriceQty) : null,
                reorderPoint:        formData.reorderPoint     ? parseFloat(formData.reorderPoint)     : null,
                reorderQuantity:     formData.reorderQuantity  ? parseFloat(formData.reorderQuantity)  : null,
                autoAlert:           formData.autoAlert ? 1 as const : 0 as const,
                notes:               formData.notes.trim() || null,
              };

          updateConsumable(db, consumableID, updates);
          markDirty();
          toast.success(`✓ "${formData.name.trim()}" updated`);
        }

        onComplete();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Failed to ${mode === 'add' ? 'add' : 'update'} consumable: ${msg}`);
      } finally {
        setIsSubmitting(false);
      }
    },
    [db, formData, itemRole, mode, consumableID, structuralLocked, markDirty, onComplete, toast]
  );

  // =========================================================================
  // SHARED CLASSES
  // =========================================================================

  const selectCls = (locked = false) =>
    `w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none ${
      locked ? 'opacity-60 cursor-not-allowed' : ''
    }`;

  const inputCls = (locked = false) =>
    `w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none ${
      locked ? 'opacity-60 cursor-not-allowed' : ''
    }`;

  const lockBadge = <span className="ml-2 text-xs text-amber-400">🔒 Locked</span>;

  // =========================================================================
  // RENDER: LOADING
  // =========================================================================

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-2xl">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  // =========================================================================
  // RENDER: FORM
  // =========================================================================

  const trackStock = !formData.onDemand;
  const showIngredientFields = itemRole === 'ingredient' || itemRole === 'dual';
  const showSupplyFields     = itemRole === 'supply'     || itemRole === 'dual';

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-2xl">
      <h3 className="text-2xl font-semibold text-white mb-6">
        {mode === 'add' ? 'Create Item' : 'Edit Item'}
      </h3>

      {structuralLocked && (
        <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700 rounded-lg">
          <p className="text-sm text-amber-300">
            <strong>Structural fields are locked.</strong> This consumable has been used in one or
            more batches. The unit, ingredient type, and supply type cannot be changed to preserve
            historical data integrity. All other fields can still be edited.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ================================================================
            ITEM ROLE
        ================================================================ */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Item Role <span className="text-red-500">*</span>
            {structuralLocked && lockBadge}
          </label>
          <select
            value={itemRole}
            onChange={e => !structuralLocked && handleRoleChange(e.target.value as ItemRole)}
            disabled={structuralLocked}
            className={selectCls(structuralLocked)}
          >
            <option value="">Select role…</option>
            <option value="ingredient">Ingredient</option>
            <option value="supply">Supply</option>
            <option value="dual">Dual Purpose</option>
          </select>
        </div>

        {/* ================================================================
            CASCADING CATEGORY / TYPE (shown once a role is selected)
        ================================================================ */}
        {itemRole && (
          <>
            <hr className="border-gray-700" />

            {/* --- INGREDIENT CATEGORY + TYPE --- */}
            {showIngredientFields && (
              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    {itemRole === 'dual' ? 'Ingredient Category' : 'Category'}
                    <span className="text-red-500"> *</span>
                    {structuralLocked && lockBadge}
                  </label>
                  <select
                    value={ingredientCategoryID}
                    onChange={e => !structuralLocked && handleIngCategoryChange(e.target.value)}
                    disabled={structuralLocked}
                    className={selectCls(structuralLocked)}
                  >
                    <option value="">Select category…</option>
                    {ingredientCategories.map(cat => (
                      <option key={cat.categoryID} value={cat.categoryID.toString()}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type — shown only after a category is picked */}
                {ingredientCategoryID && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      {itemRole === 'dual' ? 'Ingredient Type' : 'Type'}
                      <span className="text-red-500"> *</span>
                      {structuralLocked && lockBadge}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.ingredientTypeID}
                        onChange={e => !structuralLocked && handleIngTypeChange(e.target.value)}
                        disabled={structuralLocked}
                        className={`flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none ${
                          structuralLocked ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        <option value="">Select type…</option>
                        {filteredIngredientTypes.map(t => (
                          <option key={t.ingredientTypeID} value={t.ingredientTypeID.toString()}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      {/* Only show "+ New" button for ingredient and supply roles (not dual) */}
                      {itemRole !== 'dual' && !structuralLocked && (
                        <button
                          type="button"
                          onClick={() => setShowIngTypeCreate(prev => !prev)}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
                        >
                          + New
                        </button>
                      )}
                    </div>
                    {showIngTypeCreate && (
                      <InlineTypeCreate
                        onConfirm={handleCreateIngType}
                        onCancel={() => setShowIngTypeCreate(false)}
                      />
                    )}
                  </div>
                )}

                {/* Subtype — shown only after a type with subtypes is picked */}
                {formData.ingredientTypeID && ingredientSubtypes.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Subtype <span className="text-gray-500">(optional)</span>
                      {structuralLocked && lockBadge}
                    </label>
                    <select
                      value={formData.ingredientSubtypeID}
                      onChange={e => !structuralLocked && set('ingredientSubtypeID', e.target.value)}
                      disabled={structuralLocked}
                      className={selectCls(structuralLocked)}
                    >
                      <option value="">— No specific subtype —</option>
                      {ingredientSubtypes.map(s => (
                        <option key={s.ingredientSubtypeID} value={s.ingredientSubtypeID.toString()}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank if this item does not have a specific subtype
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* --- SUPPLY CATEGORY + TYPE --- */}
            {showSupplyFields && (
              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    {itemRole === 'dual' ? 'Supply Category' : 'Category'}
                    <span className="text-red-500"> *</span>
                    {structuralLocked && lockBadge}
                  </label>
                  <select
                    value={supplyCategoryID}
                    onChange={e => !structuralLocked && handleSupCategoryChange(e.target.value)}
                    disabled={structuralLocked}
                    className={selectCls(structuralLocked)}
                  >
                    <option value="">Select category…</option>
                    {supplyCategories.map(cat => (
                      <option key={cat.categoryID} value={cat.categoryID.toString()}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type — shown only after a category is picked */}
                {supplyCategoryID && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      {itemRole === 'dual' ? 'Supply Type' : 'Type'}
                      <span className="text-red-500"> *</span>
                      {structuralLocked && lockBadge}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.supplyTypeID}
                        onChange={e => !structuralLocked && set('supplyTypeID', e.target.value)}
                        disabled={structuralLocked}
                        className={`flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none ${
                          structuralLocked ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        <option value="">Select type…</option>
                        {filteredSupplyTypes.map(t => (
                          <option key={t.supplyTypeID} value={t.supplyTypeID.toString()}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      {itemRole !== 'dual' && !structuralLocked && (
                        <button
                          type="button"
                          onClick={() => setShowSupTypeCreate(prev => !prev)}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
                        >
                          + New
                        </button>
                      )}
                    </div>
                    {showSupTypeCreate && (
                      <InlineTypeCreate
                        onConfirm={handleCreateSupType}
                        onCancel={() => setShowSupTypeCreate(false)}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <hr className="border-gray-700" />

        {/* ================================================================
            IDENTITY: BRAND + NAME
        ================================================================ */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Brand <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.brand}
            onChange={e => set('brand', e.target.value)}
            placeholder="e.g., Lalvin, Star San, Nature Nate's"
            className={inputCls()}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Item Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g., EC-1118, Star San, Wildflower Honey"
            required
            className={inputCls()}
          />
        </div>

        {/* ================================================================
            UNIT
        ================================================================ */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Unit of Measure <span className="text-red-500">*</span>
            {structuralLocked && lockBadge}
          </label>
          <select
            value={formData.unit}
            onChange={e => set('unit', e.target.value)}
            required
            disabled={structuralLocked}
            className={selectCls(structuralLocked)}
          >
            {UNIT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Choose the unit this consumable is measured in. It cannot be changed once the consumable
            has been used in a batch.
          </p>
        </div>

        <hr className="border-gray-700" />

        {/* ================================================================
            TRACK STOCK TOGGLE
        ================================================================ */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={trackStock}
              onChange={e => handleTrackStockChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm font-semibold text-gray-300">Track Stock</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Uncheck for items you buy or make as needed without tracking inventory
          </p>
        </div>

        {/* ================================================================
            STOCK TRACKING FIELDS
        ================================================================ */}
        {trackStock && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Low Stock Alert (Reorder Point)
              </label>
              <div className="flex items-end gap-3">
                <CompactNumberField
                  id="reorderPoint"
                  label=""
                  value={formData.reorderPoint}
                  onChange={e => set('reorderPoint', e.target.value)}
                  placeholder="e.g., 500"
                  fieldType={INPUT_WIDTHS.STANDARD}
                />
                <CompactNumberField
                  id="reorderQuantity"
                  label=""
                  value={formData.reorderQuantity}
                  onChange={e => set('reorderQuantity', e.target.value)}
                  placeholder="Reorder qty"
                  fieldType={INPUT_WIDTHS.STANDARD}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Get notified when stock falls below this amount. Leave blank to disable alerts.
              </p>
            </div>

            {formData.reorderPoint && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoAlert"
                  checked={formData.autoAlert}
                  onChange={e => set('autoAlert', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="autoAlert" className="text-sm text-gray-300 cursor-pointer">
                  Show low-stock alert when stock falls below reorder point
                </label>
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            ON-DEMAND FIELDS
        ================================================================ */}
        {!trackStock && (
          <div className="space-y-4 bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">
              Since you are not tracking stock, provide pricing info for cost calculations:
            </p>
            <div className="flex items-end gap-3">
              <CompactNumberField
                id="onDemandPrice"
                label="Price"
                value={formData.onDemandPrice}
                onChange={e => set('onDemandPrice', e.target.value)}
                placeholder="0.00"
                step="0.01"
                min={0}
                fieldType={INPUT_WIDTHS.STANDARD}
              />
              <span className="text-gray-400 pb-2">per</span>
              <CompactNumberField
                id="onDemandPriceQty"
                label={`Quantity (${formData.unit || 'unit'})`}
                value={formData.onDemandPriceQty}
                onChange={e => set('onDemandPriceQty', e.target.value)}
                placeholder="1"
                min={0.001}
                step="any"
                fieldType={INPUT_WIDTHS.STANDARD}
              />
            </div>
            <p className="text-xs text-gray-500">
              Example: $5.99 for 500 g → Price = 5.99, Quantity = 500
            </p>
          </div>
        )}

        <hr className="border-gray-700" />

        {/* ================================================================
            NOTES
        ================================================================ */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Notes <span className="text-gray-500">(optional)</span>
          </label>
          <textarea
            value={formData.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            placeholder="Any additional information about this consumable…"
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none resize-none"
          />
        </div>

        {/* ================================================================
            ACTIONS
        ================================================================ */}
        <div className="flex gap-4 pt-2">
          <button
            type="button"
            onClick={onComplete}
            disabled={isSubmitting}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isSubmitting
              ? (mode === 'add' ? 'Creating…' : 'Saving…')
              : (mode === 'add' ? 'Create Item' : 'Save Changes')}
          </button>
        </div>
      </form>
    </div>
  );
};
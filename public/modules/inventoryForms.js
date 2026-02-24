// inventoryForms.js - Inventory forms using unified item API

import BrewCode from './brewcode.js';
import { renderNavigation } from './navigation.js';
import { CONVERSIONS } from './conversions.js';
import { showToast } from './uiHelpers.js';
import { getFormatters } from './formatHelpers.js';
import { 
    INPUT_WIDTHS,
    renderCompactNumberField,
    renderCompactSelectField
} from './formHelpers.js';

/**
 * Show create item form
 */
function showCreateItemForm(BrewCode) {
    const categories = BrewCode.query('SELECT * FROM itemCategories ORDER BY sortOrder');
    const ingredientTypes = BrewCode.query('SELECT * FROM ingredientTypes WHERE isActive = 1 ORDER BY name');
    const supplyTypes = BrewCode.query('SELECT * FROM supplyTypes WHERE isActive = 1 ORDER BY name');
    
    const massUnits = Object.entries(CONVERSIONS.mass.units);
    const volumeUnits = Object.entries(CONVERSIONS.volume.units);
    const allUnits = [...massUnits, ...volumeUnits, ['count', 'count']].sort((a, b) => a[1].localeCompare(b[1]));

    const content = `
        <div class="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-2xl mx-auto">
            <h3 class="text-2xl font-semibold text-white mb-6">Create Item</h3>
            
            <div id="createItemForm" class="space-y-6">
                <!-- Item Role -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Item Role <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                        <select 
                            id="itemRoleSelect"
                            onchange="window.brewcode.updateCategoryOptionsForCreate()"
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none appearance-none"
                        >
                            <option value="">Select role...</option>
                            <option value="ingredient">Ingredient</option>
                            <option value="supply">Supply</option>
                            <option value="dual">Dual Purpose</option>
                        </select>
                        <svg class="absolute right-3 top-3.5 text-gray-500 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </div>

                <hr class="border-gray-700">

                <!-- Category and Type Grid (responsive layout for dual-purpose) -->
                <div id="categoryTypeGrid" class="hidden">
                    <!-- Ingredient Category -->
                    <div id="categorySection">
                        <label id="categoryLabel" class="block text-sm font-semibold text-gray-300 mb-2">
                            Category <span class="text-red-500">*</span>
                        </label>
                        <div class="relative max-w-md">
                            <select 
                                id="categorySelect"
                                onchange="window.brewcode.updateTypeOptionsForCreate()"
                                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none appearance-none"
                            >
                                <option value="">Select category...</option>
                            </select>
                            <svg class="absolute right-3 top-3.5 text-gray-500 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                    </div>

                    <!-- Supply Category (dual purpose only) -->
                    <div id="dualCategorySection" class="hidden">
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Supply Category
                        </label>
                        <input 
                            type="text"
                            id="supplyCategoryDisplay"
                            value="Cleaners & Sanitizers"
                            disabled
                            class="w-full max-w-md bg-gray-600 text-gray-300 rounded-lg px-4 py-3 border border-gray-600 cursor-not-allowed"
                        />
                    </div>

                    <!-- Ingredient Type -->
                    <div id="typeSection">
                        <label id="typeLabel" class="block text-sm font-semibold text-gray-300 mb-2">
                            Type <span class="text-red-500">*</span>
                        </label>
                        <div class="flex gap-2 mb-2">
                            <div class="relative flex-1 max-w-md">
                                <select 
                                    id="typeSelect"
                                    onchange="window.brewcode.updateSubtypeOptions()"
                                    class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none appearance-none"
                                >
                                    <option value="">Select category first...</option>
                                </select>
                                <svg class="absolute right-3 top-3.5 text-gray-500 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                            <button 
                                type="button"
                                id="createTypeButton"
                                onclick="window.brewcode.showCreateTypeInline()"
                                class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
                            >
                                + New
                            </button>
                        </div>
                        <div id="inlineTypeCreate" class="hidden mt-2 flex gap-2">
                            <input 
                                type="text"
                                id="newTypeName"
                                placeholder="New type name"
                                class="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
                            />
                            <button 
                                type="button"
                                onclick="window.brewcode.createTypeInline()"
                                class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                            >
                                Add
                            </button>
                            <button 
                                type="button"
                                onclick="window.brewcode.hideCreateTypeInline()"
                                class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>

                    <!-- Ingredient Subtype (optional) -->
                    <div id="subtypeSection" class="hidden">
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Subtype <span class="text-gray-500">(Optional)</span>
                        </label>
                        <div class="relative max-w-md">
                            <select 
                                id="subtypeSelect"
                                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none appearance-none"
                            >
                                <option value="">No specific subtype</option>
                            </select>
                            <svg class="absolute right-3 top-3.5 text-gray-500 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Leave blank if this item doesn't have a specific subtype</p>
                    </div>

                    <!-- Supply Type (dual purpose only) -->
                    <div id="dualSupplyTypeSection" class="hidden">
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Supply Type
                        </label>
                        <input 
                            type="text"
                            id="supplyTypeDisplay"
                            disabled
                            class="w-full max-w-md bg-gray-600 text-gray-300 rounded-lg px-4 py-3 border border-gray-600 cursor-not-allowed"
                        />
                        <input type="hidden" id="supplyTypeSelect" />
                    </div>
                </div>

                <hr class="border-gray-700">

                <!-- Brand -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Brand
                    </label>
                    <input 
                        type="text"
                        id="brandInput"
                        placeholder="Brand name or leave blank for generic"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                </div>

                <!-- Name -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Item Name <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="text"
                        id="nameInput"
                        placeholder="e.g., Apple Juice, 71B-1122, Star San"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                </div>

                <!-- Unit -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Unit of Measure <span class="text-red-500">*</span>
                    </label>
                    ${renderCompactSelectField({
                        id: 'unitSelect',
                        label: '',
                        choices: [{ value: '', label: 'Select unit...' }, ...allUnits.map(([key, label]) => ({ value: key, label: label }))],
                        value: ''
                    })}
                </div>

                <hr class="border-gray-700">

                <!-- Track Stock -->
                <div>
                    <label class="flex items-center gap-3 cursor-pointer">
                        <input 
                            type="checkbox"
                            id="trackStockCheckbox"
                            checked
                            onchange="window.brewcode.toggleOnDemandFields()"
                            class="w-4 h-4"
                        />
                        <span class="text-sm font-semibold text-gray-300">Track Stock</span>
                    </label>
                    <p class="text-xs text-gray-500 mt-1">Uncheck for items you buy/make as needed without tracking inventory</p>
                </div>

                <!-- Stock Tracking Fields -->
                <div id="stockTrackingFields" class="space-y-4">
                    <div>
                        ${renderCompactNumberField({
                            id: 'reorderPointInput',
                            label: 'Low Stock Alert (Reorder Point)',
                            placeholder: 'e.g., 500',
                            fieldType: INPUT_WIDTHS.STANDARD
                        })}
                        <p class="text-xs text-gray-500 mt-1">Get notified when stock falls below this amount</p>
                    </div>
                </div>

                <!-- On-Demand Fields (hidden by default) -->
                <div id="onDemandFields" class="hidden space-y-4 bg-gray-700/50 rounded-lg p-4">
                    <p class="text-sm text-gray-400">Since you're not tracking stock, provide pricing info for cost calculations:</p>
                    
                    ${renderCompactNumberField({
                        id: 'onDemandPrice',
                        label: 'Price',
                        placeholder: '0.00',
                        step: '0.01',
                        fieldType: INPUT_WIDTHS.STANDARD,
                        disabled: true
                    })}

                    <div>
                        ${renderCompactNumberField({
                            id: 'onDemandQty',
                            label: 'Quantity for that Price',
                            placeholder: '1.0',
                            step: '0.01',
                            fieldType: INPUT_WIDTHS.STANDARD,
                            disabled: true
                        })}
                        <p class="text-xs text-gray-500 mt-1">Example: $5.99 for 500g means Price=5.99, Quantity=500</p>
                    </div>
                </div>

                <!-- Notes -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Notes
                    </label>
                    <textarea 
                        id="notesInput"
                        rows="3"
                        placeholder="Any additional information..."
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none resize-none"
                    ></textarea>
                </div>

                <!-- Buttons -->
                <div class="flex gap-4 pt-4">
                    <button 
                        type="button"
                        onclick="window.brewcode.navigate('inventory')"
                        class="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button"
                        onclick="window.brewcode.submitCreateItem()"
                        class="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Create Item
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('app').innerHTML = `
        ${renderNavigation('inventory')}
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button 
                onclick="window.brewcode.navigate('inventory')"
                class="text-amber-400 hover:text-amber-300 mb-4 inline-block"
            >
                ← Back to Inventory
            </button>
            ${content}
        </div>
    `;
}

/**
 * Update category options based on item role
 */
function updateCategoryOptionsForCreate() {
    const itemRole = document.getElementById('itemRoleSelect').value;
    const categorySelect = document.getElementById('categorySelect');
    const categoryLabel = document.getElementById('categoryLabel');
    const typeLabel = document.getElementById('typeLabel');
    const categoryTypeGrid = document.getElementById('categoryTypeGrid');
    const dualCategorySection = document.getElementById('dualCategorySection');
    const dualSupplyTypeSection = document.getElementById('dualSupplyTypeSection');
    const createTypeButton = document.getElementById('createTypeButton');
    
    // If no role selected, hide everything and return
    if (!itemRole) {
        categoryTypeGrid.classList.add('hidden');
        return;
    }
    
    let optionsHtml = '<option value="">Select category...</option>';
    
    // Show the grid wrapper
    categoryTypeGrid.classList.remove('hidden');
    
    if (itemRole === 'ingredient') {
        categoryLabel.innerHTML = 'Category <span class="text-red-500">*</span>';
        typeLabel.innerHTML = 'Type <span class="text-red-500">*</span>';
        dualCategorySection.classList.add('hidden');
        dualSupplyTypeSection.classList.add('hidden');
        createTypeButton.classList.remove('hidden');
        // Remove grid layout for single column
        categoryTypeGrid.classList.remove('md:grid', 'md:grid-cols-2', 'md:gap-6');
        optionsHtml = '<option value="">Select category...</option><option value="1">Water</option><option value="4">Honeys, Syrups & Sugars</option><option value="2">Fruits & Juices</option><option value="3">Grains & Malts</option><option value="5">Flavorants</option><option value="6">Hops</option><option value="7">Additives</option><option value="8">Yeasts & Microbes</option>';
    } else if (itemRole === 'supply') {
        categoryLabel.innerHTML = 'Category <span class="text-red-500">*</span>';
        typeLabel.innerHTML = 'Type <span class="text-red-500">*</span>';
        dualCategorySection.classList.add('hidden');
        dualSupplyTypeSection.classList.add('hidden');
        createTypeButton.classList.remove('hidden');
        // Remove grid layout for single column
        categoryTypeGrid.classList.remove('md:grid', 'md:grid-cols-2', 'md:gap-6');
        optionsHtml = '<option value="">Select category...</option><option value="9">Cleaners & Sanitizers</option><option value="10">Bottles & Vessels</option><option value="11">Closures</option><option value="12">Packaging Materials</option>';
    } else if (itemRole === 'dual') {
        categoryLabel.innerHTML = 'Ingredient Category <span class="text-red-500">*</span>';
        typeLabel.innerHTML = 'Ingredient Type <span class="text-red-500">*</span>';
        dualCategorySection.classList.remove('hidden');
        dualSupplyTypeSection.classList.remove('hidden');
        createTypeButton.classList.add('hidden');
        // Apply grid layout for two columns on desktop
        categoryTypeGrid.classList.add('md:grid', 'md:grid-cols-2', 'md:gap-6');
        optionsHtml = '<option value="">Select category...</option><option value="1">Water</option><option value="7">Additives</option>';
    }
    
    categorySelect.innerHTML = optionsHtml;
    categorySelect.value = '';
}

/**
 * Update type options based on selected category
 */
function updateTypeOptionsForCreate() {
    const itemRole = document.getElementById('itemRoleSelect').value;
    const categoryID = parseInt(document.getElementById('categorySelect').value);
    const typeSelect = document.getElementById('typeSelect');
    const supplyTypeSelect = document.getElementById('supplyTypeSelect');
    
    if (!categoryID) {
        typeSelect.innerHTML = '<option value="">Select category first...</option>';
        return;
    }
    
    if (itemRole === 'dual') {
        // Auto-fill for dual purpose based on category
        const categories = BrewCode.query('SELECT name FROM itemCategories WHERE categoryID = ?', [categoryID]);
        if (categories.length === 0) {
            typeSelect.innerHTML = '<option value="">Select category first...</option>';
            return;
        }
        
        const categoryName = categories[0].name;
        let typeID = null;
        let typeName = null;
        let supplyTypeID = null;
        let supplyTypeName = null;
        
        if (categoryName === 'Water') {
            const waterType = BrewCode.ingredientType.getAll({ isActive: 1 });
            const water = waterType.find(t => t.name === 'Water');
            if (water) {
                typeID = water.ingredientTypeID;
                typeName = water.name;
            }
            
            // Set supply type to Cleaner
            const cleanersCategoryID = 9; // Cleaners & Sanitizers
            const supplyTypes = BrewCode.supplyType.getAll({ categoryID: cleanersCategoryID, isActive: 1 });
            const cleaner = supplyTypes.find(t => t.name === 'Cleaner');
            if (cleaner) {
                supplyTypeID = cleaner.supplyTypeID;
                supplyTypeName = cleaner.name;
            }
        } else if (categoryName === 'Additives') {
            const additiveTypes = BrewCode.ingredientType.getAll({ isActive: 1 });
            const stabiliser = additiveTypes.find(t => t.name === 'Stabiliser');
            if (stabiliser) {
                typeID = stabiliser.ingredientTypeID;
                typeName = stabiliser.name;
            }
            
            // Set supply type to Sanitiser
            const cleanersCategoryID = 9; // Cleaners & Sanitizers
            const supplyTypes = BrewCode.supplyType.getAll({ categoryID: cleanersCategoryID, isActive: 1 });
            const sanitiser = supplyTypes.find(t => t.name === 'Sanitiser');
            if (sanitiser) {
                supplyTypeID = sanitiser.supplyTypeID;
                supplyTypeName = sanitiser.name;
            }
        }
        
        // Update ingredient type
        if (typeID) {
            typeSelect.innerHTML = `<option value="${typeID}" selected>${typeName}</option>`;
            typeSelect.value = typeID;
        } else {
            typeSelect.innerHTML = '<option value="">Type not found</option>';
        }
        
        // Update supply type display (read-only)
        const supplyTypeDisplay = document.getElementById('supplyTypeDisplay');
        if (supplyTypeID && supplyTypeName) {
            supplyTypeDisplay.value = supplyTypeName;
            supplyTypeSelect.value = supplyTypeID;
        }
    } else {
        // Normal behavior for ingredient/supply
        let types = [];
        if (itemRole === 'ingredient') {
            types = BrewCode.ingredientType.getAll({ categoryID, isActive: 1 });
            typeSelect.innerHTML = `
                <option value="">Select type...</option>
                ${types.map(t => `<option value="${t.ingredientTypeID}">${t.name}</option>`).join('')}
            `;
        } else if (itemRole === 'supply') {
            types = BrewCode.supplyType.getAll({ categoryID, isActive: 1 });
            typeSelect.innerHTML = `
                <option value="">Select type...</option>
                ${types.map(t => `<option value="${t.supplyTypeID}">${t.name}</option>`).join('')}
            `;
        }
        
        // Update subtypes whenever type changes (for ingredients only)
        if (itemRole === 'ingredient') {
            updateSubtypeOptions();
        }
    }
}

/**
 * Update subtype options based on selected ingredient type
 */
function updateSubtypeOptions() {
    const itemRole = document.getElementById('itemRoleSelect').value;
    const typeID = parseInt(document.getElementById('typeSelect').value);
    const subtypeSection = document.getElementById('subtypeSection');
    const subtypeSelect = document.getElementById('subtypeSelect');
    
    // Only show subtypes for ingredient role (not supply, not dual)
    if (itemRole !== 'ingredient' || !typeID) {
        subtypeSection.classList.add('hidden');
        return;
    }
    
    // Get subtypes for this type
    const subtypes = BrewCode.subtype.getAll({ ingredientTypeID: typeID, isActive: 1 });
    
    if (subtypes.length === 0) {
        // No subtypes available, hide the section
        subtypeSection.classList.add('hidden');
        return;
    }
    
    // Show subtype section and populate options
    subtypeSection.classList.remove('hidden');
    subtypeSelect.innerHTML = `
        <option value="">No specific subtype</option>
        ${subtypes.map(st => `<option value="${st.ingredientSubtypeID}">${st.name}</option>`).join('')}
    `;
}

/**
 * Toggle on-demand fields
 */
function toggleOnDemandFields() {
    const trackStock = document.getElementById('trackStockCheckbox').checked;
    const onDemandFields = document.getElementById('onDemandFields');
    const stockTrackingFields = document.getElementById('stockTrackingFields');
    const priceInput = document.getElementById('onDemandPrice');
    const qtyInput = document.getElementById('onDemandQty');
    const reorderPointInput = document.getElementById('reorderPointInput');
    
    if (trackStock) {
        // Track stock is ON, show stock tracking fields, hide on-demand fields
        stockTrackingFields.classList.remove('hidden');
        onDemandFields.classList.add('hidden');
        priceInput.disabled = true;
        qtyInput.disabled = true;
        priceInput.value = '';
        qtyInput.value = '';
        reorderPointInput.disabled = false;
    } else {
        // Track stock is OFF, show on-demand fields, hide stock tracking fields
        stockTrackingFields.classList.add('hidden');
        onDemandFields.classList.remove('hidden');
        priceInput.disabled = false;
        qtyInput.disabled = false;
        reorderPointInput.disabled = true;
        reorderPointInput.value = '';
    }
}

/**
 * Submit create item form
 */
function submitCreateItem() {
    const itemRole = document.getElementById('itemRoleSelect').value;
    const categoryID = parseInt(document.getElementById('categorySelect').value);
    const typeID = parseInt(document.getElementById('typeSelect').value);
    const subtypeID = document.getElementById('subtypeSelect') ? 
        (parseInt(document.getElementById('subtypeSelect').value) || null) : null;
    const brand = document.getElementById('brandInput').value.trim() || null;
    const name = document.getElementById('nameInput').value.trim();
    const unit = document.getElementById('unitSelect').value;
    const trackStock = document.getElementById('trackStockCheckbox').checked;
    const notes = document.getElementById('notesInput').value.trim() || null;
    
    // Validation
    if (!itemRole) {
        showToast('Please select an item role', 'error');
        return;
    }
    if (!categoryID) {
        showToast('Please select a category', 'error');
        return;
    }
    if (!typeID) {
        showToast('Please select a type', 'error');
        return;
    }
    if (!name) {
        showToast('Please enter an item name', 'error');
        return;
    }
    if (!unit) {
        showToast('Please select a unit', 'error');
        return;
    }
    
    let onDemandPrice = null;
    let onDemandQty = null;
    let reorderPoint = null;
    
    if (!trackStock) {
        onDemandPrice = parseFloat(document.getElementById('onDemandPrice').value) || null;
        onDemandQty = parseFloat(document.getElementById('onDemandQty').value) || null;
    } else {
        reorderPoint = parseFloat(document.getElementById('reorderPointInput').value) || null;
    }
    
    try {
        // DEBUG: Log what we're sending
        const itemData = {
            brand: brand,
            name: name,
            unit: unit,
            ingredientTypeID: itemRole === 'ingredient' || itemRole === 'dual' ? typeID : null,
            ingredientSubtypeID: itemRole === 'ingredient' ? subtypeID : null,
            supplyTypeID: itemRole === 'supply' || itemRole === 'dual' ? 
                (itemRole === 'dual' ? parseInt(document.getElementById('supplyTypeSelect').value) : typeID) : null,
            onDemand: trackStock ? 0 : 1,
            onDemandPrice: onDemandPrice,
            onDemandPriceQty: onDemandQty,
            reorderPoint: reorderPoint,
            notes: notes
        };
        
        console.log('Creating item with itemRole:', itemRole);
        console.log('TypeID:', typeID);
        console.log('SupplyTypeSelect value:', document.getElementById('supplyTypeSelect')?.value);
        console.log('Item data being sent:', itemData);
        
        // Create the item
        const newItem = BrewCode.item.create(itemData);
        
        // Item created with type/subtype already embedded
        
        showToast('✓ Item created successfully', 'success');
        window.brewcode.navigate('inventory');
    } catch (error) {
        showToast('✗ Failed to create item: ${error.message}', 'error');
    }
}

/**
 * Show inline type creation form
 */
function showCreateTypeInline() {
    const inlineForm = document.getElementById('inlineTypeCreate');
    inlineForm.classList.remove('hidden');
    document.getElementById('newTypeName').focus();
}

/**
 * Hide inline type creation form
 */
function hideCreateTypeInline() {
    document.getElementById('inlineTypeCreate').classList.add('hidden');
    document.getElementById('newTypeName').value = '';
}

/**
 * Create type inline and add to dropdown
 */
function createTypeInline() {
    const itemRole = document.getElementById('itemRoleSelect').value;
    const categoryID = parseInt(document.getElementById('categorySelect').value);
    const typeName = document.getElementById('newTypeName').value.trim();
    
    if (!typeName) {
        showToast('Please enter a type name', 'error');
        return;
    }
    
    if (!categoryID) {
        showToast('Please select a category first', 'error');
        return;
    }
    
    try {
        let newType;
        if (itemRole === 'ingredient') {
            newType = BrewCode.ingredientType.create({
                categoryID: categoryID,
                name: typeName,
                beverageTypes: JSON.stringify([]),
                isPrimaryRequired: 0
            });
        } else {
            newType = BrewCode.supplyType.create({
                categoryID: categoryID,
                name: typeName
            });
        }
        
        const typeSelect = document.getElementById('typeSelect');
        const option = document.createElement('option');
        const typeIdField = itemRole === 'ingredient' ? 'ingredientTypeID' : 'supplyTypeID';
        option.value = newType[typeIdField];
        option.textContent = newType.name;
        typeSelect.appendChild(option);
        typeSelect.value = newType[typeIdField];
        
        showToast(`✓ Type "${typeName}" created successfully`, 'success');
        hideCreateTypeInline();
    } catch (error) {
        showToast(`✗ Failed to create type: ${error.message}`, 'error');
    }
}

/**
 * Show add lot form for an item
 * @param {number} itemID - Item ID to add lot for
 */
function showAddLotForm(itemID) {
    const settings = BrewCode.settings.get();
    const fmt = getFormatters(settings);
    const item = BrewCode.item.get(itemID);
    
    if (!item) {
        showToast('Item not found', 'error');
        window.brewcode.navigate('inventory');
        return;
    }

    const massUnits = Object.entries(CONVERSIONS.mass.units);
    const volumeUnits = Object.entries(CONVERSIONS.volume.units);
    const allUnits = [...massUnits, ...volumeUnits, ['count', 'count']].sort((a, b) => a[1].localeCompare(b[1]));

    const itemName = item.brand ? `${item.brand} ${item.name}` : item.name;
    const today = new Date().toISOString().split('T')[0];

    const content = `
        <div class="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-2xl mx-auto">
            <h3 class="text-2xl font-semibold text-white mb-2">Add Inventory Lot</h3>
            <p class="text-gray-400 mb-6">${itemName}</p>
            
            <div id="addLotForm" class="space-y-6">
                <!-- Quantity Acquired -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Quantity Acquired <span class="text-red-500">*</span>
                    </label>
                    <div class="flex gap-2">
                        ${renderCompactNumberField({
                            id: 'quantityInput',
                            label: '',
                            placeholder: '0.00',
                            step: '0.01',
                            fieldType: INPUT_WIDTHS.STANDARD
                        })}
                        ${renderCompactSelectField({
                            id: 'unitSelect',
                            label: '',
                            choices: allUnits.map(([key, label]) => ({ value: key, label: label })),
                            value: item.unit
                        })}
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Item's default unit: ${item.unit}</p>
                </div>

                <!-- Acquisition Date -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Acquisition Date <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="date"
                        id="acquisitionDateInput"
                        value="${today}"
                        required
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                </div>

                <hr class="border-gray-700">

                <!-- Cost Type Selection -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-3">
                        Cost Information (Optional)
                    </label>
                    <div class="flex gap-4 mb-3">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio"
                                name="costType"
                                value="total"
                                id="costTypeTotal"
                                checked
                                onchange="window.brewcode.updateCostLabel()"
                                class="w-4 h-4"
                            />
                            <span class="text-sm text-gray-300">Total Cost</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio"
                                name="costType"
                                value="perUnit"
                                id="costTypePerUnit"
                                onchange="window.brewcode.updateCostLabel()"
                                class="w-4 h-4"
                            />
                            <span class="text-sm text-gray-300">Cost Per Unit</span>
                        </label>
                    </div>
                    <div>
                        <label id="costLabel" class="block text-sm font-medium text-gray-400 mb-2">
                            Total Cost
                        </label>
                        <div class="flex items-center gap-2">
                            <span class="text-gray-400">${fmt.currencySymbol}</span>
                            ${renderCompactNumberField({
                                id: 'costInput',
                                label: '',
                                placeholder: '0.00',
                                step: '0.01',
                                fieldType: INPUT_WIDTHS.STANDARD
                            })}
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Leave blank if cost is unknown</p>
                    </div>
                </div>

                <hr class="border-gray-700">

                <!-- Supplier -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Supplier
                    </label>
                    <input 
                        type="text"
                        id="supplierInput"
                        placeholder="e.g., Local Homebrew Shop, Amazon"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                </div>

                <!-- Expiration Date -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Expiration Date
                    </label>
                    <input 
                        type="date"
                        id="expirationDateInput"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                    <p class="text-xs text-gray-500 mt-1">Leave blank if item doesn't expire or date is unknown</p>
                </div>

                <!-- Notes -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Notes
                    </label>
                    <textarea 
                        id="notesInput"
                        rows="3"
                        placeholder="Lot number, batch info, or other details..."
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none resize-none"
                    ></textarea>
                </div>

                <!-- Buttons -->
                <div class="flex gap-4 pt-4">
                    <button 
                        type="button"
                        onclick="window.brewcode.viewInventoryDetail(${itemID})"
                        class="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button"
                        onclick="window.brewcode.submitAddLot(${itemID})"
                        class="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Add Lot
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('app').innerHTML = `
        ${renderNavigation('inventory')}
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button 
                onclick="window.brewcode.viewInventoryDetail(${itemID})"
                class="text-amber-400 hover:text-amber-300 mb-4 inline-block"
            >
                ← Back to Item
            </button>
            ${content}
        </div>
    `;
}

/**
 * Show edit item form
 * @param {number} itemID - Item ID to edit
 */
function showEditItemForm(itemID) {
    const item = BrewCode.item.get(itemID);
    
    if (!item) {
        showToast('Item not found', 'error');
        window.brewcode.navigate('inventory');
        return;
    }

    const massUnits = Object.entries(CONVERSIONS.mass.units);
    const volumeUnits = Object.entries(CONVERSIONS.volume.units);
    const allUnits = [...massUnits, ...volumeUnits, ['count', 'count']].sort((a, b) => a[1].localeCompare(b[1]));

    const itemName = item.brand ? `${item.brand} ${item.name}` : item.name;
    const trackStock = item.onDemand === 0;

    const content = `
        <div class="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-2xl mx-auto">
            <h3 class="text-2xl font-semibold text-white mb-2">Edit Item</h3>
            <p class="text-gray-400 mb-6">${itemName}</p>
            
            <div id="editItemForm" class="space-y-6">
                <!-- Brand -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Brand
                    </label>
                    <input 
                        type="text"
                        id="brandInput"
                        value="${item.brand || ''}"
                        placeholder="Brand name or leave blank for generic"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                </div>

                <!-- Name -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Item Name <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="text"
                        id="nameInput"
                        value="${item.name}"
                        required
                        placeholder="e.g., Apple Juice, 71B-1122, Star San"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                </div>

                <!-- Unit -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Unit of Measure <span class="text-red-500">*</span>
                    </label>
                    ${renderCompactSelectField({
                        id: 'unitSelect',
                        label: '',
                        choices: allUnits.map(([key, label]) => ({ value: key, label: label })),
                        value: item.unit
                    })}
                </div>
                    <!-- Subtype (if ingredient with subtypes) -->
                <div id="editSubtypeSection" class="hidden">
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Subtype <span class="text-gray-500">(Optional)</span>
                    </label>
                    ${renderCompactSelectField({
                        id: 'editSubtypeSelect',
                        label: '',
                        choices: [{ value: '', label: 'No specific subtype' }],
                        value: ''
                    })}
                    <p class="text-xs text-gray-500 mt-1">Leave blank if this item doesn't have a specific subtype</p>
                </div>

                <hr class="border-gray-700">

                <!-- Track Stock -->
                <div>
                    <label class="flex items-center gap-3 cursor-pointer">
                        <input 
                            type="checkbox"
                            id="trackStockCheckbox"
                            ${trackStock ? 'checked' : ''}
                            onchange="window.brewcode.toggleOnDemandFieldsEdit()"
                            class="w-4 h-4"
                        />
                        <span class="text-sm font-semibold text-gray-300">Track Stock</span>
                    </label>
                    <p class="text-xs text-gray-500 mt-1">Uncheck for items you buy/make as needed without tracking inventory</p>
                </div>

                <!-- Stock Tracking Fields -->
                <div id="stockTrackingFields" class="${trackStock ? '' : 'hidden'} space-y-4">
                    <div>
                        ${renderCompactNumberField({
                            id: 'reorderPointInput',
                            label: 'Low Stock Alert (Reorder Point)',
                            placeholder: 'e.g., 500',
                            value: item.reorderPoint || '',
                            step: '0.01',
                            fieldType: INPUT_WIDTHS.STANDARD
                        })}
                        <p class="text-xs text-gray-500 mt-1">Get notified when stock falls below this amount</p>
                    </div>
                </div>

                <!-- On-Demand Fields -->
                <div id="onDemandFields" class="${!trackStock ? '' : 'hidden'} space-y-4 bg-gray-700/50 rounded-lg p-4">
                    <p class="text-sm text-gray-400">Since you're not tracking stock, provide pricing info for cost calculations:</p>
                    
                    ${renderCompactNumberField({
                        id: 'onDemandPrice',
                        label: 'Price',
                        placeholder: '0.00',
                        value: item.onDemandPrice || '',
                        step: '0.01',
                        fieldType: INPUT_WIDTHS.STANDARD,
                        disabled: trackStock
                    })}

                    <div>
                        ${renderCompactNumberField({
                            id: 'onDemandQty',
                            label: 'Quantity for that Price',
                            placeholder: '1.0',
                            value: item.onDemandPriceQty || '',
                            step: '0.01',
                            fieldType: INPUT_WIDTHS.STANDARD,
                            disabled: trackStock
                        })}
                        <p class="text-xs text-gray-500 mt-1">Example: $5.99 for 500g means Price=5.99, Quantity=500</p>
                    </div>
                </div>

                <!-- Notes -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Notes
                    </label>
                    <textarea 
                        id="notesInput"
                        rows="3"
                        placeholder="Any additional information..."
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none resize-none"
                    >${item.notes || ''}</textarea>
                </div>

                <!-- Buttons -->
                <div class="flex gap-4 pt-4">
                    <button 
                        type="button"
                        onclick="window.brewcode.viewInventoryDetail(${itemID})"
                        class="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button"
                        onclick="window.brewcode.submitEditItem(${itemID})"
                        class="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    `;

    // After rendering, populate subtypes if this is an ingredient item
    setTimeout(() => {
        if (item.ingredientTypeID) {
            const subtypes = BrewCode.subtype.getAll({ ingredientTypeID: item.ingredientTypeID, isActive: 1 });
            
            if (subtypes.length > 0) {
                const subtypeSection = document.getElementById('editSubtypeSection');
                const subtypeSelect = document.getElementById('editSubtypeSelect');
                
                subtypeSection.classList.remove('hidden');
                subtypeSelect.innerHTML = `
                    <option value="">No specific subtype</option>
                    ${subtypes.map(st => 
                        `<option value="${st.ingredientSubtypeID}" ${item.ingredientSubtypeID === st.ingredientSubtypeID ? 'selected' : ''}>
                            ${st.name}
                        </option>`
                    ).join('')}
                `;
            }
        }
    }, 0);

    document.getElementById('app').innerHTML = `
        ${renderNavigation('inventory')}
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button 
                onclick="window.brewcode.viewInventoryDetail(${itemID})"
                class="text-amber-400 hover:text-amber-300 mb-4 inline-block"
            >
                ← Back to Item
            </button>
            ${content}
        </div>
    `;
}

/**
 * Toggle on-demand fields for edit form
 */
function toggleOnDemandFieldsEdit() {
    const trackStock = document.getElementById('trackStockCheckbox').checked;
    const onDemandFields = document.getElementById('onDemandFields');
    const stockTrackingFields = document.getElementById('stockTrackingFields');
    const priceInput = document.getElementById('onDemandPrice');
    const qtyInput = document.getElementById('onDemandQty');
    const reorderPointInput = document.getElementById('reorderPointInput');
    
    if (trackStock) {
        stockTrackingFields.classList.remove('hidden');
        onDemandFields.classList.add('hidden');
        priceInput.disabled = true;
        qtyInput.disabled = true;
        reorderPointInput.disabled = false;
    } else {
        stockTrackingFields.classList.add('hidden');
        onDemandFields.classList.remove('hidden');
        priceInput.disabled = false;
        qtyInput.disabled = false;
        reorderPointInput.disabled = true;
    }
}

/**
 * Submit edit item form
 * @param {number} itemID - Item ID
 */
function submitEditItem(itemID) {
    const brand = document.getElementById('brandInput').value.trim() || null;
    const name = document.getElementById('nameInput').value.trim();
    const unit = document.getElementById('unitSelect').value;
    const subtypeSelect = document.getElementById('editSubtypeSelect');
    const subtypeID = subtypeSelect && !subtypeSelect.parentElement.classList.contains('hidden') ? 
        (parseInt(subtypeSelect.value) || null) : null;
    const trackStock = document.getElementById('trackStockCheckbox').checked;
    const notes = document.getElementById('notesInput').value.trim() || null;

    // Validation
    if (!name) {
        showToast('Please enter an item name', 'error');
        return;
    }
    if (!unit) {
        showToast('Please select a unit', 'error');
        return;
    }

    const updates = {
        brand: brand,
        name: name,
        unit: unit,
        onDemand: trackStock ? 0 : 1,
        notes: notes
    };
    
    // Only include subtypeID if the field was visible (meaning it's an ingredient with subtypes available)
    if (subtypeSelect && !subtypeSelect.parentElement.classList.contains('hidden')) {
        updates.ingredientSubtypeID = subtypeID;
    }

    if (trackStock) {
        const reorderPoint = parseFloat(document.getElementById('reorderPointInput').value) || null;
        updates.reorderPoint = reorderPoint;
        updates.onDemandPrice = null;
        updates.onDemandPriceQty = null;
    } else {
        const onDemandPrice = parseFloat(document.getElementById('onDemandPrice').value) || null;
        const onDemandQty = parseFloat(document.getElementById('onDemandQty').value) || null;
        updates.onDemandPrice = onDemandPrice;
        updates.onDemandPriceQty = onDemandQty;
        updates.reorderPoint = null;
    }

    try {
        BrewCode.item.update(itemID, updates);
        showToast('✓ Item updated successfully', 'success');
        window.brewcode.viewInventoryDetail(itemID);
    } catch (error) {
        showToast(`✗ Failed to update item: ${error.message}`, 'error');
    }
}

/**
 * Update cost label based on selected cost type
 */
function updateCostLabel() {
    const costType = document.querySelector('input[name="costType"]:checked').value;
    const costLabel = document.getElementById('costLabel');
    
    if (costType === 'total') {
        costLabel.textContent = 'Total Cost';
    } else {
        costLabel.textContent = 'Cost Per Unit';
    }
}

/**
 * Submit add lot form
 * @param {number} itemID - Item ID
 */
function submitAddLot(itemID) {
    const quantity = parseFloat(document.getElementById('quantityInput').value);
    const unit = document.getElementById('unitSelect').value;
    const acquisitionDate = document.getElementById('acquisitionDateInput').value;
    const costType = document.querySelector('input[name="costType"]:checked').value;
    const costValue = parseFloat(document.getElementById('costInput').value);
    const supplier = document.getElementById('supplierInput').value.trim() || null;
    const expirationDate = document.getElementById('expirationDateInput').value || null;
    const notes = document.getElementById('notesInput').value.trim() || null;

    // Validation
    if (!quantity || quantity <= 0) {
        showToast('Please enter a valid quantity', 'error');
        return;
    }
    if (!acquisitionDate) {
        showToast('Please select an acquisition date', 'error');
        return;
    }

    // Calculate cost per unit
    let costPerUnit = null;
    if (costValue && costValue > 0) {
        if (costType === 'total') {
            costPerUnit = costValue / quantity;
        } else {
            costPerUnit = costValue;
        }
    }

    try {
        BrewCode.inventory.addLot({
            itemID: itemID,
            quantityPurchased: quantity,
            quantityRemaining: quantity,
            unit: unit,
            purchaseDate: acquisitionDate,
            costPerUnit: costPerUnit,
            supplier: supplier,
            expirationDate: expirationDate,
            notes: notes
        });

        showToast('✓ Inventory lot added successfully', 'success');
        window.brewcode.viewInventoryDetail(itemID);
    } catch (error) {
        showToast(`✗ Failed to add lot: ${error.message}`, 'error');
    }
}

export {
    showCreateItemForm,
    updateCategoryOptionsForCreate,
    updateTypeOptionsForCreate,
    updateSubtypeOptions,
    toggleOnDemandFields,
    submitCreateItem,
    showCreateTypeInline,
    hideCreateTypeInline,
    createTypeInline,
    showAddLotForm,
    updateCostLabel,
    submitAddLot,
    showEditItemForm,
    toggleOnDemandFieldsEdit,
    submitEditItem
};
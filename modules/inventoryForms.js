// inventoryForms.js - Inventory forms using unified item API

import BrewCode from './brewcode.js';
import { renderNavigation } from './navigation.js';
import { CONVERSIONS } from './conversions.js';
import { showToast } from './uiHelpers.js';
import { getFormatters } from './formatHelpers.js';

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

                <!-- Category -->
                <div id="categorySection">
                    <label id="categoryLabel" class="block text-sm font-semibold text-gray-300 mb-2">
                        Category <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
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

                <!-- Dual Purpose Second Category -->
                <div id="dualCategorySection" class="hidden mt-4">
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Supply Category
                    </label>
                    <input 
                        type="text"
                        id="supplyCategoryDisplay"
                        value="Cleaners & Sanitizers"
                        disabled
                        class="w-full bg-gray-600 text-gray-300 rounded-lg px-4 py-3 border border-gray-600 cursor-not-allowed"
                    />
                </div>

                <!-- Type -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Type <span class="text-red-500">*</span>
                    </label>
                    <div class="flex gap-2 mb-2">
                        <div class="relative flex-1">
                            <select 
                                id="typeSelect"
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
                    <div class="relative">
                        <select 
                            id="unitSelect"
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none appearance-none"
                        >
                            <option value="">Select unit...</option>
                            ${allUnits.map(([key, label]) => `
                                <option value="${key}">${label}</option>
                            `).join('')}
                        </select>
                        <svg class="absolute right-3 top-3.5 text-gray-500 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
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
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Low Stock Alert (Reorder Point)
                        </label>
                        <input 
                            type="number"
                            id="reorderPointInput"
                            step="0.01"
                            min="0"
                            placeholder="e.g., 500"
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                        />
                        <p class="text-xs text-gray-500 mt-1">Get notified when stock falls below this amount</p>
                    </div>
                </div>

                <!-- On-Demand Fields (hidden by default) -->
                <div id="onDemandFields" class="hidden space-y-4 bg-gray-700/50 rounded-lg p-4">
                    <p class="text-sm text-gray-400">Since you're not tracking stock, provide pricing info for cost calculations:</p>
                    
                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Price
                        </label>
                        <input 
                            type="number"
                            id="onDemandPrice"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            disabled
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none disabled:bg-gray-600 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Quantity for that Price
                        </label>
                        <input 
                            type="number"
                            id="onDemandQty"
                            step="0.01"
                            min="0"
                            placeholder="1.0"
                            disabled
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none disabled:bg-gray-600 disabled:cursor-not-allowed"
                        />
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

    // Initialize category dropdown
    window.brewcode.updateCategoryOptionsForCreate();
}

/**
 * Update category options based on item role
 */
function updateCategoryOptionsForCreate() {
    const itemRole = document.getElementById('itemRoleSelect').value;
    const categorySelect = document.getElementById('categorySelect');
    const categoryLabel = document.getElementById('categoryLabel');
    const dualCategorySection = document.getElementById('dualCategorySection');
    const categories = BrewCode.ingredientType.getAll();
    
    let optionsHtml = '<option value="">Select category...</option>';
    
    if (itemRole === 'ingredient') {
        categoryLabel.innerHTML = 'Category <span class="text-red-500">*</span>';
        dualCategorySection.classList.add('hidden');
        optionsHtml = '<option value="">Select category...</option><option value="1">Water</option><option value="4">Honeys, Syrups & Sugars</option><option value="2">Fruits & Juices</option><option value="3">Grains & Malts</option><option value="5">Flavorants</option><option value="6">Hops</option><option value="7">Additives</option><option value="8">Yeasts & Microbes</option>';
    } else if (itemRole === 'supply') {
        categoryLabel.innerHTML = 'Category <span class="text-red-500">*</span>';
        dualCategorySection.classList.add('hidden');
        optionsHtml = '<option value="">Select category...</option><option value="9">Cleaners & Sanitizers</option><option value="10">Bottles & Vessels</option><option value="11">Closures</option><option value="12">Packaging Materials</option>';
    } else if (itemRole === 'dual') {
        categoryLabel.innerHTML = 'Ingredient Category <span class="text-red-500">*</span>';
        dualCategorySection.classList.remove('hidden');
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
        
        if (categoryName === 'Water') {
            const waterType = BrewCode.ingredientType.getAll({ isActive: 1 });
            const water = waterType.find(t => t.name === 'Water');
            if (water) {
                typeID = water.ingredientTypeID;
                typeName = water.name;
            }
        } else if (categoryName === 'Additives') {
            const additiveTypes = BrewCode.ingredientType.getAll({ isActive: 1 });
            const kmeta = additiveTypes.find(t => t.name === 'Potassium Metabisulfite (K-Meta)');
            if (kmeta) {
                typeID = kmeta.ingredientTypeID;
                typeName = kmeta.name;
            }
        }
        
        if (typeID) {
            typeSelect.innerHTML = `<option value="${typeID}" selected>${typeName}</option>`;
            typeSelect.value = typeID;
        } else {
            typeSelect.innerHTML = '<option value="">Type not found</option>';
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
    }
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
    const brand = document.getElementById('brandInput').value.trim() || null;
    const name = document.getElementById('nameInput').value.trim();
    const unit = document.getElementById('unitSelect').value;
    const trackStock = document.getElementById('trackStockCheckbox').checked;
    const notes = document.getElementById('notesInput').value.trim() || null;
    
    // Validation
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
        // Create the item
        const newItem = BrewCode.item.create({
            brand: brand,
            name: name,
            unit: unit,
            onDemand: trackStock ? 0 : 1,
            onDemandPrice: onDemandPrice,
            onDemandPriceQty: onDemandQty,
            reorderPoint: reorderPoint,
            notes: notes
        });
        
        // Add role(s)
        if (itemRole === 'dual') {
            // Add ingredient role
            BrewCode.item.addRole(newItem.itemID, 'ingredient', typeID, categoryID);
            // Add supply role with Cleaners & Sanitizers category
            const cleanersCategory = BrewCode.query('SELECT categoryID FROM itemCategories WHERE name = "Cleaners & Sanitizers"');
            if (cleanersCategory && cleanersCategory.length > 0) {
                const cleanersCategoryID = cleanersCategory[0].categoryID;
                // Get the supply type for this item (based on ingredient type)
                const supplyType = BrewCode.query(`
                    SELECT st.supplyTypeID FROM supplyTypes st 
                    WHERE st.categoryID = ? LIMIT 1
                `, [cleanersCategoryID]);
                if (supplyType && supplyType.length > 0) {
                    BrewCode.item.addRole(newItem.itemID, 'supply', supplyType[0].supplyTypeID, cleanersCategoryID);
                }
            }
        } else {
            BrewCode.item.addRole(newItem.itemID, itemRole, typeID, categoryID);
        }
        
        showToast('✓ Item created successfully', 'success');
        window.brewcode.navigate('inventory');
    } catch (error) {
        showToast(`✗ Failed to create item: ${error.message}`, 'error');
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
                        <input 
                            type="number"
                            id="quantityInput"
                            step="0.01"
                            min="0.01"
                            required
                            placeholder="0.00"
                            class="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                        />
                        <div class="relative w-40">
                            <select 
                                id="unitSelect"
                                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none appearance-none"
                            >
                                ${allUnits.map(([key, label]) => `
                                    <option value="${key}" ${key === item.unit ? 'selected' : ''}>${label}</option>
                                `).join('')}
                            </select>
                            <svg class="absolute right-3 top-3.5 text-gray-500 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
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
                            <input 
                                type="number"
                                id="costInput"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                class="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                            />
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
                    <div class="relative">
                        <select 
                            id="unitSelect"
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none appearance-none"
                        >
                            ${allUnits.map(([key, label]) => `
                                <option value="${key}" ${key === item.unit ? 'selected' : ''}>${label}</option>
                            `).join('')}
                        </select>
                        <svg class="absolute right-3 top-3.5 text-gray-500 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
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
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Low Stock Alert (Reorder Point)
                        </label>
                        <input 
                            type="number"
                            id="reorderPointInput"
                            step="0.01"
                            min="0"
                            value="${item.reorderPoint || ''}"
                            placeholder="e.g., 500"
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                        />
                        <p class="text-xs text-gray-500 mt-1">Get notified when stock falls below this amount</p>
                    </div>
                </div>

                <!-- On-Demand Fields -->
                <div id="onDemandFields" class="${!trackStock ? '' : 'hidden'} space-y-4 bg-gray-700/50 rounded-lg p-4">
                    <p class="text-sm text-gray-400">Since you're not tracking stock, provide pricing info for cost calculations:</p>
                    
                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Price
                        </label>
                        <input 
                            type="number"
                            id="onDemandPrice"
                            step="0.01"
                            min="0"
                            value="${item.onDemandPrice || ''}"
                            placeholder="0.00"
                            ${trackStock ? 'disabled' : ''}
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none disabled:bg-gray-600 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Quantity for that Price
                        </label>
                        <input 
                            type="number"
                            id="onDemandQty"
                            step="0.01"
                            min="0"
                            value="${item.onDemandPriceQty || ''}"
                            placeholder="1.0"
                            ${trackStock ? 'disabled' : ''}
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none disabled:bg-gray-600 disabled:cursor-not-allowed"
                        />
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
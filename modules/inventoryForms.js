// inventoryForms.js - Complete inventory management forms

import BrewCode from './brewcode.js';
import { renderNavigation } from './navigation.js';

/**
 * Show add inventory modal - State 1: Select Item
 */
function showAddInventoryForm() {
    // Get all ingredients and supplies for the searchable list
    const ingredients = BrewCode.ingredient.getAll({ isActive: 1 });
    const supplies = BrewCode.supply.getAll({ isActive: 1 });
    
    // Combine and format for display
    const allItems = [
        ...ingredients.map(i => ({
            id: `ingredient-${i.ingredientID}`,
            type: 'ingredient',
            itemID: i.ingredientID,
            display: `${i.brand || ''} ${i.name} (${i.ingredientTypeName})`.trim(),
            searchText: `${i.brand || ''} ${i.name} ${i.ingredientTypeName}`.toLowerCase()
        })),
        ...supplies.map(s => ({
            id: `supply-${s.supplyID}`,
            type: 'supply',
            itemID: s.supplyID,
            display: `${s.brand || ''} ${s.name} (${s.supplyTypeName})`.trim(),
            searchText: `${s.brand || ''} ${s.name} ${s.supplyTypeName}`.toLowerCase()
        }))
    ].sort((a, b) => a.display.localeCompare(b.display));

    const content = `
        <div class="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-2xl mx-auto">
            <h3 class="text-2xl font-semibold text-white mb-6">Add Inventory</h3>
            
            <div id="selectItemSection">
                <label class="block text-sm font-semibold text-gray-300 mb-2">
                    Select Item <span class="text-red-500">*</span>
                </label>
                
                <input 
                    type="text"
                    id="itemSearch"
                    placeholder="🔍 Search items..."
                    class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none mb-2"
                />
                
                <div id="itemList" class="bg-gray-700 rounded-lg border border-gray-600 max-h-96 overflow-y-auto">
                    <div 
                        class="px-4 py-3 hover:bg-gray-600 cursor-pointer border-b border-gray-600 font-semibold text-amber-400"
                        onclick="window.brewcode.showCreateNewItemForm()"
                    >
                        + Create New Item
                    </div>
                    ${allItems.map(item => `
                        <div 
                            class="px-4 py-3 hover:bg-gray-600 cursor-pointer border-b border-gray-600 text-gray-300"
                            data-item-id="${item.id}"
                            data-search="${item.searchText}"
                            onclick="window.brewcode.selectInventoryItem('${item.type}', ${item.itemID})"
                        >
                            ${item.display}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div id="createItemSection" class="hidden">
                <!-- Will be populated by showCreateNewItemForm() -->
            </div>
            
            <div id="addInventorySection" class="hidden">
                <!-- Will be populated by selectInventoryItem() -->
            </div>
        </div>
    `;

    // Render modal
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

    // Attach search handler
    attachItemSearchHandler();
}

/**
 * Attach search handler for filtering items
 */
function attachItemSearchHandler() {
    const searchInput = document.getElementById('itemSearch');
    const itemList = document.getElementById('itemList');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const items = itemList.querySelectorAll('[data-search]');
            
            items.forEach(item => {
                const searchText = item.getAttribute('data-search');
                if (searchText.includes(query)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
}

/**
 * Show create new item form - State 2
 */
function showCreateNewItemForm() {
    const categories = BrewCode.query('SELECT * FROM itemCategories ORDER BY sortOrder');
    
    const createItemSection = document.getElementById('createItemSection');
    const selectItemSection = document.getElementById('selectItemSection');
    
    selectItemSection.classList.add('hidden');
    createItemSection.classList.remove('hidden');
    
    createItemSection.innerHTML = `
        <button 
            onclick="window.brewcode.backToItemSelection()"
            class="text-amber-400 hover:text-amber-300 mb-4 inline-block"
        >
            ← Back to item selection
        </button>
        
        <form id="createItemForm" class="space-y-6">
            <!-- Item Type -->
            <div>
                <label class="block text-sm font-semibold text-gray-300 mb-2">
                    Item Type <span class="text-red-500">*</span>
                </label>
                <div class="flex gap-4">
                    <label class="flex items-center">
                        <input 
                            type="radio" 
                            name="itemType" 
                            value="ingredient" 
                            checked
                            onchange="window.brewcode.updateCategoryOptions()"
                            class="mr-2"
                        />
                        <span class="text-white">Ingredient</span>
                    </label>
                    <label class="flex items-center">
                        <input 
                            type="radio" 
                            name="itemType" 
                            value="supply"
                            onchange="window.brewcode.updateCategoryOptions()"
                            class="mr-2"
                        />
                        <span class="text-white">Supply</span>
                    </label>
                </div>
            </div>

            <!-- Category -->
            <div>
                <label class="block text-sm font-semibold text-gray-300 mb-2">
                    Category <span class="text-red-500">*</span>
                </label>
                <select 
                    id="categorySelect"
                    name="categoryID"
                    required
                    onchange="window.brewcode.updateTypeOptions()"
                    class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                >
                    <option value="">Select category...</option>
                    ${categories.filter(c => c.sortOrder < 20).map(cat => `
                        <option value="${cat.categoryID}" data-range="ingredient">${cat.name}</option>
                    `).join('')}
                    ${categories.filter(c => c.sortOrder >= 20).map(cat => `
                        <option value="${cat.categoryID}" data-range="supply">${cat.name}</option>
                    `).join('')}
                </select>
            </div>

            <!-- Type -->
            <div>
                <label class="block text-sm font-semibold text-gray-300 mb-2">
                    Type <span class="text-red-500">*</span>
                </label>
                <select 
                    id="typeSelect"
                    name="typeID"
                    required
                    class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                >
                    <option value="">Select category first...</option>
                </select>
                <button 
                    type="button"
                    onclick="window.brewcode.showCreateTypeInline()"
                    class="text-amber-400 hover:text-amber-300 text-sm mt-2"
                >
                    + Create new type...
                </button>
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
                        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                    >
                        Add
                    </button>
                    <button 
                        type="button"
                        onclick="window.brewcode.hideCreateTypeInline()"
                        class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                    >
                        Cancel
                    </button>
                </div>
            </div>

            <hr class="border-gray-700">

            <!-- Brand -->
            <div>
                <label class="block text-sm font-semibold text-gray-300 mb-2">
                    Brand (Optional)
                </label>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input 
                            type="radio" 
                            name="brandType" 
                            value="generic" 
                            checked
                            onchange="window.brewcode.toggleBrandInput()"
                            class="mr-2"
                        />
                        <span class="text-white">Generic/Homemade</span>
                    </label>
                    <label class="flex items-center">
                        <input 
                            type="radio" 
                            name="brandType" 
                            value="specific"
                            onchange="window.brewcode.toggleBrandInput()"
                            class="mr-2"
                        />
                        <span class="text-white">Specific Brand:</span>
                    </label>
                    <input 
                        type="text"
                        id="brandInput"
                        name="brand"
                        placeholder="Brand name"
                        disabled
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none disabled:opacity-50"
                    />
                </div>
            </div>

            <!-- Name -->
            <div>
                <label class="block text-sm font-semibold text-gray-300 mb-2">
                    Name <span class="text-red-500">*</span>
                </label>
                <input 
                    type="text"
                    name="name"
                    required
                    placeholder="e.g., 71B-1122"
                    class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                />
            </div>

            <!-- Package Size -->
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Package Size (Optional)
                    </label>
                    <input 
                        type="number"
                        name="packageSize"
                        step="0.01"
                        min="0"
                        placeholder="5"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Unit
                    </label>
                    <input 
                        type="text"
                        name="packageUnit"
                        placeholder="g, kg, L, packet"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                </div>
            </div>

            <!-- Notes -->
            <div>
                <label class="block text-sm font-semibold text-gray-300 mb-2">
                    Notes (Optional)
                </label>
                <textarea 
                    name="notes"
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
                    class="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button 
                    type="submit"
                    class="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                    Create & Continue →
                </button>
            </div>
        </form>
    `;

    // Initialize category options
    updateCategoryOptions();
    
    // Attach form handler
    attachCreateItemFormHandler();
}

/**
 * Back to item selection
 */
function backToItemSelection() {
    const createItemSection = document.getElementById('createItemSection');
    const selectItemSection = document.getElementById('selectItemSection');
    
    createItemSection.classList.add('hidden');
    selectItemSection.classList.remove('hidden');
}

/**
 * Update category options based on item type
 */
function updateCategoryOptions() {
    const itemType = document.querySelector('input[name="itemType"]:checked').value;
    const categorySelect = document.getElementById('categorySelect');
    const options = categorySelect.querySelectorAll('option[data-range]');
    
    options.forEach(opt => {
        const range = opt.getAttribute('data-range');
        if (range === itemType) {
            opt.style.display = 'block';
        } else {
            opt.style.display = 'none';
        }
    });
    
    // Reset selection
    categorySelect.value = '';
    updateTypeOptions();
}

/**
 * Update type options based on selected category
 */
function updateTypeOptions() {
    const itemType = document.querySelector('input[name="itemType"]:checked').value;
    const categoryID = document.getElementById('categorySelect').value;
    const typeSelect = document.getElementById('typeSelect');
    
    if (!categoryID) {
        typeSelect.innerHTML = '<option value="">Select category first...</option>';
        return;
    }
    
    let types = [];
    if (itemType === 'ingredient') {
        types = BrewCode.ingredient.getAllTypes({ categoryID: parseInt(categoryID), isActive: 1 });
        typeSelect.innerHTML = `
            <option value="">Select ingredient type...</option>
            ${types.map(t => `<option value="${t.ingredientTypeID}">${t.name}</option>`).join('')}
        `;
    } else {
        types = BrewCode.supply.type.getAll({ categoryID: parseInt(categoryID), isActive: 1 });
        typeSelect.innerHTML = `
            <option value="">Select supply type...</option>
            ${types.map(t => `<option value="${t.supplyTypeID}">${t.name}</option>`).join('')}
        `;
    }
}

/**
 * Toggle brand input based on selection
 */
function toggleBrandInput() {
    const brandType = document.querySelector('input[name="brandType"]:checked').value;
    const brandInput = document.getElementById('brandInput');
    
    if (brandType === 'specific') {
        brandInput.disabled = false;
        brandInput.required = true;
    } else {
        brandInput.disabled = true;
        brandInput.required = false;
        brandInput.value = '';
    }
}

/**
 * Show inline type creation
 */
function showCreateTypeInline() {
    document.getElementById('inlineTypeCreate').classList.remove('hidden');
}

/**
 * Hide inline type creation
 */
function hideCreateTypeInline() {
    document.getElementById('inlineTypeCreate').classList.add('hidden');
    document.getElementById('newTypeName').value = '';
}

/**
 * Create type inline
 */
function createTypeInline() {
    const itemType = document.querySelector('input[name="itemType"]:checked').value;
    const categoryID = parseInt(document.getElementById('categorySelect').value);
    const typeName = document.getElementById('newTypeName').value.trim();
    
    if (!typeName) {
        alert('Please enter a type name');
        return;
    }
    
    try {
        let newType;
        if (itemType === 'ingredient') {
            newType = BrewCode.ingredient.createType({
                categoryID: categoryID,
                name: typeName
            });
            
            // Add to dropdown
            const typeSelect = document.getElementById('typeSelect');
            const option = document.createElement('option');
            option.value = newType.ingredientTypeID;
            option.textContent = newType.name;
            typeSelect.appendChild(option);
            typeSelect.value = newType.ingredientTypeID;
        } else {
            newType = BrewCode.supply.type.create({
                categoryID: categoryID,
                name: typeName
            });
            
            // Add to dropdown
            const typeSelect = document.getElementById('typeSelect');
            const option = document.createElement('option');
            option.value = newType.supplyTypeID;
            option.textContent = newType.name;
            typeSelect.appendChild(option);
            typeSelect.value = newType.supplyTypeID;
        }
        
        hideCreateTypeInline();
    } catch (error) {
        alert(`Failed to create type: ${error.message}`);
    }
}

/**
 * Attach create item form handler
 */
function attachCreateItemFormHandler() {
    const form = document.getElementById('createItemForm');
    
    form.onsubmit = (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const itemType = formData.get('itemType');
        const typeID = parseInt(formData.get('typeID'));
        const brandType = formData.get('brandType');
        const brand = brandType === 'specific' ? formData.get('brand') : null;
        const name = formData.get('name');
        const packageSize = formData.get('packageSize') ? parseFloat(formData.get('packageSize')) : null;
        const packageUnit = formData.get('packageUnit') || null;
        const notes = formData.get('notes') || null;
        
        try {
            let newItem;
            if (itemType === 'ingredient') {
                newItem = BrewCode.ingredient.create({
                    ingredientTypeID: typeID,
                    brand: brand,
                    name: name,
                    packageSize: packageSize,
                    packageUnit: packageUnit,
                    notes: notes
                });
                
                // Select the newly created item
                selectInventoryItem('ingredient', newItem.ingredientID);
            } else {
                newItem = BrewCode.supply.create({
                    supplyTypeID: typeID,
                    brand: brand,
                    name: name,
                    packageSize: packageSize,
                    packageUnit: packageUnit,
                    notes: notes
                });
                
                // Select the newly created item
                selectInventoryItem('supply', newItem.supplyID);
            }
        } catch (error) {
            alert(`Failed to create item: ${error.message}`);
        }
    };
}

/**
 * Select inventory item - State 3
 */
function selectInventoryItem(type, itemID) {
    let item;
    if (type === 'ingredient') {
        item = BrewCode.ingredient.get(itemID);
    } else {
        item = BrewCode.supply.get(itemID);
    }
    
    if (!item) {
        alert('Item not found');
        return;
    }
    
    const selectItemSection = document.getElementById('selectItemSection');
    const createItemSection = document.getElementById('createItemSection');
    const addInventorySection = document.getElementById('addInventorySection');
    
    selectItemSection.classList.add('hidden');
    createItemSection.classList.add('hidden');
    addInventorySection.classList.remove('hidden');
    
    const displayName = `${item.brand || ''} ${item.name}`.trim();
    const typeName = type === 'ingredient' ? item.ingredientTypeName : item.supplyTypeName;
    
    addInventorySection.innerHTML = `
        <div class="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
            <div class="flex justify-between items-start">
                <div>
                    <div class="text-white font-semibold text-lg">${displayName}</div>
                    <div class="text-gray-400 text-sm">${typeName}</div>
                </div>
                <button 
                    onclick="window.brewcode.showAddInventoryForm()"
                    class="text-amber-400 hover:text-amber-300 text-sm"
                >
                    Change
                </button>
            </div>
        </div>
        
        <form id="addInventoryLotForm" class="space-y-6">
            <input type="hidden" name="itemType" value="${type}" />
            <input type="hidden" name="itemID" value="${itemID}" />
            
            <hr class="border-gray-700">
            
            <!-- Quantity -->
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Quantity Acquired <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="number"
                        name="quantityPurchased"
                        id="quantityPurchased"
                        required
                        step="0.01"
                        min="0.01"
                        placeholder="10"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Unit <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="text"
                        name="unit"
                        required
                        placeholder="kg, L, packet"
                        value="${item.packageUnit || ''}"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                </div>
            </div>
            
            <!-- Dates -->
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Acquisition Date <span class="text-red-500">*</span>
                    </label>
                    <input 
                        type="date"
                        name="purchaseDate"
                        required
                        value="${new Date().toISOString().split('T')[0]}"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Expiration Date (Optional)
                    </label>
                    <input 
                        type="date"
                        name="expirationDate"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                    <p class="text-xs text-gray-500 mt-1">Leave blank for non-perishable items</p>
                </div>
            </div>
            
            <hr class="border-gray-700">
            
            <!-- Cost -->
            <div>
                <label class="block text-sm font-semibold text-gray-300 mb-2">
                    Cost (Optional)
                </label>
                <div class="space-y-2 mb-3">
                    <label class="flex items-center">
                        <input 
                            type="radio" 
                            name="costType" 
                            value="total" 
                            checked
                            onchange="window.brewcode.toggleCostInput()"
                            class="mr-2"
                        />
                        <span class="text-white">Total Cost</span>
                    </label>
                    <label class="flex items-center">
                        <input 
                            type="radio" 
                            name="costType" 
                            value="perUnit"
                            onchange="window.brewcode.toggleCostInput()"
                            class="mr-2"
                        />
                        <span class="text-white">Cost per Unit</span>
                    </label>
                </div>
                <input 
                    type="number"
                    id="costInput"
                    name="cost"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    onkeyup="window.brewcode.updateCostCalculation()"
                    class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                />
                <div id="costCalculation" class="text-sm text-gray-400 mt-2"></div>
            </div>
            
            <!-- Supplier -->
            <div>
                <label class="block text-sm font-semibold text-gray-300 mb-2">
                    Supplier (Optional)
                </label>
                <input 
                    type="text"
                    name="supplier"
                    placeholder="Where did you get this?"
                    class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                />
            </div>
            
            <!-- Notes -->
            <div>
                <label class="block text-sm font-semibold text-gray-300 mb-2">
                    Notes (Optional)
                </label>
                <textarea 
                    name="notes"
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
                    class="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button 
                    type="submit"
                    class="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                    📦 Add to Inventory
                </button>
            </div>
        </form>
    `;
    
    // Attach form handler
    attachAddInventoryLotFormHandler(type, itemID);
}

/**
 * Toggle cost input type
 */
function toggleCostInput() {
    updateCostCalculation();
}

/**
 * Update cost calculation display
 */
function updateCostCalculation() {
    const costType = document.querySelector('input[name="costType"]:checked').value;
    const costInput = parseFloat(document.getElementById('costInput').value) || 0;
    const quantity = parseFloat(document.getElementById('quantityPurchased').value) || 0;
    const calculationDiv = document.getElementById('costCalculation');
    
    if (costInput === 0 || quantity === 0) {
        calculationDiv.textContent = '';
        return;
    }
    
    if (costType === 'total') {
        const perUnit = (costInput / quantity).toFixed(2);
        calculationDiv.textContent = `Calculated: $${perUnit} per unit`;
    } else {
        const total = (costInput * quantity).toFixed(2);
        calculationDiv.textContent = `Calculated: $${total} total`;
    }
}

/**
 * Attach add inventory lot form handler
 */
function attachAddInventoryLotFormHandler(type, itemID) {
    const form = document.getElementById('addInventoryLotForm');
    
    form.onsubmit = (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const costType = formData.get('costType');
        const cost = parseFloat(formData.get('cost')) || 0;
        const quantity = parseFloat(formData.get('quantityPurchased'));
        
        // Calculate costPerUnit based on costType
        let costPerUnit = null;
        if (cost > 0) {
            if (costType === 'total') {
                costPerUnit = cost / quantity;
            } else {
                costPerUnit = cost;
            }
        }
        
        const lotData = {
            quantityPurchased: quantity,
            unit: formData.get('unit'),
            purchaseDate: formData.get('purchaseDate'),
            expirationDate: formData.get('expirationDate') || null,
            costPerUnit: costPerUnit,
            supplier: formData.get('supplier') || null,
            notes: formData.get('notes') || null
        };
        
        // Add ingredientID or supplyID
        if (type === 'ingredient') {
            lotData.ingredientID = itemID;
        } else {
            lotData.supplyID = itemID;
        }
        
        try {
            const newLot = BrewCode.inventory.addLot(lotData);
            
            alert('Inventory added successfully!');
            window.brewcode.navigate('inventory');
            
        } catch (error) {
            alert(`Failed to add inventory: ${error.message}`);
        }
    };
}

export {
    showAddInventoryForm,
    showCreateNewItemForm,
    backToItemSelection,
    updateCategoryOptions,
    updateTypeOptions,
    toggleBrandInput,
    showCreateTypeInline,
    hideCreateTypeInline,
    createTypeInline,
    selectInventoryItem,
    toggleCostInput,
    updateCostCalculation
};
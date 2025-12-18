// inventoryPage.js

import { getFormatters } from './formatHelpers.js';
import { renderResponsiveFilters, renderFilterDropdown } from './filterHelpers.js';

/**
 * Render inventory page
 * @param {Object} BrewCode - BrewCode API instance
 * @returns {string} HTML for inventory page
 */
function renderInventoryPage(BrewCode) {
    const inventory = BrewCode.inventory.getAll({ status: 'active' });
    const settings = BrewCode.settings.get();
    const fmt = getFormatters(settings);

    if (inventory.length === 0) {
        return `
            <div class="mb-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-3xl font-bold text-white">Ingredients & Supplies</h2>
                    <button 
                        onclick="window.brewcode.showAddInventory()"
                        class="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        + Add Inventory
                    </button>
                </div>

                <!-- Inventory Stats (Empty State) -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-green-900/20 border border-green-500 rounded-lg p-4">
                        <div class="text-2xl font-bold text-green-400">0</div>
                        <div class="text-sm text-gray-400">Ingredients</div>
                    </div>
                    <div class="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                        <div class="text-2xl font-bold text-blue-400">0</div>
                        <div class="text-sm text-gray-400">Supplies</div>
                    </div>
                    <div class="bg-amber-900/20 border border-amber-500 rounded-lg p-4">
                        <div class="text-2xl font-bold text-amber-400">0</div>
                        <div class="text-sm text-gray-400">Total Lots</div>
                    </div>
                    <div class="bg-purple-900/20 border border-purple-500 rounded-lg p-4">
                        <div class="text-2xl font-bold text-purple-400">$0.00</div>
                        <div class="text-sm text-gray-400">Total Value</div>
                    </div>
                </div>

                <!-- Search Bar -->
                <div class="mb-6">
                    <input 
                        type="text"
                        id="inventorySearch"
                        placeholder="Search inventory by name or type..."
                        disabled
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none opacity-50"
                    />
                </div>

                <!-- Filter Dropdowns -->
                ${renderResponsiveFilters('inventoryFilters', `
                    ${renderFilterDropdown({
                        id: 'inv-filter-type',
                        label: 'Item Type',
                        onChange: 'window.brewcode.applyInventoryFilters()',
                        options: [
                            { value: 'all', label: `All (${inventory.length})` },
                            { value: 'ingredients', label: 'Ingredients' },
                            { value: 'supplies', label: 'Supplies' }
                        ]
                    })}
                    
                    ${renderFilterDropdown({
                        id: 'inv-filter-stock',
                        label: 'Stock Level',
                        onChange: 'window.brewcode.applyInventoryFilters()',
                        options: [
                            { value: 'all', label: 'All' },
                            { value: 'in-stock', label: 'In Stock' },
                            { value: 'low-stock', label: 'Low Stock (< 25%)' },
                            { value: 'out-of-stock', label: 'Out of Stock' }
                        ]
                    })}
                    
                    ${renderFilterDropdown({
                        id: 'inv-filter-category',
                        label: 'Category',
                        onChange: 'window.brewcode.applyInventoryFilters()',
                        options: [
                            { value: 'all', label: 'All Categories' }
                        ]
                    })}
                `)}

            <!-- Empty State Message -->
            <div class="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
                <div class="text-6xl mb-4">📦</div>
                <h3 class="text-2xl font-bold text-white mb-2">No Inventory Yet</h3>
                <p class="text-gray-400 mb-6 max-w-md mx-auto">
                    Start tracking your ingredients and supplies. Monitor quantities, expiration dates, and costs.
                </p>
                <button 
                    onclick="window.brewcode.showAddInventory()"
                    class="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                    + Add Your First Inventory
                </button>
            </div>
        `;
    }

    // Group by ingredient/supply
    const ingredients = inventory.filter(item => item.ingredientID !== null);
    const supplies = inventory.filter(item => item.supplyID !== null);

    // Calculate totals
    const totalValue = inventory.reduce((sum, item) => {
        return sum + ((item.costPerUnit || 0) * item.quantityRemaining);
    }, 0);

    return `
        <div class="mb-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold text-white">Inventory</h2>
                <button 
                    onclick="window.brewcode.showAddInventory()"
                    class="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                    + Add Inventory
                </button>
            </div>

            <!-- Inventory Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-green-900/20 border border-green-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-green-400">${ingredients.length}</div>
                    <div class="text-sm text-gray-400">Ingredients</div>
                </div>
                <div class="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-blue-400">${supplies.length}</div>
                    <div class="text-sm text-gray-400">Supplies</div>
                </div>
                <div class="bg-amber-900/20 border border-amber-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-amber-400">${inventory.length}</div>
                    <div class="text-sm text-gray-400">Total Lots</div>
                </div>
                <div class="bg-purple-900/20 border border-purple-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-purple-400">$${totalValue.toFixed(2)}</div>
                    <div class="text-sm text-gray-400">Total Value</div>
                </div>
            </div>

            <!-- Filter Tabs -->
            <div class="mb-6 flex gap-2">
                <button 
                    onclick="window.brewcode.filterInventory('all')"
                    id="inv-filter-all"
                    class="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium"
                >
                    All (${inventory.length})
                </button>
                <button 
                    onclick="window.brewcode.filterInventory('ingredients')"
                    id="inv-filter-ingredients"
                    class="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 font-medium"
                >
                    Ingredients (${ingredients.length})
                </button>
                <button 
                    onclick="window.brewcode.filterInventory('supplies')"
                    id="inv-filter-supplies"
                    class="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 font-medium"
                >
                    Supplies (${supplies.length})
                </button>
            </div>
        </div>

        <!-- Inventory List -->
        <div class="space-y-4" id="inventoryList">
            ${inventory.map(item => renderInventoryCard(item, fmt)).join('')}
        </div>
    `;
}

/**
 * Render inventory item card
 * @param {Object} item - Inventory lot object
 * @param {Object} fmt - Formatters object
 * @returns {string} HTML for inventory card
 */
function renderInventoryCard(item, fmt) {
    const isIngredient = item.ingredientID !== null;
    const itemType = isIngredient ? 'ingredient' : 'supply';
    const name = isIngredient ? 
        `${item.brand ? item.brand + ' ' : ''}${item.name}` : 
        item.supplyName;
    const typeName = isIngredient ? item.ingredientTypeName : item.supplyTypeName;

    // Calculate percentage remaining
    const percentRemaining = (item.quantityRemaining / item.quantityPurchased) * 100;
    
    // Determine bar color based on percentage
    let barColor = 'bg-green-500';
    if (percentRemaining < 25) barColor = 'bg-red-500';
    else if (percentRemaining < 50) barColor = 'bg-yellow-500';

    // Check if expiring soon (within 30 days)
    const isExpiringSoon = item.expirationDate && 
        new Date(item.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return `
        <div 
            class="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:shadow-lg transition-shadow"
            data-inventory-type="${itemType}"
            data-percent-remaining="${percentRemaining}"
            data-category="${typeName}"
        >
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h3 class="text-lg font-bold text-white mb-1">${name}</h3>
                    <div class="text-sm text-gray-400 mb-2">${typeName}</div>
                    
                    ${isExpiringSoon ? `
                        <div class="inline-block bg-red-900/30 text-red-300 text-xs px-2 py-1 rounded mb-2">
                            ⚠️ Expires ${fmt.date(item.expirationDate)}
                        </div>
                    ` : ''}
                </div>
                
                <div class="text-right">
                    <div class="text-2xl font-bold text-white mb-1">
                        ${item.quantityRemaining.toFixed(1)} ${item.unit}
                    </div>
                    <div class="text-xs text-gray-500">
                        of ${item.quantityPurchased.toFixed(1)} ${item.unit}
                    </div>
                </div>
            </div>

            <!-- Progress Bar -->
            <div class="mb-4">
                <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div class="${barColor} h-full transition-all" style="width: ${percentRemaining}%"></div>
                </div>
            </div>

            <!-- Details Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                    <div class="text-gray-400">Purchased</div>
                    <div class="text-white">${fmt.date(item.purchaseDate)}</div>
                </div>
                ${item.expirationDate ? `
                    <div>
                        <div class="text-gray-400">Expires</div>
                        <div class="text-white">${fmt.date(item.expirationDate)}</div>
                    </div>
                ` : '<div></div>'}
                ${item.supplier ? `
                    <div>
                        <div class="text-gray-400">Supplier</div>
                        <div class="text-white">${item.supplier}</div>
                    </div>
                ` : '<div></div>'}
                ${item.costPerUnit ? `
                    <div>
                        <div class="text-gray-400">Cost/Unit</div>
                        <div class="text-white">$${item.costPerUnit.toFixed(2)}/${item.unit}</div>
                    </div>
                ` : '<div></div>'}
            </div>

            ${item.notes ? `
                <div class="mt-4 pt-4 border-t border-gray-700">
                    <div class="text-xs text-gray-400 mb-1">Notes:</div>
                    <div class="text-sm text-gray-300">${item.notes}</div>
                </div>
            ` : ''}

            <!-- Actions -->
            <div class="mt-4 pt-4 border-t border-gray-700 flex gap-2">
                <button 
                    onclick="window.brewcode.viewInventoryDetail(${item.lotID})"
                    class="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded transition-colors"
                >
                    View Details
                </button>
                ${isExpiringSoon || percentRemaining === 0 ? `
                    <button 
                        onclick="window.brewcode.markInventoryExpired(${item.lotID})"
                        class="bg-red-700 hover:bg-red-600 text-white text-sm py-2 px-4 rounded transition-colors"
                    >
                        Mark Expired
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Render inventory detail view
 * @param {Object} BrewCode - BrewCode API instance
 * @param {number} lotID - Lot ID to display
 * @returns {string} HTML for inventory detail
 */
function renderInventoryDetail(BrewCode, lotID) {
    const lot = BrewCode.inventory.getLot(lotID);
    const settings = BrewCode.settings.get();
    const fmt = getFormatters(settings);

    if (!lot) {
        return `
            <div class="text-center py-12">
                <h2 class="text-2xl font-bold text-red-500 mb-4">Inventory Not Found</h2>
                <button 
                    onclick="window.brewcode.navigate('inventory')"
                    class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg"
                >
                    ← Back to Inventory
                </button>
            </div>
        `;
    }

    const isIngredient = lot.ingredientID !== null;
    const name = isIngredient ? 
        `${lot.brand ? lot.brand + ' ' : ''}${lot.name}` : 
        lot.name;
    const typeName = isIngredient ? lot.ingredientTypeName : lot.supplyTypeName;

    const percentRemaining = (lot.quantityRemaining / lot.quantityPurchased) * 100;
    const totalCost = (lot.costPerUnit || 0) * lot.quantityPurchased;
    const remainingValue = (lot.costPerUnit || 0) * lot.quantityRemaining;

    return `
        <div class="mb-6">
            <button 
                onclick="window.brewcode.navigate('inventory')"
                class="text-amber-400 hover:text-amber-300 mb-4 inline-block"
            >
                ← Back to Inventory
            </button>
            
            <h1 class="text-4xl font-bold text-white mb-2">${name}</h1>
            <div class="text-gray-400 mb-4">${typeName}</div>
        </div>

        <!-- Details Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <!-- Quantity Info -->
            <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 class="text-lg font-semibold text-white mb-4">Quantity</h3>
                <div class="space-y-3">
                    <div>
                        <div class="text-sm text-gray-400">Remaining</div>
                        <div class="text-3xl font-bold text-white">
                            ${lot.quantityRemaining.toFixed(1)} ${lot.unit}
                        </div>
                        <div class="text-sm text-gray-500">
                            ${percentRemaining.toFixed(0)}% of ${lot.quantityPurchased.toFixed(1)} ${lot.unit}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Purchase Info -->
            <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 class="text-lg font-semibold text-white mb-4">Purchase Info</h3>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Purchased:</span>
                        <span class="text-white">${fmt.date(lot.purchaseDate)}</span>
                    </div>
                    ${lot.expirationDate ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Expires:</span>
                            <span class="text-white">${fmt.date(lot.expirationDate)}</span>
                        </div>
                    ` : ''}
                    ${lot.supplier ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Supplier:</span>
                            <span class="text-white">${lot.supplier}</span>
                        </div>
                    ` : ''}
                    ${lot.costPerUnit ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Cost per ${lot.unit}:</span>
                            <span class="text-white">$${lot.costPerUnit.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between pt-2 border-t border-gray-700">
                            <span class="text-gray-400">Total Cost:</span>
                            <span class="text-white font-semibold">$${totalCost.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Remaining Value:</span>
                            <span class="text-white font-semibold">$${remainingValue.toFixed(2)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>

        ${lot.notes ? `
            <div class="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
                <h3 class="text-lg font-semibold text-white mb-4">Notes</h3>
                <p class="text-gray-300 whitespace-pre-line">${lot.notes}</p>
            </div>
        ` : ''}

        <!-- Actions -->
        <div class="flex gap-4">
            <button 
                onclick="window.brewcode.markInventoryExpired(${lot.lotID})"
                class="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg transition-colors"
            >
                Mark as Expired
            </button>
        </div>
    `;
}

/**
 * Apply all inventory filters
 */
function applyInventoryFilters() {
    const typeFilter = document.getElementById('inv-filter-type').value;
    const stockFilter = document.getElementById('inv-filter-stock').value;
    const categoryFilter = document.getElementById('inv-filter-category').value;
    
    const cards = document.querySelectorAll('[data-inventory-type]');
    
    cards.forEach(card => {
        const itemType = card.dataset.inventoryType;
        const percentRemaining = parseFloat(card.dataset.percentRemaining || 100);
        const category = card.dataset.category || '';
        
        let visible = true;
        
        // Apply item type filter
        if (typeFilter === 'ingredients' && itemType !== 'ingredient') visible = false;
        if (typeFilter === 'supplies' && itemType !== 'supply') visible = false;
        
        // Apply stock level filter
        if (stockFilter === 'in-stock' && percentRemaining <= 0) visible = false;
        if (stockFilter === 'low-stock' && (percentRemaining >= 25 || percentRemaining <= 0)) visible = false;
        if (stockFilter === 'out-of-stock' && percentRemaining > 0) visible = false;
        
        // Apply category filter
        if (categoryFilter !== 'all' && category !== categoryFilter) visible = false;
        
        card.style.display = visible ? 'block' : 'none';
    });
    
    // Update category dropdown based on type selection
    updateCategoryDropdown();
}

/**
 * Update category dropdown options based on selected item type
 */
function updateCategoryDropdown() {
    const typeFilter = document.getElementById('inv-filter-type').value;
    const categorySelect = document.getElementById('inv-filter-category');
    const currentCategory = categorySelect.value;
    
    // Get unique categories from visible items
    const cards = document.querySelectorAll('[data-inventory-type]');
    const categories = new Set();
    
    cards.forEach(card => {
        const itemType = card.dataset.inventoryType;
        const category = card.dataset.category;
        
        if ((typeFilter === 'all') || 
            (typeFilter === 'ingredients' && itemType === 'ingredient') ||
            (typeFilter === 'supplies' && itemType === 'supply')) {
            if (category) categories.add(category);
        }
    });
    
    // Rebuild dropdown
    categorySelect.innerHTML = '<option value="all">All Categories</option>';
    Array.from(categories).sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (cat === currentCategory) option.selected = true;
        categorySelect.appendChild(option);
    });
}

export { 
    renderInventoryPage,
    renderInventoryDetail,
    applyInventoryFilters,
    updateCategoryDropdown
};
// inventoryPage.js - Item-focused inventory management

import { getFormatters } from './formatHelpers.js';
import { renderEmptyState } from './uiHelpers.js';
import { toggleDropdown, renderMultiSelectDropdown, handleMultiSelectAll, renderFilterDropdown } from './filterHelpers.js';

/**
 * Render inventory page
 * @param {Object} BrewCode - BrewCode API instance
 * @returns {string} HTML for inventory page
 */
function renderInventoryPage(BrewCode) {
    const settings = BrewCode.settings.get();
    const fmt = getFormatters(settings);
    
    // Get ALL items with their lots (including on-demand items)
    const items = getAllItemsWithInventory(BrewCode);
    
    if (items.length === 0) {
        return renderInventoryEmpty(BrewCode);
    }

    // Calculate stats
    const expiringCount = items.filter(item => isItemExpiringSoon(item)).length;
    const lowStockCount = items.filter(item => {
        const result = isItemLowStock(item);
        console.log(`Item: ${item.name}, onDemand: ${item.onDemand}, reorderPoint: ${item.reorderPoint}, totalRemaining: ${item.lots.reduce((s, l) => s + l.quantityRemaining, 0)}, isLowStock: ${result}`);
        return result;
    }).length;
    const outOfStockCount = items.filter(item => {
        // Only count non-on-demand items with zero stock
        if (item.onDemand === 1) return false;
        const totalRemaining = item.lots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
        return totalRemaining === 0;
    }).length;
    const totalValue = items.reduce((sum, item) => {
        return sum + item.lots.reduce((lotSum, lot) => {
            return lotSum + ((lot.costPerUnit || 0) * lot.quantityRemaining);
        }, 0);
    }, 0);

    // Get unique categories and types
    const categories = new Set();
    const types = new Set();
    items.forEach(item => {
        if (item.categoryName) categories.add(item.categoryName);
        if (item.typeName) types.add(item.typeName);
    });
    const sortedCategories = Array.from(categories).sort();
    const sortedTypes = Array.from(types).sort();

    return `
        <div class="mb-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold text-white">Inventory</h2>
                <div class="flex gap-3">
                    <button 
                        onclick="window.brewcode.showTypeManagementWrapper()"
                        class="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Manage Types
                    </button>
                    <button 
                        onclick="window.brewcode.showCreateItemFormWrapper()"
                        class="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        + Add Item
                    </button>
                </div>
            </div>

            <!-- Top Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-orange-900/20 border border-orange-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-orange-400">${expiringCount}</div>
                    <div class="text-sm text-gray-400">Expiring Soon</div>
                </div>
                <div class="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-yellow-400">${lowStockCount}</div>
                    <div class="text-sm text-gray-400">Low Stock</div>
                </div>
                <div class="bg-red-900/20 border border-red-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-red-400">${outOfStockCount}</div>
                    <div class="text-sm text-gray-400">Out of Stock</div>
                </div>
                <div class="bg-purple-900/20 border border-purple-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-purple-400">${fmt.currency(totalValue)}</div>
                    <div class="text-sm text-gray-400">Value on Hand</div>
                </div>
            </div>

            <!-- Search Bar -->
            <div class="mb-6">
                <input 
                    type="text"
                    id="inventorySearch"
                    placeholder="Search inventory..."
                    onkeyup="window.brewcode.applyInventoryFilters()"
                    class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                />
            </div>

            <!-- Filter Toggle Button (visible on small screens) -->
            <button 
                id="filterToggleBtn"
                onclick="window.brewcode.toggleFilters()"
                class="md:hidden w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors mb-4 flex items-center justify-center gap-2"
            >
                <span>Filters</span>
                <span id="filterToggleIcon">▼</span>
            </button>

            <!-- Filter Dropdowns -->
            <div id="filterContainer" class="mb-6 flex-wrap gap-3 hidden md:flex">
                ${renderFilterDropdown({
                    id: 'inventorySortBy',
                    label: '',
                    onChange: 'window.brewcode.applyInventoryFilters()',
                    options: [
                        { value: 'name-asc', label: 'Name, A-Z' },
                        { value: 'name-desc', label: 'Name, Z-A' },
                        { value: 'stock-low', label: 'Stock, Low to High' },
                        { value: 'stock-high', label: 'Stock, High to Low' }
                    ],
                    defaultValue: 'name-asc'
                })}
                
                ${renderMultiSelectDropdown({
                    id: 'itemRoleDropdown',
                    label: 'Item Role',
                    options: [
                        { value: 'ingredient', label: 'Ingredients' },
                        { value: 'supply', label: 'Supplies' },
                        { value: 'dual', label: 'Dual Purpose' }
                    ],
                    onChange: 'window.brewcode.applyInventoryFilters'
                })}
                
                ${renderMultiSelectDropdown({
                    id: 'categoryDropdown',
                    label: 'Categories',
                    options: sortedCategories.map(cat => ({ value: cat, label: cat })),
                    onChange: 'window.brewcode.applyInventoryFilters'
                })}
                
                ${renderMultiSelectDropdown({
                    id: 'typeDropdown',
                    label: 'Types',
                    options: sortedTypes.map(type => ({ value: type, label: type })),
                    onChange: 'window.brewcode.applyInventoryFilters'
                })}
                
                ${renderMultiSelectDropdown({
                    id: 'stockStatusDropdown',
                    label: 'Stock Status',
                    options: [
                        { value: 'in-stock', label: 'In Stock' },
                        { value: 'low-stock', label: 'Low Stock' },
                        { value: 'out-of-stock', label: 'Out of Stock' },
                        { value: 'on-demand', label: 'On Demand' },
                        { value: 'expiring-soon', label: 'Expiring Soon' }
                    ],
                    onChange: 'window.brewcode.applyInventoryFilters',
                    includeAll: true
                })}
            </div>

            <!-- Inventory List -->
            <div class="space-y-4" id="inventoryList">
                ${items.map(item => renderInventoryCard(item, fmt)).join('')}
            </div>
        </div>
    `;
}

/**
 * Get all items with their inventory lots
 * Includes on-demand items (which have no lots)
 */
function getAllItemsWithInventory(BrewCode) {
    // DEBUG: Check what's in the database
    const debugItems = BrewCode.query("SELECT itemID, name, reorderPoint, onDemand FROM items WHERE name LIKE '%71B%' OR name LIKE '%Potassium%'");
    console.log('DEBUG - Items from database:', debugItems);
    
    const itemsQuery = `
        SELECT 
            i.*,
            it.ingredientTypeID,
            it.name as ingredientTypeName,
            ic_ing.categoryID as ingredientCategoryID,
            ic_ing.name as ingredientCategoryName,
            st.supplyTypeID,
            st.name as supplyTypeName,
            ic_sup.categoryID as supplyCategoryID,
            ic_sup.name as supplyCategoryName
        FROM items i
        LEFT JOIN ingredientTypes it ON i.ingredientTypeID = it.ingredientTypeID
        LEFT JOIN itemCategories ic_ing ON it.categoryID = ic_ing.categoryID
        LEFT JOIN supplyTypes st ON i.supplyTypeID = st.supplyTypeID
        LEFT JOIN itemCategories ic_sup ON st.categoryID = ic_sup.categoryID
        WHERE i.isActive = 1
        ORDER BY i.name ASC
    `;
    
    const itemsResult = BrewCode.query(itemsQuery);
    const lots = BrewCode.inventory.getAll({ status: 'active' });
    
    const lotsByItem = {};
    lots.forEach(lot => {
        if (!lotsByItem[lot.itemID]) {
            lotsByItem[lot.itemID] = [];
        }
        lotsByItem[lot.itemID].push(lot);
    });
    
    const items = itemsResult.map(item => {
        const itemLots = lotsByItem[item.itemID] || [];
        const typeName = item.ingredientTypeName || item.supplyTypeName;
        const categoryName = item.ingredientCategoryName || item.supplyCategoryName;
        
        let earliestExpiration = null;
        itemLots.forEach(lot => {
            if (lot.expirationDate) {
                if (!earliestExpiration || new Date(lot.expirationDate) < new Date(earliestExpiration)) {
                    earliestExpiration = lot.expirationDate;
                }
            }
        });
        
        return {
            itemID: item.itemID,
            name: item.name,
            brand: item.brand,
            unit: item.unit,
            isIngredient: item.ingredientTypeID !== null,
            isSupply: item.supplyTypeID !== null,
            typeName: typeName,
            categoryName: categoryName,
            reorderPoint: item.reorderPoint,
            onDemand: item.onDemand,
            onDemandPrice: item.onDemandPrice,
            onDemandPriceQty: item.onDemandPriceQty,
            earliestExpiration: earliestExpiration,
            lots: itemLots
        };
    });
    
    return items;
}

function renderInventoryEmpty(BrewCode) {
    return `
        <div class="mb-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold text-white">Inventory</h2>
                <div class="flex gap-3">
                    <button 
                        onclick="window.brewcode.showTypeManagementWrapper()"
                        class="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Manage Types
                    </button>
                    <button 
                        onclick="window.brewcode.showCreateItemFormWrapper()"
                        class="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        + Add Item
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-orange-900/20 border border-orange-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-orange-400">0</div>
                    <div class="text-sm text-gray-400">Expiring Soon</div>
                </div>
                <div class="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-yellow-400">0</div>
                    <div class="text-sm text-gray-400">Low Stock</div>
                </div>
                <div class="bg-red-900/20 border border-red-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-red-400">0</div>
                    <div class="text-sm text-gray-400">Out of Stock</div>
                </div>
                <div class="bg-purple-900/20 border border-purple-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-purple-400">$0.00</div>
                    <div class="text-sm text-gray-400">Value on Hand</div>
                </div>
            </div>
        </div>

        ${renderEmptyState({
            icon: '📦',
            title: 'No Inventory Yet',
            description: 'Start tracking your ingredients and supplies.',
            buttonLabel: '+ Add Item',
            buttonAction: 'window.brewcode.showCreateItemFormWrapper()'
        })}
    `;
}

function renderInventoryCard(item, fmt) {
    const totalRemaining = item.lots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
    const totalPurchased = item.lots.reduce((sum, lot) => sum + lot.quantityPurchased, 0);
    const percentRemaining = totalPurchased > 0 ? (totalRemaining / totalPurchased) * 100 : 0;
    
    const isLowStock = isItemLowStock(item);
    const isExpiringSoon = isItemExpiringSoon(item);
    const isOnDemand = item.onDemand === 1;
    const isOutOfStock = !isOnDemand && totalRemaining === 0;

    let stockStatus = 'in-stock';
    if (isOnDemand) stockStatus = 'on-demand';
    else if (isOutOfStock) stockStatus = 'out-of-stock';
    else if (isLowStock) stockStatus = 'low-stock';
    
    const additionalStatuses = [];
    if (isExpiringSoon) additionalStatuses.push('expiring-soon');

    let barColor = 'bg-green-500';
    if (isOutOfStock) barColor = 'bg-gray-500';
    else if (isLowStock) barColor = 'bg-red-500';
    else if (percentRemaining < 25) barColor = 'bg-orange-500';
    else if (percentRemaining < 50) barColor = 'bg-yellow-500';

    return `
        <div 
            class="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:shadow-lg transition-shadow"
            data-item-id="${item.itemID}"
            data-item-role="${item.isIngredient && item.isSupply ? 'dual' : item.isIngredient ? 'ingredient' : 'supply'}"
            data-item-category="${item.categoryName || ''}"
            data-item-type="${item.typeName || ''}"
            data-is-low-stock="${isLowStock}"
            data-is-on-demand="${isOnDemand}"
            data-stock-status="${stockStatus}"
            data-stock-level="${totalRemaining}"
            data-additional-status="${additionalStatuses.join(',')}"
            data-search-text="${(item.name + ' ' + (item.brand || '') + ' ' + (item.typeName || '')).toLowerCase()}"
        >
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1 cursor-pointer" onclick="window.brewcode.viewInventoryDetail('${item.itemID}')">
                    <h3 class="text-lg font-bold text-white">
                        ${item.brand ? `<span class="text-gray-400">${item.brand}</span> ` : ''}${item.name}
                    </h3>
                    <p class="text-sm text-gray-400">${item.typeName || 'Uncategorized'}</p>
                </div>
                <button 
                    onclick="event.stopPropagation(); window.brewcode.showEditItem(${item.itemID})"
                    class="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded transition-colors"
                >
                    Edit
                </button>
            </div>

            ${isLowStock || isOutOfStock || isExpiringSoon ? `
                <div class="flex flex-wrap gap-2 mb-4">
                    ${isLowStock ? `<span class="bg-red-900/40 text-red-300 text-xs px-2 py-1 rounded">Low Stock</span>` : ''}
                    ${isOutOfStock ? `<span class="bg-gray-900/40 text-gray-300 text-xs px-2 py-1 rounded">Out of Stock</span>` : ''}
                    ${isExpiringSoon ? `<span class="bg-orange-900/40 text-orange-300 text-xs px-2 py-1 rounded">Expiring Soon</span>` : ''}
                </div>
            ` : ''}

            <div class="flex justify-between items-end">
                <div class="flex flex-col gap-2">
                    ${isOnDemand ? `
                        <div class="text-xl font-bold text-blue-400">On Demand</div>
                        ${item.onDemandPrice ? `<div class="text-xs text-gray-500">${fmt.currency(item.onDemandPrice)} / ${item.onDemandPriceQty} ${item.unit}</div>` : ''}
                    ` : `
                        <div class="text-2xl font-bold text-white flex items-center gap-2">
                            ${totalRemaining.toFixed(1)} ${item.unit}
                            ${(isLowStock || isOutOfStock) ? `<span class="text-yellow-400 text-xl" title="${isOutOfStock ? 'Out of stock' : 'Low stock'}">⚠️</span>` : ''}
                        </div>
                    `}
                    <div class="grid grid-cols-2 gap-3 text-sm text-gray-400">
                        ${item.reorderPoint !== null && !isOnDemand ? `
                            <div>
                                <span class="text-gray-500">Reorder:</span> ${item.reorderPoint} ${item.unit}
                            </div>
                        ` : ''}
                        ${item.earliestExpiration ? `
                            <div>
                                <span class="text-gray-500">Expires:</span> ${fmt.date(item.earliestExpiration)}
                            </div>
                        ` : ''}
                        ${item.lots.length > 0 ? `
                            <div>
                                <span class="text-gray-500">Lots:</span> ${item.lots.length}
                            </div>
                        ` : ''}
                    </div>
                </div>
                ${!isOnDemand ? `
                    <button 
                        onclick="event.stopPropagation(); window.brewcode.showAddLotForm(${item.itemID})"
                        class="bg-amber-600 hover:bg-amber-700 text-white text-sm py-2 px-4 rounded transition-colors whitespace-nowrap"
                    >
                        + Add Lot
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function isItemLowStock(item) {
    // Don't count on-demand items as low stock
    if (item.onDemand === 1) return false;
    
    // Only items with a reorder point can be low stock
    if (item.reorderPoint === null) return false;
    
    const totalRemaining = item.lots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
    
    // Item is low stock if it's at or below reorder point (includes zero/out of stock)
    return totalRemaining <= item.reorderPoint;
}

function isItemExpiringSoon(item) {
    if (!item.earliestExpiration) return false;
    const expirationDate = new Date(item.earliestExpiration);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return expirationDate < thirtyDaysFromNow;
}

function applyInventoryFilters() {
    const searchText = document.getElementById('inventorySearch')?.value.toLowerCase() || '';
    const sortBy = document.getElementById('inventorySortBy')?.value || 'name-asc';
    
    const itemRoleCheckboxes = document.querySelectorAll('#itemRoleDropdown input[type="checkbox"]:checked');
    const categoryCheckboxes = document.querySelectorAll('#categoryDropdown input[type="checkbox"]:checked');
    const typeCheckboxes = document.querySelectorAll('#typeDropdown input[type="checkbox"]:checked');
    const stockStatusCheckboxes = document.querySelectorAll('#stockStatusDropdown input[type="checkbox"]:checked');
    
    const selectedRoles = Array.from(itemRoleCheckboxes).map(cb => cb.value);
    const selectedCategories = Array.from(categoryCheckboxes).map(cb => cb.value);
    const selectedTypes = Array.from(typeCheckboxes).map(cb => cb.value);
    const selectedStockStatuses = Array.from(stockStatusCheckboxes).map(cb => cb.value);
    
    const cards = Array.from(document.querySelectorAll('[data-item-id]'));
    
    // If no cards exist, return early
    if (cards.length === 0) return;
    
    cards.forEach(card => {
        let visible = true;
        
        if (searchText && !card.dataset.searchText.includes(searchText)) {
            visible = false;
        }
        
        // Only apply role filter if there are selections AND "all" is not selected
        if (selectedRoles.length > 0 && !selectedRoles.includes('all')) {
            const itemRole = card.dataset.itemRole;
            if (!selectedRoles.includes(itemRole)) {
                visible = false;
            }
        }
        
        // Only apply category filter if there are selections AND "all" is not selected
        if (selectedCategories.length > 0 && !selectedCategories.includes('all')) {
            if (!selectedCategories.includes(card.dataset.itemCategory)) {
                visible = false;
            }
        }
        
        // Only apply type filter if there are selections AND "all" is not selected
        if (selectedTypes.length > 0 && !selectedTypes.includes('all')) {
            if (!selectedTypes.includes(card.dataset.itemType)) {
                visible = false;
            }
        }
        
        // Only apply stock status filter if there are selections AND "all-stock" is not selected
        if (selectedStockStatuses.length > 0 && !selectedStockStatuses.includes('all-stock') && !selectedStockStatuses.includes('all')) {
            const stockStatus = card.dataset.stockStatus;
            const additionalStatuses = card.dataset.additionalStatus.split(',').filter(s => s);
            const allStatuses = [stockStatus, ...additionalStatuses];
            
            const matchesStatus = selectedStockStatuses.some(status => allStatuses.includes(status));
            if (!matchesStatus) {
                visible = false;
            }
        }
        
        card.style.display = visible ? 'block' : 'none';
    });
    
    const visibleCards = cards.filter(card => card.style.display !== 'none');
    const parent = cards[0]?.parentElement;
    
    if (parent && visibleCards.length > 0) {
        visibleCards.sort((a, b) => {
            const aStock = parseFloat(a.dataset.stockLevel) || 0;
            const bStock = parseFloat(b.dataset.stockLevel) || 0;
            
            switch(sortBy) {
                case 'name-asc': {
                    const aName = a.dataset.searchText || '';
                    const bName = b.dataset.searchText || '';
                    return aName.localeCompare(bName);
                }
                case 'name-desc': {
                    const aName = a.dataset.searchText || '';
                    const bName = b.dataset.searchText || '';
                    return bName.localeCompare(aName);
                }
                case 'stock-low':
                    return aStock - bStock;
                case 'stock-high':
                    return bStock - aStock;
                default:
                    return 0;
            }
        });
        
        visibleCards.forEach(card => parent.appendChild(card));
    }
}

function toggleFilters() {
    const filterContainer = document.getElementById('filterContainer');
    const filterToggleIcon = document.getElementById('filterToggleIcon');
    
    if (filterContainer.classList.contains('hidden')) {
        filterContainer.classList.remove('hidden');
        filterContainer.classList.add('flex');
        filterToggleIcon.textContent = '▲';
    } else {
        filterContainer.classList.add('hidden');
        filterContainer.classList.remove('flex');
        filterToggleIcon.textContent = '▼';
    }
}

function renderInventoryDetail(BrewCode, itemID) {
    const settings = BrewCode.settings.get();
    const fmt = getFormatters(settings);
    
    const itemQuery = `
        SELECT 
            i.*,
            it.name as ingredientTypeName,
            st.name as supplyTypeName
        FROM items i
        LEFT JOIN ingredientTypes it ON i.ingredientTypeID = it.ingredientTypeID
        LEFT JOIN supplyTypes st ON i.supplyTypeID = st.supplyTypeID
        WHERE i.itemID = ?
    `;
    
    const itemResult = BrewCode.query(itemQuery, [itemID]);
    
    if (itemResult.length === 0) {
        return `
            <div class="text-center py-12">
                <h2 class="text-2xl font-bold text-red-500 mb-4">Item Not Found</h2>
                <button 
                    onclick="window.brewcode.navigate('inventory')"
                    class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg"
                >
                    ← Back
                </button>
            </div>
        `;
    }
    
    const item = itemResult[0];
    const lots = BrewCode.inventory.getAll({ itemID, status: 'active' });
    
    const name = item.brand ? `${item.brand} ${item.name}` : item.name;
    const typeName = item.ingredientTypeName || item.supplyTypeName;
    const isOnDemand = item.onDemand === 1;
    
    const totalRemaining = lots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
    const totalPurchased = lots.reduce((sum, lot) => sum + lot.quantityPurchased, 0);
    const totalValue = lots.reduce((sum, lot) => sum + ((lot.costPerUnit || 0) * lot.quantityRemaining), 0);

    return `
        <div class="mb-6">
            <button 
                onclick="window.brewcode.navigate('inventory')"
                class="text-amber-400 hover:text-amber-300 mb-4 inline-block"
            >
                ← Back to Inventory
            </button>
            
            <h1 class="text-4xl font-bold text-white mb-2">${name}</h1>
            <p class="text-gray-400">${typeName || 'Uncategorized'}</p>
            ${isOnDemand ? `<span class="inline-block bg-blue-900/40 text-blue-300 text-sm px-3 py-1 rounded mt-2">On Demand</span>` : ''}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            ${!isOnDemand ? `
                <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <div class="text-sm text-gray-400 mb-1">Current Stock</div>
                    <div class="text-3xl font-bold text-white">${totalRemaining.toFixed(1)} ${item.unit}</div>
                    ${totalPurchased > 0 ? `<div class="text-xs text-gray-500 mt-2">${((totalRemaining / totalPurchased) * 100).toFixed(0)}% of ${totalPurchased.toFixed(1)} purchased</div>` : ''}
                </div>
                <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <div class="text-sm text-gray-400 mb-1">Stock Value</div>
                    <div class="text-3xl font-bold text-white">${fmt.currency(totalValue)}</div>
                </div>
            ` : `
                <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <div class="text-sm text-gray-400 mb-1">Purchase As Needed</div>
                    <div class="text-3xl font-bold text-blue-400">On Demand</div>
                    ${item.onDemandPrice ? `<div class="text-sm text-gray-400 mt-2">${fmt.currency(item.onDemandPrice)} per ${item.onDemandPriceQty} ${item.unit}</div>` : ''}
                </div>
            `}
            <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div class="text-sm text-gray-400 mb-1">Reorder Point</div>
                <div class="text-3xl font-bold text-white">${item.reorderPoint !== null ? item.reorderPoint + ' ' + item.unit : '—'}</div>
            </div>
        </div>

        ${!isOnDemand && lots.length > 0 ? `
            <div class="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
                <h2 class="text-xl font-bold text-white mb-4">Lots (${lots.length})</h2>
                <div class="space-y-3">
                    ${lots.map(lot => `
                        <div class="bg-gray-700/50 rounded p-4">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <div class="font-semibold text-white">${lot.quantityRemaining.toFixed(1)} ${lot.unit}</div>
                                    <div class="text-xs text-gray-400">Acquired ${fmt.date(lot.purchaseDate)}</div>
                                </div>
                                <div class="text-right">
                                    ${lot.supplier ? `<div class="text-sm text-gray-400">${lot.supplier}</div>` : ''}
                                    ${lot.costPerUnit ? `<div class="text-sm text-white font-semibold">${fmt.currency(lot.costPerUnit * lot.quantityRemaining)}</div>` : ''}
                                </div>
                            </div>
                            ${lot.expirationDate ? `
                                <div class="text-xs ${new Date(lot.expirationDate) < new Date() ? 'text-red-400' : 'text-gray-400'}">
                                    ${new Date(lot.expirationDate) < new Date() ? '⚠ ' : '⏰'} ${fmt.date(lot.expirationDate)}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        <div class="flex gap-3">
            ${!isOnDemand ? `
                <button 
                    onclick="window.brewcode.showAddLotForm(${itemID})"
                    class="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 px-6 rounded-lg transition-colors font-semibold"
                >
                    + Add Lot
                </button>
            ` : ''}
        </div>
    `;
}

export {
    renderInventoryPage,
    renderInventoryDetail,
    applyInventoryFilters,
    toggleFilters,
    toggleDropdown,
    handleMultiSelectAll
};
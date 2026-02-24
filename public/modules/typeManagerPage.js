// typeManagementPage.js - Type management UI and logic

import { renderNavigation } from './navigation.js';
import { showToast } from './uiHelpers.js';

let BrewCodeInstance = null;

/**
 * Show type management screen
 * @param {string} activeTab - 'ingredient' or 'supply'
 */
function showTypeManagement(BrewCode, activeTab = 'ingredient') {
    BrewCodeInstance = BrewCode; // Store for use in other functions
    const ingredientTypes = BrewCode.ingredientType.getAll().filter(t => t.isActive);
    const supplyTypes = BrewCodeInstance.supplyType.getAll().filter(t => t.isActive);
    const categories = BrewCode.query('SELECT * FROM itemCategories ORDER BY sortOrder');
    
    const ingredientCategories = categories.filter(c => c.roleID === 'ingredient');
    const supplyCategories = categories.filter(c => c.roleID === 'supply');
    
    const content = `
        <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div class="mb-6">
                <h1 class="text-3xl font-bold text-white mb-2">Type Management</h1>
                <p class="text-gray-400">Manage ingredient and supply types for your inventory</p>
            </div>

            <!-- Tabs -->
            <div class="flex gap-2 mb-6 border-b border-gray-700">
                <button
                    onclick="window.brewcode.showTypeManagementWrapper('ingredient')"
                    class="px-4 py-2 font-medium transition-colors ${
                        activeTab === 'ingredient'
                            ? 'text-amber-400 border-b-2 border-amber-400'
                            : 'text-gray-400 hover:text-gray-300'
                    }"
                >
                    Ingredient Types
                </button>
                <button
                    onclick="window.brewcode.showTypeManagementWrapper('supply')"
                    class="px-4 py-2 font-medium transition-colors ${
                        activeTab === 'supply'
                            ? 'text-amber-400 border-b-2 border-amber-400'
                            : 'text-gray-400 hover:text-gray-300'
                    }"
                >
                    Supply Types
                </button>
            </div>

            <!-- Controls -->
            <div class="flex flex-col sm:flex-row gap-4 mb-6">
                <!-- Search -->
                <div class="relative flex-1">
                    <input
                        type="text"
                        id="typeSearchInput"
                        placeholder="Search types..."
                        oninput="window.brewcode.filterTypes('${activeTab}')"
                        class="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                    <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                </div>

                <!-- Category Filter - Hidden on mobile -->
                <select
                    id="categoryFilterSelect"
                    onchange="window.brewcode.filterTypes('${activeTab}')"
                    class="hidden sm:block bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
                >
                    <option value="all">All Categories</option>
                    ${(activeTab === 'ingredient' ? ingredientCategories : supplyCategories).map(cat => 
                        `<option value="${cat.categoryID}">${cat.name}</option>`
                    ).join('')}
                </select>

                <!-- Sort - Hidden on mobile -->
                <select
                    id="sortSelect"
                    onchange="window.brewcode.filterTypes('${activeTab}')"
                    class="hidden sm:block bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
                >
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                    <option value="category-asc">Category A-Z</option>
                    <option value="category-desc">Category Z-A</option>
                </select>

                <!-- Create Button -->
                <button
                    onclick="window.brewcode.showTypeForm('${activeTab}', null)"
                    class="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Create Type
                </button>
            </div>

            <!-- Form Container -->
            <div id="typeFormContainer"></div>

            <!-- Subtype Form Container (Modal) -->
            <div id="subtypeFormContainer"></div>

            <!-- Types List -->
            <div id="typesListContainer">
                ${renderTypesList(BrewCode, activeTab, activeTab === 'ingredient' ? ingredientTypes : supplyTypes, categories, 'all', '', 'name-asc')}
            </div>

            <!-- Summary -->
            <div id="typesSummary" class="mt-4 text-sm text-gray-400">
                Showing ${(activeTab === 'ingredient' ? ingredientTypes : supplyTypes).length} ${activeTab} types
            </div>
        </div>
    `;

    return `
        <button 
            onclick="window.brewcode.navigate('inventory')"
            class="text-amber-400 hover:text-amber-300 mb-4 inline-block"
        >
            ← Back to Inventory
        </button>
        ${content}
    `;
}

/**
 * Render types list as cards
 */
function renderTypesList(BrewCode, activeTab, types, categories, categoryFilter, searchTerm, sortOrder) {
    // Filter types
    let filteredTypes = types.filter(type => {
        const matchesSearch = !searchTerm || type.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || type.categoryID === parseInt(categoryFilter);
        return matchesSearch && matchesCategory;
    });

    // Sort types
    const getCategoryName = (categoryID) => {
        const cat = categories.find(c => c.categoryID === categoryID);
        return cat ? cat.name : 'Unknown';
    };

    filteredTypes.sort((a, b) => {
        switch(sortOrder) {
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'category-asc':
                return getCategoryName(a.categoryID).localeCompare(getCategoryName(b.categoryID));
            case 'category-desc':
                return getCategoryName(b.categoryID).localeCompare(getCategoryName(a.categoryID));
            default:
                return a.name.localeCompare(b.name);
        }
    });

    if (filteredTypes.length === 0) {
        return `
            <div class="p-8 text-center text-gray-400">
                <svg class="mx-auto mb-4 opacity-50" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
                <p>No types found matching your criteria</p>
            </div>
        `;
    }

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            ${filteredTypes.map(type => {
                const typeID = activeTab === 'ingredient' ? type.ingredientTypeID : type.supplyTypeID;
                const subtypes = activeTab === 'ingredient' 
                    ? BrewCode.subtype.getAll({ ingredientTypeID: typeID, isActive: 1 })
                    : [];
                
                return `
                    <div class="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:shadow-lg transition-shadow">
                        <!-- Header -->
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex-1">
                                <h3 class="text-lg font-bold text-white">${type.name}</h3>
                                <div class="flex items-center gap-2 text-sm">
                                    <span class="text-gray-400">${getCategoryName(type.categoryID)}</span>
                                    ${activeTab === 'ingredient' && subtypes.length > 0 ? `
                                        <span class="inline-block bg-blue-600/20 text-blue-400 text-xs px-2 py-0.5 rounded">
                                            ${subtypes.length} subtype${subtypes.length !== 1 ? 's' : ''}
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                            <button 
                                onclick="window.brewcode.showTypeForm('${activeTab}', ${typeID})"
                                class="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded transition-colors"
                            >
                                Edit
                            </button>
                        </div>

                        <!-- Subtypes -->
                        ${activeTab === 'ingredient' ? `
                            <div class="min-h-[2rem]">
                                ${subtypes.length > 0 ? `
                                    <div class="flex flex-wrap gap-1">
                                        ${subtypes.map(subtype => `
                                            <span class="inline-flex items-center gap-1 bg-gray-600/50 text-gray-300 text-xs px-2 py-1 rounded">
                                                ${subtype.name}
                                                <button
                                                    onclick="window.brewcode.showSubtypeForm(${typeID}, ${subtype.ingredientSubtypeID})"
                                                    class="text-blue-400 hover:text-blue-300"
                                                    title="Edit subtype"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </button>
                                            </span>
                                        `).join('')}
                                        <button
                                            onclick="window.brewcode.showSubtypeForm(${typeID}, null)"
                                            class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                ` : `
                                    <button
                                        onclick="window.brewcode.showSubtypeForm(${typeID}, null)"
                                        class="text-xs text-gray-500 hover:text-amber-400"
                                    >
                                        + Add Subtype
                                    </button>
                                `}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Show type create/edit form
 */
function showTypeForm(activeTab, typeID) {
    const categories = BrewCodeInstance.query('SELECT * FROM itemCategories ORDER BY sortOrder');
    const relevantCategories = activeTab === 'ingredient' 
        ? categories.filter(c => c.categoryID <= 8)
        : categories.filter(c => c.categoryID > 8);
    
    const beverageTypes = ['Mead', 'Cider', 'Beer', 'Wine'];
    
    let formData = {
        name: '',
        categoryID: '',
        beverageTypes: [],
        isPrimaryRequired: false,
        isActive: true
    };
    
    if (typeID) {
        // Edit mode - load existing type
        const type = activeTab === 'ingredient'
            ? BrewCodeInstance.ingredientType.get(typeID)
            : BrewCodeInstance.supplyType.get(typeID);
        
        if (!type) {
            showToast('Type not found', 'error');
            return;
        }
        
        formData = {
            name: type.name,
            categoryID: type.categoryID,
            beverageTypes: activeTab === 'ingredient' 
                ? (typeof type.beverageTypes === 'string' ? JSON.parse(type.beverageTypes || '[]') : (type.beverageTypes || []))
                : [],
            isPrimaryRequired: activeTab === 'ingredient' ? type.isPrimaryRequired === 1 : false,
            isActive: type.isActive === 1
        };
    }
    
    const formHtml = `
        <div class="bg-gray-700/50 rounded-lg p-4 mb-4 border-2 border-amber-500">
            <h4 class="text-lg font-semibold text-white mb-4">
                ${typeID ? 'Edit Type' : 'Create New Type'}
            </h4>
            
            <div class="space-y-4">
                <!-- Name -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Type Name <span class="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="typeNameInput"
                        value="${formData.name}"
                        placeholder="e.g., Apple, Pilsner Malt, Star San"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    />
                </div>

                <!-- Category -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Category <span class="text-red-500">*</span>
                    </label>
                    <select
                        id="typeCategorySelect"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    >
                        <option value="">Select category...</option>
                        ${relevantCategories.map(cat => 
                            `<option value="${cat.categoryID}" ${formData.categoryID === cat.categoryID ? 'selected' : ''}>${cat.name}</option>`
                        ).join('')}
                    </select>
                </div>

                ${activeTab === 'ingredient' ? `
                    <!-- Beverage Types -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Beverage Types <span class="text-red-500">*</span>
                        </label>
                        <p class="text-xs text-gray-400 mb-2">Select which beverage types can use this ingredient</p>
                        <div class="flex flex-wrap gap-2">
                            ${beverageTypes.map(bevType => `
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="beverageType"
                                        value="${bevType}"
                                        ${formData.beverageTypes.includes(bevType) ? 'checked' : ''}
                                        class="w-4 h-4 rounded border-gray-600"
                                    />
                                    <span class="text-sm text-gray-300">${bevType}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Primary Required -->
                    <div>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                id="isPrimaryRequiredCheckbox"
                                ${formData.isPrimaryRequired ? 'checked' : ''}
                                class="w-4 h-4 rounded border-gray-600"
                            />
                            <span class="text-sm font-semibold text-gray-300">Primary Ingredient Required</span>
                        </label>
                        <p class="text-xs text-gray-400 mt-1 ml-6">
                            Check this if recipes must include at least one item of this type as a primary ingredient
                        </p>
                    </div>
                ` : ''}

                <!-- Active status -->
                <div>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            id="isActiveCheckbox"
                            ${formData.isActive ? 'checked' : ''}
                            class="w-4 h-4 rounded border-gray-600"
                        />
                        <span class="text-sm font-semibold text-gray-300">Active</span>
                    </label>
                    <p class="text-xs text-gray-400 mt-1 ml-6">
                        Inactive types are hidden from dropdown menus but existing items are preserved
                    </p>
                </div>

                <!-- Buttons -->
                <div class="flex gap-2 pt-2">
                    <button
                        onclick="window.brewcode.saveType('${activeTab}', ${typeID || 'null'})"
                        class="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Save
                    </button>
                    <button
                        onclick="window.brewcode.hideTypeForm('${activeTab}')"
                        class="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('typeFormContainer').innerHTML = formHtml;
}

/**
 * Hide type form
 */
function hideTypeForm(activeTab) {
    document.getElementById('typeFormContainer').innerHTML = '';
}

/**
 * Save type (create or update)
 */
function saveType(activeTab, typeID) {
    const name = document.getElementById('typeNameInput').value.trim();
    const categoryID = parseInt(document.getElementById('typeCategorySelect').value);
    const isActive = document.getElementById('isActiveCheckbox').checked ? 1 : 0;
    
    // Validation
    if (!name) {
        showToast('Please enter a type name', 'error');
        return;
    }
    if (!categoryID) {
        showToast('Please select a category', 'error');
        return;
    }
    
    const data = {
        name,
        categoryID,
        isActive
    };
    
    if (activeTab === 'ingredient') {
        const beverageTypeCheckboxes = document.querySelectorAll('input[name="beverageType"]:checked');
        const beverageTypes = Array.from(beverageTypeCheckboxes).map(cb => cb.value);
        
        if (beverageTypes.length === 0) {
            showToast('Please select at least one beverage type', 'error');
            return;
        }
        
        data.beverageTypes = JSON.stringify(beverageTypes);
        data.isPrimaryRequired = document.getElementById('isPrimaryRequiredCheckbox').checked ? 1 : 0;
    }
    
    try {
        if (typeID) {
            // Update existing type
            if (activeTab === 'ingredient') {
                BrewCodeInstance.ingredientType.update(typeID, data);
            } else {
                BrewCodeInstance.supplyType.update(typeID, data);
            }
            showToast('✓ Type updated successfully', 'success');
        } else {
            // Create new type
            if (activeTab === 'ingredient') {
                BrewCodeInstance.ingredientType.create(data);
            } else {
                BrewCodeInstance.supplyType.create(data);
            }
            showToast('✓ Type created successfully', 'success');
        }
        
        // Refresh the page
        showTypeManagement(BrewCodeInstance, activeTab);
    } catch (error) {
        showToast(`✗ Failed to save type: ${error.message}`, 'error');
    }
}

/**
 * Deactivate type (soft delete)
 */
function deleteType(activeTab, typeID) {
    if (!confirm('Are you sure you want to deactivate this type? It will be hidden but existing items will be preserved.')) {
        return;
    }
    
    try {
        if (activeTab === 'ingredient') {
            BrewCodeInstance.ingredientType.update(typeID, { isActive: 0 });
        } else {
            BrewCodeInstance.supplyType.update(typeID, { isActive: 0 });
        }
        showToast('✓ Type deactivated successfully', 'success');
        showTypeManagement(BrewCodeInstance, activeTab);
    } catch (error) {
        showToast(`✗ Failed to deactivate type: ${error.message}`, 'error');
    }
}

/**
 * Filter types based on search and category
 */
function filterTypes(activeTab) {
    const searchTerm = document.getElementById('typeSearchInput').value;
    const categoryFilter = document.getElementById('categoryFilterSelect')?.value || 'all';
    const sortOrder = document.getElementById('sortSelect')?.value || 'name-asc';
    const categories = BrewCodeInstance.query('SELECT * FROM itemCategories ORDER BY sortOrder');
    
    const types = activeTab === 'ingredient'
        ? BrewCodeInstance.ingredientType.getAll().filter(t => t.isActive)
        : BrewCodeInstance.supplyType.getAll().filter(t => t.isActive);
    
    const listHtml = renderTypesList(BrewCodeInstance, activeTab, types, categories, categoryFilter, searchTerm, sortOrder);
    document.getElementById('typesListContainer').innerHTML = listHtml;
    
    // Update summary
    const filteredTypes = types.filter(type => {
        const matchesSearch = !searchTerm || type.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || type.categoryID === parseInt(categoryFilter);
        return matchesSearch && matchesCategory;
    });
    
    document.getElementById('typesSummary').textContent = 
        `Showing ${filteredTypes.length} of ${types.length} ${activeTab} types`;
}

/**
 * Show subtype create/edit form
 */
function showSubtypeForm(ingredientTypeID, subtypeID) {
    const type = BrewCodeInstance.ingredientType.get(ingredientTypeID);
    
    if (!type) {
        showToast('Type not found', 'error');
        return;
    }
    
    let formData = {
        name: '',
        isActive: true
    };
    
    if (subtypeID) {
        const subtype = BrewCodeInstance.subtype.get(subtypeID);
        if (!subtype) {
            showToast('Subtype not found', 'error');
            return;
        }
        formData = {
            name: subtype.name,
            isActive: subtype.isActive === 1
        };
    }
    
    const formHtml = `
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="window.brewcode.hideSubtypeForm(event)">
            <div class="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-md w-full mx-4" onclick="event.stopPropagation()">
                <h4 class="text-lg font-semibold text-white mb-4">
                    ${subtypeID ? 'Edit' : 'Create'} Subtype for ${type.name}
                </h4>
                
                <div class="space-y-4">
                    <!-- Name -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Subtype Name <span class="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="subtypeNameInput"
                            value="${formData.name}"
                            placeholder="e.g., Wildflower, Merlot, Red Wine"
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
                        />
                    </div>

                    <!-- Active status -->
                    <div>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                id="subtypeIsActiveCheckbox"
                                ${formData.isActive ? 'checked' : ''}
                                class="w-4 h-4 rounded border-gray-600"
                            />
                            <span class="text-sm font-semibold text-gray-300">Active</span>
                        </label>
                    </div>

                    <!-- Buttons -->
                    <div class="flex gap-2 pt-2">
                        <button
                            onclick="window.brewcode.saveSubtype(${ingredientTypeID}, ${subtypeID || 'null'})"
                            class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Save
                        </button>
                        <button
                            onclick="window.brewcode.hideSubtypeForm()"
                            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        ${subtypeID ? `
                            <button
                                onclick="window.brewcode.deleteSubtype(${subtypeID})"
                                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('subtypeFormContainer').innerHTML = formHtml;
}

/**
 * Hide subtype form
 */
function hideSubtypeForm(event) {
    // Only close if clicking the backdrop or calling directly
    if (!event || event.target === event.currentTarget) {
        document.getElementById('subtypeFormContainer').innerHTML = '';
    }
}

/**
 * Save subtype (create or update)
 */
function saveSubtype(ingredientTypeID, subtypeID) {
    const name = document.getElementById('subtypeNameInput').value.trim();
    const isActive = document.getElementById('subtypeIsActiveCheckbox').checked ? 1 : 0;
    
    if (!name) {
        showToast('Please enter a subtype name', 'error');
        return;
    }
    
    const data = { name, isActive };
    
    try {
        if (subtypeID) {
            BrewCodeInstance.subtype.update(subtypeID, data);
            showToast('✓ Subtype updated successfully', 'success');
        } else {
            data.ingredientTypeID = ingredientTypeID;
            BrewCodeInstance.subtype.create(data);
            showToast('✓ Subtype created successfully', 'success');
        }
        
        hideSubtypeForm();
        showTypeManagement(BrewCodeInstance, 'ingredient'); // Refresh
    } catch (error) {
        showToast(`✗ Failed to save subtype: ${error.message}`, 'error');
    }
}

/**
 * Delete subtype
 */
function deleteSubtype(subtypeID) {
    if (!confirm('Are you sure you want to delete this subtype?')) {
        return;
    }
    
    try {
        BrewCodeInstance.subtype.setStatus(subtypeID, 0); // Soft delete
        showToast('✓ Subtype deleted successfully', 'success');
        hideSubtypeForm();
        showTypeManagement(BrewCodeInstance, 'ingredient'); // Refresh
    } catch (error) {
        showToast(`✗ Failed to delete subtype: ${error.message}`, 'error');
    }
}

export {
    showTypeManagement,
    showTypeForm,
    hideTypeForm,
    saveType,
    deleteType,
    filterTypes,
    showSubtypeForm,
    hideSubtypeForm,
    saveSubtype,
    deleteSubtype
};
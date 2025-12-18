// equipmentPage.js

import { getFormatters } from './formatHelpers.js';
import { convert } from './conversions.js';
import { renderResponsiveFilters, renderFilterDropdown, renderSearchInput } from './filterHelpers.js';

/**
 * Categorize equipment by type
 */
function categorizeEquipmentType(type) {
    const typeLower = type.toLowerCase();
    
    if (['vessel', 'bucket', 'carboy', 'keg', 'fermenter'].some(v => typeLower.includes(v))) {
        return 'vessel';
    } else if (['monitoring', 'tilt', 'inkbird', 'controller', 'monitor'].some(v => typeLower.includes(v))) {
        return 'monitoring';
    } else if (['lab', 'hydrometer', 'refractometer', 'ph meter', 'thermometer', 'scale'].some(v => typeLower.includes(v))) {
        return 'lab';
    } else {
        return 'other';
    }
}

/**
 * Sort equipment based on selected option
 */
function sortEquipment(equipment, sortBy) {
    const sorted = [...equipment];
    
    switch(sortBy) {
        case 'name-asc':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'name-desc':
            return sorted.sort((a, b) => b.name.localeCompare(a.name));
        case 'type':
            // Sort by type order: vessel, monitoring, lab, other
            const typeOrder = { 'vessel': 1, 'monitoring': 2, 'lab': 3, 'other': 4 };
            return sorted.sort((a, b) => {
                const catA = categorizeEquipmentType(a.type);
                const catB = categorizeEquipmentType(b.type);
                const orderDiff = typeOrder[catA] - typeOrder[catB];
                if (orderDiff !== 0) return orderDiff;
                // Within same type, sort by name
                return a.name.localeCompare(b.name);
            });
        default:
            return sorted;
    }
}

/**
 * Render equipment page
 * @param {Object} BrewCode - BrewCode API instance
 * @returns {string} HTML for equipment page
 */
function renderEquipmentPage(BrewCode) {
    const allEquipment = BrewCode.equipment.getAll();
    const settings = BrewCode.settings.get();
    const fmt = getFormatters(settings);

    // Categorize equipment
    const vessels = allEquipment.filter(e => categorizeEquipmentType(e.type) === 'vessel');
    const monitoring = allEquipment.filter(e => categorizeEquipmentType(e.type) === 'monitoring');
    const lab = allEquipment.filter(e => categorizeEquipmentType(e.type) === 'lab');
    const other = allEquipment.filter(e => categorizeEquipmentType(e.type) === 'other');

    // Count by status
    const activeEquipment = allEquipment.filter(e => e.isActive === 1);
    const inactiveEquipment = allEquipment.filter(e => e.isActive === 0);

    if (allEquipment.length === 0) {
        return `
            <div class="mb-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-3xl font-bold text-white">Equipment</h2>
                    <button 
                        onclick="window.brewcode.showAddEquipment()"
                        class="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        + Add Equipment
                    </button>
                </div>

                <!-- Equipment Stats (Empty State) -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                        <div class="text-2xl font-bold text-blue-400">0</div>
                        <div class="text-sm text-gray-400">Fermentation Vessels</div>
                    </div>
                    <div class="bg-green-900/20 border border-green-500 rounded-lg p-4">
                        <div class="text-2xl font-bold text-green-400">0</div>
                        <div class="text-sm text-gray-400">Monitoring Devices</div>
                    </div>
                    <div class="bg-purple-900/20 border border-purple-500 rounded-lg p-4">
                        <div class="text-2xl font-bold text-purple-400">0</div>
                        <div class="text-sm text-gray-400">Lab Equipment</div>
                    </div>
                    <div class="bg-gray-700/20 border border-gray-500 rounded-lg p-4">
                        <div class="text-2xl font-bold text-gray-400">0</div>
                        <div class="text-sm text-gray-400">Other</div>
                    </div>
                </div>

                <!-- Search Bar -->
                <div class="mb-6">
                    <input 
                        type="text"
                        id="equipmentSearch"
                        placeholder="Search equipment by name or type..."
                        disabled
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none opacity-50"
                    />
                </div>

                <!-- Filters and Sort (Disabled State) -->
                ${renderResponsiveFilters('equipmentFilters', `                                 
                    ${renderFilterDropdown({
                        id: 'equipmentSortBy',
                        label: 'Sort by',
                        onChange: 'window.brewcode.applyEquipmentFilters()',
                        options: [
                            { value: 'name-asc', label: 'Name, A-Z' },
                            { value: 'name-desc', label: 'Name, Z-A' },
                            { value: 'type', label: 'Type' }
                        ]
                    })}
                    
                    ${renderFilterDropdown({
                        id: 'equipmentStatusFilter',
                        label: 'Status',
                        onChange: 'window.brewcode.applyEquipmentFilters()',
                        options: [
                            { value: 'active', label: `Active (${activeEquipment.length})` },
                            { value: 'inactive', label: `Inactive (${inactiveEquipment.length})` },
                            { value: 'all', label: `All (${allEquipment.length})` }
                        ]
                    })}
                    
                    ${renderFilterDropdown({
                        id: 'equipmentTypeFilter',
                        label: 'Type',
                        onChange: 'window.brewcode.applyEquipmentFilters()',
                        options: [
                            { value: 'all', label: 'All Types' },
                            { value: 'vessel', label: `Vessels (${vessels.length})` },
                            { value: 'monitoring', label: `Monitoring (${monitoring.length})` },
                            { value: 'lab', label: `Lab (${lab.length})` },
                            { value: 'other', label: `Other (${other.length})` }
                        ]
                    })}
                `)}
            </div>

            <!-- Empty State Message -->
            <div class="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
                <div class="text-6xl mb-4">🔧</div>
                <h3 class="text-2xl font-bold text-white mb-2">No Equipment Yet</h3>
                <p class="text-gray-400 mb-6 max-w-md mx-auto">
                    Start tracking your brewing equipment like fermenters, hydrometers, and monitoring devices.
                </p>
                <button 
                    onclick="window.brewcode.showAddEquipment()"
                    class="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                    + Add Your First Equipment
                </button>
            </div>
        `;
    }

    return `
        <div class="mb-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold text-white">Equipment</h2>
                <button 
                    onclick="window.brewcode.showAddEquipment()"
                    class="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                    + Add Equipment
                </button>
            </div>

            <!-- Equipment Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-blue-400">${vessels.length}</div>
                    <div class="text-sm text-gray-400">Fermentation Vessels</div>
                </div>
                <div class="bg-green-900/20 border border-green-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-green-400">${monitoring.length}</div>
                    <div class="text-sm text-gray-400">Monitoring Devices</div>
                </div>
                <div class="bg-purple-900/20 border border-purple-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-purple-400">${lab.length}</div>
                    <div class="text-sm text-gray-400">Lab Equipment</div>
                </div>
                <div class="bg-gray-700/20 border border-gray-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-gray-400">${other.length}</div>
                    <div class="text-sm text-gray-400">Other</div>
                </div>
            </div>

            <!-- Search Bar -->
            <div class="mb-6">
                <input 
                    type="text"
                    id="equipmentSearch"
                    placeholder="Search equipment by name or type..."
                    onkeyup="window.brewcode.filterEquipmentBySearch()"
                    class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                />
            </div>

            <!-- Filters and Sort -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <!-- Sort By -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Sort by
                    </label>
                    <select 
                        id="equipmentSortBy"
                        onchange="window.brewcode.applyEquipmentFilters()"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    >
                        <option value="name-asc">Name, A-Z</option>
                        <option value="name-desc">Name, Z-A</option>
                        <option value="type">Type</option>
                    </select>
                </div>

                <!-- Status Filter -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Status
                    </label>
                    <select 
                        id="equipmentStatusFilter"
                        onchange="window.brewcode.applyEquipmentFilters()"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    >
                        <option value="active">Active (${activeEquipment.length})</option>
                        <option value="inactive">Inactive (${inactiveEquipment.length})</option>
                        <option value="all">All (${allEquipment.length})</option>
                    </select>
                </div>

                <!-- Type Filter -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Type
                    </label>
                    <select 
                        id="equipmentTypeFilter"
                        onchange="window.brewcode.applyEquipmentFilters()"
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                    >
                        <option value="all">All Types</option>
                        <option value="vessel">Fermentation Vessels (${vessels.length})</option>
                        <option value="monitoring">Monitoring Devices (${monitoring.length})</option>
                        <option value="lab">Lab Equipment (${lab.length})</option>
                        <option value="other">Other (${other.length})</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Equipment List -->
        <div class="space-y-4" id="equipmentList">
            ${allEquipment.map(equipment => renderEquipmentCard(equipment, fmt, settings)).join('')}
        </div>
    `;
}

/**
 * Render equipment card
 * @param {Object} equipment - Equipment object
 * @param {Object} fmt - Formatters object
 * @param {Object} settings - User settings
 * @returns {string} HTML for equipment card
 */
function renderEquipmentCard(equipment, fmt, settings) {
    const category = categorizeEquipmentType(equipment.type);
    
    const categoryColors = {
        'vessel': 'border-blue-500 bg-blue-900/10',
        'monitoring': 'border-green-500 bg-green-900/10',
        'lab': 'border-purple-500 bg-purple-900/10',
        'other': 'border-gray-500 bg-gray-700/10'
    };

    const categoryIcons = {
        'vessel': '🪣',
        'monitoring': '📊',
        'lab': '🔬',
        'other': '🔧'
    };

    const cardColor = categoryColors[category] || 'border-gray-500 bg-gray-800';
    const icon = categoryIcons[category] || '🔧';

    // Format calibration temperature if present
    let calibrationTempDisplay = null;
    if (equipment.calibrationTemp !== null && equipment.calibrationTemp !== undefined) {
        const tempUnit = equipment.calibrationTempUnit || 'c';
        
        // Convert to user's preferred unit
        if (tempUnit !== settings.temperatureUnit) {
            try {
                const converted = convert(
                    equipment.calibrationTemp, 
                    tempUnit, 
                    settings.temperatureUnit, 
                    'temperature'
                );
                calibrationTempDisplay = fmt.temperature(converted);
            } catch (error) {
                // Fallback to stored value if conversion fails
                calibrationTempDisplay = `${equipment.calibrationTemp}°${tempUnit.toUpperCase()}`;
            }
        } else {
            calibrationTempDisplay = fmt.temperature(equipment.calibrationTemp);
        }
    }

    return `
        <div 
            class="bg-gray-800 rounded-lg border ${cardColor} p-6 hover:shadow-lg transition-shadow"
            data-equipment-id="${equipment.equipmentID}"
            data-equipment-category="${category}"
            data-equipment-name="${equipment.name.toLowerCase()}"
            data-equipment-type="${equipment.type.toLowerCase()}"
            data-equipment-status="${equipment.isActive === 1 ? 'active' : 'inactive'}"
        >
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="text-3xl">${icon}</span>
                        <div>
                            <h3 class="text-xl font-bold text-white">${equipment.name}</h3>
                            <div class="text-sm text-gray-400">${equipment.type}</div>
                        </div>
                    </div>
                </div>
                
                <div class="flex gap-2">
                    <button 
                        onclick="window.brewcode.editEquipment(${equipment.equipmentID})"
                        class="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded transition-colors"
                    >
                        Edit
                    </button>
                </div>
            </div>

            <!-- Equipment Details -->
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                    <div class="text-gray-400">Status</div>
                    <div class="text-white font-medium">
                        ${equipment.isActive ? '✅ Active' : '❌ Inactive'}
                    </div>
                </div>                
                
                ${equipment.capacityL ? `
                    <div>
                        <div class="text-gray-400">Capacity</div>
                        <div class="text-white font-medium">${fmt.volume(equipment.capacityL)}</div>
                    </div>
                ` : ''}
                ${equipment.material ? `
                    <div>
                        <div class="text-gray-400">Material</div>
                        <div class="text-white font-medium">${equipment.material}</div>
                    </div>
                ` : ''}
                ${calibrationTempDisplay ? `
                    <div>
                        <div class="text-gray-400">Calibration</div>
                        <div class="text-white font-medium">${calibrationTempDisplay}</div>
                    </div>
                ` : ''}

            </div>

            ${equipment.notes ? `
                <div class="mt-4 pt-4 border-t border-gray-700">
                    <div class="text-xs text-gray-400 mb-1">Notes:</div>
                    <div class="text-sm text-gray-300">${equipment.notes}</div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Apply all filters and sorting to equipment list
 */
function applyEquipmentFilters() {
    const sortBy = document.getElementById('equipmentSortBy').value;
    const statusFilter = document.getElementById('equipmentStatusFilter').value;
    const typeFilter = document.getElementById('equipmentTypeFilter').value;
    const searchQuery = document.getElementById('equipmentSearch').value.toLowerCase();
    
    const cards = Array.from(document.querySelectorAll('[data-equipment-name]'));
    
    // First, filter cards based on criteria
    cards.forEach(card => {
        const category = card.dataset.equipmentCategory;
        const status = card.dataset.equipmentStatus;
        const name = card.dataset.equipmentName;
        const type = card.dataset.equipmentType;
        
        let visible = true;
        
        // Apply status filter
        if (statusFilter === 'active' && status !== 'active') visible = false;
        if (statusFilter === 'inactive' && status !== 'inactive') visible = false;
        
        // Apply type filter
        if (typeFilter !== 'all' && category !== typeFilter) visible = false;
        
        // Apply search filter
        if (searchQuery && !name.includes(searchQuery) && !type.includes(searchQuery)) {
            visible = false;
        }
        
        card.style.display = visible ? 'block' : 'none';
    });
    
    // Then, sort visible cards
    const visibleCards = cards.filter(card => card.style.display !== 'none');
    const parent = cards[0]?.parentElement;
    
    if (parent) {
        // Sort based on selected option
        visibleCards.sort((a, b) => {
            switch(sortBy) {
                case 'name-asc':
                    return a.dataset.equipmentName.localeCompare(b.dataset.equipmentName);
                case 'name-desc':
                    return b.dataset.equipmentName.localeCompare(a.dataset.equipmentName);
                case 'type':
                    const typeOrder = { 'vessel': 1, 'monitoring': 2, 'lab': 3, 'other': 4 };
                    const orderDiff = typeOrder[a.dataset.equipmentCategory] - typeOrder[b.dataset.equipmentCategory];
                    if (orderDiff !== 0) return orderDiff;
                    return a.dataset.equipmentName.localeCompare(b.dataset.equipmentName);
                default:
                    return 0;
            }
        });
        
        // Re-append in sorted order
        visibleCards.forEach(card => parent.appendChild(card));
    }
}

/**
 * Filter equipment by search query
 */
function filterEquipmentBySearch() {
    applyEquipmentFilters();
}

export { 
    renderEquipmentPage,
    filterEquipmentBySearch,
    applyEquipmentFilters
};
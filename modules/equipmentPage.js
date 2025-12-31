// equipmentPage.js

import { getFormatters } from './formatHelpers.js';
import { convert } from './conversions.js';
import { renderEmptyState } from './uiHelpers.js';
import { renderFilterDropdown, renderMultiSelectDropdown, toggleDropdown, handleMultiSelectAll } from './filterHelpers.js';

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
 * Render equipment stats section
 */
function renderEquipmentStats(vessels, monitoring, lab, other) {
    return `
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
    `;
}

/**
 * Check if vessel is available (not currently used in active batch)
 */
function isVesselAvailable(BrewCode, equipmentID) {
    try {
        // Check equipmentUsage table to see if equipment is currently in use
        const activeUsage = BrewCode.query(`
            SELECT COUNT(*) as count 
            FROM equipmentUsage eu
            INNER JOIN batchStages bs ON eu.batchStageID = bs.batchStageID
            INNER JOIN batches b ON bs.batchID = b.batchID
            WHERE eu.equipmentID = ? 
            AND eu.status = 'in-use'
            AND b.status IN ('planning', 'active')
            AND bs.status IN ('pending', 'active')
        `, [equipmentID]);
        
        return activeUsage[0].count === 0;
    } catch (error) {
        // If query fails, just return null to hide availability
        console.warn('Could not check vessel availability:', error);
        return null;
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

                ${renderEquipmentStats(vessels, monitoring, lab, other)}

                <!-- Search Bar (Disabled) -->
                <div class="mb-6">
                    <input 
                        type="text"
                        id="equipmentSearch"
                        placeholder="Search equipment by name or type..."
                        disabled
                        class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 opacity-50 cursor-not-allowed"
                    />
                </div>

                <!-- Filters (Disabled) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 opacity-50 pointer-events-none">
                    <div class="flex-shrink-0">
                        ${renderFilterDropdown({
                            id: 'equipmentSortBy',
                            label: '',
                            onChange: 'window.brewcode.applyEquipmentFilters()',
                            options: [
                                { value: 'name-asc', label: 'Name, A-Z' },
                                { value: 'name-desc', label: 'Name, Z-A' },
                                { value: 'type', label: 'Type' }
                            ]
                        })}
                    </div>
                    
                    ${renderMultiSelectDropdown({
                        id: 'equipmentTypeDropdown',
                        label: 'Type',
                        options: [
                            { value: 'vessel', label: 'Vessels (0)' },
                            { value: 'monitoring', label: 'Monitoring (0)' },
                            { value: 'lab', label: 'Lab (0)' },
                            { value: 'other', label: 'Other (0)' }
                        ],
                        onChange: 'window.brewcode.applyEquipmentFilters'
                    })}
                </div>
            </div>

            ${renderEmptyState({
                icon: '🔧',
                title: 'No Equipment Yet',
                description: 'Start tracking your brewing equipment like fermenters, hydrometers, and monitoring devices.',
                buttonLabel: '+ Add Your First Equipment',
                buttonAction: 'window.brewcode.showAddEquipment()'
            })}
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

            ${renderEquipmentStats(vessels, monitoring, lab, other)}

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
            <div class="flex flex-wrap gap-3 mb-6">
                ${renderFilterDropdown({
                    id: 'equipmentSortBy',
                    label: '',
                    onChange: 'window.brewcode.applyEquipmentFilters()',
                    options: [
                        { value: 'name-asc', label: 'Name, A-Z' },
                        { value: 'name-desc', label: 'Name, Z-A' },
                        { value: 'type', label: 'Type' }
                    ],
                    defaultValue: 'name-asc'
                })}
                
                ${renderMultiSelectDropdown({
                    id: 'equipmentTypeDropdown',
                    label: 'Type',
                    options: [
                        { value: 'vessel', label: `Vessels (${vessels.length})` },
                        { value: 'monitoring', label: `Monitoring (${monitoring.length})` },
                        { value: 'lab', label: `Lab (${lab.length})` },
                        { value: 'other', label: `Other (${other.length})` }
                    ],
                    onChange: 'window.brewcode.applyEquipmentFilters'
                })}
            </div>
        </div>

        <!-- Equipment List -->
        <div class="space-y-4" id="equipmentList">
            ${allEquipment.map(equipment => renderEquipmentCard(equipment, fmt, settings, BrewCode)).join('')}
        </div>
    `;
}

/**
 * Render equipment card
 * @param {Object} equipment - Equipment object
 * @param {Object} fmt - Formatters object
 * @param {Object} settings - User settings
 * @param {Object} BrewCode - BrewCode API instance
 * @returns {string} HTML for equipment card
 */
function renderEquipmentCard(equipment, fmt, settings, BrewCode) {
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

    // Check availability for vessels
    const isAvailable = category === 'vessel' ? isVesselAvailable(BrewCode, equipment.equipmentID) : null;

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
                ${category === 'vessel' && isAvailable !== null ? `
                    <div>
                        <div class="text-gray-400">Availability</div>
                        <div class="text-white font-medium">
                            ${isAvailable ? '✅ Available' : '🔒 In Use'}
                        </div>
                    </div>
                ` : ''}
                
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
    const searchQuery = document.getElementById('equipmentSearch')?.value.toLowerCase() || '';
    
    // Get selected values from multi-select dropdowns
    const typeCheckboxes = document.querySelectorAll('#equipmentTypeDropdown input[type="checkbox"]:checked');
    const selectedTypes = Array.from(typeCheckboxes).map(cb => cb.value);
    
    const cards = Array.from(document.querySelectorAll('[data-equipment-name]'));
    
    // First, filter cards based on criteria
    cards.forEach(card => {
        const category = card.dataset.equipmentCategory;
        const name = card.dataset.equipmentName;
        const type = card.dataset.equipmentType;
        
        let visible = true;
        
        // Apply type filter
        if (selectedTypes.length > 0 && !selectedTypes.includes('all')) {
            if (!selectedTypes.includes(category)) visible = false;
        }
        
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
    applyEquipmentFilters,
    toggleDropdown,
    handleMultiSelectAll
};
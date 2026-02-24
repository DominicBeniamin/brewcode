// equipmentForms.js

import BrewCode from './brewcode.js';
import { convert } from './conversions.js';
import { renderNavigation } from './navigation.js';
import { showToast } from './uiHelpers.js';
import { 
    INPUT_WIDTHS,
    renderCompactNumberField,
    renderCompactSelectField
} from './formHelpers.js';

/**
 * Show add equipment form
 */
function showAddEquipmentForm() {
    const settings = BrewCode.settings.get();
    
    const content = `
        <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 class="text-2xl font-semibold text-white mb-6">Add Equipment</h3>
            
            <form id="addEquipmentForm" class="space-y-6">
                <!-- Equipment Type -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Equipment Type <span class="text-red-500">*</span>
                    </label>
                    ${renderCompactSelectField({
                        id: 'equipmentType',
                        name: 'equipmentType',
                        label: '',
                        choices: [
                            { value: '', label: 'Select equipment type...' },
                            { value: 'vessel', label: 'Fermentation Vessel (Bucket, Carboy, Keg, etc)' },
                            { value: 'monitoring', label: 'Monitoring Device (TILT, Inkbird Controller, etc)' },
                            { value: 'lab', label: 'Lab Equipment (Hydrometer, Refractometer, pH Meter, etc)' },
                            { value: 'other', label: 'Other (Auto-siphon, corker, etc)' },
                            { value: 'custom', label: 'Custom (specify below)' }
                        ]
                    })}
                </div>

                <!-- Dynamic fields container (hidden until type selected) -->
                <div id="dynamicFields" class="space-y-6 hidden">
                    
                    <!-- Custom Type Name (only for custom) -->
                    <div id="customTypeContainer" class="hidden">
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Custom Type Name <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="text"
                            name="customTypeName"
                            id="customTypeName"
                            placeholder="e.g., Bottle Filler"
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                        />
                    </div>

                    <!-- Name -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Name <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="text"
                            name="name"
                            id="equipmentName"
                            required
                            placeholder="Select equipment type first"
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                        />
                        <p class="text-xs text-gray-500 mt-1">
                            Give this equipment a unique, descriptive name to identify it
                        </p>
                    </div>

                    <!-- Quantity -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Quantity <span class="text-red-500">*</span>
                        </label>
                        ${renderCompactNumberField({
                            id: 'quantity',
                            name: 'quantity',
                            label: '',
                            value: '1',
                            min: 1,
                            max: 99,
                            fieldType: INPUT_WIDTHS.SHORT,
                            required: true
                        })}
                    </div>

                    <!-- Capacity (only for vessels) -->
                    <div id="capacityContainer" class="hidden">
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Capacity <span class="text-red-500">*</span>
                        </label>
                        <div class="flex gap-2">
                            ${renderCompactNumberField({
                                id: 'capacityValue',
                                name: 'capacity',
                                label: '',
                                placeholder: '0.0',
                                step: '0.1',
                                min: 0.1,
                                fieldType: INPUT_WIDTHS.MEDIUM
                            })}
                            ${renderCompactSelectField({
                                id: 'capacityUnit',
                                name: 'capacityUnit',
                                label: '',
                                choices: [
                                    { value: 'l', label: 'Litres (L)' },
                                    { value: 'gal', label: 'US Gallons (gal)' },
                                    { value: 'imp-gal', label: 'Imperial Gallons (gal)' }
                                ]
                            })}
                        </div>
                    </div>

                    <!-- Material (only for vessels) -->
                    <div id="materialContainer" class="hidden">
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Material
                        </label>
                        ${renderCompactSelectField({
                            id: 'material',
                            name: 'material',
                            label: '',
                            choices: [
                                { value: '', label: 'Not specified' },
                                { value: 'Plastic', label: 'Plastic' },
                                { value: 'Glass', label: 'Glass' },
                                { value: 'Stainless Steel', label: 'Stainless Steel' }
                            ]
                        })}
                    </div>

                    <!-- Calibration Temperature (only for lab) -->
                    <div id="calibrationContainer" class="hidden">
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Calibration Temperature
                        </label>
                        <div class="flex gap-2">
                            ${renderCompactNumberField({
                                id: 'calibrationTemp',
                                name: 'calibrationTemp',
                                label: '',
                                placeholder: '--',
                                step: '0.1',
                                fieldType: INPUT_WIDTHS.SHORT
                            })}
                            ${renderCompactSelectField({
                                id: 'calibrationTempUnit',
                                name: 'calibrationTempUnit',
                                label: '',
                                choices: [
                                    { value: 'c', label: '°C' },
                                    { value: 'f', label: '°F' }
                                ]
                            })}
                        </div>
                        <p class="text-xs text-gray-500 mt-1">
                            Leave blank if not applicable or unknown
                        </p>
                    </div>

                    <!-- Notes -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Notes
                        </label>
                        <textarea 
                            name="notes"
                            rows="3"
                            placeholder="Maintenance notes, specifications, or other details..."
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none resize-none"
                        ></textarea>
                    </div>

                    <!-- Buttons -->
                    <div class="flex gap-4 pt-4">
                        <button 
                            type="submit"
                            class="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                        >
                            Add Equipment
                        </button>
                        
                        <button 
                            type="button"
                            onclick="window.brewcode.navigate('equipment')"
                            class="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
        </div>
    `;

    // Render content
    document.getElementById('app').innerHTML = `
        ${renderNavigation('equipment')}
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button 
                onclick="window.brewcode.navigate('equipment')"
                class="text-amber-400 hover:text-amber-300 mb-4 inline-block"
            >
                ← Back to Equipment
            </button>
            ${content}
        </div>
    `;

    // Attach handlers
    attachEquipmentFormHandlers('add');
}

/**
 * Show edit equipment form
 * @param {number} equipmentID - Equipment ID to edit
 */
function showEditEquipmentForm(equipmentID) {
    const equipment = BrewCode.equipment.get(equipmentID);
    const settings = BrewCode.settings.get();

    if (!equipment) {
        showToast('Equipment not found', 'error');
        window.brewcode.navigate('equipment');
        return;
    }

    // Determine equipment type category
    let equipmentType = 'other';
    const type = equipment.type.toLowerCase();
    if (['vessel', 'bucket', 'carboy', 'keg', 'fermenter'].some(v => type.includes(v))) {
        equipmentType = 'vessel';
    } else if (['monitoring', 'tilt', 'inkbird', 'controller', 'monitor'].some(v => type.includes(v))) {
        equipmentType = 'monitoring';
    } else if (['lab', 'hydrometer', 'refractometer', 'ph meter'].some(v => type.includes(v))) {
        equipmentType = 'lab';
    } else if (!['vessel', 'monitoring', 'lab', 'other'].includes(type)) {
        equipmentType = 'custom';
    }

    // Convert capacity to user's preferred unit
    let displayCapacity = equipment.capacityL;
    let displayCapacityUnit = 'l';
    if (equipment.capacityL) {
        if (settings.measurementSystem === 'us') {
            displayCapacity = convert(equipment.capacityL, 'l', 'gal', 'volume');
            displayCapacityUnit = 'gal';
        } else if (settings.measurementSystem === 'imperial') {
            displayCapacity = convert(equipment.capacityL, 'l', 'imp-gal', 'volume');
            displayCapacityUnit = 'imp-gal';
        }
    }

    const content = `
        <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 class="text-2xl font-semibold text-white mb-6">Edit Equipment</h3>
            
            <form id="editEquipmentForm" class="space-y-6">
                <!-- Equipment Type -->
                <div>
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                        Equipment Type <span class="text-red-500">*</span>
                    </label>
                    ${renderCompactSelectField({
                        id: 'equipmentType',
                        name: 'equipmentType',
                        label: '',
                        choices: [
                            { value: 'vessel', label: 'Fermentation Vessel' },
                            { value: 'monitoring', label: 'Monitoring Device' },
                            { value: 'lab', label: 'Lab Equipment' },
                            { value: 'other', label: 'Other' },
                            { value: 'custom', label: 'Custom' }
                        ],
                        value: equipmentType
                    })}
                </div>

                <!-- Dynamic fields container -->
                <div id="dynamicFields" class="space-y-6">
                    
                    <!-- Custom Type Name (only for custom) -->
                    <div id="customTypeContainer" class="${equipmentType === 'custom' ? '' : 'hidden'}">
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Custom Type Name <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="text"
                            name="customTypeName"
                            id="customTypeName"
                            value="${equipmentType === 'custom' ? equipment.type : ''}"
                            placeholder="e.g., Bottle Filler"
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                        />
                    </div>

                    <!-- Name -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Name <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="text"
                            name="name"
                            id="equipmentName"
                            required
                            value="${equipment.name}"
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                        />
                    </div>

                    <!-- Capacity (only for vessels) -->
                    <div id="capacityContainer" class="${equipmentType === 'vessel' ? '' : 'hidden'}">
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Capacity <span class="text-red-500">*</span>
                        </label>
                        <div class="flex gap-2">
                            ${renderCompactNumberField({
                                id: 'capacityValue',
                                name: 'capacity',
                                label: '',
                                placeholder: '0.0',
                                value: displayCapacity ? displayCapacity.toFixed(1) : '',
                                step: '0.1',
                                min: 0.1,
                                fieldType: INPUT_WIDTHS.MEDIUM
                            })}
                            ${renderCompactSelectField({
                                id: 'capacityUnit',
                                name: 'capacityUnit',
                                label: '',
                                choices: [
                                    { value: 'l', label: 'Litres (L)' },
                                    { value: 'gal', label: 'US Gallons (gal)' },
                                    { value: 'imp-gal', label: 'Imperial Gallons (gal)' }
                                ],
                                value: displayCapacityUnit
                            })}
                        </div>
                    </div>

                    <!-- Material (only for vessels) -->
                    <div id="materialContainer" class="${equipmentType === 'vessel' ? '' : 'hidden'}">
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Material
                        </label>
                        ${renderCompactSelectField({
                            id: 'material',
                            name: 'material',
                            label: '',
                            choices: [
                                { value: '', label: 'Not specified' },
                                { value: 'Plastic', label: 'Plastic' },
                                { value: 'Glass', label: 'Glass' },
                                { value: 'Stainless Steel', label: 'Stainless Steel' }
                            ],
                            value: equipment.material || ''
                        })}
                    </div>

                    <!-- Calibration Temperature (only for lab) -->
                    <div id="calibrationContainer" class="${equipmentType === 'lab' ? '' : 'hidden'}">
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Calibration Temperature
                        </label>
                        <div class="flex gap-2">
                            ${renderCompactNumberField({
                                id: 'calibrationTemp',
                                name: 'calibrationTemp',
                                label: '',
                                placeholder: '--',
                                value: equipment.calibrationTemp || '',
                                step: '0.1',
                                fieldType: INPUT_WIDTHS.SHORT
                            })}
                            ${renderCompactSelectField({
                                id: 'calibrationTempUnit',
                                name: 'calibrationTempUnit',
                                label: '',
                                choices: [
                                    { value: 'c', label: '°C' },
                                    { value: 'f', label: '°F' }
                                ],
                                value: equipment.calibrationTempUnit || 'c'
                            })}
                        </div>
                        <p class="text-xs text-gray-500 mt-1">
                            Leave blank if not applicable or unknown
                        </p>
                    </div>

                    <!-- Notes -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">
                            Notes
                        </label>
                        <textarea 
                            name="notes"
                            rows="3"
                            placeholder="Maintenance notes, specifications, or other details..."
                            class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none resize-none"
                        >${equipment.notes || ''}</textarea>
                    </div>

                    <!-- Buttons -->
                    <div class="flex gap-4 pt-4">
                        <button 
                            type="submit"
                            class="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                        >
                            Save Changes
                        </button>
                        
                        <button 
                            type="button"
                            onclick="window.brewcode.navigate('equipment')"
                            class="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
        </div>
    `;

    // Render content
    document.getElementById('app').innerHTML = `
        ${renderNavigation('equipment')}
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button 
                onclick="window.brewcode.navigate('equipment')"
                class="text-amber-400 hover:text-amber-300 mb-4 inline-block"
            >
                ← Back to Equipment
            </button>
            ${content}
        </div>
    `;

    // Attach handlers
    attachEquipmentFormHandlers('edit', equipmentID);
}

/**
 * Attach event handlers to equipment form
 * @param {string} mode - 'add' or 'edit'
 * @param {number} equipmentID - Equipment ID (for edit mode)
 */
function attachEquipmentFormHandlers(mode, equipmentID = null) {
    const form = document.getElementById(mode === 'add' ? 'addEquipmentForm' : 'editEquipmentForm');
    const typeSelect = document.getElementById('equipmentType');
    const dynamicFields = document.getElementById('dynamicFields');
    const customTypeContainer = document.getElementById('customTypeContainer');
    const nameInput = document.getElementById('equipmentName');
    const capacityContainer = document.getElementById('capacityContainer');
    const materialContainer = document.getElementById('materialContainer');
    const calibrationContainer = document.getElementById('calibrationContainer');
    const capacityValue = document.getElementById('capacityValue');

    // Dynamic placeholders based on equipment type
    const placeholders = {
        'vessel': 'e.g., Primary Fermenter #1',
        'monitoring': 'e.g., TILT Blue',
        'lab': 'e.g., Triple Scale Hydrometer',
        'other': 'e.g., Auto-Siphon',
        'custom': 'e.g., My Custom Equipment'
    };

    // Handle equipment type change
    typeSelect.addEventListener('change', function() {
        const selectedType = this.value;
        
        if (selectedType) {
            // Show dynamic fields (for add mode)
            if (mode === 'add') {
                dynamicFields.classList.remove('hidden');
            }
            
            // Update name placeholder
            nameInput.placeholder = placeholders[selectedType] || 'Enter equipment name';
            
            // Show/hide custom type name
            if (selectedType === 'custom') {
                customTypeContainer.classList.remove('hidden');
                document.getElementById('customTypeName').required = true;
            } else {
                customTypeContainer.classList.add('hidden');
                document.getElementById('customTypeName').required = false;
            }
            
            // Show/hide capacity and material (only for vessels)
            if (selectedType === 'vessel') {
                capacityContainer.classList.remove('hidden');
                materialContainer.classList.remove('hidden');
                capacityValue.required = true;
            } else {
                capacityContainer.classList.add('hidden');
                materialContainer.classList.add('hidden');
                capacityValue.required = false;
            }
            
            // Show/hide calibration (only for lab)
            if (selectedType === 'lab') {
                calibrationContainer.classList.remove('hidden');
            } else {
                calibrationContainer.classList.add('hidden');
            }
        } else {
            // Hide all dynamic fields
            dynamicFields.classList.add('hidden');
        }
    });

    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        
        // Determine the equipment type
        let equipmentType = formData.get('equipmentType');
        if (equipmentType === 'custom') {
            equipmentType = formData.get('customTypeName');
        }
        
        // Prepare base equipment data
        const equipmentData = {
            type: equipmentType,
            canBeOccupied: equipmentType === 'vessel' || equipmentType === 'monitoring' ? 1 : 0,
            notes: formData.get('notes') || null
        };

        // Add name (only for edit mode, add mode handles quantity differently)
        if (mode === 'edit') {
            equipmentData.name = formData.get('name');
        }

        // Add capacity if vessel (convert to liters for storage)
        if (equipmentType === 'vessel') {
            const capacity = parseFloat(formData.get('capacity'));
            const unit = formData.get('capacityUnit');
            
            if (capacity) {
                equipmentData.capacityL = unit === 'l' ? capacity : convert(capacity, unit, 'l', 'volume');
            }
            
            // Add material if specified
            const material = formData.get('material');
            if (material) {
                equipmentData.material = material;
            }
        }

        // Add calibration temp if lab equipment and value provided
        if (equipmentType === 'lab') {
            const calibTemp = formData.get('calibrationTemp');
            if (calibTemp && calibTemp.trim() !== '') {
                const tempValue = parseFloat(calibTemp);
                const tempUnit = formData.get('calibrationTempUnit');
                
                equipmentData.calibrationTemp = tempValue;
                equipmentData.calibrationTempUnit = tempUnit;
            }
        }

        try {
            if (mode === 'add') {
                // Add mode: create multiple items based on quantity
                const quantity = parseInt(formData.get('quantity'));
                const baseName = formData.get('name');
                
                for (let i = 0; i < quantity; i++) {
                    const itemName = quantity > 1 ? `${baseName} #${i + 1}` : baseName;
                    
                    BrewCode.equipment.create({
                        ...equipmentData,
                        name: itemName
                    });
                }

                showToast(`✓ Successfully added ${quantity} equipment item${quantity > 1 ? 's' : ''}`, 'success');
            } else {
                // Edit mode: update existing equipment
                BrewCode.equipment.update(equipmentID, equipmentData);
                showToast('✓ Equipment updated successfully', 'success');
            }
            
            // Navigate back to equipment list
            window.brewcode.navigate('equipment');
            
        } catch (error) {
            showToast(`Failed to ${mode} equipment: ${error.message}`, 'error');
        }
    });
}

export { 
    showAddEquipmentForm, 
    showEditEquipmentForm
};
// filterHelpers.js - Reusable filter UI components

/**
 * Toggle filter visibility (for mobile)
 * @param {string} filtersId - ID of filters container
 */
function toggleFilters(filtersId) {
    const filters = document.getElementById(filtersId);
    const icon = document.getElementById(`${filtersId}-icon`);
    
    if (filters && icon) {
        filters.classList.toggle('hidden');
        filters.classList.toggle('flex');
        icon.classList.toggle('rotate-180');
    }
}

/**
 * Toggle dropdown visibility and close others
 * @param {string} dropdownId - ID of dropdown to toggle
 */
function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    const allDropdowns = document.querySelectorAll('[id$="Dropdown"]');
    
    // Close all other dropdowns
    allDropdowns.forEach(dd => {
        if (dd.id !== dropdownId && !dd.classList.contains('hidden')) {
            dd.classList.add('hidden');
        }
    });
    
    // Toggle this dropdown
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

/**
 * Handle "All" checkbox logic in multi-select dropdowns
 * @param {Event} event - Change event from checkbox
 * @param {string} dropdownId - ID of the dropdown container
 * @param {Function} filterCallback - Callback function to apply filters
 */
function handleMultiSelectAll(event, dropdownId, filterCallback) {
    const checkbox = event.target;
    const dropdown = document.getElementById(dropdownId);
    const allCheckbox = dropdown.querySelector('input[value="all"]');
    const otherCheckboxes = Array.from(dropdown.querySelectorAll('input[type="checkbox"]:not([value="all"])'));
    
    if (checkbox.value === 'all') {
        // "All" was clicked
        if (checkbox.checked) {
            // Uncheck all others
            otherCheckboxes.forEach(cb => cb.checked = false);
        }
    } else {
        // Another option was clicked
        if (checkbox.checked && allCheckbox.checked) {
            // Uncheck "All" when selecting something specific
            allCheckbox.checked = false;
        }
        
        // If nothing is selected, re-check "All"
        const anySelected = otherCheckboxes.some(cb => cb.checked);
        if (!anySelected) {
            allCheckbox.checked = true;
        }
    }
    
    // Call the filter function
    if (filterCallback) {
        filterCallback();
    }
}

/**
 * Render responsive filter container with show/hide toggle
 * @param {string} filtersId - Unique ID for the filters container
 * @param {string} filtersContent - HTML content of the filters
 * @returns {string} HTML for responsive filter container
 */
function renderResponsiveFilters(filtersId, filtersContent) {
    return `
        <!-- Mobile Filter Toggle -->
        <div class="md:hidden mb-4">
            <button 
                onclick="window.brewcode.toggleFilters('${filtersId}')"
                class="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-between"
            >
                <span class="font-medium">Filters & Sorting</span>
                <svg id="${filtersId}-icon" class="w-5 h-5 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
        </div>

        <!-- Filters Container -->
        <div id="${filtersId}" class="hidden md:flex md:flex-wrap gap-4 mb-6">
            ${filtersContent}
        </div>
    `;
}

/**
 * Render a multi-select dropdown with checkboxes
 * @param {Object} config - Dropdown configuration
 * @param {string} config.id - Dropdown ID
 * @param {string} config.label - Button label
 * @param {Array} config.options - Array of {value, label} objects
 * @param {string} config.onChange - onChange handler function name
 * @param {boolean} config.includeAll - Include "All" option (default: true)
 * @returns {string} HTML for multi-select dropdown
 */
function renderMultiSelectDropdown(config) {
    const {
        id,
        label,
        options,
        onChange,
        includeAll = true
    } = config;

    const toggleFn = `window.brewcode.toggleDropdown('${id}')`;

    return `
        <div class="relative flex-shrink-0">
            <button 
                onclick="${toggleFn}"
                class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
                ${label} ▼
            </button>
            <div id="${id}" class="hidden absolute top-full left-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto whitespace-nowrap">
                ${includeAll ? `
                    <label class="block px-4 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700">
                        <input type="checkbox" value="all" onchange="window.brewcode.handleMultiSelectAll(event, '${id}', ${onChange})" class="mr-2" checked>
                        All
                    </label>
                ` : ''}
                ${options.map(opt => `
                    <label class="block px-4 py-2 hover:bg-gray-700 cursor-pointer">
                        <input type="checkbox" value="${opt.value}" onchange="window.brewcode.handleMultiSelectAll(event, '${id}', ${onChange})" class="mr-2">
                        ${opt.label}
                    </label>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Render a single-select filter dropdown
 * @param {Object} options - Filter options
 * @param {string} options.id - Filter ID
 * @param {string} options.label - Filter label
 * @param {string} options.onChange - onchange handler function call
 * @param {Array} options.options - Array of {value, label} objects
 * @param {string} [options.defaultValue] - Default selected value
 * @returns {string} HTML for filter dropdown
 */
function renderFilterDropdown(options) {
    const { id, label, onChange, options: filterOptions, defaultValue = '' } = options;
    
    // If no label, render as button-style dropdown to match multi-select
    if (!label || label === '') {
        return `
            <div class="relative inline-block">
                <select 
                    id="${id}"
                    onchange="${onChange}"
                    class="bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 py-2 pr-10 border border-gray-600 focus:border-amber-500 focus:outline-none appearance-none cursor-pointer"
                >
                    ${filterOptions.map(opt => `
                        <option value="${opt.value}" ${opt.value === defaultValue ? 'selected' : ''}>
                            ${opt.label}
                        </option>
                    `).join('')}
                </select>
                <svg class="absolute right-3 top-2.5 text-gray-400 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
        `;
    }
    
    // Original labeled style
    return `
        <div class="flex-shrink-0">
            <label class="block text-sm font-semibold text-gray-300 mb-2">
                ${label}
            </label>
            <select 
                id="${id}"
                onchange="${onChange}"
                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
            >
                ${filterOptions.map(opt => `
                    <option value="${opt.value}" ${opt.value === defaultValue ? 'selected' : ''}>
                        ${opt.label}
                    </option>
                `).join('')}
            </select>
        </div>
    `;
}

/**
 * Render a search input
 * @param {Object} options - Search options
 * @param {string} options.id - Input ID
 * @param {string} options.placeholder - Placeholder text
 * @param {string} options.onKeyup - onkeyup handler function call
 * @returns {string} HTML for search input
 */
function renderSearchInput(options) {
    const { id, placeholder, onKeyup } = options;
    
    return `
        <div class="flex-grow min-w-[200px]">
            <label class="block text-sm font-semibold text-gray-300 mb-2">
                Search
            </label>
            <input 
                type="text"
                id="${id}"
                placeholder="${placeholder}"
                onkeyup="${onKeyup}"
                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
            />
        </div>
    `;
}

/**
 * Apply multi-select filters to cards
 * @param {Object} config - Filter configuration
 * @param {string} config.searchInputId - Search input element ID
 * @param {Array<Object>} config.filters - Array of filter configs
 * @param {string} config.filters[].dropdownId - Dropdown element ID
 * @param {string} config.filters[].dataAttribute - Card data attribute to filter on
 * @param {Function} config.filters[].matchFn - Optional custom match function
 * @param {string} config.cardSelector - Selector for filterable cards
 */
function applyMultiSelectFilters(config) {
    const {
        searchInputId,
        filters,
        cardSelector = '[data-filterable]'
    } = config;

    // Get search text
    const searchText = searchInputId 
        ? document.getElementById(searchInputId)?.value.toLowerCase() || ''
        : '';

    // Get all cards
    const cards = document.querySelectorAll(cardSelector);

    cards.forEach(card => {
        let visible = true;

        // Apply search filter
        if (searchText && card.dataset.searchText) {
            if (!card.dataset.searchText.toLowerCase().includes(searchText)) {
                visible = false;
            }
        }

        // Apply each filter
        filters.forEach(filter => {
            if (!visible) return; // Skip if already hidden

            const checkboxes = document.querySelectorAll(`#${filter.dropdownId} input[type="checkbox"]:checked`);
            const selectedValues = Array.from(checkboxes).map(cb => cb.value);

            if (selectedValues.length > 0 && !selectedValues.includes('all')) {
                const cardValue = card.dataset[filter.dataAttribute];
                
                if (filter.matchFn) {
                    // Custom match function
                    if (!filter.matchFn(cardValue, selectedValues)) {
                        visible = false;
                    }
                } else {
                    // Default exact match
                    if (!selectedValues.includes(cardValue)) {
                        visible = false;
                    }
                }
            }
        });

        card.style.display = visible ? 'block' : 'none';
    });
}

export {
    toggleFilters,
    toggleDropdown,
    handleMultiSelectAll,
    renderResponsiveFilters,
    renderMultiSelectDropdown,
    renderFilterDropdown,
    renderSearchInput,
    applyMultiSelectFilters
};
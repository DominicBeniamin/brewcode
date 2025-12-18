// filterHelpers.js - Reusable filter UI components

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
 * Render a single filter dropdown with auto-width
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
    
    return `
        <div class="flex-shrink-0">
            <label class="block text-sm font-semibold text-gray-300 mb-2">
                ${label}
            </label>
            <select 
                id="${id}"
                onchange="${onChange}"
                class="bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none w-auto"
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
 * Render a search input with auto-width
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
 * Toggle filter visibility (for mobile)
 * @param {string} filtersId - ID of filters container
 */
function toggleFilters(filtersId) {
    const filters = document.getElementById(filtersId);
    const icon = document.getElementById(`${filtersId}-icon`);
    
    if (filters && icon) {
        filters.classList.toggle('hidden');
        icon.classList.toggle('rotate-180');
    }
}

export {
    renderResponsiveFilters,
    renderFilterDropdown,
    renderSearchInput,
    toggleFilters
};
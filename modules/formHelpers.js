// ============================================================================
// formHelpers.js - Reusable form components and utilities
// ============================================================================

/**
 * Render a modal wrapper for forms
 * @param {string} title - Modal title
 * @param {string} content - Form HTML content
 * @param {string} modalId - Unique modal ID
 * @returns {string} HTML for modal
 */
function renderModal(title, content, modalId = 'formModal') {
    return `
        <div id="${modalId}" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div class="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <!-- Header -->
                <div class="flex justify-between items-center p-6 border-b border-gray-700">
                    <h2 class="text-2xl font-bold text-white">${title}</h2>
                    <button 
                        onclick="window.brewcode.closeModal('${modalId}')"
                        class="text-gray-400 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>
                
                <!-- Content -->
                <div class="p-6">
                    ${content}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render a text input field
 * @param {Object} options - Field options
 * @returns {string} HTML for input field
 */
function renderTextField(options) {
    const {
        id,
        name,
        label,
        placeholder = '',
        required = false,
        value = '',
        helpText = '',
        type = 'text'
    } = options;

    return `
        <div class="mb-4">
            <label for="${id}" class="block text-sm font-semibold text-gray-300 mb-2">
                ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
            </label>
            <input 
                type="${type}"
                id="${id}"
                name="${name}"
                value="${value}"
                placeholder="${placeholder}"
                ${required ? 'required' : ''}
                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
            />
            ${helpText ? `<p class="text-xs text-gray-500 mt-1">${helpText}</p>` : ''}
        </div>
    `;
}

/**
 * Render a number input field
 * @param {Object} options - Field options
 * @returns {string} HTML for input field
 */
function renderNumberField(options) {
    const {
        id,
        name,
        label,
        placeholder = '',
        required = false,
        value = '',
        min = null,
        max = null,
        step = 'any',
        helpText = ''
    } = options;

    return `
        <div class="mb-4">
            <label for="${id}" class="block text-sm font-semibold text-gray-300 mb-2">
                ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
            </label>
            <input 
                type="number"
                id="${id}"
                name="${name}"
                value="${value}"
                placeholder="${placeholder}"
                ${required ? 'required' : ''}
                ${min !== null ? `min="${min}"` : ''}
                ${max !== null ? `max="${max}"` : ''}
                step="${step}"
                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
            />
            ${helpText ? `<p class="text-xs text-gray-500 mt-1">${helpText}</p>` : ''}
        </div>
    `;
}

/**
 * Render a select dropdown field
 * @param {Object} options - Field options
 * @returns {string} HTML for select field
 */
function renderSelectField(options) {
    const {
        id,
        name,
        label,
        required = false,
        value = '',
        choices = [],
        helpText = ''
    } = options;

    return `
        <div class="mb-4">
            <label for="${id}" class="block text-sm font-semibold text-gray-300 mb-2">
                ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
            </label>
            <select 
                id="${id}"
                name="${name}"
                ${required ? 'required' : ''}
                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
            >
                <option value="">-- Select --</option>
                ${choices.map(choice => `
                    <option value="${choice.value}" ${value === choice.value ? 'selected' : ''}>
                        ${choice.label}
                    </option>
                `).join('')}
            </select>
            ${helpText ? `<p class="text-xs text-gray-500 mt-1">${helpText}</p>` : ''}
        </div>
    `;
}

/**
 * Render a date input field
 * @param {Object} options - Field options
 * @returns {string} HTML for date field
 */
function renderDateField(options) {
    const {
        id,
        name,
        label,
        required = false,
        value = '',
        helpText = ''
    } = options;

    return `
        <div class="mb-4">
            <label for="${id}" class="block text-sm font-semibold text-gray-300 mb-2">
                ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
            </label>
            <input 
                type="date"
                id="${id}"
                name="${name}"
                value="${value}"
                ${required ? 'required' : ''}
                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
            />
            ${helpText ? `<p class="text-xs text-gray-500 mt-1">${helpText}</p>` : ''}
        </div>
    `;
}

/**
 * Render a textarea field
 * @param {Object} options - Field options
 * @returns {string} HTML for textarea field
 */
function renderTextareaField(options) {
    const {
        id,
        name,
        label,
        placeholder = '',
        required = false,
        value = '',
        rows = 4,
        helpText = ''
    } = options;

    return `
        <div class="mb-4">
            <label for="${id}" class="block text-sm font-semibold text-gray-300 mb-2">
                ${label} ${required ? '<span class="text-red-500">*</span>' : ''}
            </label>
            <textarea 
                id="${id}"
                name="${name}"
                placeholder="${placeholder}"
                ${required ? 'required' : ''}
                rows="${rows}"
                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
            >${value}</textarea>
            ${helpText ? `<p class="text-xs text-gray-500 mt-1">${helpText}</p>` : ''}
        </div>
    `;
}

/**
 * Render form buttons
 * @param {Object} options - Button options
 * @returns {string} HTML for buttons
 */
function renderFormButtons(options = {}) {
    const {
        submitLabel = 'Submit',
        cancelLabel = 'Cancel',
        onCancel = "window.brewcode.closeModal('formModal')",
        submitId = 'submitBtn'
    } = options;

    return `
        <div class="flex gap-4 pt-4">
            <button 
                type="submit"
                id="${submitId}"
                class="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
                ${submitLabel}
            </button>
            <button 
                type="button"
                onclick="${onCancel}"
                class="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors"
            >
                ${cancelLabel}
            </button>
        </div>
    `;
}

/**
 * Close a modal
 * @param {string} modalId - Modal ID to close
 */
function closeModal(modalId = 'formModal') {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

export {
    renderModal,
    renderTextField,
    renderNumberField,
    renderSelectField,
    renderDateField,
    renderTextareaField,
    renderFormButtons,
    closeModal,
    getTodayDate
};
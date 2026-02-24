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
        type = 'text',
        disabled = false
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
                ${disabled ? 'disabled' : ''}
                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none ${disabled ? 'disabled:bg-gray-600 disabled:cursor-not-allowed' : ''}"
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
        helpText = '',
        disabled = false
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
                ${disabled ? 'disabled' : ''}
                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none ${disabled ? 'disabled:bg-gray-600 disabled:cursor-not-allowed' : ''}"
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
        helpText = '',
        disabled = false
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
                ${disabled ? 'disabled' : ''}
                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none ${disabled ? 'disabled:bg-gray-600 disabled:cursor-not-allowed' : ''}"
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
        helpText = '',
        disabled = false
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
                ${disabled ? 'disabled' : ''}
                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none ${disabled ? 'disabled:bg-gray-600 disabled:cursor-not-allowed' : ''}"
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

// ============================================================================
// INPUT FIELD WIDTH STANDARDS
// ============================================================================

/**
 * Standard Tailwind width classes for form inputs based on expected content
 */
const INPUT_WIDTHS = {
    // Numeric inputs
    TINY: 'w-16',           // Single digit (0-9)
    SHORT: 'w-20',          // Small numbers, temperatures (0-100)
    MEDIUM: 'w-24',         // Medium numbers, volumes (0-1000)
    STANDARD: 'w-32',       // Standard numbers, gravity readings (1.000-1.100)
    LONG: 'w-40',           // Longer numbers or text
    
    // Result displays
    RESULT_COMPACT: 'min-w-[80px]',
    RESULT_STANDARD: 'min-w-[120px]',
    RESULT_WIDE: 'min-w-[150px]',
    
    // Full width
    FULL: 'w-full'
};

/**
 * Get appropriate input width class based on field type
 * @param {string} fieldType - Type of field (temperature, gravity, volume, etc.)
 * @returns {string} Tailwind width class
 */
function getInputWidth(fieldType) {
    const widthMap = {
        'temperature': INPUT_WIDTHS.SHORT,
        'gravity': INPUT_WIDTHS.STANDARD,
        'density': INPUT_WIDTHS.STANDARD,
        'volume': INPUT_WIDTHS.MEDIUM,
        'mass': INPUT_WIDTHS.MEDIUM,
        'percentage': INPUT_WIDTHS.SHORT,
        'days': INPUT_WIDTHS.SHORT,
        'count': INPUT_WIDTHS.SHORT,
        'co2': INPUT_WIDTHS.SHORT,
        'text': INPUT_WIDTHS.FULL,
        'textarea': INPUT_WIDTHS.FULL
    };
    
    return widthMap[fieldType] || INPUT_WIDTHS.STANDARD;
}

/**
 * Render a compact number input field (for calculators/tools)
 * @param {Object} options - Field options
 * @returns {string} HTML for compact input field
 */
function renderCompactNumberField(options) {
    const {
        id,
        name = null,
        label,
        placeholder = '',
        value = '',
        step = 'any',
        fieldType = 'standard',
        onInput = null,
        onChange = null,
        disabled = false,
        min = null,
        max = null,
        required = false
    } = options;

    const width = typeof fieldType === 'string' ? getInputWidth(fieldType) : fieldType;

    return `
        <div>
            <label class="block text-sm font-medium text-gray-400 mb-2">${label}</label>
            <input 
                type="number"
                id="${id}"
                ${name ? `name="${name}"` : ''}
                step="${step}"
                placeholder="${placeholder}"
                value="${value}"
                ${onInput ? `oninput="${onInput}"` : ''}
                ${onChange ? `onchange="${onChange}"` : ''}
                ${disabled ? 'disabled' : ''}
                ${min !== null ? `min="${min}"` : ''}
                ${max !== null ? `max="${max}"` : ''}
                ${required ? 'required' : ''}
                class="${width} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none ${disabled ? 'disabled:bg-gray-600 disabled:cursor-not-allowed' : ''}"
            />
        </div>
    `;
}

/**
 * Render a compact select field (for calculators/tools)
 * @param {Object} options - Field options
 * @returns {string} HTML for compact select field
 */
function renderCompactSelectField(options) {
    const {
        id,
        name = null,
        label,
        choices = [],
        value = '',
        onChange = null,
        width = 'auto',
        disabled = false
    } = options;

    return `
        <div>
            <label class="block text-sm font-medium text-gray-400 mb-2">${label}</label>
            <select 
                id="${id}"
                ${name ? `name="${name}"` : ''}
                ${onChange ? `onchange="${onChange}"` : ''}
                ${disabled ? 'disabled' : ''}
                class="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none ${width !== 'auto' ? width : ''} ${disabled ? 'disabled:bg-gray-600 disabled:cursor-not-allowed' : ''}"
            >
                ${choices.map(choice => `
                    <option value="${choice.value}" ${value === choice.value ? 'selected' : ''}>
                        ${choice.label}
                    </option>
                `).join('')}
            </select>
        </div>
    `;
}

/**
 * Render a result display field with optional copy button
 * @param {Object} options - Field options
 * @returns {string} HTML for result display
 */
function renderResultDisplay(options) {
    const {
        id,
        label,
        width = INPUT_WIDTHS.RESULT_STANDARD,
        copyable = false,
        inline = false
    } = options;

    if (inline) {
        return `
            <div class="flex gap-2 items-center">
                <div id="${id}" class="bg-gray-900 text-green-400 font-mono rounded-lg px-3 py-2 border border-gray-600 ${width}">
                    —
                </div>
                ${copyable ? `
                    <button 
                        onclick="window.brewcode.copyToClipboard('${id}')"
                        class="text-gray-500 hover:text-gray-300 text-sm"
                        title="Copy to clipboard"
                    >
                        📋
                    </button>
                ` : ''}
            </div>
        `;
    }

    return `
        <div>
            <label class="block text-sm font-medium text-gray-400 mb-2">${label}</label>
            <div class="relative">
                <div id="${id}" class="bg-gray-900 text-green-400 font-mono rounded-lg px-3 py-2 border border-gray-600 inline-block ${width}">
                    —
                </div>
                ${copyable ? `
                    <button 
                        onclick="window.brewcode.copyToClipboard('${id}')"
                        class="ml-2 text-gray-500 hover:text-gray-300 text-sm"
                        title="Copy to clipboard"
                    >
                        📋
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Copy text to clipboard from element
 * @param {string} elementId - ID of element to copy from
 */
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    // Check if clipboard API is available
    if (!navigator.clipboard) {
        // Fallback for non-HTTPS or unsupported browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            const originalText = element.textContent;
            element.textContent = '✓ Copied!';
            setTimeout(() => {
                element.textContent = originalText;
            }, 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
            alert('Failed to copy to clipboard');
        }
        document.body.removeChild(textArea);
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        const originalText = element.textContent;
        element.textContent = '✓ Copied!';
        setTimeout(() => {
            element.textContent = originalText;
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    });
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
    getTodayDate,
    INPUT_WIDTHS,
    getInputWidth,
    renderCompactNumberField,
    renderCompactSelectField,
    renderResultDisplay,
    copyToClipboard
};
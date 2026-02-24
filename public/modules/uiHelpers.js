// ============================================================================
// uiHelpers.js - UI utilities and notifications
// ============================================================================

/**
 * Show a toast notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type: 'success', 'error', 'info'
 * @param {number} duration - Duration in ms (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    const colors = {
        success: 'bg-green-900/90 border-green-500 text-green-200',
        error: 'bg-red-900/90 border-red-500 text-red-200',
        info: 'bg-blue-900/90 border-blue-500 text-blue-200'
    };

    const icons = {
        success: '✓',
        error: '✗',
        info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 ${colors[type]} border px-6 py-4 rounded-lg shadow-lg z-50 animate-fade-in`;
    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <span class="text-2xl">${icons[type]}</span>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('animate-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Show loading screen
 * @param {string} message - Loading message
 */
function showLoadingScreen(message) {
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex items-center justify-center">
            <div class="text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-4 border-amber-500 border-t-transparent mx-auto mb-4"></div>
                <p class="text-gray-400">${message}</p>
            </div>
        </div>
    `;
}

/**
 * Show error screen
 * @param {string} title - Error title
 * @param {Error} error - Error object
 */
function showError(title, error) {
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex items-center justify-center p-4">
            <div class="max-w-2xl w-full">
                <div class="bg-red-900/20 border border-red-500 rounded-lg p-8">
                    <h2 class="text-2xl font-bold text-red-500 mb-4">${title}</h2>
                    <p class="text-gray-300 mb-4">${error.message}</p>
                    <button 
                        onclick="window.brewcode.showWelcomeScreen()"
                        class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg transition-colors"
                    >
                        ← Try Again
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render empty state
 * @param {Object} config - Empty state configuration
 * @param {string} config.icon - Emoji icon
 * @param {string} config.title - Title text
 * @param {string} config.description - Description text
 * @param {string} config.buttonLabel - Button label
 * @param {string} config.buttonAction - Button onclick handler
 * @returns {string} HTML for empty state
 */
function renderEmptyState(config) {
    const {
        icon = '📦',
        title = 'No Items Yet',
        description = 'Get started by adding your first item.',
        buttonLabel = '+ Add Item',
        buttonAction = ''
    } = config;

    return `
        <div class="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <div class="text-6xl mb-4">${icon}</div>
            <h3 class="text-2xl font-bold text-white mb-2">${title}</h3>
            <p class="text-gray-400 mb-6 max-w-md mx-auto">
                ${description}
            </p>
            ${buttonAction ? `
                <button 
                    onclick="${buttonAction}"
                    class="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                    ${buttonLabel}
                </button>
            ` : ''}
        </div>
    `;
}

export {
    showToast,
    showLoadingScreen,
    showError,
    renderEmptyState
};
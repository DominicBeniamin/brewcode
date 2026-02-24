// navigation.js

/**
 * Render navigation bar
 * @param {string} currentPage - Currently active page
 * @param {boolean} hasUnsavedChanges - Whether there are unsaved changes
 * @returns {string} HTML for navigation
 */
function renderNavigation(currentPage = 'dashboard', hasUnsavedChanges = false) {
    const pages = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'batches', label: 'Batches', icon: '🍺' },
        { id: 'recipes', label: 'Recipes', icon: '📖' },
        { id: 'inventory', label: 'Inventory', icon: '📦' },
        { id: 'equipment', label: 'Equipment', icon: '🔧' },
        { id: 'tools', label: 'Brew\u00A0Tools', icon: '🔢' },
        { id: 'settings', label: 'Settings', icon: '⚙️' }
    ];

    return `
        <nav class="bg-gray-800 border-b border-gray-700">
            <div class="w-full px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                    <!-- Logo -->
                    <div class="flex items-center">
                        <h1 class="text-2xl font-bold text-amber-500">{\u00A0Brewcode\u00A0}</h1>
                    </div>

                    <!-- Desktop Navigation -->
                    <div class="hidden lg:block">
                        <div class="flex items-baseline space-x-4">
                            ${pages.map(page => `
                                <button
                                    onclick="window.brewcode.navigate('${page.id}')"
                                    class="${currentPage === page.id 
                                        ? 'bg-gray-900 text-white' 
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    } px-3 py-2 rounded-md text-xs font-medium transition-colors relative flex flex-col items-center"
                                >
                                    <span class="text-xl">${page.icon}</span>
                                    <span>${page.label}</span>
                                    ${page.id === 'settings' && hasUnsavedChanges ? `
                                        <span class="absolute top-1 right-1 flex h-2 w-2">
                                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                            <span class="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                                        </span>
                                    ` : ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Mobile menu button -->
                    <div class="lg:hidden">
                        <button 
                            onclick="window.brewcode.toggleMobileMenu()"
                            class="text-gray-400 hover:text-white focus:outline-none relative"
                        >
                            ${hasUnsavedChanges ? `
                                <span class="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                    <span class="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                                </span>
                            ` : ''}
                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Mobile menu (hidden by default) -->
            <div id="mobileMenu" class="hidden">
                <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    ${pages.map(page => `
                        <button
                            onclick="window.brewcode.navigate('${page.id}')"
                            class="${currentPage === page.id 
                                ? 'bg-gray-900 text-white' 
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            } block w-full text-left px-3 py-2 rounded-md text-base font-medium relative"
                        >
                            ${page.icon} ${page.label}
                            ${page.id === 'settings' && hasUnsavedChanges ? `
                                <span class="absolute top-2 right-2 flex h-2 w-2">
                                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                    <span class="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                                </span>
                            ` : ''}
                        </button>
                    `).join('')}
                </div>
            </div>
        </nav>
    `;
}

/**
 * Toggle mobile menu visibility
 */
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

/**
 * Render page with navigation
 * @param {string} pageId - Page to render
 * @param {string} content - Page content HTML
 * @returns {string} Complete page HTML with navigation
 */
function renderPageWithNav(pageId, content) {
    return `
        ${renderNavigation(pageId)}
        <div class="w-full px-4 sm:px-6 lg:px-8 py-8">
            ${content}
        </div>
    `;
}

export { 
    renderNavigation, 
    toggleMobileMenu, 
    renderPageWithNav 
};
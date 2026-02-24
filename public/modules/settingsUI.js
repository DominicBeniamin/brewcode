// settingsUI.js

import { 
    renderCompactSelectField,
    renderCompactNumberField
} from './formHelpers.js';
import { showToast } from './uiHelpers.js';

/**
 * Render settings page with save section
 * @param {Object} BrewCode - BrewCode API instance
 * @param {Object} sessionState - Session state object
 * @returns {string} HTML for settings page
 */
function renderSettingsPage(BrewCode, sessionState = null) {
    const settings = BrewCode.settings.get();
    
    // Build save section if sessionState provided
    let saveSection = '';
    if (sessionState) {
        const modifiedText = sessionState.hasUnsavedChanges ? 
            '<span class="text-yellow-400">⚠️ You have unsaved changes</span>' : 
            '<span class="text-green-400">✓ All changes saved</span>';
        
        const lastSavedText = sessionState.lastSaveTime ? 
            `Last saved: ${new Date(sessionState.lastSaveTime).toLocaleString()}` : 
            'Never saved';

        saveSection = `
            <!-- Save Database Section -->
            <div class="bg-gray-800 rounded-lg border border-amber-500 p-6 mb-6">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h2 class="text-xl font-semibold text-white mb-2">💾 Database</h2>
                        <p class="text-sm text-gray-400">
                            Current file: <span class="text-amber-400">${sessionState.currentFilename || 'brewcode.db'}</span>
                        </p>
                        <p class="text-xs text-gray-500 mt-1">${lastSavedText}</p>
                    </div>
                    <div class="text-right">
                        ${modifiedText}
                    </div>
                </div>
                
                <div class="flex gap-3">
                    <button 
                        onclick="window.brewcode.saveDatabase()"
                        class="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors flex items-center gap-2"
                        ${!sessionState.hasUnsavedChanges ? 'disabled' : ''}
                    >
                        💾 Save Database
                    </button>
                    
                    <button 
                        onclick="window.brewcode.loadNewDatabase()"
                        class="bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
                        title="Load a different database file"
                    >
                        📂
                    </button>
                </div>
                
                <p class="text-xs text-gray-500 mt-3">
                    💡 <strong>Tip:</strong> Keep your database file in a cloud folder (Dropbox, Google Drive, iCloud) to sync across devices.
                    Remember to save before closing!
                </p>
            </div>
        `;
    }
    
    return `
        <div class="min-h-screen bg-gray-900 p-8">
            <div class="max-w-3xl mx-auto">
                <!-- Header -->
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-amber-500 mb-2">⚙️ Settings</h1>
                    <p class="text-gray-400">Customize your Brewcode experience</p>
                </div>

                ${saveSection}

                <!-- Settings Form -->
                <div class="bg-gray-800 rounded-lg border border-gray-700 p-8">
                    <h2 class="text-xl font-semibold text-white mb-6">Preferences</h2>
                    
                    <form id="settingsForm">
                        
                        <!-- Measurement Units Section -->
                        <div class="flex flex-wrap gap-6 mb-6">
                            
                            <!-- Measurement System -->
                            <div>
                                <label class="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
                                    Measurement System
                                </label>
                                ${renderCompactSelectField({
                                    id: 'measurementSystem',
                                    name: 'measurementSystem',
                                    label: '',
                                    choices: [
                                        { value: 'metric', label: 'Metric (kg, L, cm)' },
                                        { value: 'imperial', label: 'Imperial (lb, gal, in)' },
                                        { value: 'us', label: 'US Customary (lb, gal, in)' }
                                    ],
                                    value: settings.measurementSystem
                                })}
                                <p class="text-xs text-gray-500 mt-1">Weight, volume, length</p>
                            </div>

                            <!-- Temperature Unit -->
                            <div>
                                <label class="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
                                    Temperature Unit
                                </label>
                                ${renderCompactSelectField({
                                    id: 'temperatureUnit',
                                    name: 'temperatureUnit',
                                    label: '',
                                    choices: [
                                        { value: 'c', label: 'Celsius (°C)' },
                                        { value: 'f', label: 'Fahrenheit (°F)' }
                                    ],
                                    value: settings.temperatureUnit
                                })}
                            </div>

                            <!-- Density Unit -->
                            <div>
                                <label class="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
                                    Density/Gravity Unit
                                </label>
                                ${renderCompactSelectField({
                                    id: 'densityUnit',
                                    name: 'densityUnit',
                                    label: '',
                                    choices: [
                                        { value: 'sg', label: 'Specific Gravity (SG)' },
                                        { value: 'brix', label: 'Brix (°Bx)' },
                                        { value: 'plato', label: 'Plato (°P)' },
                                        { value: 'oe', label: 'Oechsle (°Oe)' }
                                    ],
                                    value: settings.densityUnit
                                })}
                                <p class="text-xs text-gray-500 mt-1">Sugar content</p>
                            </div>

                            <!-- ABV Method -->
                            <div>
                                <label class="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
                                    ABV Calculation Method
                                </label>
                                ${renderCompactSelectField({
                                    id: 'abvMethodSelect',
                                    name: 'abvMethod',
                                    label: '',
                                    choices: [
                                        { value: 'abv-basic', label: 'Basic' },
                                        { value: 'abv-berry', label: 'Berry' },
                                        { value: 'abv-hall', label: 'Hall' },
                                        { value: 'abv-hmrc', label: 'HMRC' }
                                    ],
                                    value: settings.abvMethod
                                })}
                                <p id="abvMethodDescription" class="text-xs text-gray-400 mt-2 leading-relaxed max-w-md"></p>
                            </div>
                        
                        </div>

                        <!-- Display Formats Section -->
                        <div class="flex flex-wrap gap-6 mb-6">

                            <!-- Date Format -->
                            <div>
                                <label class="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
                                    Date Format
                                </label>
                                ${renderCompactSelectField({
                                    id: 'dateFormat',
                                    name: 'dateFormat',
                                    label: '',
                                    choices: [
                                        { value: 'iso', label: 'ISO 8601 (YYYY-MM-DD)' },
                                        { value: 'us', label: 'US (MM/DD/YYYY)' },
                                        { value: 'uk', label: 'UK/Europe (DD/MM/YYYY)' }
                                    ],
                                    value: settings.dateFormat
                                })}
                            </div>

                            <!-- Time Format -->
                            <div>
                                <label class="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
                                    Time Format
                                </label>
                                ${renderCompactSelectField({
                                    id: 'timeFormat',
                                    name: 'timeFormat',
                                    label: '',
                                    choices: [
                                        { value: '24h', label: '24-hour (14:30)' },
                                        { value: '12h', label: '12-hour (2:30 PM)' }
                                    ],
                                    value: settings.timeFormat
                                })}
                            </div>

                            <!-- Currency Symbol -->
                            <div>
                                <label class="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
                                    Currency Symbol
                                </label>
                                <input 
                                    type="text"
                                    id="currencySymbol"
                                    name="currencySymbol"
                                    maxlength="3"
                                    value="${settings.currencySymbol || '€'}"
                                    placeholder="e.g., $, €, £"
                                    class="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none w-32"
                                />
                                <p class="text-xs text-gray-500 mt-1">For costs and prices</p>
                            </div>

                            <!-- Theme -->
                            <div>
                                <label class="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
                                    Theme
                                </label>
                                ${renderCompactSelectField({
                                    id: 'theme',
                                    name: 'theme',
                                    label: '',
                                    choices: [
                                        { value: 'dark', label: 'Dark' },
                                        { value: 'light', label: 'Light' },
                                        { value: 'auto', label: 'Auto (System)' }
                                    ],
                                    value: settings.theme
                                })}
                            </div>

                        </div>

                        <!-- Success Message -->
                        <div id="successMessage" class="hidden mb-4 p-4 bg-green-900/30 border border-green-500 rounded-lg text-green-300">
                            ✓ Settings saved successfully!
                        </div>

                        <!-- Buttons -->
                        <div class="flex gap-4">
                            <button 
                                type="submit"
                                class="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                            >
                                Save Settings
                            </button>
                            
                            <button 
                                type="button"
                                id="resetBtn"
                                class="bg-gray-700 hover:bg-gray-600 text-white py-3 px-8 rounded-lg transition-colors"
                            >
                                Reset to Defaults
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Info Box -->
                <div class="mt-6 bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 text-sm text-gray-300">
                    <p class="font-semibold text-blue-300 mb-2">💡 About Settings</p>
                    <ul class="space-y-1">
                        <li>• Settings are stored in your database file</li>
                        <li>• They sync across all devices using the same database</li>
                        <li>• Reset to defaults uses your browser's locale settings</li>
                    </ul>
                </div>

                <!-- Data Management -->
                <div class="mt-6 bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <h3 class="text-xl font-semibold text-white mb-4">Data Management</h3>
                    
                    <div class="space-y-4">
                        <div class="flex items-start gap-4">
                            <div class="flex-shrink-0 w-10 h-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                                </svg>
                            </div>
                            <div class="flex-1">
                                <button
                                    onclick="window.brewcode.showTypeManagementWrapper('ingredient')"
                                    class="text-left w-full group"
                                >
                                    <h4 class="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">
                                        Manage Types & Subtypes
                                    </h4>
                                    <p class="text-sm text-gray-400 mt-1">
                                        Create and organize ingredient types (Honey, Apple, etc.) and subtypes (Wildflower, Merlot, etc.)
                                    </p>
                                </button>
                            </div>
                            <button
                                onclick="window.brewcode.showTypeManagementWrapper('ingredient')"
                                class="flex-shrink-0 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                Manage →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attach event handlers to settings form
 * @param {Object} BrewCode - BrewCode API instance
 * @param {Function} onSave - Callback when settings are saved
 */
function attachSettingsHandlers(BrewCode, onSave) {
    const form = document.getElementById('settingsForm');
    const resetBtn = document.getElementById('resetBtn');
    const successMessage = document.getElementById('successMessage');
    const abvMethodSelect = document.getElementById('abvMethodSelect');
    const abvMethodDescription = document.getElementById('abvMethodDescription');

    // ABV Method descriptions
    const abvDescriptions = {
        'abv-basic': "Quick estimation using a fixed multiplier. Appropriate for lower alcohol products like beers and ciders. Less accurate at higher gravities.",
        'abv-berry': "Formula from 'First Steps in Winemaking' by C.J.J. Berry. More appropriate for wine and mead than the Basic method.",
        'abv-hall': "Advanced formula from 'Brew By The Numbers' that accounts for alcohol's lower density. More precise than simpler methods.",
        'abv-hmrc': "Official UK tax authority formula using thresholds based on gravity change. Required for commercial production in the UK. Most conservative calculation."
    };

    // Update description when selection changes
    function updateAbvDescription() {
        const selectedMethod = abvMethodSelect.value;
        abvMethodDescription.textContent = abvDescriptions[selectedMethod] || '';
    }

    // Set initial description
    updateAbvDescription();

    // Listen for changes
    abvMethodSelect.addEventListener('change', updateAbvDescription);

    // Handle form submission
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const updates = {
            measurementSystem: formData.get('measurementSystem'),
            temperatureUnit: formData.get('temperatureUnit'),
            densityUnit: formData.get('densityUnit'),
            abvMethod: formData.get('abvMethod'),
            dateFormat: formData.get('dateFormat'),
            timeFormat: formData.get('timeFormat'),
            theme: formData.get('theme'),
            currencySymbol: formData.get('currencySymbol')
        };

        try {
            BrewCode.settings.update(updates);
            
            // Show success message
            successMessage.classList.remove('hidden');
            setTimeout(() => {
                successMessage.classList.add('hidden');
            }, 3000);

            // Call callback
            if (onSave) onSave();
            
        } catch (error) {
            alert(`Failed to save settings: ${error.message}`);
        }
    };

    // Handle reset button
    resetBtn.onclick = () => {
        if (confirm('Reset all settings to defaults based on your locale?')) {
            try {
                BrewCode.settings.reset();
                
                // Reload the page to show new settings
                location.reload();
                
            } catch (error) {
                alert(`Failed to reset settings: ${error.message}`);
            }
        }
    };
}

/**
 * Show database save success notification
 */
function showDatabaseSaveNotification() {
    showToast('💾 Database saved successfully!', 'success');
}

export { 
    renderSettingsPage, 
    attachSettingsHandlers, 
    showDatabaseSaveNotification 
};
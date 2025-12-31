// settingsUI.js

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
                        class="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
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
                        
                        <!-- Measurement System -->
                        <div class="mb-6">
                            <label class="block text-sm font-semibold text-gray-300 mb-2">
                                Measurement System
                            </label>
                            <select 
                                name="measurementSystem" 
                                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                            >
                                <option value="metric" ${settings.measurementSystem === 'metric' ? 'selected' : ''}>
                                    Metric (kg, L, cm)
                                </option>
                                <option value="imperial" ${settings.measurementSystem === 'imperial' ? 'selected' : ''}>
                                    Imperial (lb, gal, in)
                                </option>
                                <option value="us" ${settings.measurementSystem === 'us' ? 'selected' : ''}>
                                    US Customary (lb, gal, in)
                                </option>
                            </select>
                            <p class="text-xs text-gray-500 mt-1">Used for weight, volume, and length measurements</p>
                        </div>

                        <!-- Temperature Unit -->
                        <div class="mb-6">
                            <label class="block text-sm font-semibold text-gray-300 mb-2">
                                Temperature Unit
                            </label>
                            <select 
                                name="temperatureUnit" 
                                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                            >
                                <option value="c" ${settings.temperatureUnit === 'c' ? 'selected' : ''}>
                                    Celsius (°C)
                                </option>
                                <option value="f" ${settings.temperatureUnit === 'f' ? 'selected' : ''}>
                                    Fahrenheit (°F)
                                </option>
                            </select>
                        </div>

                        <!-- Density Unit -->
                        <div class="mb-6">
                            <label class="block text-sm font-semibold text-gray-300 mb-2">
                                Density/Gravity Unit
                            </label>
                            <select 
                                name="densityUnit" 
                                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                            >
                                <option value="sg" ${settings.densityUnit === 'sg' ? 'selected' : ''}>
                                    Specific Gravity (SG)
                                </option>
                                <option value="brix" ${settings.densityUnit === 'brix' ? 'selected' : ''}>
                                    Brix (°Bx)
                                </option>
                                <option value="plato" ${settings.densityUnit === 'plato' ? 'selected' : ''}>
                                    Plato (°P)
                                </option>
                                <option value="oe" ${settings.densityUnit === 'oe' ? 'selected' : ''}>
                                    Oechsle (°Oe)
                                </option>
                            </select>
                            <p class="text-xs text-gray-500 mt-1">Used for measuring sugar content and fermentation progress</p>
                        </div>

                        <!-- Date Format -->
                        <div class="mb-6">
                            <label class="block text-sm font-semibold text-gray-300 mb-2">
                                Date Format
                            </label>
                            <select 
                                name="dateFormat" 
                                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                            >
                                <option value="iso" ${settings.dateFormat === 'iso' ? 'selected' : ''}>
                                    ISO 8601 (YYYY-MM-DD)
                                </option>
                                <option value="us" ${settings.dateFormat === 'us' ? 'selected' : ''}>
                                    US (MM/DD/YYYY)
                                </option>
                                <option value="uk" ${settings.dateFormat === 'uk' ? 'selected' : ''}>
                                    UK/Europe (DD/MM/YYYY)
                                </option>
                            </select>
                        </div>

                        <!-- Time Format -->
                        <div class="mb-6">
                            <label class="block text-sm font-semibold text-gray-300 mb-2">
                                Time Format
                            </label>
                            <select 
                                name="timeFormat" 
                                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                            >
                                <option value="24h" ${settings.timeFormat === '24h' ? 'selected' : ''}>
                                    24-hour (14:30)
                                </option>
                                <option value="12h" ${settings.timeFormat === '12h' ? 'selected' : ''}>
                                    12-hour (2:30 PM)
                                </option>
                            </select>
                        </div>

                        <!-- Theme -->
                        <div class="mb-6">
                            <label class="block text-sm font-semibold text-gray-300 mb-2">
                                Theme
                            </label>
                            <select 
                                name="theme" 
                                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                            >
                                <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>
                                    Dark
                                </option>
                                <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>
                                    Light
                                </option>
                                <option value="auto" ${settings.theme === 'auto' ? 'selected' : ''}>
                                    Auto (System)
                                </option>
                            </select>
                        </div>

                        <!-- Currency Symbol -->
                        <div class="mb-8">
                            <label class="block text-sm font-semibold text-gray-300 mb-2">
                                Currency Symbol
                            </label>
                            <input 
                                type="text"
                                name="currencySymbol"
                                maxlength="3"
                                value="${settings.currencySymbol || '€'}"
                                placeholder="e.g., $, €, £, kr, CHF"
                                class="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
                            />
                            <p class="text-xs text-gray-500 mt-1">Symbol used for displaying costs and prices (1-3 characters)</p>
                        </div>

                        <!-- Success Message -->
                        <div id="successMessage" class="hidden mb-4 p-4 bg-green-900/30 border border-green-500 rounded-lg text-green-300">
                            ✓ Settings saved successfully!
                        </div>

                        <!-- Buttons -->
                        <div class="flex gap-4">
                            <button 
                                type="submit"
                                class="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                            >
                                Save Settings
                            </button>
                            
                            <button 
                                type="button"
                                id="resetBtn"
                                class="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors"
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

    // Handle form submission
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const updates = {
            measurementSystem: formData.get('measurementSystem'),
            temperatureUnit: formData.get('temperatureUnit'),
            densityUnit: formData.get('densityUnit'),
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

export { renderSettingsPage, attachSettingsHandlers };
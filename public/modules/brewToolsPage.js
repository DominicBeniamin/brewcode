// brewToolsPage.js

import { 
    INPUT_WIDTHS, 
    renderCompactNumberField, 
    renderCompactSelectField, 
    renderResultDisplay, 
    copyToClipboard 
} from './formHelpers.js';
import { convert, normaliseUnit, densityCorrection, CONVERSIONS } from './conversions.js';
import { abv, priming, FORMULAE } from './fermentation.js';

/**
 * Render the Brew Tools page with all calculators
 * @param {Object} BrewCode - BrewCode API instance
 * @returns {string} HTML for brew tools page
 */
function renderBrewToolsPage(BrewCode) {
    const settings = BrewCode.settings.get();

    return `
        <div class="mb-6">
            <h2 class="text-3xl font-bold text-white mb-2">Brew Tools</h2>
            <p class="text-gray-400">Calculators and converters for brewing</p>
        </div>

        <!-- Tool Cards Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            ${renderUnitConverter(settings)}
            ${renderDensityCorrectionTool(settings)}
            ${renderABVCalculator(settings)}
            ${renderPrimingCalculator(settings)}
        </div>
    `;
}

/**
 * Render Unit Converter Card
 */
function renderUnitConverter(settings) {
    const categories = Object.keys(CONVERSIONS);
    const firstCategory = categories[0];
    const firstCategoryUnits = Object.entries(CONVERSIONS[firstCategory].units);
    
    return `
        <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div class="flex items-center gap-3 mb-4">
                <span class="text-3xl">🔄</span>
                <h3 class="text-xl font-bold text-white">Unit Converter</h3>
            </div>
            
            <div class="space-y-4">
                <!-- Category Selection -->
                ${renderCompactSelectField({
                    id: 'converterCategory',
                    label: 'Category',
                    choices: categories.map(cat => ({ value: cat, label: CONVERSIONS[cat].label })),
                    onChange: 'window.brewcode.updateConverterUnits()'
                })}

                <!-- Input: Value | From Unit -->
                <div class="flex gap-3">
                    ${renderCompactNumberField({
                        id: 'converterFromValue',
                        label: 'Value',
                        placeholder: '0.0',
                        fieldType: INPUT_WIDTHS.STANDARD,
                        onInput: 'window.brewcode.performConversion()'
                    })}
                    ${renderCompactSelectField({
                        id: 'converterFromUnit',
                        label: 'From',
                        choices: firstCategoryUnits.map(([key, label]) => ({ value: key, label: label })),
                        onChange: 'window.brewcode.performConversion()'
                    })}
                </div>

                <!-- Output: Result | To Unit -->
                <div class="flex gap-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-2">Result</label>
                        <div id="converterResultValue" class="w-32 bg-gray-900 text-green-400 font-mono rounded-lg px-3 py-2 border border-gray-600 min-h-[42px] flex items-center">
                            —
                        </div>
                    </div>
                    ${renderCompactSelectField({
                        id: 'converterToUnit',
                        label: 'To',
                        choices: firstCategoryUnits.map(([key, label]) => ({ value: key, label: label })),
                        onChange: 'window.brewcode.performConversion()'
                    })}
                    <div class="flex items-end pb-2">
                        <button 
                            onclick="window.brewcode.copyToClipboard('converterResultValue')"
                            class="text-gray-500 hover:text-gray-300 text-sm"
                            title="Copy to clipboard"
                        >
                            📋
                        </button>
                    </div>
                </div>

                <!-- Error Display -->
                <div id="converterError" class="hidden">
                    <div class="bg-red-900/20 border border-red-500 rounded-lg p-3">
                        <div class="text-sm text-red-400" id="converterErrorMessage"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render Density Temperature Correction Tool
 */
function renderDensityCorrectionTool(settings) {
    const densityUnits = Object.entries(CONVERSIONS.density.units);
    const tempUnits = Object.entries(CONVERSIONS.temperature.units);
    
    const defaultCalibTemp = settings.temperatureUnit === 'f' ? '68.0' : '20.0';
    
    return `
        <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div class="flex items-center gap-3 mb-4">
                <span class="text-3xl">🌡️</span>
                <h3 class="text-xl font-bold text-white">Density Correction</h3>
            </div>
            
            <p class="text-sm text-gray-400 mb-4">
                Correct hydrometer readings for temperature differences
            </p>

            <div class="space-y-4">
                <!-- Setup Row -->
                <div class="flex flex-wrap gap-3">
                    ${renderCompactSelectField({
                        id: 'densityCorrectionUnit',
                        label: 'Density Unit',
                        choices: densityUnits.map(([key, label]) => ({ value: key, label: label })),
                        value: settings.densityUnit,
                        onChange: 'window.brewcode.performDensityCorrection()'
                    })}

                    <div class="flex-shrink-0">
                        ${renderCompactNumberField({
                            id: 'densityCorrectionCalibTemp',
                            label: 'Calibration Temp',
                            value: defaultCalibTemp,
                            fieldType: INPUT_WIDTHS.SHORT,
                            onInput: 'window.brewcode.performDensityCorrection()'
                        })}
                    </div>

                    <div class="flex-shrink-0">
                        ${renderCompactSelectField({
                            id: 'densityCorrectionTempUnit',
                            label: 'Temp Unit',
                            choices: tempUnits.map(([key, label]) => ({ value: key, label: label })),
                            value: settings.temperatureUnit,
                            onChange: 'window.brewcode.performDensityCorrection()'
                        })}
                    </div>
                </div>

                <!-- Input Row -->
                <div class="flex gap-3">
                    ${renderCompactNumberField({
                        id: 'densityCorrectionReading',
                        label: 'Reading',
                        placeholder: '1.050',
                        fieldType: INPUT_WIDTHS.STANDARD,
                        onInput: 'window.brewcode.performDensityCorrection()'
                    })}

                    ${renderCompactNumberField({
                        id: 'densityCorrectionSampleTemp',
                        label: 'Sample Temp',
                        placeholder: settings.temperatureUnit === 'f' ? '70.0' : '21.0',
                        fieldType: INPUT_WIDTHS.SHORT,
                        onInput: 'window.brewcode.performDensityCorrection()'
                    })}
                </div>

                <!-- Output Row -->
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-2">Corrected Reading</label>
                    <div class="relative">
                        <div id="densityCorrectionResultValue" class="bg-gray-900 text-green-400 font-mono rounded-lg px-3 py-2 border border-gray-600 inline-block min-w-[150px]">
                            —
                        </div>
                        <button 
                            onclick="window.brewcode.copyToClipboard('densityCorrectionResultValue')"
                            class="ml-2 text-gray-500 hover:text-gray-300 text-sm"
                            title="Copy to clipboard"
                        >
                            📋
                        </button>
                    </div>
                </div>

                <!-- Error Display -->
                <div id="densityCorrectionError" class="hidden">
                    <div class="bg-red-900/20 border border-red-500 rounded-lg p-3">
                        <div class="text-sm text-red-400" id="densityCorrectionErrorMessage"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render ABV Calculator
 */
function renderABVCalculator(settings) {
    const densityUnits = Object.entries(CONVERSIONS.density.units);
    const tempUnits = Object.entries(CONVERSIONS.temperature.units);
    const formulas = Object.entries(FORMULAE);
    const defaultCalibTemp = settings.temperatureUnit === 'f' ? '68.0' : '20.0';
    
    return `
        <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div class="flex items-center gap-3 mb-4">
                <span class="text-3xl">📊</span>
                <h3 class="text-xl font-bold text-white">ABV Calculator</h3>
            </div>

            <div class="space-y-4">
                <!-- Setup Row -->
                <div class="flex flex-wrap gap-3">
                    ${renderCompactSelectField({
                        id: 'abvFormula',
                        label: 'Formula',
                        choices: formulas.map(([key, formula]) => ({ value: key, label: formula.label })),
                        value: settings.abvMethod,
                        onChange: 'window.brewcode.calculateABV()'
                    })}

                    ${renderCompactSelectField({
                        id: 'abvDensityUnit',
                        label: 'Density Unit',
                        choices: densityUnits.map(([key, label]) => ({ value: key, label: label })),
                        value: settings.densityUnit,
                        onChange: 'window.brewcode.calculateABV()'
                    })}

                    <div class="flex-shrink-0">
                        ${renderCompactNumberField({
                            id: 'abvCalibTemp',
                            label: 'Calibration Temp',
                            value: defaultCalibTemp,
                            fieldType: INPUT_WIDTHS.SHORT,
                            onInput: 'window.brewcode.calculateABV()'
                        })}
                    </div>

                    <div class="flex-shrink-0">
                        ${renderCompactSelectField({
                            id: 'abvTempUnit',
                            label: 'Temp Unit',
                            choices: tempUnits.map(([key, label]) => ({ value: key, label: label })),
                            value: settings.temperatureUnit,
                            onChange: 'window.brewcode.calculateABV()'
                        })}
                    </div>
                </div>

                <!-- Original Reading & Temperature -->
                <div class="flex gap-3">
                    ${renderCompactNumberField({
                        id: 'abvOriginalGravity',
                        label: 'Original Reading',
                        placeholder: '1.050',
                        fieldType: INPUT_WIDTHS.STANDARD,
                        onInput: 'window.brewcode.calculateABV()'
                    })}

                    ${renderCompactNumberField({
                        id: 'abvOriginalTemp',
                        label: 'Original Temp',
                        placeholder: settings.temperatureUnit === 'f' ? '70.0' : '21.0',
                        fieldType: INPUT_WIDTHS.SHORT,
                        onInput: 'window.brewcode.calculateABV()'
                    })}
                </div>

                <!-- Final Reading & Temperature -->
                <div class="flex gap-3">
                    ${renderCompactNumberField({
                        id: 'abvFinalGravity',
                        label: 'Final Reading',
                        placeholder: '1.010',
                        fieldType: INPUT_WIDTHS.STANDARD,
                        onInput: 'window.brewcode.calculateABV()'
                    })}

                    ${renderCompactNumberField({
                        id: 'abvFinalTemp',
                        label: 'Final Temp',
                        placeholder: settings.temperatureUnit === 'f' ? '70.0' : '21.0',
                        fieldType: INPUT_WIDTHS.SHORT,
                        onInput: 'window.brewcode.calculateABV()'
                    })}
                </div>

                <!-- Result -->
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-2">Alcohol Content</label>
                    <div class="flex gap-2 items-center">
                        <div id="abvResultValue" class="bg-gray-900 text-green-400 font-mono rounded-lg px-3 py-2 border border-gray-600 inline-block min-w-[120px] text-xl font-bold">
                            —
                        </div>
                        ${renderCompactSelectField({
                            id: 'abvResultUnit',
                            label: '',
                            choices: [
                                { value: 'abv', label: '% ABV' },
                                { value: 'abw', label: '% ABW' },
                                { value: 'us-proof', label: 'US Proof' },
                                { value: 'uk-proof', label: 'UK Proof' }
                            ],
                            onChange: 'window.brewcode.calculateABV()'
                        })}
                        <button 
                            onclick="window.brewcode.copyToClipboard('abvResultValue')"
                            class="text-gray-500 hover:text-gray-300 text-sm"
                            title="Copy to clipboard"
                        >
                            📋
                        </button>
                    </div>
                </div>

                <!-- Error Display -->
                <div id="abvError" class="hidden">
                    <div class="bg-red-900/20 border border-red-500 rounded-lg p-3">
                        <div class="text-sm text-red-400" id="abvErrorMessage"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render Priming Sugar Calculator
 */
function renderPrimingCalculator(settings) {
    const volumeUnits = Object.entries(CONVERSIONS.volume.units);
    const tempUnits = Object.entries(CONVERSIONS.temperature.units);
    
    // Determine default volume unit based on measurement system
    let defaultVolumeUnit = 'l'; // default to liters
    if (settings.measurementSystem === 'imperial') {
        defaultVolumeUnit = 'imp-gal';
    } else if (settings.measurementSystem === 'us') {
        defaultVolumeUnit = 'gal';
    }
    
    return `
        <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div class="flex items-center gap-3 mb-4">
                <span class="text-3xl">🫧</span>
                <h3 class="text-xl font-bold text-white">Priming Calculator</h3>
            </div>

            <p class="text-sm text-gray-400 mb-4">
                Calculate priming sugar for carbonation
            </p>

            <div class="space-y-4">
                <!-- Beverage Volume -->
                <div class="flex gap-3">
                    ${renderCompactNumberField({
                        id: 'primingVolume',
                        label: 'Volume',
                        placeholder: '20.0',
                        fieldType: INPUT_WIDTHS.MEDIUM,
                        onInput: 'window.brewcode.calculatePriming()'
                    })}
                    ${renderCompactSelectField({
                        id: 'primingVolumeUnit',
                        label: 'Unit',
                        choices: volumeUnits.map(([key, label]) => ({ value: key, label: label })),
                        value: defaultVolumeUnit,
                        onChange: 'window.brewcode.calculatePriming()'
                    })}
                </div>

                <!-- Beverage Temperature -->
                <div class="flex gap-3">
                    ${renderCompactNumberField({
                        id: 'primingTemp',
                        label: 'Beverage Temp',
                        placeholder: settings.temperatureUnit === 'f' ? '68.0' : '20.0',
                        fieldType: INPUT_WIDTHS.SHORT,
                        onInput: 'window.brewcode.calculatePriming()'
                    })}
                    ${renderCompactSelectField({
                        id: 'primingTempUnit',
                        label: 'Unit',
                        choices: tempUnits.map(([key, label]) => ({ value: key, label: label })),
                        value: settings.temperatureUnit,
                        onChange: 'window.brewcode.calculatePriming()'
                    })}
                </div>

                <!-- Desired CO2 -->
                <div>
                    ${renderCompactNumberField({
                        id: 'primingCO2',
                        label: 'Desired CO₂ (volumes)',
                        placeholder: '2.5',
                        fieldType: INPUT_WIDTHS.SHORT,
                        onInput: 'window.brewcode.calculatePriming()'
                    })}
                    <div class="text-xs text-gray-500 mt-1">Typical: Lager 2.5, Ale 2.0, Stout 1.8</div>
                </div>

                <!-- Sugar Type -->
                ${renderCompactSelectField({
                    id: 'primingSugarType',
                    label: 'Sugar Type',
                    choices: [
                        { value: 'dextrose', label: 'Dextrose (Corn Sugar)' },
                        { value: 'sucrose', label: 'Sucrose (Table Sugar)' },
                        { value: 'honey', label: 'Honey' },
                        { value: 'maltose', label: 'Maltose (DME)' }
                    ],
                    onChange: 'window.brewcode.calculatePriming()'
                })}

                <!-- Results -->
                <div class="border-t border-gray-700 pt-4">
                    <div class="space-y-3">
                        <!-- Mass and Volume Results -->
                        <div class="flex flex-wrap gap-3">
                            <div>
                                <div class="text-xs text-gray-500 mb-1">By Mass</div>
                                <div class="flex gap-2 items-center">
                                    <div id="primingResultMass" class="bg-gray-900 text-green-400 font-mono rounded px-3 py-2 inline-block min-w-[80px]">—</div>
                                    ${renderCompactSelectField({
                                        id: 'primingMassUnit',
                                        label: '',
                                        choices: Object.entries(CONVERSIONS.mass.units).map(([key, label]) => ({ value: key, label: label })),
                                        onChange: 'window.brewcode.calculatePriming()',
                                        width: 'text-sm'
                                    })}
                                    <button 
                                        onclick="window.brewcode.copyToClipboard('primingResultMass')"
                                        class="text-gray-500 hover:text-gray-300 text-xs"
                                        title="Copy to clipboard"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <div class="text-xs text-gray-500 mb-1">By Volume</div>
                                <div class="flex gap-2 items-center">
                                    <div id="primingResultVolume" class="bg-gray-900 text-green-400 font-mono rounded px-3 py-2 inline-block min-w-[80px]">—</div>
                                    ${renderCompactSelectField({
                                        id: 'primingVolumeResultUnit',
                                        label: '',
                                        choices: Object.entries(CONVERSIONS.volume.units).map(([key, label]) => ({ value: key, label: label })),
                                        onChange: 'window.brewcode.calculatePriming()',
                                        width: 'text-sm'
                                    })}
                                    <button 
                                        onclick="window.brewcode.copyToClipboard('primingResultVolume')"
                                        class="text-gray-500 hover:text-gray-300 text-xs"
                                        title="Copy to clipboard"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Delta and New Volume Results -->
                        <div class="flex flex-wrap gap-3">
                            <div>
                                <div class="text-xs text-gray-500 mb-1">Estimated increase in density/gravity</div>
                                <div class="flex gap-2 items-center">
                                    <div id="primingResultDelta" class="bg-gray-900 text-green-400 font-mono rounded px-3 py-2 inline-block min-w-[80px]">—</div>
                                    ${renderCompactSelectField({
                                        id: 'primingDeltaUnit',
                                        label: '',
                                        choices: Object.entries(CONVERSIONS.density.units).map(([key, label]) => ({ value: key, label: label })),
                                        onChange: 'window.brewcode.calculatePriming()',
                                        width: 'text-sm'
                                    })}
                                    <button 
                                        onclick="window.brewcode.copyToClipboard('primingResultDelta')"
                                        class="text-gray-500 hover:text-gray-300 text-xs"
                                        title="Copy to clipboard"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <div class="text-xs text-gray-500 mb-1">New Volume</div>
                                <div class="flex gap-2 items-center">
                                    <div id="primingResultNewVolume" class="bg-gray-900 text-green-400 font-mono rounded px-3 py-2 inline-block min-w-[80px]">—</div>
                                    ${renderCompactSelectField({
                                        id: 'primingNewVolumeUnit',
                                        label: '',
                                        choices: Object.entries(CONVERSIONS.volume.units).map(([key, label]) => ({ value: key, label: label })),
                                        onChange: 'window.brewcode.calculatePriming()',
                                        width: 'text-sm'
                                    })}
                                    <button 
                                        onclick="window.brewcode.copyToClipboard('primingResultNewVolume')"
                                        class="text-gray-500 hover:text-gray-300 text-xs"
                                        title="Copy to clipboard"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Error Display -->
                <div id="primingError" class="hidden">
                    <div class="bg-red-900/20 border border-red-500 rounded-lg p-3">
                        <div class="text-sm text-red-400" id="primingErrorMessage"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =====================================================================
// CALCULATOR FUNCTIONS
// =====================================================================

/**
 * Update converter unit dropdowns when category changes
 */
function updateConverterUnits() {
    const category = document.getElementById('converterCategory').value;
    const units = Object.entries(CONVERSIONS[category].units);
    
    const fromSelect = document.getElementById('converterFromUnit');
    const toSelect = document.getElementById('converterToUnit');
    
    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';
    
    units.forEach(([key, label]) => {
        fromSelect.add(new Option(label, key));
        toSelect.add(new Option(label, key));
    });
    
    document.getElementById('converterResultValue').textContent = '—';
    document.getElementById('converterError').classList.add('hidden');
    
    performConversion();
}

/**
 * Perform unit conversion
 */
function performConversion() {
    try {
        const value = parseFloat(document.getElementById('converterFromValue').value);
        const fromUnit = document.getElementById('converterFromUnit').value;
        const toUnit = document.getElementById('converterToUnit').value;
        const category = document.getElementById('converterCategory').value;
        
        const resultElement = document.getElementById('converterResultValue');
        
        if (isNaN(value) || value === '') {
            resultElement.textContent = '—';
            document.getElementById('converterError').classList.add('hidden');
            return;
        }
        
        const result = convert(value, fromUnit, toUnit, category);
        
        let formattedResult;
        if (category === 'temperature') {
            formattedResult = result.toFixed(1);
        } else if (category === 'density') {
            formattedResult = result.toFixed(4);
        } else {
            formattedResult = result.toFixed(2);
        }
        
        resultElement.textContent = formattedResult;
        document.getElementById('converterError').classList.add('hidden');
    } catch (error) {
        document.getElementById('converterResultValue').textContent = '—';
        document.getElementById('converterErrorMessage').textContent = error.message;
        document.getElementById('converterError').classList.remove('hidden');
    }
}

/**
 * Perform density temperature correction
 */
function performDensityCorrection() {
    try {
        const reading = parseFloat(document.getElementById('densityCorrectionReading').value);
        const sampleTemp = parseFloat(document.getElementById('densityCorrectionSampleTemp').value);
        const calibTemp = parseFloat(document.getElementById('densityCorrectionCalibTemp').value);
        const densityUnit = document.getElementById('densityCorrectionUnit').value;
        const tempUnit = document.getElementById('densityCorrectionTempUnit').value;
        
        const resultElement = document.getElementById('densityCorrectionResultValue');
        
        if (isNaN(reading) || isNaN(sampleTemp) || isNaN(calibTemp)) {
            resultElement.textContent = '—';
            document.getElementById('densityCorrectionError').classList.add('hidden');
            return;
        }
        
        const corrected = densityCorrection(reading, sampleTemp, calibTemp, tempUnit, densityUnit);
        
        resultElement.textContent = corrected.toFixed(4);
        document.getElementById('densityCorrectionError').classList.add('hidden');
    } catch (error) {
        document.getElementById('densityCorrectionResultValue').textContent = '—';
        document.getElementById('densityCorrectionErrorMessage').textContent = error.message;
        document.getElementById('densityCorrectionError').classList.remove('hidden');
    }
}

/**
 * Calculate ABV
 */
function calculateABV() {
    try {
        const formula = document.getElementById('abvFormula').value;
        const densityUnit = document.getElementById('abvDensityUnit').value;
        const originalGravity = parseFloat(document.getElementById('abvOriginalGravity').value);
        const finalGravity = parseFloat(document.getElementById('abvFinalGravity').value);
        const tempUnit = document.getElementById('abvTempUnit').value;
        const originalTemp = parseFloat(document.getElementById('abvOriginalTemp').value);
        const finalTemp = parseFloat(document.getElementById('abvFinalTemp').value);
        const calibTemp = parseFloat(document.getElementById('abvCalibTemp').value);
        const resultUnit = document.getElementById('abvResultUnit').value;
        
        const resultElement = document.getElementById('abvResultValue');
        
        if (isNaN(originalGravity) || isNaN(finalGravity) || isNaN(originalTemp) || isNaN(finalTemp) || isNaN(calibTemp)) {
            resultElement.textContent = '—';
            document.getElementById('abvError').classList.add('hidden');
            return;
        }
        
        let abvParams = {
            originalReading: originalGravity,
            finalReading: finalGravity,
            densityScale: densityUnit,
            formula: formula,
            tempScale: tempUnit,
            originalTemp: originalTemp,
            finalTemp: finalTemp,
            calibrationTemp: calibTemp
        };
        
        const result = abv(abvParams);
        
        // Convert result based on selected unit
        let displayValue, suffix;
        if (resultUnit === 'abv') {
            displayValue = result.toFixed(2);
            suffix = '% ABV';
        } else if (resultUnit === 'abw') {
            // ABW ≈ ABV × 0.79 (approximate conversion based on alcohol density)
            displayValue = (result * 0.79).toFixed(2);
            suffix = '% ABW';
        } else if (resultUnit === 'us-proof') {
            // US Proof = ABV × 2
            displayValue = (result * 2).toFixed(1);
            suffix = '° Proof (US)';
        } else if (resultUnit === 'uk-proof') {
            // UK Proof = ABV × 1.75
            displayValue = (result * 1.75).toFixed(1);
            suffix = '° Proof (UK)';
        }
        
        resultElement.textContent = `${displayValue}${suffix}`;
        document.getElementById('abvError').classList.add('hidden');
    } catch (error) {
        document.getElementById('abvResultValue').textContent = '—';
        document.getElementById('abvErrorMessage').textContent = error.message;
        document.getElementById('abvError').classList.remove('hidden');
    }
}

/**
 * Calculate priming sugar
 */
function calculatePriming() {
    try {
        const volume = parseFloat(document.getElementById('primingVolume').value);
        const volumeUnit = document.getElementById('primingVolumeUnit').value;
        const temp = parseFloat(document.getElementById('primingTemp').value);
        const tempUnit = document.getElementById('primingTempUnit').value;
        const co2 = parseFloat(document.getElementById('primingCO2').value);
        const sugarType = document.getElementById('primingSugarType').value;
        const massUnit = document.getElementById('primingMassUnit').value;
        const volumeResultUnit = document.getElementById('primingVolumeResultUnit').value;
        const deltaUnit = document.getElementById('primingDeltaUnit').value;
        const newVolumeUnit = document.getElementById('primingNewVolumeUnit').value;
        
        if (isNaN(volume) || isNaN(temp) || isNaN(co2)) {
            document.getElementById('primingResultMass').textContent = '—';
            document.getElementById('primingResultVolume').textContent = '—';
            document.getElementById('primingResultDelta').textContent = '—';
            document.getElementById('primingResultNewVolume').textContent = '—';
            document.getElementById('primingError').classList.add('hidden');
            return;
        }
        
        const result = priming({
            beverageVolume: volume,
            volumeUnit: volumeUnit,
            beverageTemp: temp,
            tempScale: tempUnit,
            desiredVolCo2: co2,
            sugarType: sugarType
        });
        
        // Convert mass to selected unit
        const massInSelectedUnit = convert(result.massG, 'g', massUnit, 'mass');
        document.getElementById('primingResultMass').textContent = `${massInSelectedUnit.toFixed(1)}`;
        
        // Convert volume (mL) to selected unit
        const volumeInSelectedUnit = convert(result.volumeMl, 'ml', volumeResultUnit, 'volume');
        document.getElementById('primingResultVolume').textContent = `${volumeInSelectedUnit.toFixed(1)}`;
        
        // Convert delta SG to selected density unit (first convert delta to absolute, then back to delta)
        // Delta SG needs special handling - just convert as if it's a small SG value
        const baseSG = 1.000;
        const sgWithDelta = baseSG + result.deltaSg;
        const convertedWithDelta = convert(sgWithDelta, 'sg', deltaUnit, 'density');
        const convertedBase = convert(baseSG, 'sg', deltaUnit, 'density');
        const deltaInSelectedUnit = convertedWithDelta - convertedBase;
        document.getElementById('primingResultDelta').textContent = deltaInSelectedUnit.toFixed(4);
        
        // Convert new volume (L) to selected unit
        const newVolumeInSelectedUnit = convert(result.newVolumeL, 'l', newVolumeUnit, 'volume');
        document.getElementById('primingResultNewVolume').textContent = `${newVolumeInSelectedUnit.toFixed(2)}`;
        
        document.getElementById('primingError').classList.add('hidden');
    } catch (error) {
        document.getElementById('primingResultMass').textContent = '—';
        document.getElementById('primingResultVolume').textContent = '—';
        document.getElementById('primingResultDelta').textContent = '—';
        document.getElementById('primingResultNewVolume').textContent = '—';
        document.getElementById('primingErrorMessage').textContent = error.message;
        document.getElementById('primingError').classList.remove('hidden');
    }
}

export {
    renderBrewToolsPage,
    updateConverterUnits,
    performConversion,
    performDensityCorrection,
    calculateABV,
    calculatePriming
};
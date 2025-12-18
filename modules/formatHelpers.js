// formatHelpers.js

import { convert } from './conversions.js';

/**
 * Format temperature according to user settings
 * @param {number} value - Temperature value in Celsius
 * @param {Object} settings - User settings object
 * @returns {string} Formatted temperature with unit
 * 
 * @example
 * formatTemperature(20, settings); // "20°C" or "68°F"
 */
function formatTemperature(value, settings) {
    const targetUnit = settings.temperatureUnit || 'c';
    
    if (targetUnit === 'f') {
        const converted = convert(value, 'c', 'f', 'temperature');
        return `${Math.round(converted)}°F`;
    }
    
    return `${Math.round(value)}°C`;
}

/**
 * Format mass according to user settings
 * @param {number} value - Mass value in grams
 * @param {Object} settings - User settings object
 * @param {Object} [options] - Formatting options
 * @param {number} [options.decimals=1] - Number of decimal places
 * @returns {string} Formatted mass with unit
 * 
 * @example
 * formatMass(1000, settings); // "1 kg" or "2.2 lb"
 */
function formatMass(value, settings, options = {}) {
    const decimals = options.decimals ?? 1;
    const system = settings.measurementSystem || 'metric';
    
    // Convert from grams to appropriate unit
    if (system === 'metric') {
        if (value >= 1000) {
            return `${(value / 1000).toFixed(decimals)} kg`;
        }
        return `${value.toFixed(decimals)} g`;
    } else {
        // Imperial/US uses pounds and ounces
        const lb = convert(value, 'g', 'lb', 'mass');
        if (lb >= 1) {
            return `${lb.toFixed(decimals)} lb`;
        }
        const oz = convert(value, 'g', 'oz', 'mass');
        return `${oz.toFixed(decimals)} oz`;
    }
}

/**
 * Format volume according to user settings
 * @param {number} value - Volume value in liters
 * @param {Object} settings - User settings object
 * @param {Object} [options] - Formatting options
 * @param {number} [options.decimals=1] - Number of decimal places
 * @returns {string} Formatted volume with unit
 * 
 * @example
 * formatVolume(10, settings); // "10 L" or "2.64 gal"
 */
function formatVolume(value, settings, options = {}) {
    const decimals = options.decimals ?? 1;
    const system = settings.measurementSystem || 'metric';
    
    if (system === 'metric') {
        if (value >= 1) {
            return `${value.toFixed(decimals)} L`;
        }
        return `${(value * 1000).toFixed(0)} mL`;
    } else if (system === 'us') {
        // US gallons
        const gal = convert(value, 'l', 'gal', 'volume');
        if (gal >= 1) {
            return `${gal.toFixed(decimals)} gal`;
        }
        const floz = convert(value, 'l', 'fl-oz', 'volume');
        return `${floz.toFixed(decimals)} fl oz`;
    } else {
        // Imperial gallons
        const gal = convert(value, 'l', 'imp-gal', 'volume');
        if (gal >= 1) {
            return `${gal.toFixed(decimals)} gal`;
        }
        const floz = convert(value, 'l', 'imp-fl-oz', 'volume');
        return `${floz.toFixed(decimals)} fl oz`;
    }
}

/**
 * Format density/gravity according to user settings
 * @param {number} value - Density value in SG
 * @param {Object} settings - User settings object
 * @returns {string} Formatted density with unit
 * 
 * @example
 * formatDensity(1.050, settings); // "1.050 SG" or "12.4°Bx"
 */
function formatDensity(value, settings) {
    const targetUnit = settings.densityUnit || 'sg';
    
    if (targetUnit === 'sg') {
        return `${value.toFixed(3)} SG`;
    }
    
    const converted = convert(value, 'sg', targetUnit, 'density');
    
    switch (targetUnit) {
        case 'brix':
            return `${converted.toFixed(1)}°Bx`;
        case 'plato':
            return `${converted.toFixed(1)}°P`;
        case 'oe':
            return `${converted.toFixed(1)}°Oe`;
        default:
            return `${converted.toFixed(1)} ${targetUnit}`;
    }
}

/**
 * Format date according to user settings
 * @param {string|Date} date - Date to format (ISO string or Date object)
 * @param {Object} settings - User settings object
 * @returns {string} Formatted date
 * 
 * @example
 * formatDate("2025-12-01", settings); // "2025-12-01" or "12/01/2025" or "01/12/2025"
 */
function formatDate(date, settings) {
    const dateFormat = settings.dateFormat || 'iso';
    
    // Parse date
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) {
        return 'Invalid date';
    }
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    switch (dateFormat) {
        case 'us':
            return `${month}/${day}/${year}`;
        case 'uk':
            return `${day}/${month}/${year}`;
        case 'iso':
        default:
            return `${year}-${month}-${day}`;
    }
}

/**
 * Format time according to user settings
 * @param {string|Date} datetime - DateTime to format (ISO string or Date object)
 * @param {Object} settings - User settings object
 * @returns {string} Formatted time
 * 
 * @example
 * formatTime("2025-12-01T14:30:00", settings); // "14:30" or "2:30 PM"
 */
function formatTime(datetime, settings) {
    const timeFormat = settings.timeFormat || '24h';
    
    // Parse datetime
    const d = typeof datetime === 'string' ? new Date(datetime) : datetime;
    
    if (isNaN(d.getTime())) {
        return 'Invalid time';
    }
    
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    if (timeFormat === '12h') {
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return `${hours12}:${minutes} ${period}`;
    }
    
    // 24h format
    return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * Format datetime according to user settings
 * @param {string|Date} datetime - DateTime to format
 * @param {Object} settings - User settings object
 * @returns {string} Formatted datetime
 * 
 * @example
 * formatDateTime("2025-12-01T14:30:00", settings); // "2025-12-01 14:30" or "12/01/2025 2:30 PM"
 */
function formatDateTime(datetime, settings) {
    return `${formatDate(datetime, settings)} ${formatTime(datetime, settings)}`;
}

/**
 * Format ABV percentage
 * @param {number} abv - ABV value (e.g., 12.5)
 * @returns {string} Formatted ABV
 * 
 * @example
 * formatABV(12.5); // "12.5% ABV"
 */
function formatABV(abv) {
    return `${abv.toFixed(1)}% ABV`;
}

/**
 * Format duration in days
 * @param {number} days - Number of days
 * @returns {string} Formatted duration
 * 
 * @example
 * formatDuration(14); // "14 days"
 * formatDuration(1); // "1 day"
 */
function formatDuration(days) {
    if (days === 1) return '1 day';
    return `${days} days`;
}

/**
 * Get all format functions with settings pre-applied
 * @param {Object} settings - User settings object
 * @returns {Object} Object with all format functions
 * 
 * @example
 * const fmt = getFormatters(settings);
 * fmt.temperature(20); // "68°F"
 * fmt.mass(1000); // "2.2 lb"
 */
function getFormatters(settings) {
    return {
        temperature: (value) => formatTemperature(value, settings),
        mass: (value, options) => formatMass(value, settings, options),
        volume: (value, options) => formatVolume(value, settings, options),
        density: (value) => formatDensity(value, settings),
        date: (value) => formatDate(value, settings),
        time: (value) => formatTime(value, settings),
        datetime: (value) => formatDateTime(value, settings),
        abv: (value) => formatABV(value),
        duration: (value) => formatDuration(value)
    };
}

export {
    formatTemperature,
    formatMass,
    formatVolume,
    formatDensity,
    formatDate,
    formatTime,
    formatDateTime,
    formatABV,
    formatDuration,
    getFormatters
};
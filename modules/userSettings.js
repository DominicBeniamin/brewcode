// userSettings.js

import { resultToObjects } from './helpers.js';

/**
 * Get user settings
 * 
 * @param {Object} db - SQL.js database instance
 * @returns {Object} User settings object
 * 
 * @example
 * const settings = getUserSettings(db);
 * console.log(settings.temperatureUnit); // "c" or "f"
 * console.log(settings.measurementSystem); // "metric", "imperial", or "us"
 */
function getUserSettings(db) {
    try {
        const sql = `SELECT * FROM userSettings WHERE settingsID = 1`;
        const result = db.exec(sql);
        const settings = resultToObjects(result);
        
        if (settings.length === 0) {
            // This shouldn't happen, but if it does, insert defaults
            initializeDefaultSettings(db);
            return getUserSettings(db);
        }
        
        return settings[0];
        
    } catch (error) {
        console.error('Failed to fetch user settings:', error.message);
        throw new Error(`Failed to fetch user settings: ${error.message}`);
    }
}

/**
 * Update user settings
 * 
 * @param {Object} db - SQL.js database instance
 * @param {Object} updates - Settings to update
 * @param {string} [updates.temperatureUnit] - "c" or "f"
 * @param {string} [updates.measurementSystem] - "metric", "imperial", or "us"
 * @param {string} [updates.densityUnit] - "sg", "brix", "plato", etc.
 * @param {string} [updates.dateFormat] - "iso", "us", or "uk"
 * @param {string} [updates.timeFormat] - "24h" or "12h"
 * @param {string} [updates.theme] - "light", "dark", or "auto"
 * @param {string} [updates.language] - "en", "de", etc.
 * @returns {Object} { success: boolean, message: string, updatedFields: array }
 * @throws {Error} If validation fails
 * 
 * @example
 * updateUserSettings(db, {
 *     temperatureUnit: "f",
 *     measurementSystem: "us",
 *     dateFormat: "us"
 * });
 */
function updateUserSettings(db, updates) {
    // STEP 1: VALIDATE FIELDS
    const validations = {
        temperatureUnit: ['c', 'f'],
        measurementSystem: ['metric', 'imperial', 'us'],
        dateFormat: ['iso', 'us', 'uk'],
        timeFormat: ['24h', '12h'],
        theme: ['light', 'dark', 'auto']
    };
    
    for (const [key, value] of Object.entries(updates)) {
        if (validations[key]) {
            if (!validations[key].includes(value)) {
                throw new Error(`Invalid ${key}: "${value}". Must be one of: ${validations[key].join(', ')}`);
            }
        } else if (key === 'densityUnit') {
            // densityUnit can be any valid density unit from conversions
            if (typeof value !== 'string' || value.trim() === '') {
                throw new Error('densityUnit must be a non-empty string');
            }
        } else if (key === 'language') {
            // language can be any string (for future use)
            if (typeof value !== 'string' || value.trim() === '') {
                throw new Error('language must be a non-empty string');
            }
        } else if (key === 'currencySymbol') {
            // currencySymbol can be 1-3 characters
            if (typeof value !== 'string' || value.trim() === '' || value.length > 3) {
                throw new Error('currencySymbol must be a string between 1-3 characters');
            }
        } else {
            throw new Error(`Unknown setting: ${key}`);
        }
    }
    
    // STEP 2: CHECK IF THERE ARE UPDATES
    if (Object.keys(updates).length === 0) {
        throw new Error('No settings to update');
    }
    
    // STEP 3: BUILD UPDATE SQL
    const setClauses = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
        setClauses.push(`${key} = ?`);
        values.push(value);
    }
    
    const sql = `UPDATE userSettings SET ${setClauses.join(', ')} WHERE settingsID = 1`;
    
    try {
        // STEP 4: EXECUTE UPDATE
        db.run(sql, values);
        
        console.log('User settings updated successfully');
        
        // STEP 5: RETURN SUCCESS
        return {
            success: true,
            message: 'Settings updated successfully',
            updatedFields: Object.entries(updates).map(([key, value]) => ({
                field: key,
                newValue: value
            }))
        };
        
    } catch (error) {
        console.error('Failed to update user settings:', error.message);
        throw new Error(`Failed to update user settings: ${error.message}`);
    }
}

/**
 * Initialize default settings based on browser locale
 * 
 * @param {Object} db - SQL.js database instance
 * @returns {Object} Initialized settings
 * 
 * @example
 * const settings = initializeDefaultSettings(db);
 */
function initializeDefaultSettings(db) {
    // Detect user's locale
    const locale = navigator.language || 'en-US';
    const country = locale.split('-')[1] || 'US';
    
    // Detect currency symbol based on locale
    let currencySymbol = '€'; // Default to Euro
    if (country === 'US' || country === 'CA' || country === 'AU') {
        currencySymbol = '$';
    } else if (country === 'GB') {
        currencySymbol = '£';
    } else if (country === 'DK') {
        currencySymbol = 'kr';
    } else if (country === 'SE' || country === 'NO') {
        currencySymbol = 'kr';
    } else if (country === 'CH') {
        currencySymbol = 'CHF';
    }
    
    // Smart defaults based on locale
    const defaults = {
        temperatureUnit: (country === 'US') ? 'f' : 'c',
        measurementSystem: (country === 'US') ? 'us' : 
                          (country === 'GB') ? 'imperial' : 'metric',
        densityUnit: 'sg',
        dateFormat: (country === 'US') ? 'us' : 
                   (country === 'GB') ? 'uk' : 'iso',
        timeFormat: (country === 'US') ? '12h' : '24h',
        theme: 'dark',
        language: locale.split('-')[0] || 'en',
        currencySymbol: currencySymbol
    };
    
    try {
        const sql = `
            INSERT OR REPLACE INTO userSettings 
            (settingsID, temperatureUnit, measurementSystem, densityUnit, dateFormat, timeFormat, theme, language, currencySymbol)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [
            defaults.temperatureUnit,
            defaults.measurementSystem,
            defaults.densityUnit,
            defaults.dateFormat,
            defaults.timeFormat,
            defaults.theme,
            defaults.language,
            defaults.currencySymbol
        ]);
        
        console.log('Initialized default settings based on locale:', locale);
        
        return defaults;
        
    } catch (error) {
        console.error('Failed to initialize default settings:', error.message);
        throw new Error(`Failed to initialize default settings: ${error.message}`);
    }
}

/**
 * Reset settings to defaults
 * 
 * @param {Object} db - SQL.js database instance
 * @returns {Object} { success: boolean, message: string }
 * 
 * @example
 * resetUserSettings(db);
 */
function resetUserSettings(db) {
    try {
        // Delete current settings
        db.run('DELETE FROM userSettings WHERE settingsID = 1');
        
        // Reinitialize with defaults
        initializeDefaultSettings(db);
        
        console.log('User settings reset to defaults');
        
        return {
            success: true,
            message: 'Settings reset to defaults'
        };
        
    } catch (error) {
        console.error('Failed to reset user settings:', error.message);
        throw new Error(`Failed to reset user settings: ${error.message}`);
    }
}

export {
    getUserSettings,
    updateUserSettings,
    initializeDefaultSettings,
    resetUserSettings
};
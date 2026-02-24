import { UserSettings, SettingsUpdate } from '../types/settings';

/**
 * Get user settings from database
 */
export function getUserSettings(db: any): UserSettings {
  try {
    const sql = 'SELECT * FROM userSettings WHERE settingsID = 1';
    const result = db.exec(sql);
    
    if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
      throw new Error('No settings found');
    }
    
    const columns = result[0].columns;
    const values = result[0].values[0];
    
    const settings: any = {};
    columns.forEach((col: string, index: number) => {
      settings[col] = values[index];
    });
    
    return settings as UserSettings;
  } catch (error) {
    console.error('Failed to fetch user settings:', error);
    throw new Error('Failed to fetch user settings: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Update user settings in database
 */
export function updateUserSettings(db: any, updates: SettingsUpdate): void {
  const validations: Record<string, string[]> = {
    temperatureUnit: ['c', 'f'],
    measurementSystem: ['metric', 'imperial', 'us'],
    abvMethod: ['abv-basic', 'abv-berry', 'abv-hall', 'abv-hmrc'],
    dateFormat: ['iso', 'us', 'uk'],
    timeFormat: ['24h', '12h'],
    theme: ['light', 'dark', 'auto'],
  };
  
  // Validate
  for (const [key, value] of Object.entries(updates)) {
    if (validations[key]) {
      if (!validations[key].includes(value as string)) {
        throw new Error(`Invalid ${key}: "${value}". Must be one of: ${validations[key].join(', ')}`);
      }
    } else if (key === 'densityUnit' || key === 'language') {
      if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${key} must be a non-empty string`);
      }
    } else if (key === 'currencySymbol') {
      if (typeof value !== 'string' || value.trim() === '' || value.length > 3) {
        throw new Error('currencySymbol must be a string between 1-3 characters');
      }
    } else if (key === 'numberFormat') {
      if (!['anglo', 'continental', 'international'].includes(value as string)) {
        throw new Error(`Invalid numberFormat: "${value}". Must be one of: anglo, continental, international`);
      }
    } else {
      throw new Error(`Unknown setting: ${key}`);
    }
  }
  
  if (Object.keys(updates).length === 0) {
    throw new Error('No settings to update');
  }
  
  const setClauses: string[] = [];
  const values: any[] = [];
  
  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = ?`);
    values.push(value);
  }
  
  const sql = `UPDATE userSettings SET ${setClauses.join(', ')} WHERE settingsID = 1`;
  
  try {
    db.run(sql, values);
    console.log(new Date().toISOString(), 'User settings updated successfully');
  } catch (error) {
    console.error(new Date().toISOString(), 'Failed to update user settings:', error);
    throw new Error('Failed to update user settings: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Initialize default settings based on browser locale
 */
export function initializeDefaultSettings(db: any): void {
  const locale = navigator.language || 'en-US';
  const country = locale.split('-')[1] || 'US';
  
  let currencySymbol = '€';
  if (country === 'US' || country === 'CA' || country === 'AU') {
    currencySymbol = '$';
  } else if (country === 'GB') {
    currencySymbol = '£';
  } else if (country === 'DK' || country === 'SE' || country === 'NO') {
    currencySymbol = 'kr';
  } else if (country === 'CH') {
    currencySymbol = 'CHF';
  }
  
  const defaults = {
    temperatureUnit: country === 'US' ? 'f' : 'c',
    measurementSystem: country === 'US' ? 'us' : country === 'GB' ? 'imperial' : 'metric',
    densityUnit: 'sg',
    abvMethod: 'abv-basic',
    dateFormat: country === 'US' ? 'us' : country === 'GB' ? 'uk' : 'iso',
    timeFormat: country === 'US' ? '12h' : '24h',
    theme: 'dark',
    language: locale.split('-')[0] || 'en',
    currencySymbol,
    numberFormat: 'anglo',
  };
  
  try {
    const sql = `
      INSERT OR REPLACE INTO userSettings 
      (settingsID, temperatureUnit, measurementSystem, densityUnit, abvMethod, dateFormat, timeFormat, theme, language, currencySymbol, numberFormat)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [
      defaults.temperatureUnit,
      defaults.measurementSystem,
      defaults.densityUnit,
      defaults.abvMethod,
      defaults.dateFormat,
      defaults.timeFormat,
      defaults.theme,
      defaults.language,
      defaults.currencySymbol,
      defaults.numberFormat,
    ]);
    
    console.log(new Date().toISOString(), 'Initialised default settings based on locale:', locale);
  } catch (error) {
    console.error(new Date().toISOString(), 'Failed to initialise default settings:', error);
    throw new Error('Failed to initialise default settings: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Reset settings to defaults
 */
export function resetUserSettings(db: any): void {
  try {
    db.run('DELETE FROM userSettings WHERE settingsID = 1');
    initializeDefaultSettings(db);
    console.log(new Date().toISOString(), 'User settings reset to defaults');
  } catch (error) {
    console.error(new Date().toISOString(), 'Failed to reset user settings:', error);
    throw new Error('Failed to reset user settings: ' + (error instanceof Error ? error.message : String(error)));
  }
}
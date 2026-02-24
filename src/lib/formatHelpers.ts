import { convert } from './conversions';

interface Settings {
  temperatureUnit?: 'c' | 'f';
  measurementSystem?: 'metric' | 'us' | 'imperial';
  densityUnit?: 'sg' | 'brix' | 'plato' | 'oe';
  dateFormat?: 'iso' | 'us' | 'uk';
  timeFormat?: '24h' | '12h';
  currencySymbol?: string;
  numberFormat?: 'anglo' | 'continental' | 'international';
}

interface FormatOptions {
  decimals?: number;
}

/**
 * Format a number according to user's number format setting
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @param settings - User settings object
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1234.56, 2, settings); // "1,234.56" or "1.234,56" or "1 234,56"
 */
function formatNumber(value: number, decimals: number, settings: Settings): string {
  const numberFormat = settings.numberFormat || 'anglo';
  const fixed = value.toFixed(decimals);
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart] = fixed.split('.');
  
  // Add thousands separators based on format
  let formattedInteger: string;
  
  if (numberFormat === 'anglo') {
    // 1,234,567.89
    formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  } else if (numberFormat === 'continental') {
    // 1.234.567,89
    formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decimalPart ? `${formattedInteger},${decimalPart}` : formattedInteger;
  } else {
    // international: 1 234 567,89
    formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return decimalPart ? `${formattedInteger},${decimalPart}` : formattedInteger;
  }
}

/**
 * Get a placeholder example for a number input based on field type and user's number format
 * @param fieldType - Type of field (temperature, gravity, volume, etc.)
 * @param settings - User settings object
 * @returns Placeholder string in user's number format
 */
export function getNumberPlaceholder(fieldType: string, settings: Settings): string {
  const numberFormat = settings.numberFormat || 'anglo';
  
  // Define example values and decimal places for each field type
  const examples: Record<string, { value: number; decimals: number }> = {
    'temperature': { value: 20, decimals: 1 },
    'gravity': { value: 1.050, decimals: 3 },
    'density': { value: 1.050, decimals: 3 },
    'sg': { value: 1.050, decimals: 3 },
    'brix': { value: 12.5, decimals: 1 },
    'plato': { value: 12.5, decimals: 1 },
    'oe': { value: 80.0, decimals: 1 },
    'volume': { value: 20, decimals: 1 },
    'mass': { value: 100, decimals: 1 },
    'percentage': { value: 5.5, decimals: 1 },
    'co2': { value: 2.5, decimals: 1 },
    'days': { value: 14, decimals: 0 },
    'count': { value: 1, decimals: 0 }
  };
  
  const example = examples[fieldType] || { value: 0, decimals: 1 };
  return formatNumber(example.value, example.decimals, settings);
}

/**
 * Get appropriate step value for numeric input based on unit type
 */
export function getStepForUnit(unit: string): string {
  // All units of measure should use 0.1 for reasonable precision
  // Only counts/integers should use step="1"
  
  // Specific gravity - step by 0.001 (needs more precision)
  if (['SG', 'sg'].includes(unit)) {
    return '0.001';
  }
  
  // All other measurement units - step by 0.1
  // Temperature: C, F, K
  // Density: Brix, Plato
  // Volume: L, mL, gal, qt, pt, cup, fl oz, bbl, hL
  // Weight: g, kg, oz, lb
  // Pressure: bar, psi, kPa, atm
  return '0.1';
}

/**
 * Get appropriate number of decimal places for display based on unit type
 */
export function getDecimalsForUnit(unit: string): number {
  // Specific gravity - 3 decimal places
  if (['SG', 'sg'].includes(unit)) {
    return 3;
  }
  
  // Alcohol content (ABV, ABW) - 2 decimal places
  if (['abv', 'abw', 'ABV', 'ABW'].includes(unit)) {
    return 2;
  }
  
  // Temperature units - 1 decimal place
  if (['C', 'F', 'K', 'c', 'f', 'k'].includes(unit)) {
    return 1;
  }
  
  // Brix, Plato - 1 decimal place
  if (['Brix', 'Plato', 'brix', 'plato'].includes(unit)) {
    return 1;
  }
  
  // Volume units - 2 decimal places
  if (['L', 'mL', 'gal', 'qt', 'pt', 'cup', 'fl oz', 'bbl', 'hL', 'l', 'ml'].includes(unit)) {
    return 2;
  }
  
  // Weight units - 2 decimal places
  if (['g', 'kg', 'oz', 'lb'].includes(unit)) {
    return 2;
  }
  
  // Pressure units - 2 decimal places
  if (['bar', 'psi', 'kPa', 'atm'].includes(unit)) {
    return 2;
  }
  
  // Default to 2 decimal places
  return 2;
}

/**
 * Get a placeholder example for a unit input based on the specific unit
 * @param unit - The unit string (e.g., 'sg', 'C', 'L')
 * @param settings - User settings object
 * @returns Placeholder string in user's number format
 */
export function getPlaceholderForUnit(unit: string, settings: Settings): string {
  // Temperature units
  if (['C', 'c'].includes(unit)) {
    return formatNumber(20, 1, settings);
  }
  if (['F', 'f'].includes(unit)) {
    return formatNumber(68, 1, settings);
  }
  if (['K', 'k'].includes(unit)) {
    return formatNumber(293, 1, settings);
  }
  
  // Specific gravity
  if (['SG', 'sg'].includes(unit)) {
    return formatNumber(1.050, 3, settings);
  }
  
  // Brix, Plato
  if (['Brix', 'brix', 'Plato', 'plato'].includes(unit)) {
    return formatNumber(12.5, 1, settings);
  }
  
  // Volume units
  if (['L', 'l'].includes(unit)) {
    return formatNumber(20, 1, settings);
  }
  if (['gal'].includes(unit)) {
    return formatNumber(5, 1, settings);
  }
  if (['mL', 'ml'].includes(unit)) {
    return formatNumber(500, 0, settings);
  }
  
  // Weight units
  if (['g'].includes(unit)) {
    return formatNumber(100, 1, settings);
  }
  if (['kg'].includes(unit)) {
    return formatNumber(1, 1, settings);
  }
  if (['oz'].includes(unit)) {
    return formatNumber(3.5, 1, settings);
  }
  if (['lb'].includes(unit)) {
    return formatNumber(2.2, 1, settings);
  }
  
  // Default
  return formatNumber(1, 1, settings);
}

/**
 * Format temperature according to user settings
 * @param value - Temperature value in Celsius
 * @param settings - User settings object
 * @returns Formatted temperature with unit
 * 
 * @example
 * formatTemperature(20, settings); // "20°C" or "68°F"
 */
export function formatTemperature(value: number, settings: Settings): string {
  const targetUnit = settings.temperatureUnit || 'c';
  
  if (targetUnit === 'f') {
    const converted = convert(value, 'c', 'f', 'temperature');
    return `${Math.round(converted)}°F`;
  }
  
  return `${Math.round(value)}°C`;
}

/**
 * Format mass according to user settings
 * @param value - Mass value in grams
 * @param settings - User settings object
 * @param options - Formatting options
 * @returns Formatted mass with unit
 * 
 * @example
 * formatMass(1000, settings); // "1 kg" or "2.2 lb"
 */
export function formatMass(value: number, settings: Settings, options: FormatOptions = {}): string {
  const decimals = options.decimals ?? 1;
  const system = settings.measurementSystem || 'metric';
  
  // Convert from grams to appropriate unit
  if (system === 'metric') {
    if (value >= 1000) {
      return `${formatNumber(value / 1000, decimals, settings)} kg`;
    }
    return `${formatNumber(value, decimals, settings)} g`;
  } else {
    // Imperial/US uses pounds and ounces
    const lb = convert(value, 'g', 'lb', 'mass');
    if (lb >= 1) {
      return `${formatNumber(lb, decimals, settings)} lb`;
    }
    const oz = convert(value, 'g', 'oz', 'mass');
    return `${formatNumber(oz, decimals, settings)} oz`;
  }
}

/**
 * Format volume according to user settings
 * @param value - Volume value in liters
 * @param settings - User settings object
 * @param options - Formatting options
 * @returns Formatted volume with unit
 * 
 * @example
 * formatVolume(10, settings); // "10 L" or "2.64 gal"
 */
export function formatVolume(value: number, settings: Settings, options: FormatOptions = {}): string {
  const decimals = options.decimals ?? 1;
  const system = settings.measurementSystem || 'metric';
  
  if (system === 'metric') {
    if (value >= 1) {
      return `${formatNumber(value, decimals, settings)} L`;
    }
    return `${formatNumber(value * 1000, 0, settings)} mL`;
  } else if (system === 'us') {
    // US gallons
    const gal = convert(value, 'l', 'gal', 'volume');
    if (gal >= 1) {
      return `${formatNumber(gal, decimals, settings)} gal`;
    }
    const floz = convert(value, 'l', 'fl-oz', 'volume');
    return `${formatNumber(floz, decimals, settings)} fl oz`;
  } else {
    // Imperial gallons
    const gal = convert(value, 'l', 'imp-gal', 'volume');
    if (gal >= 1) {
      return `${formatNumber(gal, decimals, settings)} gal`;
    }
    const floz = convert(value, 'l', 'imp-fl-oz', 'volume');
    return `${formatNumber(floz, decimals, settings)} fl oz`;
  }
}

/**
 * Format density/gravity according to user settings
 * @param value - Density value in SG
 * @param settings - User settings object
 * @returns Formatted density with unit
 * 
 * @example
 * formatDensity(1.050, settings); // "1.050 SG" or "12.4°Bx"
 */
export function formatDensity(value: number, settings: Settings): string {
  const targetUnit = settings.densityUnit || 'sg';
  
  if (targetUnit === 'sg') {
    return `${formatNumber(value, 3, settings)} SG`;
  }
  
  const converted = convert(value, 'sg', targetUnit, 'density');
  
  switch (targetUnit) {
    case 'brix':
      return `${formatNumber(converted, 1, settings)}°Bx`;
    case 'plato':
      return `${formatNumber(converted, 1, settings)}°P`;
    case 'oe':
      return `${formatNumber(converted, 1, settings)}°Oe`;
    default:
      return `${formatNumber(converted, 1, settings)} ${targetUnit}`;
  }
}

/**
 * Format date according to user settings
 * @param date - Date to format (ISO string or Date object)
 * @param settings - User settings object
 * @returns Formatted date
 * 
 * @example
 * formatDate("2025-12-01", settings); // "2025-12-01" or "12/01/2025" or "01/12/2025"
 */
export function formatDate(date: string | Date, settings: Settings): string {
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
 * @param datetime - DateTime to format (ISO string or Date object)
 * @param settings - User settings object
 * @returns Formatted time
 * 
 * @example
 * formatTime("2025-12-01T14:30:00", settings); // "14:30" or "2:30 PM"
 */
export function formatTime(datetime: string | Date, settings: Settings): string {
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
 * @param datetime - DateTime to format
 * @param settings - User settings object
 * @returns Formatted datetime
 * 
 * @example
 * formatDateTime("2025-12-01T14:30:00", settings); // "2025-12-01 14:30" or "12/01/2025 2:30 PM"
 */
export function formatDateTime(datetime: string | Date, settings: Settings): string {
  return `${formatDate(datetime, settings)} ${formatTime(datetime, settings)}`;
}

/**
 * Format ABV percentage
 * @param abv - ABV value (e.g., 12.5)
 * @returns Formatted ABV
 * 
 * @example
 * formatABV(12.5); // "12.5% ABV"
 */
export function formatABV(abv: number, settings: Settings): string {
  return `${formatNumber(abv, 1, settings)}% ABV`;
}

/**
 * Format duration in days
 * @param days - Number of days
 * @returns Formatted duration
 * 
 * @example
 * formatDuration(14); // "14 days"
 * formatDuration(1); // "1 day"
 */
export function formatDuration(days: number): string {
  if (days === 1) return '1 day';
  return `${days} days`;
}

/**
 * Format currency according to user settings
 * @param amount - Amount to format
 * @param settings - User settings object
 * @returns Formatted currency with symbol
 * 
 * @example
 * formatCurrency(19.99, settings); // "€19.99" or "$19.99" or "£19.99"
 */
export function formatCurrency(amount: number, settings: Settings): string {
  const symbol = settings.currencySymbol || '€';
  return `${symbol}${formatNumber(amount, 2, settings)}`;
}

/**
 * Formatters object with all format functions
 */
export interface Formatters {
  temperature: (value: number) => string;
  mass: (value: number, options?: FormatOptions) => string;
  volume: (value: number, options?: FormatOptions) => string;
  density: (value: number) => string;
  date: (value: string | Date) => string;
  time: (value: string | Date) => string;
  datetime: (value: string | Date) => string;
  abv: (value: number) => string;
  duration: (value: number) => string;
  currency: (value: number) => string;
  number: (value: number, decimals?: number) => string;
}

/**
 * Get all format functions with settings pre-applied
 * @param settings - User settings object
 * @returns Object with all format functions
 * 
 * @example
 * const fmt = getFormatters(settings);
 * fmt.temperature(20); // "68°F"
 * fmt.mass(1000); // "2.2 lb"
 */
export function getFormatters(settings: Settings): Formatters {
  return {
    temperature: (value: number) => formatTemperature(value, settings),
    mass: (value: number, options?: FormatOptions) => formatMass(value, settings, options),
    volume: (value: number, options?: FormatOptions) => formatVolume(value, settings, options),
    density: (value: number) => formatDensity(value, settings),
    date: (value: string | Date) => formatDate(value, settings),
    time: (value: string | Date) => formatTime(value, settings),
    datetime: (value: string | Date) => formatDateTime(value, settings),
    abv: (value: number) => formatABV(value, settings),
    duration: (value: number) => formatDuration(value),
    currency: (value: number) => formatCurrency(value, settings),
    number: (value: number, decimals: number = 1) => formatNumber(value, decimals, settings)
  };
}
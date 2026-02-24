export type TemperatureUnit = 'c' | 'f';
export type MeasurementSystem = 'metric' | 'imperial' | 'us';
export type DensityUnit = 'sg' | 'brix' | 'plato' | 'oe';
export type AbvMethod = 'abv-basic' | 'abv-berry' | 'abv-hall' | 'abv-hmrc';
export type DateFormat = 'iso' | 'us' | 'uk';
export type TimeFormat = '24h' | '12h';
export type Theme = 'light' | 'dark' | 'auto';
export type NumberFormat = 'anglo' | 'continental' | 'international';

export interface UserSettings {
  settingsID: number;
  temperatureUnit: TemperatureUnit;
  measurementSystem: MeasurementSystem;
  densityUnit: DensityUnit;
  abvMethod: AbvMethod;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  theme: Theme;
  language: string;
  currencySymbol: string;
  numberFormat: NumberFormat;
}

export interface SettingsUpdate {
  temperatureUnit?: TemperatureUnit;
  measurementSystem?: MeasurementSystem;
  densityUnit?: DensityUnit;
  abvMethod?: AbvMethod;
  dateFormat?: DateFormat;
  timeFormat?: TimeFormat;
  theme?: Theme;
  language?: string;
  currencySymbol?: string;
  numberFormat?: NumberFormat;
}

export const ABV_METHOD_DESCRIPTIONS: Record<AbvMethod, string> = {
  'abv-basic': 'Quick estimation using a fixed multiplier. Appropriate for lower alcohol products like beers and ciders. Less accurate at higher gravities.',
  'abv-berry': "Formula from 'First Steps in Winemaking' by C.J.J. Berry. More appropriate for wine and mead than the Basic method.",
  'abv-hall': "Advanced formula from 'Brew By The Numbers' that accounts for alcohol's lower density. More precise than simpler methods.",
  'abv-hmrc': 'Official UK tax authority formula using thresholds based on gravity change. Required for commercial production in the UK. Most conservative calculation.',
}

export const NUMBER_FORMAT_DESCRIPTIONS: Record<string, string> = {
  'anglo': 'Used in USA, UK, Australia, Canada. Decimal: period (.) • Thousands: comma (,)',
  'continental': 'Used in Germany, Italy, Spain, Netherlands. Decimal: comma (,) • Thousands: period (.)',
  'international': 'Used in France, Russia, scientific notation. Decimal: comma (,) • Thousands: space'
};
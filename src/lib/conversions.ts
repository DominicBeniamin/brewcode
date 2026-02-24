// Conversion constants and lookup tables

// ALCOHOL CONTENT (base unit: ABV)
const ALCOHOL_TO_ABV: Record<string, number> = {
  abv: 1,
  abw: 1.25944584383,
  'proof(us)': 0.5,
  'proof(uk)': 0.5714285714,
};

// DENSITY (base unit: g/L)
const DENSITY_TO_G_L: Record<string, number> = {
  'g/ml': 1000,
  'g/cm3': 1000,
  'g/l': 1,
  'kg/m3': 1,
  'lb/gal(us)': 119.826,
  'lb/gal(uk)': 99.7764,
  'lb/ft3': 16.0185,
  kmw: 10,
};

// Complex brewing scales (empirical formulae)
const sgToGl = (sg: number): number => sg * 1000;
const glToSg = (gl: number): number => gl / 1000;
const brixToGl = (brix: number): number => {
  const sg = 1 + brix / (258.6 - (brix / 258.2) * 227.1);
  return sgToGl(sg);
};
const glToBrix = (gl: number): number => {
  const sg = glToSg(gl);
  return 182.4601 * Math.pow(sg, 3) - 775.6821 * Math.pow(sg, 2) + 1262.7794 * sg - 669.5622;
};
const platoToGl = brixToGl;
const glToPlato = glToBrix;
const oeToGl = (oe: number): number => {
  const sg = oe / 1000 + 1;
  return sgToGl(sg);
};
const glToOe = (gl: number): number => {
  const sg = glToSg(gl);
  return (sg - 1) * 1000;
};
const twToGl = (tw: number): number => {
  const sg = 1 + tw / 200;
  return sgToGl(sg);
};
const glToTw = (gl: number): number => {
  const sg = glToSg(gl);
  return (sg - 1) * 200;
};

const DENSITY_COMPLEX: Record<string, [(val: number) => number, (val: number) => number]> = {
  sg: [sgToGl, glToSg],
  brix: [brixToGl, glToBrix],
  plato: [platoToGl, glToPlato],
  oe: [oeToGl, glToOe],
  tw: [twToGl, glToTw],
};

// MASS (base unit: grams)
const MASS_TO_G: Record<string, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  tonne: 1_000_000,
  gr: 0.06479891,
  dr: 1.7718451953125,
  oz: 28.349523125,
  lb: 453.59237,
  ton: 907_184.74,
};

// VOLUME (base unit: litres)
const VOLUME_TO_L: Record<string, number> = {
  ml: 0.001,
  l: 1,
  cl: 0.01,
  dl: 0.1,
  m3: 1000,
  tsp: 0.00492892,
  tbsp: 0.0147868,
  'fl-oz': 0.0295735,
  cup: 0.24,
  pt: 0.473176,
  qt: 0.946353,
  gal: 3.78541,
  'imp-fl-oz': 0.0284131,
  'imp-pt': 0.568261,
  'imp-qt': 1.13652,
  'imp-gal': 4.54609,
};

// TEMPERATURE (base unit: Celsius)
const cIdentity = (c: number): number => c;
const fToC = (f: number): number => ((f - 32) * 5) / 9;
const cToF = (c: number): number => (c * 9) / 5 + 32;
const kToC = (k: number): number => k - 273.15;
const cToK = (c: number): number => c + 273.15;

const OTHER_TO_C: Record<string, (val: number) => number> = {
  c: cIdentity,
  k: kToC,
  f: fToC,
};

const C_TO_OTHER: Record<string, (val: number) => number> = {
  c: cIdentity,
  k: cToK,
  f: cToF,
};

// Conversion functions
function convertDensity(value: number, fromUnit: string, toUnit: string): number {
  let valueInGl: number;

  if (fromUnit in DENSITY_TO_G_L) {
    valueInGl = value * DENSITY_TO_G_L[fromUnit];
  } else if (fromUnit in DENSITY_COMPLEX) {
    const toGl = DENSITY_COMPLEX[fromUnit][0];
    valueInGl = toGl(value);
  } else {
    throw new Error(`Unsupported density unit: ${fromUnit}`);
  }

  let valueInToUnit: number;
  if (toUnit in DENSITY_TO_G_L) {
    valueInToUnit = valueInGl / DENSITY_TO_G_L[toUnit];
  } else if (toUnit in DENSITY_COMPLEX) {
    const fromGl = DENSITY_COMPLEX[toUnit][1];
    valueInToUnit = fromGl(valueInGl);
  } else {
    throw new Error(`Unsupported density unit: ${toUnit}`);
  }

  return valueInToUnit;
}

function convertMass(value: number, fromUnit: string, toUnit: string): number {
  const valueInG = value * MASS_TO_G[fromUnit];
  return valueInG / MASS_TO_G[toUnit];
}

function convertVolume(value: number, fromUnit: string, toUnit: string): number {
  const valueInL = value * VOLUME_TO_L[fromUnit];
  return valueInL / VOLUME_TO_L[toUnit];
}

function convertTemperature(value: number, fromUnit: string, toUnit: string): number {
  const valueInC = OTHER_TO_C[fromUnit](value);
  return C_TO_OTHER[toUnit](valueInC);
}

function convertAlcohol(value: number, fromUnit: string, toUnit: string): number {
  const valueInAbv = value * ALCOHOL_TO_ABV[fromUnit];
  return valueInAbv / ALCOHOL_TO_ABV[toUnit];
}

// Conversions registry
export interface ConversionCategory {
  label: string;
  function: (value: number, fromUnit: string, toUnit: string) => number;
  units: Record<string, string>;
}

export const CONVERSIONS: Record<string, ConversionCategory> = {
  alcohol: {
    label: 'Alcohol Content',
    function: convertAlcohol,
    units: {
      abv: '% by Vol',
      abw: '% by Wt',
      'proof(us)': 'proof (US)',
      'proof(uk)': 'proof (UK)',
    },
  },
  density: {
    label: 'Density',
    function: convertDensity,
    units: {
      'g/ml': 'g/mL',
      'g/cm3': 'g/cm³',
      'g/l': 'g/L',
      'kg/m3': 'kg/m³',
      'lb/gal(us)': 'lb/gal (US)',
      'lb/gal(uk)': 'lb/gal (UK)',
      'lb/ft3': 'lb/ft³',
      sg: 'Specific Gravity',
      brix: '°Bx',
      plato: '°P',
      oe: '°Oe',
      kmw: '°KMW',
      tw: '°Tw',
    },
  },
  mass: {
    label: 'Mass',
    function: convertMass,
    units: {
      mg: 'mg',
      g: 'g',
      kg: 'kg',
      tonne: 'tonne',
      gr: 'gr',
      dr: 'dr',
      oz: 'oz',
      lb: 'lb',
      ton: 'ton',
    },
  },
  temperature: {
    label: 'Temperature',
    function: convertTemperature,
    units: {
      c: '°C',
      f: '°F',
      k: 'K',
    },
  },
  volume: {
    label: 'Volume',
    function: convertVolume,
    units: {
      ml: 'mL',
      l: 'L',
      cl: 'cL',
      dl: 'dL',
      m3: 'm³',
      tsp: 'tsp',
      tbsp: 'Tbsp',
      'fl-oz': 'fl oz (US)',
      cup: 'cup (US)',
      pt: 'pt (US)',
      qt: 'qt (US)',
      gal: 'gal (US)',
      'imp-fl-oz': 'fl oz (imperial)',
      'imp-pt': 'pt (imperial)',
      'imp-qt': 'qt (imperial)',
      'imp-gal': 'gal (imperial)',
    },
  },
};

// Utility functions
export function normaliseUnit(unit: string, category: string): string {
  const categoryLower = category.toLowerCase();
  const unitLower = unit.toLowerCase();

  if (!(categoryLower in CONVERSIONS)) {
    throw new Error(`Unsupported conversion category: ${category}`);
  }

  const units = CONVERSIONS[categoryLower].units;

  if (unitLower in units) {
    return unitLower;
  }

  for (const [key, label] of Object.entries(units)) {
    if (label.toLowerCase() === unitLower) {
      return key;
    }
  }

  throw new Error(`Unsupported unit: ${unit} in category: ${category}`);
}

export function convert(value: number, fromUnit: string, toUnit: string, category: string): number {
  const categoryLower = category.toLowerCase();
  const fromUnitNorm = normaliseUnit(fromUnit, categoryLower);
  const toUnitNorm = normaliseUnit(toUnit, categoryLower);
  return CONVERSIONS[categoryLower].function(value, fromUnitNorm, toUnitNorm);
}

export function densityCorrection(
  value: number,
  sampleTemp: number,
  calibrationTemp: number,
  temperatureUnit: string,
  densityUnit: string
): number {
  const temperatureUnitNorm = normaliseUnit(temperatureUnit, 'temperature');
  const densityUnitNorm = normaliseUnit(densityUnit, 'density');

  const sampleTempF = convertTemperature(sampleTemp, temperatureUnitNorm, 'f');
  const calibrationTempF = convertTemperature(calibrationTemp, temperatureUnitNorm, 'f');

  const densityInSG = convertDensity(value, densityUnitNorm, 'sg');

  const correctedSG =
    densityInSG *
    ((1.00130346 -
      0.000134722124 * sampleTempF +
      0.00000204052596 * sampleTempF ** 2 -
      0.00000000232820948 * sampleTempF ** 3) /
      (1.00130346 -
        0.000134722124 * calibrationTempF +
        0.00000204052596 * calibrationTempF ** 2 -
        0.00000000232820948 * calibrationTempF ** 3));

  return convertDensity(correctedSG, 'sg', densityUnitNorm);
}
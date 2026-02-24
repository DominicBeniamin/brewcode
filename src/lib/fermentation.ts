import { densityCorrection, normaliseUnit, convert } from './conversions';

// ABV calculation functions
function abvBasic(originalSg: number, finalSg: number): number {
  return (originalSg - finalSg) * 131.25;
}

function abvBerry(originalSg: number, finalSg: number): number {
  return ((originalSg - finalSg) / 0.736) * 100;
}

function abvHall(originalSg: number, finalSg: number): number {
  const deltaSg = originalSg - finalSg;
  const abw = (76.08 * deltaSg) / (1.775 - originalSg);
  return abw / 0.794;
}

function abvHMRC(originalSg: number, finalSg: number): number {
  const thresholds: [number, number][] = [
    [0.0069, 125],
    [0.0104, 126],
    [0.0172, 127],
    [0.0261, 128],
    [0.036, 129],
    [0.0465, 130],
    [0.0571, 131],
    [0.0679, 132],
    [0.0788, 133],
    [0.0897, 134],
    [0.1007, 135],
  ];

  const deltaSg = originalSg - finalSg;

  for (const [threshold, multiplier] of thresholds) {
    if (deltaSg <= threshold) {
      return deltaSg * multiplier;
    }
  }

  return deltaSg * 135;
}

export interface AbvFormula {
  label: string;
  function: (originalSg: number, finalSg: number) => number;
}

export const FORMULAE: Record<string, AbvFormula> = {
  'abv-basic': { label: 'Basic', function: abvBasic },
  'abv-berry': { label: 'Berry', function: abvBerry },
  'abv-hall': { label: 'Hall', function: abvHall },
  'abv-hmrc': { label: 'HMRC', function: abvHMRC },
};

export interface AbvParams {
  originalReading?: number;
  finalReading?: number;
  densityScale?: string;
  tempScale?: string;
  calibrationTemp?: number;
  formula?: string;
  originalTemp?: number | null;
  finalTemp?: number | null;
}

export function abv({
  originalReading = 1.0,
  finalReading = 1.0,
  densityScale = 'sg',
  tempScale = 'c',
  calibrationTemp = 20.0,
  formula = 'abv-basic',
  originalTemp = null,
  finalTemp = null,
}: AbvParams = {}): number {
  const originalCorrected = densityCorrection(
    originalReading,
    originalTemp ?? calibrationTemp,
    calibrationTemp,
    tempScale,
    densityScale
  );

  const finalCorrected = densityCorrection(
    finalReading,
    finalTemp ?? calibrationTemp,
    calibrationTemp,
    tempScale,
    densityScale
  );

  const originalSg = convert(originalCorrected, densityScale, 'sg', 'density');
  const finalSg = convert(finalCorrected, densityScale, 'sg', 'density');

  if (!(formula in FORMULAE)) {
    throw new Error(`Invalid formula '${formula}'. Must be one of: ${Object.keys(FORMULAE).join(', ')}`);
  }

  return FORMULAE[formula].function(originalSg, finalSg);
}

export interface PrimingParams {
  beverageVolume: number;
  volumeUnit?: string;
  beverageTemp?: number;
  tempScale?: string;
  desiredVolCo2?: number;
  sugarType?: string;
  sugarDensity?: number | null;
  fermentableFraction?: number | null;
  customFactor?: number | null;
}

export interface PrimingResult {
  massG: number;
  volumeMl: number;
  deltaSg: number;
  newVolumeL: number;
}

export function priming({
  beverageVolume,
  volumeUnit = 'l',
  beverageTemp = 20.0,
  tempScale = 'c',
  desiredVolCo2 = 2.0,
  sugarType = 'dextrose',
  sugarDensity = null,
  fermentableFraction = null,
  customFactor = null,
}: PrimingParams): PrimingResult {
  const volumeUnitNorm = normaliseUnit(volumeUnit, 'volume');
  const tempScaleNorm = normaliseUnit(tempScale, 'temperature');

  const beverageVolumeL = convert(beverageVolume, volumeUnitNorm, 'l', 'volume');
  const tempC = convert(beverageTemp, tempScaleNorm, 'c', 'temperature');

  const residualCo2 = 3.0378 - 0.050062 * tempC + 0.00026555 * tempC ** 2;

  const additionalCo2 = Math.max(0, desiredVolCo2 - residualCo2);

  let factor: number;
  let sugarDensityVal: number | null;

  if (customFactor !== null) {
    factor = customFactor;
    sugarDensityVal = sugarDensity;
  } else {
    const defaults: Record<string, { fermentable: number; density: number }> = {
      dextrose: { fermentable: 1.0, density: 1587 },
      sucrose: { fermentable: 1.0, density: 1587 },
      honey: { fermentable: 0.75, density: 1420 },
      maltose: { fermentable: 1.0, density: 1540 },
    };

    const sugarDefaults = defaults[sugarType] || defaults['dextrose'];

    const finalFermentable = fermentableFraction ?? sugarDefaults.fermentable;
    sugarDensityVal = sugarDensity ?? sugarDefaults.density;

    factor = 4.01 * finalFermentable;
  }

  const sugarNeededG = beverageVolumeL * additionalCo2 * factor;

  if (sugarDensityVal === null) {
    throw new Error('Sugar density must be provided or resolved from defaults.');
  }

  const sugarVolumeML = (sugarNeededG / sugarDensityVal) * 1000;

  const deltaSg = (sugarNeededG / beverageVolumeL) * 0.0004;
  const newVolumeL = beverageVolumeL + sugarVolumeML / 1000;

  return {
    massG: sugarNeededG,
    volumeMl: sugarVolumeML,
    deltaSg,
    newVolumeL,
  };
}
// fermentation.js

import { densityCorrection, normaliseUnit, convert } from './conversions.js';

// Functions for estimating Alcohol by Volume (ABV)

function abvBasic(originalSg, finalSg) {
    return (originalSg - finalSg) * 131.25;
};

function abvBerry(originalSg, finalSg) {
    //Reference: Berry, Cyril J. J. "First Steps in Winemaking" (1998) p. 83
    return (originalSg - finalSg) / 0.736 * 100;
};

function abvHall(originalSg, finalSg) {
    // Reference: Brew By The Numbers by Michael Hall (Zymurgy, Vol. 18 No. 2, Summer 1995)
    const deltaSg = originalSg - finalSg;
    const abw = (76.08 * deltaSg) / (1.775 - originalSg);
    return abw / 0.794;
};

function abvHMRC(originalSg, finalSg) {
    // Reference: UK HMRC Guidelines: https://www.gov.uk/government/publications/excise-notice-226-beer-duty/excise-notice-226-beer-duty--2#calculation-strength
    const thresholds = [
        [0.0069, 125], [0.0104, 126], [0.0172, 127], [0.0261, 128],
        [0.0360, 129], [0.0465, 130], [0.0571, 131], [0.0679, 132],
        [0.0788, 133], [0.0897, 134], [0.1007, 135]
    ];
    
    const deltaSg = originalSg - finalSg;
    
    for (const [threshold, multiplier] of thresholds) {
        if (deltaSg <= threshold) {
            return deltaSg * multiplier;
        }
    }
    
    return deltaSg * 135;  // Fallback multiplier
};

// Registry of all supported ABV formulas

const FORMULAE = {
    "abv-basic": { label: "Basic", function: abvBasic },
    "abv-berry": { label: "Berry", function: abvBerry },
    "abv-hall": { label: "Hall", function: abvHall },
    "abv-hmrc": { label: "HMRC", function: abvHMRC }
};

// Unified ABV calculation
function abv({
    originalReading = 1.000,
    finalReading = 1.000,
    densityScale = "sg",
    tempScale = "c",
    calibrationTemp = 20.0,
    formula = "abv-basic",
    originalTemp = null,
    finalTemp = null
} = {}) {
    // Step 1: Apply temperature correction to original reading
        const originalCorrected = densityCorrection(
        originalReading, originalTemp ?? calibrationTemp, calibrationTemp, tempScale, densityScale
    );

    // Step 2: Apply temperature correction to final reading
        const finalCorrected = densityCorrection(
        finalReading, finalTemp ?? calibrationTemp, calibrationTemp, tempScale, densityScale
    );
    
    // Step 3: Convert both to SG
    const originalSg = convert(originalCorrected, densityScale, "sg", "density");
    const finalSg = convert(finalCorrected, densityScale, "sg", "density");
    
    // Step 4: Verify formula
    if (!(formula in FORMULAE)) {
    throw new Error(`Invalid formula '${formula}'. Must be one of: ${Object.keys(FORMULAE).join(', ')}`);
    }

    //Step 5: Calculate ABV using the selected formula
    const abvValue = FORMULAE[formula].function(originalSg, finalSg); 
    
    // Step 6: Return the ABV value in the requested unit
    return abvValue;
};

function priming({
    beverageVolume,
    volumeUnit = "l",
    beverageTemp = 20.0,
    tempScale = "c",
    desiredVolCo2 = 2.0,
    sugarType = "dextrose",
    sugarDensity = null,
    fermentableFraction = null,
    customFactor = null
    } = {}) {
    // Step 1: Normalize units
    const volumeUnitNorm = normaliseUnit(volumeUnit, "volume");
    const tempScaleNorm = normaliseUnit(tempScale, "temperature");

    // Step 2: Convert to base units (liters, Celsius)
    const beverageVolumeL = convert(beverageVolume, volumeUnitNorm, "l", "volume");
    const tempC = convert(beverageTemp, tempScaleNorm, "c", "temperature");
    
    // Step 3: Calculate residual CO₂
    // Formula: 3.0378 - (0.050062 * temp_c) + (0.00026555 * temp_c²)
    const residualCo2 = 3.0378 - (0.050062 * tempC) + (0.00026555 * tempC ** 2);
    
    // Step 4: Calculate additional CO₂ needed
    const additionalCo2 = Math.max(0, desiredVolCo2 - residualCo2); // Ensure non-negative
    
    // Step 5: Determine sugar properties (defaults or custom)
    let factor;
    let sugarDensityVal;

    if (customFactor !== null) {
        // User provided custom factor - use it
        factor = customFactor;
        sugarDensityVal = sugarDensity; // May still be null
    } else {
        // Use defaults based on sugar type
        const defaults = {
            "dextrose": { fermentable: 1.0, density: 1587 },
            "sucrose": { fermentable: 1.0, density: 1587 },
            "honey": { fermentable: 0.75, density: 1420 },
            "maltose": { fermentable: 1.0, density: 1540 }
        };
        
        // Get defaults for this sugar type (or use dextrose if unknown)
        const sugarDefaults = defaults[sugarType] || defaults["dextrose"];
        
        // Use provided values OR defaults
        const finalFermentable = fermentableFraction ?? sugarDefaults.fermentable;
        sugarDensityVal = sugarDensity ?? sugarDefaults.density;
        
        // Calculate factor: 4.01 g/L per volume CO₂ per fermentable fraction
        factor = 4.01 * finalFermentable;
    }
    
    // Step 6: Calculate sugar needed (grams)
    const sugarNeededG = beverageVolumeL * additionalCo2 * factor;
    
    // Step 7: Calculate sugar volume (mL)
    if (sugarDensityVal === null) {
        throw new Error("Sugar density must be provided or resolved from defaults.");
    }
    const sugarVolumeML = sugarNeededG / sugarDensityVal * 1000; // Convert g to mL
    
    // Step 8: Calculate delta SG and new volume
    const deltaSg = (sugarNeededG / beverageVolumeL) * 0.0004; // Approximate impact on SG
    const newVolumeL = beverageVolumeL + (sugarVolumeML / 1000); // Convert mL to L
    
    // Return object with all results
    return {
        massG: sugarNeededG,
        volumeMl: sugarVolumeML,
        deltaSg: deltaSg,
        newVolumeL: newVolumeL
    };
};

export {
    FORMULAE,
    abv,
    priming
};
// 1. CONVERSION CONSTANTS (lookup tables)

// ALCOHOL CONTENT (base unit: ABV)
const ALCOHOL_TO_ABV = {
    "abv": 1,
    "abw": 1.25944584383,     // ABW → ABV: multiply by 1.25944584383
    "proof(us)": 0.5,         // US proof → ABV: multiply by 0.5
    "proof(uk)": 0.5714285714 // UK proof → ABV: multiply by 1/1.75
};

// DENSITY (base unit: g/L)
// Factor-based units (simple scaling)
const DENSITY_TO_G_L = {
    "g/ml": 1000,       // grams per millilitre
    "g/cm3": 1000,    // grams per cubic centimetre (same as g/mL)
    "g/l": 1,           // grams per litre (base unit)
    "kg/m3": 1,         // kilograms per cubic metre (same as g/L)
    "lb/gal(us)": 119.826,   // pounds per US gallon
    "lb/gal(uk)": 99.7764,   // pounds per Imperial gallon
    "lb/ft3": 16.0185,       // pounds per cubic foot
    "kmw": 10               // Klosterneuburger Mostwaage (°KMW)
}

// Complex brewing scales (empirical formulas)
const sgToGl = (sg) => sg * 1000;
const glToSg = (gl) => gl / 1000;
const brixToGl = (brix) => {
    const sg = 1 + (brix / (258.6 - ((brix / 258.2) * 227.1)));
    return sgToGl(sg);
};
const glToBrix = (gl) => {
    const sg = glToSg(gl);
    return (182.4601 * Math.pow(sg, 3)) - (775.6821 * Math.pow(sg, 2)) + (1262.7794 * sg) - 669.5622;
};
const platoToGl = brixToGl; // Equivalent to °Bx
const glToPlato = glToBrix;
const oeToGl = (oe) => {
    const sg = (oe / 1000) + 1;
    return sgToGl(sg);
};
const glToOe = (gl) => {
    const sg = glToSg(gl);
    return (sg - 1) * 1000;
};
const twToGl = (tw) => {
    const sg = 1 + (tw / 200);
    return sgToGl(sg);
};
const glToTw = (gl) => {
    const sg = glToSg(gl);
    return (sg - 1) * 200;
};

// Registry of complex conversions
const DENSITY_COMPLEX = {
    "sg": [sgToGl, glToSg],
    "brix": [brixToGl, glToBrix],
    "plato": [platoToGl, glToPlato],
    "oe": [oeToGl, glToOe],
    "tw": [twToGl, glToTw],
};

// MASS (base unit: grams)
const MASS_TO_G = {
    "mg": 0.001,
    "g": 1,
    "kg": 1000,
    "tonne": 1_000_000,      // metric tonne
    "gr": 0.06479891,         // grain
    "dr": 1.7718451953125,    // dram
    "oz": 28.349523125,       // ounce
    "lb": 453.59237,          // pound
    "ton": 907_184.74,        // US short ton
};

// VOLUME (base unit: liters)
const VOLUME_TO_L = {
    "ml": 0.001,
    "l": 1,
    "cl": 0.01,
    "dl": 0.1,
    "m3": 1000,
    "tsp": 0.00492892,      // US teaspoon
    "tbsp": 0.0147868,      // US tablespoon
    "fl-oz": 0.0295735,     // US fluid ounce
    "cup": 0.24,            // Metric cup
    "pt": 0.473176,         // US pint
    "qt": 0.946353,         // US quart
    "gal": 3.78541,         // US gallon
    "imp-fl-oz": 0.0284131, // Imperial fluid ounce
    "imp-pt": 0.568261,     // Imperial pint
    "imp-qt": 1.13652,      // Imperial quart
    "imp-gal": 4.54609,     // Imperial gallon
};

// TEMPERATURE (base unit: Celsius)
const cIdentity = (c) => c;
const fToC = (f) => (f - 32) * 5 / 9;
const cToF = (c) => (c * 9 / 5) + 32;
const kToC = (k) => k - 273.15;
const cToK = (c) => c + 273.15;


const OTHER_TO_C = {
    "c": cIdentity,
    "k": kToC,
    "f": fToC,
};

const C_TO_OTHER = {
    "c": cIdentity,
    "k": cToK,
    "f": cToF,
};

// 2. CONVERSION FUNCTIONS

function convertDensity(value, fromUnit, toUnit) {
    let valueInGl;
    let valueInToUnit;
    
    // Step 1: Convert TO g/L
    if (fromUnit in DENSITY_TO_G_L) {
        const valueInGl = value * DENSITY_TO_G_L[fromUnit];
    } else if (fromUnit in DENSITY_COMPLEX) {
        const toGl = DENSITY_COMPLEX[fromUnit][0];  // Get the conversion function
        valueInGl = toGl(value);                    // Call it
    } else {
        throw new Error(`Unsupported density unit: ${fromUnit}`);
    }
    
    // Step 2: Convert FROM g/L
    if (toUnit in DENSITY_TO_G_L) {
        valueInToUnit = valueInGl / DENSITY_TO_G_L[toUnit];
    } else if (toUnit in DENSITY_COMPLEX) {
        const fromGl = DENSITY_COMPLEX[toUnit][1]; // Get the conversion function
        valueInToUnit = fromGl(valueInGl);             // Call it
    } else {
        throw new Error(`Unsupported density unit: ${toUnit}`);
    }
    return valueInToUnit;
};

function convertMass(value, fromUnit, toUnit) {
    const valueInG = value * MASS_TO_G[fromUnit];
    return valueInG / MASS_TO_G[toUnit];
};

function convertVolume(value, fromUnit, toUnit) {
    const valueInL = value * VOLUME_TO_L[fromUnit];
    return valueInL / VOLUME_TO_L[toUnit];
};

function convertTemperature(value, fromUnit, toUnit) {
    const valueInC = OTHER_TO_C[fromUnit](value);
    return C_TO_OTHER[toUnit](valueInC);
};

function convertAlcohol(value, fromUnit, toUnit) {
    const valueInAbv = value * ALCOHOL_TO_ABV[fromUnit];
    return valueInAbv / ALCOHOL_TO_ABV[toUnit];
};


// 3. CONVERSIONS REGISTRY (references the functions above)
const CONVERSIONS = {
    "alcohol": {
        label: "Alcohol Content",
        function: convertAlcohol,
        units: {
            "abv": "% by Vol",
            "abw": "% by Wt",
            "proof(us)": "proof (US)",
            "proof(uk)": "proof (UK)"
        }
    },
    "density": {
        label: "Density",
        function: convertDensity,
        units: {
            "g/ml": "g/mL",
            "g/cm3": "g/cm³",
            "g/l": "g/L",
            "kg/m3": "kg/m³",
            "lb/gal(us)": "lb/gal (US)",
            "lb/gal(uk)": "lb/gal (UK)",
            "lb/ft3": "lb/ft³",
            "sg": "Specific Gravity",
            "brix": "°Bx",
            "plato": "°P",
            "oe": "°Oe",
            "kmw": "°KMW",
            "tw": "°Tw"
        }
    },
    "mass": {
        label: "Mass",
        function: convertMass,
        units: {
            "mg": "mg",
            "g": "g",
            "kg": "kg",
            "tonne": "tonne",
            "gr": "gr",
            "dr": "dr",
            "oz": "oz",
            "lb": "lb",
            "ton": "ton"
        }
    },
    "temperature": {
        label: "Temperature",
        function: convertTemperature,
        units: {
            "c":"°C",
            "f":"°F",
            "k":"K"
        }
    },
    "volume": {
        label: "Volume",
        function: convertVolume,
        units: {
            "ml": "mL",
            "l": "L",
            "cl": "cL",
            "dl": "dL",
            "m3": "m³",
            "tsp": "tsp",
            "tbsp": "Tbsp",
            "fl-oz": "fl oz (US)",
            "cup": "cup (US)",
            "pt": "pt (US)",
            "qt": "qt (US)",
            "gal": "gal (US)",
            "imp-fl-oz": "fl oz (imperial)",
            "imp-pt": "pt (imperial)",
            "imp-qt": "qt (imperial)",
            "imp-gal": "gal (imperial)"
        }
    }
};

// 4. UTILITY FUNCTIONS

// User input normalisation
function normaliseUnit(unit, category) {
    // Convert inputs to lowercase for case-insensitive matching
    const categoryLower = category.toLowerCase();
    const unitLower = unit.toLowerCase();

    // Check if category exists
    if (!(categoryLower in CONVERSIONS)) {
        throw new Error(`Unsupported conversion category: ${category}`);
    }

    const units = CONVERSIONS[categoryLower].units;

    // Check for exact match
    if (unitLower in units) {
        return unitLower; // Return the normalised unit
    }

    // Loop through units to find the matching unit label
    for (const [key, label] of Object.entries(units)) {
        if (label.toLowerCase() === unitLower) {
            return key;
        }
    }

    throw new Error(`Unsupported unit: ${unit} in category: ${category}`);
};

function convert(value, fromUnit, toUnit, category) {
    // Convert inputs to lowercase for case-insensitive matching
    const categoryLower = category.toLowerCase();
    const fromUnitNorm = normaliseUnit(fromUnit, categoryLower);
    const toUnitNorm = normaliseUnit(toUnit, categoryLower);
    // Perform conversion
    return CONVERSIONS[categoryLower].function(value, fromUnitNorm, toUnitNorm);
}

function densityCorrection(value, sampleTemp, calibrationTemp, temperatureUnit, densityUnit) {
    // Normalise units
    const temperatureUnitNorm = normaliseUnit(temperatureUnit, "temperature");
    const densityUnitNorm = normaliseUnit(densityUnit, "density");
    // Convert sample and calibration temperatures to Fahrenheit
    const sampleTempF = convertTemperature(sampleTemp, temperatureUnitNorm, "f");
    const calibrationTempF = convertTemperature(calibrationTemp, temperatureUnitNorm, "f");
    // Convert density to Specific Gravity
    const densityInSG = convertDensity(value, densityUnitNorm, "sg");
    // Apply the ASBC polynomial correction formula
    // Reference: https://www.asbcnet.org/standards/MethodsDocuments/methods/Beer-4C.pdf (page 4)
    // Note: The formula assumes the density is measured at the sample temperature and corrects it to the calibration temperature
    const correctedSG = densityInSG * ((1.00130346 - 0.000134722124 * sampleTempF + 0.00000204052596 * sampleTempF ** 2 - 0.00000000232820948 * sampleTempF ** 3) /
        (1.00130346 - 0.000134722124 * calibrationTempF + 0.00000204052596 * calibrationTempF ** 2 - 0.00000000232820948 * calibrationTempF ** 3));
    // Convert back to original density unit
    return convertDensity(correctedSG, "sg", densityUnitNorm);
}
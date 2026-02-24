import { useState, useEffect, ChangeEvent } from 'react';
import { abv, FORMULAE } from '../../lib/fermentation';
import { CONVERSIONS } from '../../lib/conversions';
import { useSettings } from '../../contexts/SettingsContext';
import { useFormatters } from '../../hooks/useFormatters';
import { INPUT_WIDTHS } from '../common/FormComponents';
import { getPlaceholderForUnit, getStepForUnit, getDecimalsForUnit } from '../../lib/formatHelpers';

export function ABVCalculator() {
  const { settings } = useSettings();
  const formatters = useFormatters();
  
  const defaultTempUnit = settings?.temperatureUnit || 'c';
  const defaultCalibrationTemp = defaultTempUnit === 'f' ? '68' : '20';
  
  const [formula, setFormula] = useState<string>(settings?.abvMethod || 'abv-basic');
  const [densityUnit, setDensityUnit] = useState<string>(settings?.densityUnit || 'sg');
  const [calibrationTemp, setCalibrationTemp] = useState(defaultCalibrationTemp);
  const [tempUnit, setTempUnit] = useState<string>(defaultTempUnit);
  const [originalReading, setOriginalReading] = useState('');
  const [originalTemp, setOriginalTemp] = useState(defaultCalibrationTemp);
  const [finalReading, setFinalReading] = useState('');
  const [finalTemp, setFinalTemp] = useState(defaultCalibrationTemp);
  const [resultUnit, setResultUnit] = useState('abv');
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    setOriginalTemp(calibrationTemp);
    setFinalTemp(calibrationTemp);
  }, [calibrationTemp]);

  const calculate = (
    og: string,
    fg: string,
    ogTemp: string,
    fgTemp: string,
    calibTemp: string,
    densUnit: string,
    tempUnitVal: string,
    formulaType: string
  ) => {
    if (!og || !fg) {
      setResult(null);
      return;
    }

    try {
      const ogNum = parseFloat(og);
      const fgNum = parseFloat(fg);
      const ogTempNum = parseFloat(ogTemp);
      const fgTempNum = parseFloat(fgTemp);
      const calibTempNum = parseFloat(calibTemp);

      if (isNaN(ogNum) || isNaN(fgNum)) {
        setResult(null);
        return;
      }

      const abvValue = abv({
        originalReading: ogNum,
        finalReading: fgNum,
        originalTemp: isNaN(ogTempNum) ? null : ogTempNum,
        finalTemp: isNaN(fgTempNum) ? null : fgTempNum,
        calibrationTemp: calibTempNum,
        densityScale: densUnit,
        tempScale: tempUnitVal,
        formula: formulaType,
      });

      setResult(abvValue);
    } catch (error) {
      setResult(null);
    }
  };

  const handleFormulaChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newFormula = e.target.value;
    setFormula(newFormula);
    calculate(originalReading, finalReading, originalTemp, finalTemp, calibrationTemp, densityUnit, tempUnit, newFormula);
  };

  const handleDensityUnitChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value;
    setDensityUnit(newUnit);
    calculate(originalReading, finalReading, originalTemp, finalTemp, calibrationTemp, newUnit, tempUnit, formula);
  };

  const handleCalibrationTempChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCalibrationTemp(newValue);
    calculate(originalReading, finalReading, originalTemp, finalTemp, newValue, densityUnit, tempUnit, formula);
  };

  const handleTempUnitChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value;
    setTempUnit(newUnit);
    calculate(originalReading, finalReading, originalTemp, finalTemp, calibrationTemp, densityUnit, newUnit, formula);
  };

  const handleOriginalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setOriginalReading(newValue);
    calculate(newValue, finalReading, originalTemp, finalTemp, calibrationTemp, densityUnit, tempUnit, formula);
  };

  const handleOriginalTempChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setOriginalTemp(newValue);
    calculate(originalReading, finalReading, newValue, finalTemp, calibrationTemp, densityUnit, tempUnit, formula);
  };

  const handleFinalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFinalReading(newValue);
    calculate(originalReading, newValue, originalTemp, finalTemp, calibrationTemp, densityUnit, tempUnit, formula);
  };

  const handleFinalTempChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFinalTemp(newValue);
    calculate(originalReading, finalReading, originalTemp, newValue, calibrationTemp, densityUnit, tempUnit, formula);
  };

  const densityUnits = Object.entries(CONVERSIONS.density.units);
  const tempUnits = Object.entries(CONVERSIONS.temperature.units);
  const formulae = Object.entries(FORMULAE);

  const resultUnits = [
    { value: 'abv', label: '% ABV' },
    { value: 'abw', label: '% ABW' },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">ABV Calculator</h2>

      <div className="space-y-6">
        {/* Formula */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Formula</label>
          <select
            value={formula}
            onChange={handleFormulaChange}
            className={`${INPUT_WIDTHS.AUTO} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
          >
            {formulae.map(([key, data]) => (
              <option key={key} value={key}>
                {data.label}
              </option>
            ))}
          </select>
        </div>

        {/* Density Unit | Calibration Temp + Unit */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Density Unit</label>
            <select
              value={densityUnit}
              onChange={handleDensityUnitChange}
              className={`${INPUT_WIDTHS.AUTO} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
            >
              {densityUnits.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Calibration Temp</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                inputMode="decimal"
                step={getStepForUnit(tempUnit)}
                value={calibrationTemp}
                onChange={handleCalibrationTempChange}
                placeholder={getPlaceholderForUnit(tempUnit, settings || {})}
                className={`${INPUT_WIDTHS.SHORT} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
              />
              <select
                value={tempUnit}
                onChange={handleTempUnitChange}
                className={`${INPUT_WIDTHS.AUTO} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
              >
                {tempUnits.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Original Gravity + Temp */}
        <div className="flex flex-wrap gap-[14px] items-end">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Original Gravity</label>
            <input
              type="number"
              inputMode="decimal"
              step={getStepForUnit(densityUnit)}
              value={originalReading}
              onChange={handleOriginalChange}
              placeholder={getPlaceholderForUnit(densityUnit, settings || {})}
              className={`${INPUT_WIDTHS.STANDARD} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
            />
          </div>
          <div className="ml-[28px]">
            <label className="block text-sm font-medium text-gray-400 mb-2">Original Temp</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                inputMode="decimal"
                step={getStepForUnit(tempUnit)}
                value={originalTemp}
                onChange={handleOriginalTempChange}
                placeholder={getPlaceholderForUnit(tempUnit, settings || {})}
                className={`${INPUT_WIDTHS.SHORT} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
              />
              <div className="bg-gray-700 text-gray-400 rounded-lg px-3 py-2 border border-gray-600">
                {CONVERSIONS.temperature.units[tempUnit]}
              </div>
            </div>
          </div>
        </div>

        {/* Final Gravity + Temp */}
        <div className="flex flex-wrap gap-[14px] items-end">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Final Gravity</label>
            <input
              type="number"
              inputMode="decimal"
              step={getStepForUnit(densityUnit)}
              value={finalReading}
              onChange={handleFinalChange}
              placeholder={getPlaceholderForUnit(densityUnit, settings || {})}
              className={`${INPUT_WIDTHS.STANDARD} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
            />
          </div>
          <div className="ml-[28px]">
            <label className="block text-sm font-medium text-gray-400 mb-2">Final Temp</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                inputMode="decimal"
                step={getStepForUnit(tempUnit)}
                value={finalTemp}
                onChange={handleFinalTempChange}
                placeholder={getPlaceholderForUnit(tempUnit, settings || {})}
                className={`${INPUT_WIDTHS.SHORT} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
              />
              <div className="bg-gray-700 text-gray-400 rounded-lg px-3 py-2 border border-gray-600">
                {CONVERSIONS.temperature.units[tempUnit]}
              </div>
            </div>
          </div>
        </div>

        {/* Result + Unit Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Result</label>
          <div className="flex gap-2 items-center">
            <div className={`${INPUT_WIDTHS.RESULT_STANDARD} bg-gray-900 text-green-400 font-mono rounded-lg px-3 py-2 border border-gray-600 text-xl`}>
              {result !== null ? formatters.number(result * (resultUnit === 'abw' ? 0.79336 : 1), getDecimalsForUnit(resultUnit)) : '—'}
            </div>
            <select
              value={resultUnit}
              onChange={(e) => setResultUnit(e.target.value)}
              className={`${INPUT_WIDTHS.AUTO} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
            >
              {resultUnits.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, ChangeEvent } from 'react';
import { densityCorrection, CONVERSIONS } from '../../lib/conversions';
import { useFormatters } from '../../hooks/useFormatters';
import { INPUT_WIDTHS } from '../common/FormComponents';
import { getPlaceholderForUnit, getStepForUnit, getDecimalsForUnit } from '../../lib/formatHelpers';
import { useSettings } from '../../contexts/SettingsContext';

export function DensityCorrector() {
  const formatters = useFormatters();
  const { settings } = useSettings();
  const [calibrationTemp, setCalibrationTemp] = useState('20');
  const [tempUnit, setTempUnit] = useState('c');
  const [value, setValue] = useState('');
  const [densityUnit, setDensityUnit] = useState('sg');
  const [sampleTemp, setSampleTemp] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const calculate = (
    densityValue: string,
    sampleTempValue: string,
    calibTempValue: string,
    densUnit: string,
    tempUnitValue: string
  ) => {
    if (!densityValue || !sampleTempValue || !calibTempValue) {
      setResult(null);
      return;
    }

    try {
      const numValue = parseFloat(densityValue);
      const numSampleTemp = parseFloat(sampleTempValue);
      const numCalibrationTemp = parseFloat(calibTempValue);

      if (isNaN(numValue) || isNaN(numSampleTemp) || isNaN(numCalibrationTemp)) {
        setResult(null);
        return;
      }

      const corrected = densityCorrection(numValue, numSampleTemp, numCalibrationTemp, tempUnitValue, densUnit);
      setResult(corrected);
    } catch (error) {
      setResult(null);
    }
  };

  const handleCalibrationTempChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCalibrationTemp(newValue);
    calculate(value, sampleTemp, newValue, densityUnit, tempUnit);
  };

  const handleTempUnitChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value;
    setTempUnit(newUnit);
    calculate(value, sampleTemp, calibrationTemp, densityUnit, newUnit);
  };

  const handleValueChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    calculate(newValue, sampleTemp, calibrationTemp, densityUnit, tempUnit);
  };

  const handleDensityUnitChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value;
    setDensityUnit(newUnit);
    calculate(value, sampleTemp, calibrationTemp, newUnit, tempUnit);
  };

  const handleSampleTempChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSampleTemp(newValue);
    calculate(value, newValue, calibrationTemp, densityUnit, tempUnit);
  };

  const densityUnits = Object.entries(CONVERSIONS.density.units);
  const tempUnits = Object.entries(CONVERSIONS.temperature.units);

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Density Temperature Correction</h2>

      <div className="space-y-6">
        {/* Calibration Temp + Unit */}
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

        {/* Density Reading + Unit */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Density Reading</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              inputMode="decimal"
              step={getStepForUnit(densityUnit)}
              value={value}
              onChange={handleValueChange}
              placeholder={getPlaceholderForUnit(densityUnit, settings || {})}
              className={`${INPUT_WIDTHS.STANDARD} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
            />
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
        </div>

        {/* Sample Temp + Unit (display only) */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Sample Temp</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              inputMode="decimal"
              step={getStepForUnit(tempUnit)}
              value={sampleTemp}
              onChange={handleSampleTempChange}
              placeholder={getPlaceholderForUnit(tempUnit, settings || {})}
              className={`${INPUT_WIDTHS.SHORT} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
            />
            <div className="bg-gray-700 text-gray-400 rounded-lg px-3 py-2 border border-gray-600">
              {CONVERSIONS.temperature.units[tempUnit]}
            </div>
          </div>
        </div>

        {/* Result Display */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Corrected Density</label>
          <div className="flex gap-2 items-center">
            <div className={`${INPUT_WIDTHS.RESULT_STANDARD} bg-gray-900 text-green-400 font-mono rounded-lg px-3 py-2 border border-gray-600`}>
              {result !== null ? formatters.number(result, getDecimalsForUnit(densityUnit)) : '—'}
            </div>
            <span className="text-gray-300">{CONVERSIONS.density.units[densityUnit]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
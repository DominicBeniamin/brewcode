import { useState, useEffect } from 'react';
import { priming } from '../../lib/fermentation';
import { CONVERSIONS, convert } from '../../lib/conversions';
import { useSettings } from '../../contexts/SettingsContext';
import { useFormatters } from '../../hooks/useFormatters';
import { INPUT_WIDTHS } from '../common/FormComponents';
import { getPlaceholderForUnit, getStepForUnit, getDecimalsForUnit } from '../../lib/formatHelpers';

export function PrimingCalculator() {
  const { settings } = useSettings();
  const formatters = useFormatters();
  
  const [volume, setVolume] = useState('');
  const [volumeUnit, setVolumeUnit] = useState('l');
  const [temperature, setTemperature] = useState('');
  const [tempUnit, setTempUnit] = useState<string>(settings?.temperatureUnit || 'c');
  const [desiredCO2, setDesiredCO2] = useState('2.5');
  const [sugarType, setSugarType] = useState('dextrose');
  
  // Result unit states
  const [massUnit, setMassUnit] = useState('g');
  const [sugarVolumeUnit, setSugarVolumeUnit] = useState('ml');
  const [gravityUnit, setGravityUnit] = useState('sg');
  const [finalVolumeUnit, setFinalVolumeUnit] = useState('l');
  
  const [result, setResult] = useState<{
    massG: number;
    volumeMl: number;
    deltaSg: number;
    newVolumeL: number;
  } | null>(null);

  // Calculate on input change
  useEffect(() => {
    if (!volume || !temperature || !desiredCO2) {
      setResult(null);
      return;
    }

    const numVolume = parseFloat(volume);
    const numTemp = parseFloat(temperature);
    const numCO2 = parseFloat(desiredCO2);

    if (isNaN(numVolume) || isNaN(numTemp) || isNaN(numCO2)) {
      setResult(null);
      return;
    }

    try {
      const primingResult = priming({
        beverageVolume: numVolume,
        volumeUnit,
        beverageTemp: numTemp,
        tempScale: tempUnit,
        desiredVolCo2: numCO2,
        sugarType,
      });
      setResult(primingResult);
    } catch (error) {
      setResult(null);
    }
  }, [volume, volumeUnit, temperature, tempUnit, desiredCO2, sugarType]);

  const volumeUnits = Object.entries(CONVERSIONS.volume.units);
  const tempUnits = Object.entries(CONVERSIONS.temperature.units);
  const massUnits = Object.entries(CONVERSIONS.mass.units);
  const densityUnits = Object.entries(CONVERSIONS.density.units);

  const sugarTypes = [
    { value: 'dextrose', label: 'Dextrose (Corn Sugar)' },
    { value: 'sucrose', label: 'Sucrose (Table Sugar)' },
    { value: 'honey', label: 'Honey' },
    { value: 'maltose', label: 'Maltose' },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">Priming Sugar Calculator</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          {/* Beverage Volume */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Beverage Volume</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                inputMode="decimal"
                step={getStepForUnit(volumeUnit)}
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder={getPlaceholderForUnit(volumeUnit, settings || {})}
                className={`${INPUT_WIDTHS.STANDARD} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
              />
              <select
                value={volumeUnit}
                onChange={(e) => setVolumeUnit(e.target.value)}
                className={`${INPUT_WIDTHS.AUTO} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
              >
                {volumeUnits.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Beverage Temperature */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Beverage Temperature</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                inputMode="decimal"
                step={getStepForUnit(tempUnit)}
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder={getPlaceholderForUnit(tempUnit, settings || {})}
                className={`${INPUT_WIDTHS.MEDIUM} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
              />
              <select
                value={tempUnit}
                onChange={(e) => setTempUnit(e.target.value)}
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

          {/* Desired CO2 */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Desired CO₂ (volumes)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={desiredCO2}
              onChange={(e) => setDesiredCO2(e.target.value)}
              placeholder="2.5"
              className={`${INPUT_WIDTHS.MEDIUM} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
            />
            <p className="text-xs text-gray-500 mt-1">Typical: Beer 2.0-2.6, Champagne 5.0-6.0</p>
          </div>

          {/* Sugar Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Sugar Type</label>
            <select
              value={sugarType}
              onChange={(e) => setSugarType(e.target.value)}
              className={`${INPUT_WIDTHS.AUTO} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
            >
              {sugarTypes.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-300">Results:</p>
          
          {/* Sugar Mass */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Sugar Needed</label>
            <div className="flex gap-2 items-center">
              <div className={`${INPUT_WIDTHS.RESULT_STANDARD} bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 font-mono text-green-400`}>
                {result ? formatters.number(convert(result.massG, 'g', massUnit, 'mass'), getDecimalsForUnit(massUnit)) : '—'}
              </div>
              <select
                value={massUnit}
                onChange={(e) => setMassUnit(e.target.value)}
                className={`${INPUT_WIDTHS.AUTO} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
              >
                {massUnits.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sugar Volume */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Sugar Volume</label>
            <div className="flex gap-2 items-center">
              <div className={`${INPUT_WIDTHS.RESULT_STANDARD} bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 font-mono text-green-400`}>
                {result ? formatters.number(convert(result.volumeMl, 'ml', sugarVolumeUnit, 'volume'), getDecimalsForUnit(sugarVolumeUnit)) : '—'}
              </div>
              <select
                value={sugarVolumeUnit}
                onChange={(e) => setSugarVolumeUnit(e.target.value)}
                className={`${INPUT_WIDTHS.AUTO} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
              >
                {volumeUnits.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Gravity Increase */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Gravity Increase</label>
            <div className="flex gap-2 items-center">
              <div className={`${INPUT_WIDTHS.RESULT_STANDARD} bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 font-mono text-green-400`}>
                {result ? formatters.number(convert(result.deltaSg, 'sg', gravityUnit, 'density'), getDecimalsForUnit(gravityUnit)) : '—'}
              </div>
              <select
                value={gravityUnit}
                onChange={(e) => setGravityUnit(e.target.value)}
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

          {/* Final Volume */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Final Volume</label>
            <div className="flex gap-2 items-center">
              <div className={`${INPUT_WIDTHS.RESULT_STANDARD} bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 font-mono text-green-400`}>
                {result ? formatters.number(convert(result.newVolumeL, 'l', finalVolumeUnit, 'volume'), getDecimalsForUnit(finalVolumeUnit)) : '—'}
              </div>
              <select
                value={finalVolumeUnit}
                onChange={(e) => setFinalVolumeUnit(e.target.value)}
                className={`${INPUT_WIDTHS.AUTO} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
              >
                {volumeUnits.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, ChangeEvent } from 'react';
import { CONVERSIONS, convert } from '../../lib/conversions';
import { INPUT_WIDTHS } from '../common/FormComponents';
import { useFormatters } from '../../hooks/useFormatters';
import { getPlaceholderForUnit, getStepForUnit, getDecimalsForUnit } from '../../lib/formatHelpers';
import { useSettings } from '../../contexts/SettingsContext';

export function UnitConverter() {
  const formatters = useFormatters();
  const { settings } = useSettings();
  const [category, setCategory] = useState('volume');
  const [fromUnit, setFromUnit] = useState('l');
  const [toUnit, setToUnit] = useState('gal');
  const [value, setValue] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const handleValueChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (!newValue || newValue === '') {
      setResult(null);
      return;
    }

    try {
      const numValue = parseFloat(newValue);
      if (isNaN(numValue)) {
        setResult(null);
        return;
      }

      const converted = convert(numValue, fromUnit, toUnit, category);
      setResult(converted);
    } catch (error) {
      setResult(null);
    }
  };

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setCategory(newCategory);
    const newUnits = Object.keys(CONVERSIONS[newCategory].units);
    setFromUnit(newUnits[0]);
    setToUnit(newUnits[1] || newUnits[0]);
    setValue('');
    setResult(null);
  };

  const handleFromUnitChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setFromUnit(e.target.value);
    if (value) {
      try {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          const converted = convert(numValue, e.target.value, toUnit, category);
          setResult(converted);
        }
      } catch (error) {
        setResult(null);
      }
    }
  };

  const handleToUnitChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setToUnit(e.target.value);
    if (value) {
      try {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          const converted = convert(numValue, fromUnit, e.target.value, category);
          setResult(converted);
        }
      } catch (error) {
        setResult(null);
      }
    }
  };

  const categoryData = CONVERSIONS[category];
  const units = Object.entries(categoryData.units);

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Unit Converter</h2>

      <div className="space-y-6">
        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
          <select
            value={category}
            onChange={handleCategoryChange}
            className={`${INPUT_WIDTHS.AUTO} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
          >
            {Object.entries(CONVERSIONS).map(([key, data]) => (
              <option key={key} value={key}>
                {data.label}
              </option>
            ))}
          </select>
        </div>

        {/* Input Row: Value + From Unit */}
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Value</label>
            <input
              type="number"
              inputMode="decimal"
              step={getStepForUnit(fromUnit)}
              value={value}
              onChange={handleValueChange}
              placeholder={getPlaceholderForUnit(fromUnit, settings || {})}
              className={`${INPUT_WIDTHS.STANDARD} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
            />
          </div>
          <div>
            <select
              value={fromUnit}
              onChange={handleFromUnitChange}
              className={`${INPUT_WIDTHS.AUTO} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
            >
              {units.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Result Row: Display + To Unit */}
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Result</label>
            <div className={`${INPUT_WIDTHS.STANDARD} bg-gray-900 text-green-400 font-mono rounded-lg px-3 py-2 border border-gray-600`}>
              {result !== null ? formatters.number(result, getDecimalsForUnit(toUnit)) : '—'}
            </div>
          </div>
          <div>
            <select
              value={toUnit}
              onChange={handleToUnitChange}
              className={`${INPUT_WIDTHS.AUTO} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none`}
            >
              {units.map(([key, label]) => (
                <option key={key} value={key}>
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
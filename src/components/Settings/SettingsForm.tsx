import { useState, useEffect, FormEvent } from 'react';
import { UserSettings, SettingsUpdate, ABV_METHOD_DESCRIPTIONS, NUMBER_FORMAT_DESCRIPTIONS, AbvMethod, NumberFormat } from '../../types/settings';

interface SettingsFormProps {
  settings: UserSettings;
  onSave: (updates: SettingsUpdate) => Promise<void>;
  onReset: () => Promise<void>;
}

export function SettingsForm({ settings, onSave, onReset }: SettingsFormProps) {
  const [formData, setFormData] = useState<SettingsUpdate>({
    temperatureUnit: settings.temperatureUnit,
    measurementSystem: settings.measurementSystem,
    densityUnit: settings.densityUnit,
    abvMethod: settings.abvMethod,
    dateFormat: settings.dateFormat,
    timeFormat: settings.timeFormat,
    theme: settings.theme,
    language: settings.language,
    currencySymbol: settings.currencySymbol,
    numberFormat: settings.numberFormat,
  });

  const [abvDescription, setAbvDescription] = useState('');
  const [numberFormatDescription, setNumberFormatDescription] = useState('');
  const [successMessage, setSuccessMessage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAbvDescription(ABV_METHOD_DESCRIPTIONS[formData.abvMethod as AbvMethod] || '');
  }, [formData.abvMethod]);

  useEffect(() => {
    setNumberFormatDescription(NUMBER_FORMAT_DESCRIPTIONS[formData.numberFormat as NumberFormat] || '');
  }, [formData.numberFormat]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave(formData);
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    } catch (error) {
      alert('Failed to save settings: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset all settings to defaults based on your locale?')) {
      try {
        await onReset();
      } catch (error) {
        alert('Failed to reset settings: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
      <h2 className="text-xl font-semibold text-white mb-6">Preferences</h2>

      <form onSubmit={handleSubmit}>
        {/* Theme */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Theme
          </label>
          <select
            value={formData.theme}
            onChange={(e) => setFormData({ ...formData, theme: e.target.value as any })}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="auto">Auto (System)</option>
          </select>
        </div>

        {/* Measurement Units Section */}
        <div className="flex flex-wrap gap-6 mb-6">
          {/* Measurement System */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
              Measurement System
            </label>
            <select
              value={formData.measurementSystem}
              onChange={(e) => setFormData({ ...formData, measurementSystem: e.target.value as any })}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
            >
              <option value="metric">Metric (kg, L, cm)</option>
              <option value="imperial">Imperial (lb, gal, in)</option>
              <option value="us">US Customary (lb, gal, in)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Weight, volume, length</p>
          </div>

          {/* Temperature Unit */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
              Temperature Unit
            </label>
            <select
              value={formData.temperatureUnit}
              onChange={(e) => setFormData({ ...formData, temperatureUnit: e.target.value as any })}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
            >
              <option value="c">Celsius (°C)</option>
              <option value="f">Fahrenheit (°F)</option>
            </select>
          </div>

          {/* Density Unit */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
              Density/Gravity Unit
            </label>
            <select
              value={formData.densityUnit}
              onChange={(e) => setFormData({ ...formData, densityUnit: e.target.value as any })}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
            >
              <option value="sg">Specific Gravity (SG)</option>
              <option value="brix">Brix (°Bx)</option>
              <option value="plato">Plato (°P)</option>
              <option value="oe">Oechsle (°Oe)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Sugar content</p>
          </div>

          {/* ABV Method */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
              ABV Calculation Method
            </label>
            <select
              value={formData.abvMethod}
              onChange={(e) => setFormData({ ...formData, abvMethod: e.target.value as any })}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
            >
              <option value="abv-basic">Basic</option>
              <option value="abv-berry">Berry</option>
              <option value="abv-hall">Hall</option>
              <option value="abv-hmrc">HMRC</option>
            </select>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-md">{abvDescription}</p>
          </div>
        </div>

        {/* Display Formats Section */}
        <div className="flex flex-wrap gap-6 mb-6">
          {/* Date Format */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
              Date Format
            </label>
            <select
              value={formData.dateFormat}
              onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value as any })}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
            >
              <option value="iso">ISO 8601 (YYYY-MM-DD)</option>
              <option value="us">US (MM/DD/YYYY)</option>
              <option value="uk">UK/Europe (DD/MM/YYYY)</option>
            </select>
          </div>

          {/* Time Format */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
              Time Format
            </label>
            <select
              value={formData.timeFormat}
              onChange={(e) => setFormData({ ...formData, timeFormat: e.target.value as any })}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
            >
              <option value="24h">24-hour (14:30)</option>
              <option value="12h">12-hour (2:30 PM)</option>
            </select>
          </div>

          {/* Currency Symbol */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
              Currency Symbol
            </label>
            <input
              type="text"
              maxLength={3}
              value={formData.currencySymbol}
              onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
              placeholder="e.g., $, €, £"
              className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none w-32"
            />
            <p className="text-xs text-gray-500 mt-1">For costs and prices</p>
          </div>

          {/* Number Format */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2 whitespace-nowrap">
              Number Format
            </label>
            <select
              value={formData.numberFormat}
              onChange={(e) => setFormData({ ...formData, numberFormat: e.target.value as NumberFormat })}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
            >
              <option value="anglo">Anglo-American (1,234.56)</option>
              <option value="continental">Continental European (1.234,56)</option>
              <option value="international">International/SI (1 234,56)</option>
            </select>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-md">{numberFormatDescription}</p>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-900/30 border border-green-500 rounded-lg text-green-300">
            ✓ Settings saved successfully!
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white font-semibold py-3 px-8 rounded-lg transition-colours"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="bg-gray-700 hover:bg-gray-600 text-white py-3 px-8 rounded-lg transition-colours"
          >
            Reset to Defaults
          </button>
        </div>
      </form>
    </div>
  );
}
import { useSettings } from '../../contexts/SettingsContext';
import { DatabaseSection } from './DatabaseSection';
import { SettingsForm } from './SettingsForm';

export function SettingsPage() {
  const { settings, isLoading, updateSettings, resetSettings } = useSettings();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-red-400">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-500 mb-2">⚙️ Settings</h1>
          <p className="text-gray-400">Customise your Brewcode experience</p>
        </div>

        {/* Database Section */}
        <DatabaseSection />

        {/* Settings Form */}
        <SettingsForm
          settings={settings}
          onSave={updateSettings}
          onReset={resetSettings}
        />

        {/* Info Box */}
        <div className="mt-6 bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 text-sm text-gray-300">
          <p className="font-semibold text-blue-300 mb-2">💡 About Settings</p>
          <ul className="space-y-1">
            <li>• Settings are stored in your database file</li>
            <li>• They sync across all devices using the same database</li>
            <li>• Reset to defaults uses your browser's locale settings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
import { useDatabase } from '../../contexts/DatabaseContext';

export function DatabaseSection() {
  const { isDirty, isSaving, lastSaved, currentDbPath, saveNow } = useDatabase();

  const lastSavedText = lastSaved
    ? `Last saved: ${lastSaved.toLocaleString()}`
    : 'Never saved';

  return (
    <div className="bg-gray-800 rounded-lg border border-amber-500 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">💾 Database</h2>
          <p className="text-sm text-gray-400">
            Current file: <span className="text-amber-400">{currentDbPath || 'brewcode.db'}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">{lastSavedText}</p>
        </div>
        <div className="text-right">
          {isSaving && <span className="text-blue-400">💾 Saving...</span>}
          {!isSaving && isDirty && <span className="text-yellow-400">⚠️ Unsaved changes</span>}
          {!isSaving && !isDirty && lastSaved && (
            <span className="text-green-400">✓ All changes saved</span>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={saveNow}
          disabled={!isDirty}
          className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colours flex items-center gap-2"
        >
          💾 Save Database
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        💡 <strong>Tip:</strong> Keep your database file in a cloud folder (Dropbox, Google Drive, OneDrive) to sync across devices.
        Changes auto-save every 3 seconds.
      </p>
    </div>
  );
}
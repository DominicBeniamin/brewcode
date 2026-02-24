import { useState } from 'react';

interface WelcomeScreenProps {
  onCreateNew: () => void;
  onLoadExisting: () => void;
}

function WelcomeScreen({ onCreateNew, onLoadExisting }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-amber-500 mb-4">{ "{" } Brewcode { "}" }</h1>
          <p className="text-xl text-gray-400">Your Personal Brewing Assistant</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-8 shadow-xl border border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-white">Welcome to Brewcode!</h2>
          <p className="text-gray-300 mb-6">
            Brewcode stores your data in a database file on your device.
            You can keep this file in a cloud folder (Dropbox, Google Drive, OneDrive) 
            to access it from multiple devices.
          </p>

          <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-300 mb-2">💡 How it works:</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Start with a new database or load an existing one</li>
              <li>• Work on your recipes and batches</li>
              <li>• Changes auto-save every 30 seconds</li>
              <li>• Keep the file in your cloud folder for sync</li>
            </ul>
          </div>

          <div className="space-y-4">
            <button 
              onClick={onCreateNew}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
            >
              ✨ Create New Database
            </button>

            <button 
              onClick={onLoadExisting}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
            >
              📂 Load Existing Database
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-6 text-center">
            Your data stays on your device. Nothing is sent to any server.
          </p>
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
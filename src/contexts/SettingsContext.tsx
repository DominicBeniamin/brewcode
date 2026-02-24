import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserSettings, SettingsUpdate } from '../types/settings';
import { getUserSettings, updateUserSettings, resetUserSettings, initializeDefaultSettings } from '../lib/settingsDb';
import { useDatabase } from './DatabaseContext';

interface SettingsContextType {
  settings: UserSettings | null;
  isLoading: boolean;
  updateSettings: (updates: SettingsUpdate) => Promise<void>;
  resetSettings: () => Promise<void>;
  refreshSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { db, markDirty } = useDatabase();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings when database is available
  useEffect(() => {
    if (db) {
      loadSettings();
    }
  }, [db]);

  const loadSettings = () => {
    if (!db) return;

    try {
      setIsLoading(true);
      const loadedSettings = getUserSettings(db);
      setSettings(loadedSettings);
    } catch (error) {
      console.error(new Date().toISOString(), 'Failed to load settings, initialising defaults:', error);
      try {
        initializeDefaultSettings(db);
        const loadedSettings = getUserSettings(db);
        setSettings(loadedSettings);
      } catch (initError) {
        console.error(new Date().toISOString(), 'Failed to initialise default settings:', initError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettingsHandler = async (updates: SettingsUpdate) => {
    if (!db) throw new Error('Database not available');

    try {
      updateUserSettings(db, updates);
      markDirty();
      loadSettings(); // Reload to get updated values
    } catch (error) {
      console.error(new Date().toISOString(), 'Failed to update settings:', error);
      throw error;
    }
  };

  const resetSettingsHandler = async () => {
    if (!db) throw new Error('Database not available');

    try {
      resetUserSettings(db);
      markDirty();
      loadSettings();
    } catch (error) {
      console.error(new Date().toISOString(), 'Failed to reset settings:', error);
      throw error;
    }
  };

  const refreshSettings = () => {
    loadSettings();
  };

  const value: SettingsContextType = {
    settings,
    isLoading,
    updateSettings: updateSettingsHandler,
    resetSettings: resetSettingsHandler,
    refreshSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
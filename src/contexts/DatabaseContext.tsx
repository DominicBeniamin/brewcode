import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { saveDatabase, saveDatabaseAs, getCurrentDbPath } from '../lib/tauriDbApi';

interface DatabaseContextType {
  db: any;
  setDb: (db: any) => void;
  isDirty: boolean;
  markDirty: () => void;
  isSaving: boolean;
  lastSaved: Date | null;
  setLastSaved: (date: Date | null) => void;
  currentDbPath: string | null;
  setCurrentDbPath: (path: string | null) => void;
  saveNow: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const dbRef = useRef<any>(null);
  const isDirtyRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentDbPath, setCurrentDbPath] = useState<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // Load current path on mount
  useEffect(() => {
    getCurrentDbPath().then(path => {
      setCurrentDbPath(path);
    });
  }, []);

  // Mark database as dirty (has unsaved changes)
  const markDirty = useCallback(() => {
    console.log(new Date().toISOString(), 'markDirty called - setting 3 second timeout');
    setIsDirty(true);
    isDirtyRef.current = true;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save (3 seconds)
    saveTimeoutRef.current = window.setTimeout(() => {
      console.log(new Date().toISOString(), 'Timeout fired - calling performSave');
      if (dbRef.current) {
        performSave();
      }
    }, 3000);
  }, []);

  // Perform the actual save
  const performSave = useCallback(async () => {
    console.log(new Date().toISOString(), 'performSave called. db:', !!dbRef.current, 'isDirty:', isDirtyRef.current);
    if (!dbRef.current || !isDirtyRef.current) {
      console.log(new Date().toISOString(), 'performSave exiting early');
      return;
    }

    console.log(new Date().toISOString(), 'performSave starting save...');
    setIsSaving(true);
    try {
      const result = await saveDatabase(dbRef.current);
      if (result.success) {
        setIsDirty(false);
        isDirtyRef.current = false;
        setLastSaved(new Date());
        if (result.path) {
          setCurrentDbPath(result.path);
        }
        console.log(new Date().toISOString(), 'Save completed successfully');
      } else {
        console.error(new Date().toISOString(), 'Save failed:', result.error);
      }
    } catch (error) {
      console.error(new Date().toISOString(), 'Save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Manual save (for "Save Now" button)
  const saveNow = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await performSave();
  };

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      if (isDirty && db) {
        // Synchronous save on unmount
        const data = db.export();
        saveDatabase(db);
      }
    };
  }, [isDirty, db]);

  const value: DatabaseContextType = {
    db,
    setDb: (newDb: any) => {
      setDb(newDb);
      dbRef.current = newDb;
    },
    isDirty,
    markDirty,
    isSaving,
    lastSaved,
    setLastSaved,
    currentDbPath,
    setCurrentDbPath,
    saveNow,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return context;
}
import React, { useState, useEffect } from 'react';
import { checkDbExists, saveDatabaseAs, openDatabase } from './lib/tauriDbApi';
import { initDb } from './lib/initDB';
import WelcomeScreen from './components/WelcomeScreen';
import { useDatabase } from './contexts/DatabaseContext';
import { Navigation } from './components/Navigation/Navigation';
import { SettingsPage } from './components/Settings/SettingsPage';
import { BrewToolsPage } from './components/BrewTools/BrewToolsPage';
import initSqlJs from 'sql.js';
import { ToastProvider } from './hooks/useToast';
import { EquipmentPage } from './components/Equipment/EquipmentPage';
import { InventoryPage } from './components/Inventory/InventoryPage';

function App() {
  const { db, setDb, isDirty, isSaving, lastSaved, currentDbPath, setLastSaved, setCurrentDbPath, markDirty, saveNow } = useDatabase();
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('tools');

  useEffect(() => {
    console.log('Checking if database exists...');
    checkDbExists().then(exists => {
      console.log('Database exists:', exists);
      setIsLoading(false);
      if (exists) {
        // TODO: Load the existing database automatically
      }
    }).catch(error => {
      console.error('Error checking database:', error);
      setIsLoading(false);
    });
  }, []);

  // Save on window close if there are unsaved changes
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    
    import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
      const appWindow = getCurrentWindow();
      
      unlisten = await appWindow.onCloseRequested(async (event) => {
        if (isDirty) {
          event.preventDefault();
          const shouldSave = await saveNow();
          await appWindow.destroy();
        }
      });
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [isDirty, saveNow]);

  const handleCreateNew = async () => {
    try {
      setIsLoading(true);
      const newDb = await initDb();
      
      // Prompt user to save the new database
      const result = await saveDatabaseAs(newDb);
      if (result.success) {
        setDb(newDb);
        setLastSaved(new Date());
        if (result.path) {
          setCurrentDbPath(result.path);
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to create database:', error);
      alert('Failed to create database: ' + (error instanceof Error ? error.message : String(error)));
      setIsLoading(false);
    }
  };

  const handleLoadExisting = async () => {
    try {
      setIsLoading(true);
      const SQL = await initSqlJs({
        locateFile: (file: string) => `/sql-wasm/${file}`
      });
      const loadedDb = await openDatabase(SQL);
      setDb(loadedDb);
      setLastSaved(new Date());
      // Path will be set by openDatabase through the Rust backend
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load database:', error);
      alert('Failed to load database: ' + (error instanceof Error ? error.message : String(error)));
      setIsLoading(false);
    }
  };

  const handleNavigate = (pageId: string) => {
    setCurrentPage(pageId);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="min-h-screen bg-gray-900 p-8">
            <h1 className="text-3xl font-bold text-amber-500">Dashboard</h1>
            <p className="text-gray-400 mt-4">Dashboard coming soon...</p>
          </div>
        );
      case 'batches':
        return (
          <div className="min-h-screen bg-gray-900 p-8">
            <h1 className="text-3xl font-bold text-amber-500">Batches</h1>
            <p className="text-gray-400 mt-4">Batches management coming soon...</p>
          </div>
        );
      case 'recipes':
        return (
          <div className="min-h-screen bg-gray-900 p-8">
            <h1 className="text-3xl font-bold text-amber-500">Recipes</h1>
            <p className="text-gray-400 mt-4">Recipe management coming soon...</p>
          </div>
        );
      case 'inventory':
        return <InventoryPage />;
      case 'equipment':
        return <EquipmentPage />;
      case 'tools':
        return <BrewToolsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <BrewToolsPage />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Brewcode</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!db) {
    return <WelcomeScreen onCreateNew={handleCreateNew} onLoadExisting={handleLoadExisting} />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <ToastProvider />
      <Navigation 
        currentPage={currentPage} 
        onNavigate={handleNavigate}
        hasUnsavedChanges={isDirty}
      />
      {renderPage()}
    </div>
  );
}

export default App;
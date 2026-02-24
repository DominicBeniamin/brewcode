import { useState } from 'react';

interface NavigationProps {
  currentPage: string;
  onNavigate: (pageId: string) => void;
  hasUnsavedChanges?: boolean;
}

interface NavPage {
  id: string;
  label: string;
  icon: string;
}

export function Navigation({ currentPage, onNavigate, hasUnsavedChanges = false }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pages: NavPage[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'batches', label: 'Batches', icon: '🍺' },
    { id: 'recipes', label: 'Recipes', icon: '📖' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'equipment', label: 'Equipment', icon: '🔧' },
    { id: 'tools', label: 'Brew Tools', icon: '🔢' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  const handleNavigate = (pageId: string) => {
    onNavigate(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-amber-500">{'{ Brewcode }'}</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:block">
            <div className="flex items-baseline space-x-4">
              {pages.map(page => (
                <button
                  key={page.id}
                  onClick={() => handleNavigate(page.id)}
                  className={`${
                    currentPage === page.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  } px-3 py-2 rounded-md text-xs font-medium transition-colors relative flex flex-col items-center`}
                >
                  <span className="text-xl">{page.icon}</span>
                  <span>{page.label}</span>
                  {page.id === 'settings' && hasUnsavedChanges && (
                    <span className="absolute top-1 right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-400 hover:text-white focus:outline-none relative"
            >
              {hasUnsavedChanges && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                </span>
              )}
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {pages.map(page => (
              <button
                key={page.id}
                onClick={() => handleNavigate(page.id)}
                className={`${
                  currentPage === page.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                } block w-full text-left px-3 py-2 rounded-md text-base font-medium relative`}
              >
                {page.icon} {page.label}
                {page.id === 'settings' && hasUnsavedChanges && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
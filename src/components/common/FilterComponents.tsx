// ============================================================================
// Filter Components - SearchInput, FilterDropdown, MultiSelectDropdown
// ============================================================================

import { useState, useRef, useEffect, ChangeEvent } from 'react';

// ============================================================================
// SEARCH INPUT
// ============================================================================

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

/**
 * Search input component
 */
export function SearchInput({ 
  value, 
  onChange, 
  placeholder = 'Search...', 
  label 
}: SearchInputProps) {
  return (
    <div className="flex-grow min-w-[200px]">
      {label && (
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          {label}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
      />
    </div>
  );
}

// ============================================================================
// FILTER DROPDOWN (Single Select)
// ============================================================================

interface FilterDropdownProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

/**
 * Single-select filter dropdown
 */
export function FilterDropdown({ 
  label, 
  value, 
  onChange, 
  options 
}: FilterDropdownProps) {
  if (!label) {
    // Button-style dropdown (no label)
    return (
      <div className="relative inline-block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 py-2 pr-10 border border-gray-600 focus:border-amber-500 focus:outline-none appearance-none cursor-pointer"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg 
          className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    );
  }

  // Labeled dropdown
  return (
    <div className="flex-shrink-0">
      <label className="block text-sm font-semibold text-gray-300 mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================================
// MULTI-SELECT DROPDOWN
// ============================================================================

interface MultiSelectDropdownProps {
  label: string;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  options: Array<{ value: string; label: string }>;
  includeAll?: boolean;
}

/**
 * Multi-select dropdown with checkboxes
 */
export function MultiSelectDropdown({
  label,
  selectedValues,
  onChange,
  options,
  includeAll = true
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCheckboxChange = (value: string, checked: boolean) => {
    let newValues: string[];

    if (value === 'all') {
      // "All" was clicked
      if (checked) {
        newValues = ['all'];
      } else {
        newValues = [];
      }
    } else {
      // Another option was clicked
      if (checked) {
        // Add value and remove "all" if present
        newValues = [...selectedValues.filter(v => v !== 'all'), value];
      } else {
        // Remove value
        newValues = selectedValues.filter(v => v !== value);
        // If nothing selected, add "all"
        if (newValues.length === 0 && includeAll) {
          newValues = ['all'];
        }
      }
    }

    onChange(newValues);
  };

  const isAllSelected = selectedValues.includes('all') || selectedValues.length === 0;

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
      >
        {label} ▼
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto whitespace-nowrap">
          {includeAll && (
            <label className="block px-4 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => handleCheckboxChange('all', e.target.checked)}
                className="mr-2"
              />
              All
            </label>
          )}
          {options.map(opt => (
            <label 
              key={opt.value} 
              className="block px-4 py-2 hover:bg-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(opt.value)}
                onChange={(e) => handleCheckboxChange(opt.value, e.target.checked)}
                className="mr-2"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FILTER BAR (Responsive Container)
// ============================================================================

interface FilterBarProps {
  children: React.ReactNode;
  showClearButton?: boolean;
  onClear?: () => void;
}

/**
 * Responsive filter bar container
 * Shows/hides on mobile with toggle button
 */
export function FilterBar({ children, showClearButton, onClear }: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6">
      {/* Mobile Toggle Button */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-between"
        >
          <span className="font-medium">Filters & Search</span>
          <svg 
            className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
      </div>

      {/* Filters Container */}
      <div className={`${isOpen ? 'flex' : 'hidden'} md:flex md:flex-wrap gap-4 items-end`}>
        {children}
        
        {showClearButton && onClear && (
          <button
            onClick={onClear}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
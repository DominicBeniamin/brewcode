// ============================================================================
// useFilters - Hook for managing filter and search state
// ============================================================================

import { useState, useMemo } from 'react';

interface FilterConfig<T> {
  key: keyof T;
  matchFn?: (itemValue: any, selectedValues: string[]) => boolean;
}

interface UseFiltersProps<T> {
  data: T[];
  searchKeys?: (keyof T)[];
  filterConfigs?: FilterConfig<T>[];
}

/**
 * Hook for managing filters and search
 * 
 * @example
 * const { 
 *   filteredData, 
 *   searchTerm, 
 *   setSearchTerm,
 *   filters,
 *   setFilter,
 *   clearFilters
 * } = useFilters({
 *   data: batches,
 *   searchKeys: ['name', 'style'],
 *   filterConfigs: [
 *     { key: 'status' },
 *     { key: 'style' }
 *   ]
 * });
 */
export function useFilters<T>({
  data,
  searchKeys = [],
  filterConfigs = []
}: UseFiltersProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  const setFilter = (filterKey: string, values: string[]) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: values
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({});
  };

  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchTerm && searchKeys.length > 0) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item => {
        return searchKeys.some(key => {
          const value = item[key];
          if (value == null) return false;
          return String(value).toLowerCase().includes(lowerSearch);
        });
      });
    }

    // Apply each filter
    filterConfigs.forEach(config => {
      const selectedValues = filters[String(config.key)] || [];
      
      // Skip if no values selected or "all" is selected
      if (selectedValues.length === 0 || selectedValues.includes('all')) {
        return;
      }

      result = result.filter(item => {
        const itemValue = item[config.key];

        if (config.matchFn) {
          return config.matchFn(itemValue, selectedValues);
        }

        // Default exact match
        return selectedValues.includes(String(itemValue));
      });
    });

    return result;
  }, [data, searchTerm, filters, searchKeys, filterConfigs]);

  return {
    filteredData,
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters: searchTerm !== '' || Object.keys(filters).length > 0
  };
}
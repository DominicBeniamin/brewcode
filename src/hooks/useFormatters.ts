import { useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { getFormatters, Formatters } from '../lib/formatHelpers';

/**
 * Custom hook that provides formatting functions based on user settings
 * 
 * @returns Formatters object with all format functions
 * 
 * @example
 * function MyComponent() {
 *   const fmt = useFormatters();
 *   
 *   return (
 *     <div>
 *       <p>Temperature: {fmt.temperature(20)}</p>
 *       <p>Volume: {fmt.volume(10)}</p>
 *       <p>Mass: {fmt.mass(1000)}</p>
 *     </div>
 *   );
 * }
 */
export function useFormatters(): Formatters {
  const { settings } = useSettings();
  
  // Memoize the formatters to avoid recreating them on every render
  const formatters = useMemo(() => {
    return getFormatters(settings || {});
  }, [settings]);
  
  return formatters;
}
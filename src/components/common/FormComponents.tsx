// ============================================================================
// Form Components - Standardized form inputs and layouts
// ============================================================================

import { ChangeEvent } from 'react';

// ============================================================================
// INPUT WIDTH CONSTANTS
// ============================================================================

/**
 * Standard Tailwind width classes for form inputs based on expected content
 */
export const INPUT_WIDTHS = {
  // Numeric inputs
  TINY: 'w-16',           // Single digit (0-9)
  SHORT: 'w-20',          // Small numbers, temperatures (0-100)
  MEDIUM: 'w-24',         // Medium numbers, volumes (0-1000)
  STANDARD: 'w-32',       // Standard numbers, gravity readings (1.000-1.100)
  LONG: 'w-40',           // Longer numbers or text
  
  // Result displays
  RESULT_COMPACT: 'min-w-[80px]',
  RESULT_STANDARD: 'min-w-[120px]',
  RESULT_WIDE: 'min-w-[150px]',
  
  // Full width
  FULL: 'w-full',
  
  // Auto width (for selects)
  AUTO: 'w-auto'
} as const;

/**
 * Get appropriate input width class based on field type
 */
export function getInputWidth(fieldType: string): string {
  const widthMap: Record<string, string> = {
    'temperature': INPUT_WIDTHS.SHORT,
    'gravity': INPUT_WIDTHS.STANDARD,
    'density': INPUT_WIDTHS.STANDARD,
    'volume': INPUT_WIDTHS.MEDIUM,
    'mass': INPUT_WIDTHS.MEDIUM,
    'percentage': INPUT_WIDTHS.SHORT,
    'days': INPUT_WIDTHS.SHORT,
    'count': INPUT_WIDTHS.SHORT,
    'co2': INPUT_WIDTHS.SHORT,
    'text': INPUT_WIDTHS.FULL,
    'textarea': INPUT_WIDTHS.FULL
  };
  
  return widthMap[fieldType] || INPUT_WIDTHS.STANDARD;
}

// ============================================================================
// COMPACT INPUT COMPONENTS (for calculators and tools)
// ============================================================================

interface CompactNumberFieldProps {
  id: string;
  label: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  step?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  required?: boolean;
  width?: string;
  fieldType?: string;
}

/**
 * Compact number input field (for calculators/tools)
 */
export function CompactNumberField({
  id,
  label,
  value,
  onChange,
  placeholder = '',
  step,
  min,
  max,
  disabled = false,
  required = false,
  width,
  fieldType = 'standard'
}: CompactNumberFieldProps) {
  const inputWidth = width || getInputWidth(fieldType);
  
  // Determine step value based on fieldType if not explicitly provided
  const getStep = () => {
    if (step !== undefined) return step;
    
    const stepMap: Record<string, string> = {
      'temperature': '0.1',
      'gravity': '0.001',
      'density': '0.001',
      'volume': '0.1',
      'mass': '0.1',
      'percentage': '0.1',
      'days': '1',
      'count': '1',
      'co2': '0.1'
    };
    
    return stepMap[fieldType] || 'any';
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-2">
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={getStep()}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        className={`${inputWidth} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none ${
          disabled ? 'bg-gray-600 cursor-not-allowed' : ''
        }`}
      />
    </div>
  );
}

interface CompactSelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  width?: string;
}

/**
 * Compact select field (for calculators/tools)
 */
export function CompactSelectField({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
  width = INPUT_WIDTHS.AUTO
}: CompactSelectFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-2">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${width} bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none ${
          disabled ? 'bg-gray-600 cursor-not-allowed' : ''
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface ResultDisplayProps {
  id?: string;
  label: string;
  value: string | number;
  width?: string;
  className?: string;
}

/**
 * Result display field with monospace font and green text
 */
export function ResultDisplay({
  id,
  label,
  value,
  width = INPUT_WIDTHS.RESULT_STANDARD,
  className = ''
}: ResultDisplayProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2">
        {label}
      </label>
      <div
        id={id}
        className={`${width} bg-gray-900 text-green-400 font-mono rounded-lg px-3 py-2 border border-gray-600 ${className}`}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// FULL FORM COMPONENTS (for forms and modals)
// ============================================================================

interface TextFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  type?: 'text' | 'email' | 'password' | 'url';
}

/**
 * Standard text input field
 */
export function TextField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  helpText = '',
  type = 'text'
}: TextFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none ${
          disabled ? 'bg-gray-600 cursor-not-allowed' : ''
        }`}
      />
      {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    </div>
  );
}

interface NumberFieldProps {
  id: string;
  name: string;
  label: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  min?: number;
  max?: number;
  step?: string;
}

/**
 * Standard number input field
 */
export function NumberField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  helpText = '',
  min,
  max,
  step = 'any'
}: NumberFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="number"
        inputMode="decimal"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={`w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none ${
          disabled ? 'bg-gray-600 cursor-not-allowed' : ''
        }`}
      />
      {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  includeBlank?: boolean;
}

/**
 * Standard select dropdown field
 */
export function SelectField({
  id,
  name,
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  helpText = '',
  includeBlank = true
}: SelectFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none ${
          disabled ? 'bg-gray-600 cursor-not-allowed' : ''
        }`}
      >
        {includeBlank && <option value="">-- Select --</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    </div>
  );
}

interface DateFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  min?: string;
  max?: string;
}

/**
 * Standard date input field
 */
export function DateField({
  id,
  name,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  helpText = '',
  min,
  max
}: DateFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="date"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        className={`w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none ${
          disabled ? 'bg-gray-600 cursor-not-allowed' : ''
        }`}
      />
      {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    </div>
  );
}

interface TextareaFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  rows?: number;
}

/**
 * Standard textarea field
 */
export function TextareaField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  helpText = '',
  rows = 4
}: TextareaFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-amber-500 focus:outline-none ${
          disabled ? 'bg-gray-600 cursor-not-allowed' : ''
        }`}
      />
      {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}
// ============================================================================
// UI Helper Components - LoadingSpinner, EmptyState, ErrorDisplay
// ============================================================================

import { ReactNode } from 'react';

// ============================================================================
// LOADING SPINNER
// ============================================================================

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Loading spinner component
 */
export function LoadingSpinner({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 border-2',
    md: 'h-16 w-16 border-4',
    lg: 'h-24 w-24 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-amber-500 border-t-transparent`}></div>
      {message && <p className="text-gray-400 mt-4">{message}</p>}
    </div>
  );
}

/**
 * Full-screen loading overlay
 */
export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <LoadingSpinner message={message} size="lg" />
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Empty state component for when there's no data
 */
export function EmptyState({
  icon = '📦',
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// ERROR DISPLAY
// ============================================================================

interface ErrorDisplayProps {
  title?: string;
  error: Error | string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Error display component
 */
export function ErrorDisplay({
  title = 'Error',
  error,
  action
}: ErrorDisplayProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className="bg-red-900/20 border border-red-500 rounded-lg p-8">
      <h2 className="text-2xl font-bold text-red-500 mb-4">{title}</h2>
      <p className="text-gray-300 mb-4">{errorMessage}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Full-screen error display
 */
export function ErrorScreen({
  title = 'Something went wrong',
  error,
  action
}: ErrorDisplayProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
      <div className="max-w-2xl w-full">
        <ErrorDisplay title={title} error={error} action={action} />
      </div>
    </div>
  );
}

// ============================================================================
// INLINE LOADING STATE
// ============================================================================

interface InlineLoadingProps {
  text?: string;
}

/**
 * Inline loading indicator (for buttons, etc.)
 */
export function InlineLoading({ text }: InlineLoadingProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
      {text && <span>{text}</span>}
    </div>
  );
}
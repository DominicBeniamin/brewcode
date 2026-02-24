// ============================================================================
// useToast - Toast notification hook using react-hot-toast
// ============================================================================

import toast from 'react-hot-toast';

/**
 * Custom hook for showing toast notifications
 * Wraps react-hot-toast with our app's styling
 * 
 * @example
 * const showToast = useToast();
 * showToast.success('Batch saved successfully!');
 * showToast.error('Failed to save batch');
 * showToast.info('Processing...');
 */
export function useToast() {
  const success = (message: string, duration: number = 3000) => {
    toast.success(message, {
      duration,
      style: {
        background: '#065f46', // green-900
        color: '#d1fae5',      // green-200
        border: '1px solid #10b981', // green-500
        borderRadius: '0.5rem',
        padding: '1rem 1.5rem',
      },
      iconTheme: {
        primary: '#10b981', // green-500
        secondary: '#d1fae5', // green-200
      },
    });
  };

  const error = (message: string, duration: number = 4000) => {
    toast.error(message, {
      duration,
      style: {
        background: '#7f1d1d', // red-900
        color: '#fecaca',      // red-200
        border: '1px solid #ef4444', // red-500
        borderRadius: '0.5rem',
        padding: '1rem 1.5rem',
      },
      iconTheme: {
        primary: '#ef4444', // red-500
        secondary: '#fecaca', // red-200
      },
    });
  };

  const info = (message: string, duration: number = 3000) => {
    toast(message, {
      duration,
      icon: 'ℹ️',
      style: {
        background: '#1e3a8a', // blue-900
        color: '#bfdbfe',      // blue-200
        border: '1px solid #3b82f6', // blue-500
        borderRadius: '0.5rem',
        padding: '1rem 1.5rem',
      },
    });
  };

  const loading = (message: string) => {
    return toast.loading(message, {
      style: {
        background: '#1f2937', // gray-800
        color: '#d1d5db',      // gray-300
        border: '1px solid #4b5563', // gray-600
        borderRadius: '0.5rem',
        padding: '1rem 1.5rem',
      },
    });
  };

  const dismiss = (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  };

  const promise = <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        style: {
          borderRadius: '0.5rem',
          padding: '1rem 1.5rem',
        },
        success: {
          style: {
            background: '#065f46',
            color: '#d1fae5',
            border: '1px solid #10b981',
          },
          iconTheme: {
            primary: '#10b981',
            secondary: '#d1fae5',
          },
        },
        error: {
          style: {
            background: '#7f1d1d',
            color: '#fecaca',
            border: '1px solid #ef4444',
          },
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fecaca',
          },
        },
        loading: {
          style: {
            background: '#1f2937',
            color: '#d1d5db',
            border: '1px solid #4b5563',
          },
        },
      }
    );
  };

  return {
    success,
    error,
    info,
    loading,
    dismiss,
    promise,
  };
}

/**
 * Toast Provider Component
 * Add this to your App.tsx root
 * 
 * @example
 * import { ToastProvider } from './hooks/useToast';
 * 
 * function App() {
 *   return (
 *     <>
 *       <ToastProvider />
 *       {/* rest of your app *\/}
 *     </>
 *   );
 * }
 */
import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 3000,
      }}
    />
  );
}
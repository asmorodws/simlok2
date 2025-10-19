/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree
 */

'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-lg p-8">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-red-100 rounded-full mb-4">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Oops! Something went wrong
              </h2>
              
              <p className="text-gray-600 mb-6">
                We apologize for the inconvenience. An error occurred while loading this page.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="w-full mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs font-mono text-red-800 text-left break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={this.handleReset}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Try Again
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * Hook-based error boundary for functional components
 * Note: This is a placeholder. React doesn't support error boundaries in hooks yet.
 * Use the class component above for actual error boundary functionality.
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const throwError = React.useCallback((err: Error) => {
    setError(err);
  }, []);

  if (error) {
    throw error;
  }

  return throwError;
}

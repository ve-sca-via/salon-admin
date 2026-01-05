/**
 * ErrorBoundary Component
 * 
 * PURPOSE:
 * React Error Boundary to catch JavaScript errors anywhere in the component tree,
 * log errors, and display a fallback UI instead of crashing the entire app.
 * 
 * USAGE:
 * Wrap components to protect them from crashes:
 * <ErrorBoundary fallback="app">
 *   <YourComponent />
 * </ErrorBoundary>
 * 
 * FALLBACK LEVELS:
 * - "app": Full-screen error with reload (for app-level crashes)
 * - "page": Page-level error with navigation (for page crashes)
 * - "section": Inline error with retry (for component crashes)
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console ONLY in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    this.setState(state => ({
      error,
      errorInfo,
      errorCount: state.errorCount + 1,
    }));

    // Log to error tracking service in production
    if (import.meta.env.PROD) {
      // TODO: Send to Sentry, LogRocket, or similar
      // logErrorToService(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      const { fallback = 'app', children } = this.props;
      const { error, errorInfo, errorCount } = this.state;

      // Prevent infinite error loops
      if (errorCount > 3) {
        return (
          <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Critical Error</h1>
              <p className="text-gray-700 mb-6">
                Multiple errors detected. Please refresh the page or contact support if the problem persists.
              </p>
              <button
                onClick={this.handleReload}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
              >
                Reload Page
              </button>
            </div>
          </div>
        );
      }

      // App-level fallback - Full screen error
      if (fallback === 'app') {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="text-center max-w-2xl">
              <div className="mb-8">
                <AlertTriangle className="w-20 h-20 text-orange-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  Something Went Wrong
                </h1>
                <p className="text-lg text-gray-600 mb-2">
                  The admin panel encountered an unexpected error.
                </p>
                <p className="text-sm text-gray-500">
                  Don't worry - your data is safe. Try reloading the page.
                </p>
              </div>

              {/* Error details (only in development) */}
              {import.meta.env.DEV && error && (
                <div className="mb-6 text-left">
                  <details className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <summary className="cursor-pointer font-semibold text-red-900 mb-2">
                      Error Details (Dev Only)
                    </summary>
                    <div className="mt-2 text-sm">
                      <p className="font-mono text-red-800 mb-2">{error.toString()}</p>
                      {errorInfo && (
                        <pre className="text-xs text-red-700 overflow-auto max-h-40 bg-red-100 p-2 rounded">
                          {errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReload}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  <Home className="w-4 h-4" />
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Page-level fallback - Centered error with navigation
      if (fallback === 'page') {
        return (
          <div className="flex items-center justify-center min-h-[500px] p-6">
            <div className="text-center max-w-md">
              <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Page Error
              </h2>
              <p className="text-gray-600 mb-6">
                This page encountered an error and couldn't load properly.
              </p>

              {import.meta.env.DEV && error && (
                <div className="mb-6 text-left">
                  <details className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-red-900">
                      Error Details
                    </summary>
                    <p className="mt-2 text-xs font-mono text-red-800">{error.toString()}</p>
                  </details>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.handleGoBack}
                  className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 px-6 rounded-lg transition-colors duration-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </button>
                <button
                  onClick={this.resetError}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors duration-200"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Section-level fallback - Inline error with retry
      return (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 m-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Component Error
              </h3>
              <p className="text-sm text-red-700 mb-4">
                This section failed to load. Try refreshing or contact support if the problem persists.
              </p>

              {import.meta.env.DEV && error && (
                <div className="mb-4">
                  <details className="text-xs">
                    <summary className="cursor-pointer font-semibold text-red-900 mb-1">
                      Technical Details
                    </summary>
                    <p className="font-mono text-red-800 mt-2">{error.toString()}</p>
                  </details>
                </div>
              )}

              <button
                onClick={this.resetError}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

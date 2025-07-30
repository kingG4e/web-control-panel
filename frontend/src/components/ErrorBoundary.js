import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Don't show error boundary for cancellation errors
    if (ErrorBoundary.isCancellationError(error)) {
      console.debug('Cancellation error caught by ErrorBoundary, not showing error UI:', error);
      return { hasError: false };
    }

    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  static isCancellationError(error) {
    const errorMessage = error?.message?.toLowerCase() || '';
    return (
      errorMessage.includes('canceled') ||
      errorMessage.includes('cancelled') ||
      errorMessage.includes('aborted') ||
      error?.name === 'AbortError' ||
      error?.code === 'ERR_CANCELED'
    );
  }

  componentDidCatch(error, errorInfo) {
    // Don't process cancellation errors
    if (ErrorBoundary.isCancellationError(error)) {
      return;
    }

    // Log the error to console and any error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  componentDidMount() {
    // Listen for unhandled promise rejections specific to this component
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  handleUnhandledRejection = (event) => {
    // Filter out cancellation errors from promise rejections
    if (ErrorBoundary.isCancellationError(event.reason)) {
      console.debug('Promise cancellation handled by ErrorBoundary');
      event.preventDefault();
      return;
    }

    // Log other promise rejections for debugging
    console.warn('Unhandled promise rejection in ErrorBoundary:', event.reason);
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // You can send this to your error reporting service
    // console.log('Error Report:', errorReport);
    
    // For now, just copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => alert('Error report copied to clipboard'))
      .catch(() => alert('Could not copy error report'));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--primary-bg)] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[var(--secondary-bg)] rounded-lg shadow-lg p-6">
            <div className="text-center">
              {/* Error Icon */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>

              {/* Error Title */}
              <h1 className="text-xl font-semibold text-[var(--primary-text)] mb-2">
                Something went wrong
              </h1>

              {/* Error Message */}
              <p className="text-[var(--secondary-text)] mb-6">
                We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
              </p>

              {/* Error ID */}
              {this.state.errorId && (
                <div className="bg-[var(--tertiary-bg)] rounded-md p-3 mb-6">
                  <p className="text-sm text-[var(--secondary-text)] mb-1">Error ID:</p>
                  <p className="text-xs font-mono text-[var(--primary-text)] break-all">
                    {this.state.errorId}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={this.handleReload}
                  className="w-full bg-[var(--accent-color)] text-white py-2 px-4 rounded-md hover:bg-[var(--accent-hover)] transition-colors duration-200"
                >
                  Refresh Page
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="w-full bg-[var(--secondary-bg)] text-[var(--primary-text)] border border-[var(--border-color)] py-2 px-4 rounded-md hover:bg-[var(--tertiary-bg)] transition-colors duration-200"
                >
                  Go to Home
                </button>

                <button
                  onClick={this.handleReportError}
                  className="w-full bg-transparent text-[var(--accent-color)] py-2 px-4 rounded-md hover:bg-[var(--accent-color)] hover:bg-opacity-10 transition-colors duration-200"
                >
                  Report Error
                </button>
              </div>

              {/* Development Error Details */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-[var(--secondary-text)] hover:text-[var(--primary-text)]">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-red-50 rounded-md">
                    <pre className="text-xs text-red-800 overflow-auto max-h-40">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 
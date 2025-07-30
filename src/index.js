import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console and any error reporting service
    console.error('LinkSnap Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Track error in analytics
    if (window.linkSnapAnalytics) {
      window.linkSnapAnalytics.track('application_error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 max-w-2xl w-full text-center">
            <div className="text-red-400 text-6xl mb-6">⚠️</div>
            <h1 className="text-3xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-gray-300 mb-6">
              We apologize for the inconvenience. LinkSnap encountered an unexpected error.
            </p>
            
            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-black/20 rounded-lg p-4 mb-6 text-left">
                <h3 className="text-red-400 font-semibold mb-2">Error Details:</h3>
                <pre className="text-gray-300 text-sm overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
              >
                Reload Application
              </button>
              <button
                onClick={() => window.history.back()}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Performance monitoring
const performanceObserver = () => {
  if ('PerformanceObserver' in window) {
    try {
      // Monitor Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
        
        if (window.linkSnapAnalytics) {
          window.linkSnapAnalytics.track('performance_lcp', {
            value: lastEntry.startTime,
            timestamp: new Date().toISOString()
          });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Monitor First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.log('FID:', entry.processingStart - entry.startTime);
          
          if (window.linkSnapAnalytics) {
            window.linkSnapAnalytics.track('performance_fid', {
              value: entry.processingStart - entry.startTime,
              timestamp: new Date().toISOString()
            });
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Monitor Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        console.log('CLS:', clsValue);
        
        if (window.linkSnapAnalytics) {
          window.linkSnapAnalytics.track('performance_cls', {
            value: clsValue,
            timestamp: new Date().toISOString()
          });
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }
};

// Initialize performance monitoring
performanceObserver();

// Development mode helpers
if (process.env.NODE_ENV === 'development') {
  // React Developer Tools detection
  if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('🔧 React DevTools detected');
  }

  // Performance logging
  console.log('🚀 LinkSnap starting in development mode');
  
  // Hot reload notification
  if (module.hot) {
    console.log('🔥 Hot reloading enabled');
  }
}

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  // Disable console logs in production
  console.log = () => {};
  console.warn = () => {};
  
  // Track production load
  if (window.linkSnapAnalytics) {
    window.linkSnapAnalytics.track('app_loaded', {
      environment: 'production',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
  }
}

// Get the root element
const container = document.getElementById('root');

// Handle case where root element is not found
if (!container) {
  console.error('Root element not found. Make sure there is a div with id="root" in your HTML.');
  
  // Show error in the error fallback
  const errorFallback = document.getElementById('error-fallback');
  if (errorFallback) {
    errorFallback.classList.remove('hidden');
  }
} else {
  // Create root and render the app
  const root = ReactDOM.createRoot(container);

  // Render the application with error boundary
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Log successful render
  console.log('✅ LinkSnap rendered successfully');

  // Track app initialization
  if (window.linkSnapAnalytics) {
    window.linkSnapAnalytics.track('app_initialized', {
      timestamp: new Date().toISOString(),
      react_version: React.version,
      node_env: process.env.NODE_ENV
    });
  }
}

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason);
  
  if (window.linkSnapAnalytics) {
    window.linkSnapAnalytics.track('unhandled_rejection', {
      reason: event.reason?.message || event.reason,
      timestamp: new Date().toISOString()
    });
  }
  
  // Prevent the default browser behavior
  event.preventDefault();
});

// Handle visibility change (for analytics)
document.addEventListener('visibilitychange', function() {
  if (window.linkSnapAnalytics) {
    window.linkSnapAnalytics.track('visibility_change', {
      hidden: document.hidden,
      timestamp: new Date().toISOString()
    });
  }
});

// Handle beforeunload (for session tracking)
window.addEventListener('beforeunload', function() {
  if (window.linkSnapAnalytics) {
    window.linkSnapAnalytics.track('session_end', {
      timestamp: new Date().toISOString(),
      session_duration: Date.now() - (window.sessionStartTime || Date.now())
    });
  }
});

// Initialize session tracking
window.sessionStartTime = Date.now();

// Export for potential use in other modules
export default App;

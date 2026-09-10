import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  isUpdating: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    isUpdating: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Check if the error is related to chunk loading or dynamic imports
    const isChunkError = 
      error.name === 'ChunkLoadError' || 
      error.message.includes('Loading chunk') ||
      error.message.includes('Failed to fetch dynamically imported module');
    
    return { 
      hasError: true,
      isUpdating: isChunkError
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    const isChunkError = 
      error.name === 'ChunkLoadError' || 
      error.message.includes('Loading chunk') ||
      error.message.includes('Failed to fetch dynamically imported module');

    if (isChunkError) {
      // Auto-reload after a short delay to get the new chunks
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.state.isUpdating) {
        return (
          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-6 text-center">
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              className="max-w-md w-full bg-surface-container-low dark:bg-dark-surface border border-border dark:border-dark-border rounded-3xl p-8 shadow-2xl flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <h1 className="text-2xl font-bold text-on-surface dark:text-white mb-3">
                System Updating...
              </h1>
              <p className="text-on-surface-variant dark:text-zinc-400 mb-8 leading-relaxed">
                We&apos;ve just deployed a new version of the app. Refreshing your session to grab the latest features!
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
              >
                Reload Now
              </button>
            </motion.div>
          </div>
        );
      }

      // Generic fallback for other crashes
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background p-6 text-center">
          <div className="max-w-md w-full bg-surface-container-low dark:bg-dark-surface border border-border dark:border-dark-border rounded-3xl p-8 shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-on-surface dark:text-white mb-3">
              Something went wrong
            </h1>
            <p className="text-on-surface-variant dark:text-zinc-400 mb-8 leading-relaxed">
              We encountered an unexpected error. Please try reloading the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

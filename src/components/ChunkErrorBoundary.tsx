'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
  error?: Error;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('ChunkLoadError');

    if (isChunkError && typeof window !== 'undefined') {
      window.location.reload();
    }

    // Always return hasError: true — returning false here violates React's
    // error boundary contract and causes a crash loop on non-chunk errors.
    return { hasError: true, isChunkError, error };
  }

  componentDidCatch(error: Error) {
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk');

    if (isChunkError) {
      console.warn('Chunk loading error detected, reloading...', error);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center p-6">
              <h2 className="text-xl font-semibold mb-2">Updating Application...</h2>
              <p className="text-muted-foreground">Please wait while we reload the page.</p>
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center p-6 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              An unexpected error occurred. You can try navigating back or reloading the page.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
              >
                Go back
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

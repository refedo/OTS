'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const isChunkError = 
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('ChunkLoadError');

    if (isChunkError) {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return { hasError: true, error };
    }

    return { hasError: false };
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
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center p-6">
            <h2 className="text-xl font-semibold mb-2">Updating Application...</h2>
            <p className="text-muted-foreground">Please wait while we reload the page.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

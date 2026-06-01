'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// global-error.tsx replaces the root layout on error, so it must include <html> and <body>.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            padding: '1.5rem',
            background: '#0f172a',
            color: '#f1f5f9',
          }}
        >
          <div style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Application Error
            </h1>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
              A critical error occurred. Please reload or navigate back to the dashboard.
            </p>
            {error.digest && (
              <p style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', marginBottom: '1rem' }}>
                Error ID: {error.digest}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <a
                href="/dashboard"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #334155',
                  color: '#f1f5f9',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                }}
              >
                Dashboard
              </a>
              <button
                onClick={reset}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Try again
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

import { useState, useEffect } from 'react';
import { CURRENT_VERSION } from '@/lib/version';

interface VersionInfo {
  version: string;
  date: string;
  type: string;
  mainTitle: string;
  highlights: string[];
  changes: Array<{
    category: string;
    items: string[];
  }>;
}

export function useVersion() {
  const [version, setVersion] = useState<string>(CURRENT_VERSION);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVersion() {
      try {
        const response = await fetch('/api/system/latest-version');
        if (!response.ok) {
          throw new Error('Failed to fetch version');
        }
        const data = await response.json();
        setVersion(data.version);
        setVersionInfo(data);
      } catch (err) {
        console.error('Error fetching version:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchVersion();
  }, []);

  return { version, versionInfo, loading, error };
}

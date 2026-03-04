import { useState, useEffect } from 'react';

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
  const [version, setVersion] = useState<string>('15.18.1');
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch('/api/system/latest-version');
        if (response.ok) {
          const data = await response.json();
          setVersion(data.version);
          setVersionInfo(data);
        }
      } catch (error) {
        console.error('Failed to fetch version:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVersion();
  }, []);

  return { version, versionInfo, loading };
}

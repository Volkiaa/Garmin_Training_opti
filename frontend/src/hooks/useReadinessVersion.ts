import { useState, useEffect } from 'react';

const STORAGE_KEY = 'readiness_version';

export function useReadinessVersion() {
  const [version, setVersion] = useState<'v1' | 'v2'>('v2');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'v1' || stored === 'v2') {
      setVersion(stored);
    }
    setIsLoading(false);
  }, []);

  const setReadinessVersion = (newVersion: 'v1' | 'v2') => {
    setVersion(newVersion);
    localStorage.setItem(STORAGE_KEY, newVersion);
  };

  return { version, setReadinessVersion, isLoading };
}

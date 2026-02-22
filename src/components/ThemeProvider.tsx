'use client';

import { useEffect, useState } from 'react';

/**
 * ThemeProvider — simplified passthrough.
 * Clears any previously saved theme overrides on mount so the system
 * always uses the default CSS-defined muted theme from globals.css.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Clean up any previously saved theme data that may override CSS variables
    localStorage.removeItem('ots-theme');
    localStorage.removeItem('ots-custom-theme');

    // Remove any inline style overrides that were set by the old theme system
    const root = document.documentElement;
    const themeVars = [
      '--background', '--foreground', '--card', '--card-foreground',
      '--popover', '--popover-foreground', '--primary', '--primary-foreground',
      '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
      '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
      '--border', '--input', '--ring',
    ];
    themeVars.forEach(v => root.style.removeProperty(v));

    // Remove data-theme attribute
    document.body.removeAttribute('data-theme');

    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <>{children}</>;
}

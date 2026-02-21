'use client';

import { useEffect, createContext, useContext, useState } from 'react';

// Theme definitions with full CSS variable sets
export type ThemeConfig = {
  id: string;
  name: string;
  description: string;
  cssVariables: {
    // Core colors
    '--background': string;
    '--foreground': string;
    '--card': string;
    '--card-foreground': string;
    '--popover': string;
    '--popover-foreground': string;
    '--primary': string;
    '--primary-foreground': string;
    '--secondary': string;
    '--secondary-foreground': string;
    '--muted': string;
    '--muted-foreground': string;
    '--accent': string;
    '--accent-foreground': string;
    '--destructive': string;
    '--destructive-foreground': string;
    '--border': string;
    '--input': string;
    '--ring': string;
  };
  preview: {
    bg: string;
    card: string;
    text: string;
    muted: string;
    primary: string;
  };
};

export const THEMES: ThemeConfig[] = [
  {
    id: 'default',
    name: 'Default (Muted)',
    description: 'Clean black and white theme with subtle accents',
    cssVariables: {
      '--background': '0 0% 100%',
      '--foreground': '222.2 84% 4.9%',
      '--card': '0 0% 100%',
      '--card-foreground': '222.2 84% 4.9%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '222.2 84% 4.9%',
      '--primary': '222.2 47.4% 11.2%',
      '--primary-foreground': '210 40% 98%',
      '--secondary': '210 40% 96.1%',
      '--secondary-foreground': '222.2 47.4% 11.2%',
      '--muted': '210 40% 96.1%',
      '--muted-foreground': '215.4 16.3% 46.9%',
      '--accent': '210 40% 96.1%',
      '--accent-foreground': '222.2 47.4% 11.2%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '214.3 31.8% 91.4%',
      '--input': '214.3 31.8% 91.4%',
      '--ring': '222.2 84% 4.9%',
    },
    preview: {
      bg: '#ffffff',
      card: '#f8fafc',
      text: '#0f172a',
      muted: '#64748b',
      primary: '#1e293b',
    },
  },
  {
    id: 'slate',
    name: 'Hexa Steel Slate',
    description: 'Professional dark slate theme matching Hexa Steel branding (#2c3e50)',
    cssVariables: {
      '--background': '210 29% 97%',
      '--foreground': '210 29% 18%',
      '--card': '0 0% 100%',
      '--card-foreground': '210 29% 18%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '210 29% 18%',
      '--primary': '210 29% 24%',
      '--primary-foreground': '210 40% 98%',
      '--secondary': '210 29% 90%',
      '--secondary-foreground': '210 29% 24%',
      '--muted': '210 29% 94%',
      '--muted-foreground': '210 18% 45%',
      '--accent': '210 29% 90%',
      '--accent-foreground': '210 29% 24%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '210 29% 88%',
      '--input': '210 29% 88%',
      '--ring': '210 29% 24%',
    },
    preview: {
      bg: '#f4f6f7',
      card: '#ffffff',
      text: '#2c3e50',
      muted: '#7f8c8d',
      primary: '#2c3e50',
    },
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    description: 'Professional blue theme for corporate environments',
    cssVariables: {
      '--background': '210 100% 98%',
      '--foreground': '210 100% 12%',
      '--card': '0 0% 100%',
      '--card-foreground': '210 100% 12%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '210 100% 12%',
      '--primary': '217 91% 60%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '214 95% 93%',
      '--secondary-foreground': '217 91% 40%',
      '--muted': '214 95% 93%',
      '--muted-foreground': '217 30% 45%',
      '--accent': '214 95% 93%',
      '--accent-foreground': '217 91% 40%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '214 50% 88%',
      '--input': '214 50% 88%',
      '--ring': '217 91% 60%',
    },
    preview: {
      bg: '#f0f9ff',
      card: '#ffffff',
      text: '#0c4a6e',
      muted: '#64748b',
      primary: '#3b82f6',
    },
  },
  {
    id: 'green',
    name: 'Forest Green',
    description: 'Natural green theme for eco-friendly vibes',
    cssVariables: {
      '--background': '138 76% 97%',
      '--foreground': '142 76% 12%',
      '--card': '0 0% 100%',
      '--card-foreground': '142 76% 12%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '142 76% 12%',
      '--primary': '142 76% 36%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '138 76% 93%',
      '--secondary-foreground': '142 76% 26%',
      '--muted': '138 76% 93%',
      '--muted-foreground': '142 30% 45%',
      '--accent': '138 76% 93%',
      '--accent-foreground': '142 76% 26%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '138 40% 88%',
      '--input': '138 40% 88%',
      '--ring': '142 76% 36%',
    },
    preview: {
      bg: '#f0fdf4',
      card: '#ffffff',
      text: '#14532d',
      muted: '#64748b',
      primary: '#16a34a',
    },
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    description: 'Elegant purple theme for creative projects',
    cssVariables: {
      '--background': '262 83% 98%',
      '--foreground': '262 83% 12%',
      '--card': '0 0% 100%',
      '--card-foreground': '262 83% 12%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '262 83% 12%',
      '--primary': '262 83% 58%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '262 83% 93%',
      '--secondary-foreground': '262 83% 38%',
      '--muted': '262 83% 93%',
      '--muted-foreground': '262 30% 45%',
      '--accent': '262 83% 93%',
      '--accent-foreground': '262 83% 38%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '262 40% 88%',
      '--input': '262 40% 88%',
      '--ring': '262 83% 58%',
    },
    preview: {
      bg: '#faf5ff',
      card: '#ffffff',
      text: '#581c87',
      muted: '#64748b',
      primary: '#9333ea',
    },
  },
  {
    id: 'orange',
    name: 'Sunset Orange',
    description: 'Warm orange theme for energetic workspaces',
    cssVariables: {
      '--background': '24 95% 98%',
      '--foreground': '24 95% 12%',
      '--card': '0 0% 100%',
      '--card-foreground': '24 95% 12%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '24 95% 12%',
      '--primary': '24 95% 53%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '24 95% 93%',
      '--secondary-foreground': '24 95% 33%',
      '--muted': '24 95% 93%',
      '--muted-foreground': '24 30% 45%',
      '--accent': '24 95% 93%',
      '--accent-foreground': '24 95% 33%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '24 40% 88%',
      '--input': '24 40% 88%',
      '--ring': '24 95% 53%',
    },
    preview: {
      bg: '#fff7ed',
      card: '#ffffff',
      text: '#7c2d12',
      muted: '#64748b',
      primary: '#ea580c',
    },
  },
  {
    id: 'teal',
    name: 'Teal Modern',
    description: 'Modern teal theme for tech-forward applications',
    cssVariables: {
      '--background': '174 72% 97%',
      '--foreground': '174 72% 12%',
      '--card': '0 0% 100%',
      '--card-foreground': '174 72% 12%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '174 72% 12%',
      '--primary': '174 72% 40%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '174 72% 93%',
      '--secondary-foreground': '174 72% 25%',
      '--muted': '174 72% 93%',
      '--muted-foreground': '174 30% 45%',
      '--accent': '174 72% 93%',
      '--accent-foreground': '174 72% 25%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '174 40% 88%',
      '--input': '174 40% 88%',
      '--ring': '174 72% 40%',
    },
    preview: {
      bg: '#f0fdfa',
      card: '#ffffff',
      text: '#134e4a',
      muted: '#64748b',
      primary: '#0d9488',
    },
  },
  {
    id: 'nova',
    name: 'Nova',
    description: 'Modern gradient theme with glass morphism and vibrant purple accents',
    cssVariables: {
      '--background': '240 10% 98%',
      '--foreground': '240 10% 8%',
      '--card': '0 0% 100%',
      '--card-foreground': '240 10% 8%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '240 10% 8%',
      '--primary': '262 80% 60%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '240 5% 96%',
      '--secondary-foreground': '240 6% 10%',
      '--muted': '240 5% 96%',
      '--muted-foreground': '240 4% 46%',
      '--accent': '262 80% 95%',
      '--accent-foreground': '262 80% 40%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '240 6% 90%',
      '--input': '240 6% 90%',
      '--ring': '262 80% 60%',
    },
    preview: {
      bg: 'linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 100%)',
      card: '#ffffff',
      text: '#1a1a2e',
      muted: '#6366f1',
      primary: '#8b5cf6',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Elegant cyan and pink gradient theme inspired by northern lights',
    cssVariables: {
      '--background': '180 20% 98%',
      '--foreground': '180 10% 10%',
      '--card': '0 0% 100%',
      '--card-foreground': '180 10% 10%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '180 10% 10%',
      '--primary': '189 94% 43%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '180 10% 95%',
      '--secondary-foreground': '180 10% 15%',
      '--muted': '180 10% 95%',
      '--muted-foreground': '180 5% 45%',
      '--accent': '189 94% 93%',
      '--accent-foreground': '189 94% 30%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '180 10% 88%',
      '--input': '180 10% 88%',
      '--ring': '189 94% 43%',
    },
    preview: {
      bg: 'linear-gradient(135deg, #e0f2fe 0%, #fce7f3 100%)',
      card: '#ffffff',
      text: '#0e7490',
      muted: '#06b6d4',
      primary: '#06b6d4',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm gradient theme with coral and amber tones',
    cssVariables: {
      '--background': '30 20% 98%',
      '--foreground': '30 10% 10%',
      '--card': '0 0% 100%',
      '--card-foreground': '30 10% 10%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '30 10% 10%',
      '--primary': '25 95% 53%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '30 10% 95%',
      '--secondary-foreground': '30 10% 15%',
      '--muted': '30 10% 95%',
      '--muted-foreground': '30 5% 45%',
      '--accent': '25 95% 93%',
      '--accent-foreground': '25 95% 30%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '30 10% 88%',
      '--input': '30 10% 88%',
      '--ring': '25 95% 53%',
    },
    preview: {
      bg: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)',
      card: '#ffffff',
      text: '#c2410c',
      muted: '#f97316',
      primary: '#f97316',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep dark theme with electric blue accents for night owls',
    cssVariables: {
      '--background': '222 47% 11%',
      '--foreground': '210 40% 98%',
      '--card': '222 47% 15%',
      '--card-foreground': '210 40% 98%',
      '--popover': '222 47% 15%',
      '--popover-foreground': '210 40% 98%',
      '--primary': '217 91% 60%',
      '--primary-foreground': '222 47% 11%',
      '--secondary': '222 47% 20%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '222 47% 20%',
      '--muted-foreground': '215 20% 65%',
      '--accent': '217 91% 25%',
      '--accent-foreground': '210 40% 98%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '222 47% 25%',
      '--input': '222 47% 25%',
      '--ring': '217 91% 60%',
    },
    preview: {
      bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      card: '#1e293b',
      text: '#e2e8f0',
      muted: '#3b82f6',
      primary: '#3b82f6',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Fresh green theme with nature-inspired gradients',
    cssVariables: {
      '--background': '142 52% 98%',
      '--foreground': '142 52% 10%',
      '--card': '0 0% 100%',
      '--card-foreground': '142 52% 10%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '142 52% 10%',
      '--primary': '142 71% 45%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '142 20% 95%',
      '--secondary-foreground': '142 20% 15%',
      '--muted': '142 20% 95%',
      '--muted-foreground': '142 10% 45%',
      '--accent': '142 71% 93%',
      '--accent-foreground': '142 71% 30%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '142 20% 88%',
      '--input': '142 20% 88%',
      '--ring': '142 71% 45%',
    },
    preview: {
      bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
      card: '#ffffff',
      text: '#065f46',
      muted: '#10b981',
      primary: '#10b981',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Elegant pink and rose theme with soft gradients',
    cssVariables: {
      '--background': '330 20% 98%',
      '--foreground': '330 10% 10%',
      '--card': '0 0% 100%',
      '--card-foreground': '330 10% 10%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '330 10% 10%',
      '--primary': '330 81% 60%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '330 10% 95%',
      '--secondary-foreground': '330 10% 15%',
      '--muted': '330 10% 95%',
      '--muted-foreground': '330 5% 45%',
      '--accent': '330 81% 93%',
      '--accent-foreground': '330 81% 30%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '330 10% 88%',
      '--input': '330 10% 88%',
      '--ring': '330 81% 60%',
    },
    preview: {
      bg: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
      card: '#ffffff',
      text: '#9f1239',
      muted: '#f43f5e',
      primary: '#f43f5e',
    },
  },
];

type ThemeContextType = {
  currentTheme: string;
  setTheme: (themeId: string) => void;
  themes: ThemeConfig[];
  customTheme: ThemeConfig | null;
  setCustomTheme: (theme: ThemeConfig | null) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement;
  Object.entries(theme.cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  // Set data-theme attribute for CSS selectors
  document.body.setAttribute('data-theme', theme.id);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<string>('default');
  const [customTheme, setCustomTheme] = useState<ThemeConfig | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('ots-theme');
    const savedCustomTheme = localStorage.getItem('ots-custom-theme');
    
    if (savedCustomTheme) {
      try {
        const parsed = JSON.parse(savedCustomTheme);
        setCustomTheme(parsed);
        if (savedTheme === 'custom') {
          applyTheme(parsed);
        }
      } catch (e) {
        console.error('Failed to parse custom theme:', e);
      }
    }
    
    if (savedTheme && savedTheme !== 'custom') {
      setCurrentTheme(savedTheme);
      const theme = THEMES.find(t => t.id === savedTheme);
      if (theme) {
        applyTheme(theme);
      }
    } else if (savedTheme === 'custom' && savedCustomTheme) {
      setCurrentTheme('custom');
    }
    
    setMounted(true);
  }, []);

  const setTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('ots-theme', themeId);
    
    if (themeId === 'custom' && customTheme) {
      applyTheme(customTheme);
    } else {
      const theme = THEMES.find(t => t.id === themeId);
      if (theme) {
        applyTheme(theme);
      }
    }
  };

  const handleSetCustomTheme = (theme: ThemeConfig | null) => {
    setCustomTheme(theme);
    if (theme) {
      localStorage.setItem('ots-custom-theme', JSON.stringify(theme));
    } else {
      localStorage.removeItem('ots-custom-theme');
    }
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ 
      currentTheme, 
      setTheme, 
      themes: THEMES,
      customTheme,
      setCustomTheme: handleSetCustomTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

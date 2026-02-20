'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Palette, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ColorPalette = {
  id: string;
  name: string;
  description: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  preview: {
    bg: string;
    card: string;
    text: string;
    muted: string;
  };
};

const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'default',
    name: 'Default (Muted)',
    description: 'Clean black and white theme with subtle accents',
    primary: 'hsl(222.2, 47.4%, 11.2%)',
    primaryForeground: 'hsl(210, 40%, 98%)',
    accent: 'hsl(210, 40%, 96.1%)',
    accentForeground: 'hsl(222.2, 47.4%, 11.2%)',
    preview: {
      bg: '#ffffff',
      card: '#f8fafc',
      text: '#0f172a',
      muted: '#64748b',
    },
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    description: 'Professional blue theme for corporate environments',
    primary: 'hsl(217, 91%, 60%)',
    primaryForeground: 'hsl(0, 0%, 100%)',
    accent: 'hsl(214, 95%, 93%)',
    accentForeground: 'hsl(217, 91%, 40%)',
    preview: {
      bg: '#f0f9ff',
      card: '#e0f2fe',
      text: '#0c4a6e',
      muted: '#0284c7',
    },
  },
  {
    id: 'green',
    name: 'Forest Green',
    description: 'Natural green theme for eco-friendly vibes',
    primary: 'hsl(142, 76%, 36%)',
    primaryForeground: 'hsl(0, 0%, 100%)',
    accent: 'hsl(138, 76%, 93%)',
    accentForeground: 'hsl(142, 76%, 26%)',
    preview: {
      bg: '#f0fdf4',
      card: '#dcfce7',
      text: '#14532d',
      muted: '#16a34a',
    },
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    description: 'Elegant purple theme for creative projects',
    primary: 'hsl(262, 83%, 58%)',
    primaryForeground: 'hsl(0, 0%, 100%)',
    accent: 'hsl(262, 83%, 93%)',
    accentForeground: 'hsl(262, 83%, 38%)',
    preview: {
      bg: '#faf5ff',
      card: '#f3e8ff',
      text: '#581c87',
      muted: '#9333ea',
    },
  },
  {
    id: 'orange',
    name: 'Sunset Orange',
    description: 'Warm orange theme for energetic workspaces',
    primary: 'hsl(24, 95%, 53%)',
    primaryForeground: 'hsl(0, 0%, 100%)',
    accent: 'hsl(24, 95%, 93%)',
    accentForeground: 'hsl(24, 95%, 33%)',
    preview: {
      bg: '#fff7ed',
      card: '#ffedd5',
      text: '#7c2d12',
      muted: '#ea580c',
    },
  },
  {
    id: 'teal',
    name: 'Teal Modern',
    description: 'Modern teal theme for tech-forward applications',
    primary: 'hsl(174, 72%, 40%)',
    primaryForeground: 'hsl(0, 0%, 100%)',
    accent: 'hsl(174, 72%, 93%)',
    accentForeground: 'hsl(174, 72%, 25%)',
    preview: {
      bg: '#f0fdfa',
      card: '#ccfbf1',
      text: '#134e4a',
      muted: '#0d9488',
    },
  },
];

export default function AppearanceSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState<string>('default');

  useEffect(() => {
    // Load saved palette from localStorage
    const savedPalette = localStorage.getItem('ots-color-palette');
    if (savedPalette) {
      setSelectedPalette(savedPalette);
    }
    setLoading(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('ots-color-palette', selectedPalette);
      
      // Apply the palette
      applyPalette(selectedPalette);
      
      toast({
        title: 'Appearance Updated',
        description: 'Your color palette preference has been saved. Refresh the page to see full changes.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save appearance settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const applyPalette = (paletteId: string) => {
    const palette = COLOR_PALETTES.find(p => p.id === paletteId);
    if (!palette) return;

    // Apply CSS variables to root
    const root = document.documentElement;
    root.style.setProperty('--primary', palette.primary);
    root.style.setProperty('--primary-foreground', palette.primaryForeground);
    root.style.setProperty('--accent', palette.accent);
    root.style.setProperty('--accent-foreground', palette.accentForeground);
  };

  const handlePaletteSelect = (paletteId: string) => {
    setSelectedPalette(paletteId);
    // Preview the palette immediately
    applyPalette(paletteId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Appearance Settings</h1>
        <p className="text-muted-foreground">Customize the look and feel of your workspace</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Palette
          </CardTitle>
          <CardDescription>
            Choose a color palette that suits your preference. Changes will be applied immediately for preview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {COLOR_PALETTES.map((palette) => (
              <div
                key={palette.id}
                onClick={() => handlePaletteSelect(palette.id)}
                className={cn(
                  "relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md",
                  selectedPalette === palette.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-muted hover:border-muted-foreground/30"
                )}
              >
                {selectedPalette === palette.id && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                
                {/* Preview */}
                <div 
                  className="rounded-md p-3 mb-3"
                  style={{ backgroundColor: palette.preview.bg }}
                >
                  <div 
                    className="rounded p-2 mb-2"
                    style={{ backgroundColor: palette.preview.card }}
                  >
                    <div 
                      className="text-sm font-semibold mb-1"
                      style={{ color: palette.preview.text }}
                    >
                      Sample Header
                    </div>
                    <div 
                      className="text-xs"
                      style={{ color: palette.preview.muted }}
                    >
                      Sample description text
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div 
                      className="h-6 w-16 rounded text-xs flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: palette.preview.muted }}
                    >
                      Button
                    </div>
                    <div 
                      className="h-6 w-16 rounded text-xs flex items-center justify-center border"
                      style={{ 
                        borderColor: palette.preview.muted,
                        color: palette.preview.muted 
                      }}
                    >
                      Outline
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="font-semibold">{palette.name}</Label>
                  <p className="text-xs text-muted-foreground mt-1">{palette.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preference
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme Mode</CardTitle>
          <CardDescription>
            Light and dark mode settings (coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dark mode support will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

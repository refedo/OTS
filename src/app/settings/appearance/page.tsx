'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Palette, Check, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useTheme, THEMES, ThemeConfig } from '@/components/ThemeProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AppearanceSettingsPage() {
  const { toast } = useToast();
  const { currentTheme, setTheme, themes, customTheme, setCustomTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customPrimaryColor, setCustomPrimaryColor] = useState('#2c3e50');

  const handleSave = async () => {
    setSaving(true);
    try {
      toast({
        title: 'Theme Applied',
        description: 'Your theme preference has been saved and applied.',
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

  const handleThemeSelect = (themeId: string) => {
    setTheme(themeId);
  };

  const hexToHsl = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0 0% 0%';
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const createCustomTheme = () => {
    const hsl = hexToHsl(customPrimaryColor);
    const [h, s] = hsl.split(' ').map(v => parseFloat(v));
    
    const newTheme: ThemeConfig = {
      id: 'custom',
      name: 'Custom Theme',
      description: `Custom theme based on ${customPrimaryColor}`,
      cssVariables: {
        '--background': `${h} ${Math.max(s - 70, 5)}% 97%`,
        '--foreground': `${h} ${Math.max(s - 50, 10)}% 12%`,
        '--card': '0 0% 100%',
        '--card-foreground': `${h} ${Math.max(s - 50, 10)}% 12%`,
        '--popover': '0 0% 100%',
        '--popover-foreground': `${h} ${Math.max(s - 50, 10)}% 12%`,
        '--primary': hsl,
        '--primary-foreground': '0 0% 100%',
        '--secondary': `${h} ${Math.max(s - 50, 10)}% 90%`,
        '--secondary-foreground': `${h} ${s}% 24%`,
        '--muted': `${h} ${Math.max(s - 60, 5)}% 94%`,
        '--muted-foreground': `${h} ${Math.max(s - 50, 10)}% 45%`,
        '--accent': `${h} ${Math.max(s - 50, 10)}% 90%`,
        '--accent-foreground': `${h} ${s}% 24%`,
        '--destructive': '0 84.2% 60.2%',
        '--destructive-foreground': '210 40% 98%',
        '--border': `${h} ${Math.max(s - 60, 5)}% 88%`,
        '--input': `${h} ${Math.max(s - 60, 5)}% 88%`,
        '--ring': hsl,
      },
      preview: {
        bg: '#f4f6f7',
        card: '#ffffff',
        text: customPrimaryColor,
        muted: '#7f8c8d',
        primary: customPrimaryColor,
      },
    };
    
    setCustomTheme(newTheme);
    setTheme('custom');
    setShowCustomDialog(false);
    
    toast({
      title: 'Custom Theme Created',
      description: 'Your custom theme has been applied.',
    });
  };

  const allThemes = customTheme ? [...themes, customTheme] : themes;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Appearance Settings</h1>
        <p className="text-muted-foreground">Customize the look and feel of your workspace</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowCustomDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Custom Theme
            </Button>
          </CardTitle>
          <CardDescription>
            Choose a theme that suits your preference. Changes are applied immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allThemes.map((theme) => (
              <div
                key={theme.id}
                onClick={() => handleThemeSelect(theme.id)}
                className={cn(
                  "relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md",
                  currentTheme === theme.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-muted hover:border-muted-foreground/30"
                )}
              >
                {currentTheme === theme.id && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                
                {/* Preview */}
                <div 
                  className="rounded-md p-3 mb-3"
                  style={{ backgroundColor: theme.preview.bg }}
                >
                  <div 
                    className="rounded p-2 mb-2"
                    style={{ backgroundColor: theme.preview.card }}
                  >
                    <div 
                      className="text-sm font-semibold mb-1"
                      style={{ color: theme.preview.text }}
                    >
                      Sample Header
                    </div>
                    <div 
                      className="text-xs"
                      style={{ color: theme.preview.muted }}
                    >
                      Sample description
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div 
                      className="h-6 flex-1 rounded text-xs flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: theme.preview.primary }}
                    >
                      Button
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="font-semibold">{theme.name}</Label>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{theme.description}</p>
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

      {/* Custom Theme Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Theme</DialogTitle>
            <DialogDescription>
              Enter a primary color to generate a custom theme based on that color.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={customPrimaryColor}
                  onChange={(e) => setCustomPrimaryColor(e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={customPrimaryColor}
                  onChange={(e) => setCustomPrimaryColor(e.target.value)}
                  placeholder="#2c3e50"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a hex color code (e.g., #2c3e50) or use the color picker
              </p>
            </div>
            
            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div 
                className="rounded-md p-4 border"
                style={{ backgroundColor: '#f4f6f7' }}
              >
                <div className="bg-white rounded p-3 mb-2">
                  <div style={{ color: customPrimaryColor }} className="font-semibold">
                    Sample Header
                  </div>
                  <div className="text-sm text-gray-500">Sample description text</div>
                </div>
                <div 
                  className="h-8 rounded flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: customPrimaryColor }}
                >
                  Primary Button
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createCustomTheme}>
              Create Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

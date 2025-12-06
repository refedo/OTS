'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { generateWPSPDF } from '@/lib/wps-pdf-generator';

type WPSExportButtonProps = {
  wps: any;
};

export function WPSExportButton({ wps }: WPSExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const imageToBase64 = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handleExport = async (theme: 'blue' | 'green' | 'orange' | 'purple' | 'red') => {
    setLoading(true);
    try {
      // Fetch settings
      const settingsResponse = await fetch('/api/settings');
      const settings = settingsResponse.ok ? await settingsResponse.json() : null;

      // Convert logo to base64 if exists
      let logoBase64: string | undefined;
      if (settings?.companyLogo) {
        try {
          logoBase64 = await imageToBase64(settings.companyLogo);
        } catch (error) {
          console.error('Error converting logo to base64:', error);
        }
      }

      const blob = generateWPSPDF(wps, theme, settings, logoBase64);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `WPS-${wps.wpsNumber}-Rev${wps.revision}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Select Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('blue')}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-600"></div>
            Blue (Default)
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('green')}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-600"></div>
            Green
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('orange')}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-600"></div>
            Orange
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('purple')}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-600"></div>
            Purple
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('red')}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-600"></div>
            Red
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

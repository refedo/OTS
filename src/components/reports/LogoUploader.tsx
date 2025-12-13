'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function LogoUploader() {
  const [uploading, setUploading] = useState(false);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/reports/upload-logo', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.status === 'success') {
        setLogoPath(result.path);
        toast({
          title: 'Logo Uploaded',
          description: 'Your company logo has been updated successfully',
        });
      } else {
        toast({
          title: 'Upload Failed',
          description: result.error || 'Failed to upload logo',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Upload Error',
        description: 'An error occurred while uploading the logo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Company Logo
        </CardTitle>
        <CardDescription>
          Upload your company logo to appear on all PDF reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Logo Preview */}
        {logoPath && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Logo Updated</p>
              <p className="text-xs text-green-700">Your logo will appear on all new reports</p>
            </div>
            <img src={logoPath} alt="Company Logo" className="h-12 w-auto" />
          </div>
        )}

        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
          <input
            type="file"
            id="logo-upload"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          <label htmlFor="logo-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-primary/10 p-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {uploading ? 'Uploading...' : 'Click to upload logo'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  PNG, JPG, or SVG (max 2MB)
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 font-medium mb-2">📋 Logo Guidelines:</p>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>Recommended size: 300x100 pixels</li>
            <li>Transparent background (PNG) works best</li>
            <li>Logo will be resized to fit header (60px height)</li>
            <li>Supported formats: PNG, JPG, SVG</li>
          </ul>
        </div>

        {/* Manual Upload Button */}
        <Button
          onClick={() => document.getElementById('logo-upload')?.click()}
          disabled={uploading}
          className="w-full"
          variant="outline"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Choose File'}
        </Button>
      </CardContent>
    </Card>
  );
}

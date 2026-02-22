'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Upload, Building2, FileText, Bell, Globe, Trash2, GitBranch } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Settings = {
  id: string;
  companyName: string;
  companyTagline: string;
  companyLogo: string | null;
  companyAddress: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
  defaultReportTheme: string;
  reportFooterText: string;
  dateFormat: string;
  timezone: string;
  currency: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLoginLogo, setUploadingLoginLogo] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loginLogoPreview, setLoginLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchLoginLogo();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setLogoPreview(data.companyLogo);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginLogo = async () => {
    try {
      const response = await fetch('/api/settings/login-logo');
      if (response.ok) {
        const data = await response.json();
        setLoginLogoPreview(data.logoUrl);
      }
    } catch (error) {
      console.error('Error fetching login logo:', error);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'company-logo');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(prev => prev ? { ...prev, companyLogo: data.filePath } : null);
        setLogoPreview(data.filePath);
      } else {
        alert('Failed to upload logo');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLoginLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLoginLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/settings/login-logo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setLoginLogoPreview(data.logoUrl);
        alert('Login logo uploaded successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to upload login logo');
      }
    } catch (error) {
      console.error('Error uploading login logo:', error);
      alert('Failed to upload login logo');
    } finally {
      setUploadingLoginLogo(false);
    }
  };

  const handleDeleteLoginLogo = async () => {
    if (!confirm('Are you sure you want to remove the login logo?')) return;

    try {
      const response = await fetch('/api/settings/login-logo', {
        method: 'DELETE',
      });

      if (response.ok) {
        setLoginLogoPreview(null);
        alert('Login logo removed successfully!');
      } else {
        alert('Failed to remove login logo');
      }
    } catch (error) {
      console.error('Error deleting login logo:', error);
      alert('Failed to remove login logo');
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      // Prepare data - exclude id, createdAt, updatedAt
      const { id, createdAt, updatedAt, ...settingsData } = settings as any;
      
      console.log('Sending settings data:', settingsData);
      
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });

      if (response.ok) {
        alert('Settings saved successfully!');
        router.refresh();
      } else {
        const error = await response.json();
        console.error('Validation error:', error);
        if (error.details) {
          alert(`Failed to save settings: ${JSON.stringify(error.details, null, 2)}`);
        } else {
          alert(`Failed to save settings: ${error.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
        <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
        <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
          <div className="text-center">
            <p className="text-muted-foreground">Failed to load settings</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            <p className="text-muted-foreground">
              Manage company information and system configuration
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList>
            <TabsTrigger value="company">
              <Building2 className="mr-2 h-4 w-4" />
              Company
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileText className="mr-2 h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="system">
              <Globe className="mr-2 h-4 w-4" />
              System
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="version">
              <GitBranch className="mr-2 h-4 w-4" />
              Version
            </TabsTrigger>
          </TabsList>

          {/* Company Information */}
          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  This information will appear on all reports and documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label htmlFor="logo">Company Logo</Label>
                  <div className="flex items-start gap-4">
                    {logoPreview && (
                      <div className="w-32 h-32 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                        <img 
                          src={logoPreview} 
                          alt="Company Logo" 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: PNG or SVG, max 2MB, transparent background
                      </p>
                      {uploadingLogo && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading...
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={settings.companyName}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                      placeholder="HEXA STEEL"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyTagline">Tagline</Label>
                    <Input
                      id="companyTagline"
                      value={settings.companyTagline}
                      onChange={(e) => setSettings({ ...settings, companyTagline: e.target.value })}
                      placeholder="THRIVE DIFFERENT"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Address</Label>
                  <Textarea
                    id="companyAddress"
                    value={settings.companyAddress || ''}
                    onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                    placeholder="Company address"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Phone</Label>
                    <Input
                      id="companyPhone"
                      value={settings.companyPhone || ''}
                      onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                      placeholder="+966 XX XXX XXXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Email</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={settings.companyEmail || ''}
                      onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                      placeholder="info@company.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">Website</Label>
                    <Input
                      id="companyWebsite"
                      type="url"
                      value={settings.companyWebsite || ''}
                      onChange={(e) => setSettings({ ...settings, companyWebsite: e.target.value })}
                      placeholder="https://company.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Login Page Logo */}
            <Card>
              <CardHeader>
                <CardTitle>Login Page Logo</CardTitle>
                <CardDescription>
                  Upload a logo for the login page. Use a version that looks good on a white background.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  {loginLogoPreview ? (
                    <div className="w-48 h-24 border rounded-lg flex items-center justify-center bg-white overflow-hidden p-2">
                      <img 
                        src={loginLogoPreview} 
                        alt="Login Logo" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-24 border rounded-lg flex items-center justify-center bg-muted">
                      <span className="text-muted-foreground text-sm">No logo set</span>
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <Input
                      id="loginLogo"
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLoginLogoUpload}
                      disabled={uploadingLoginLogo}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: PNG with transparent background, or colored logo that works on white
                    </p>
                    {uploadingLoginLogo && (
                      <p className="text-xs text-blue-600 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Uploading...
                      </p>
                    )}
                    {loginLogoPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteLoginLogo}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove Logo
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  If no login logo is set, the system will display "HEXA STEEL® - THRIVE DIFFERENT" as text.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Settings */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Configuration</CardTitle>
                <CardDescription>
                  Customize the appearance of generated reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultReportTheme">Default Report Theme</Label>
                  <select
                    id="defaultReportTheme"
                    value={settings.defaultReportTheme}
                    onChange={(e) => setSettings({ ...settings, defaultReportTheme: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="orange">Orange</option>
                    <option value="purple">Purple</option>
                    <option value="red">Red</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Users can still choose different themes when exporting
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportFooterText">Report Footer Text</Label>
                  <Input
                    id="reportFooterText"
                    value={settings.reportFooterText}
                    onChange={(e) => setSettings({ ...settings, reportFooterText: e.target.value })}
                    placeholder="HEXA STEEL - Professional Report"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>
                  Configure system-wide settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <select
                      id="dateFormat"
                      value={settings.dateFormat}
                      onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border bg-background"
                    >
                      <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                      <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={settings.timezone}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                      placeholder="UTC+03:00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={settings.currency}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                      placeholder="SAR"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Manage system notification settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Send email notifications for important events
                    </p>
                  </div>
                  <input
                    id="emailNotifications"
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="smsNotifications">SMS Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Send SMS notifications for critical alerts
                    </p>
                  </div>
                  <input
                    id="smsNotifications"
                    type="checkbox"
                    checked={settings.smsNotifications}
                    onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Version Management */}
          <TabsContent value="version" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Version Management</CardTitle>
                <CardDescription>
                  Track system version and create GitHub releases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => router.push('/settings/version')}
                  className="w-full"
                >
                  <GitBranch className="mr-2 h-4 w-4" />
                  Open Version Management
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </main>
  );
}

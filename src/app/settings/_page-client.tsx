'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Upload, Building2, FileText, Bell, Globe, Trash2, GitBranch, Smartphone, Github, Eye, EyeOff, CheckCircle2, XCircle, GitCommitHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';

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

  // GitHub integration state
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubShowToken, setGithubShowToken] = useState(false);
  const [githubSaving, setGithubSaving] = useState(false);
  const [githubDisconnecting, setGithubDisconnecting] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{
    configured: boolean;
    githubDefaultRepo: string | null;
    githubTokenHint: string | null;
  } | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchLoginLogo();
    fetchGithubStatus();
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

  const fetchGithubStatus = async () => {
    try {
      const res = await fetch('/api/settings/github');
      if (res.ok) {
        const data = await res.json();
        setGithubStatus(data);
        if (data.githubDefaultRepo) setGithubRepo(data.githubDefaultRepo);
      }
    } catch {
      // non-critical
    }
  };

  const handleGithubSave = async () => {
    if (!githubToken.trim() || !githubRepo.trim()) return;
    setGithubSaving(true);
    try {
      const res = await fetch('/api/settings/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubToken: githubToken.trim(), githubDefaultRepo: githubRepo.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`GitHub connected! Authenticated as @${data.login} — repo: ${data.repoFullName}`);
        setGithubToken('');
        fetchGithubStatus();
      } else {
        alert(data.error || 'Failed to connect to GitHub');
      }
    } catch {
      alert('Failed to connect to GitHub');
    } finally {
      setGithubSaving(false);
    }
  };

  const handleGithubDisconnect = async () => {
    if (!confirm('Remove GitHub integration? Existing linked issues will not be deleted on GitHub.')) return;
    setGithubDisconnecting(true);
    try {
      const res = await fetch('/api/settings/github', { method: 'DELETE' });
      if (res.ok) {
        setGithubStatus(null);
        setGithubRepo('');
        alert('GitHub integration disconnected.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to disconnect');
      }
    } catch {
      alert('Failed to disconnect GitHub');
    } finally {
      setGithubDisconnecting(false);
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
            <TabsTrigger value="github">
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </TabsTrigger>
            <TabsTrigger value="version">
              <GitBranch className="mr-2 h-4 w-4" />
              Version
            </TabsTrigger>
            <TabsTrigger value="commits">
              <GitCommitHorizontal className="mr-2 h-4 w-4" />
              Commits
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
                <CardTitle>System Notifications</CardTitle>
                <CardDescription>
                  Manage system-wide notification settings
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

            <NotificationPreferences />
          </TabsContent>

          {/* GitHub Integration */}
          <TabsContent value="github" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  GitHub Integration
                </CardTitle>
                <CardDescription>
                  Connect OTS Backlog to GitHub so approved items can be pushed as issues for your team to track and resolve.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Connection status banner */}
                {githubStatus?.configured ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800">Connected</p>
                        <p className="text-xs text-emerald-700">
                          Repo: <span className="font-mono">{githubStatus.githubDefaultRepo}</span>
                          {githubStatus.githubTokenHint && (
                            <> · Token: <span className="font-mono">{githubStatus.githubTokenHint}</span></>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={handleGithubDisconnect}
                      disabled={githubDisconnecting}
                    >
                      {githubDisconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border">
                    <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="space-y-2">
                    <Label htmlFor="githubToken">
                      1. Personal Access Token (PAT)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Go to <strong>GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)</strong>.
                      Generate a new token with the <code className="bg-muted px-1 rounded">repo</code> scope checked. Paste it here.
                    </p>
                    <div className="relative">
                      <Input
                        id="githubToken"
                        type={githubShowToken ? 'text' : 'password'}
                        value={githubToken}
                        onChange={e => setGithubToken(e.target.value)}
                        placeholder={githubStatus?.configured ? 'Enter new token to replace existing' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                        className="pr-10 font-mono text-sm"
                      />
                      <button
                        type="button"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setGithubShowToken(v => !v)}
                      >
                        {githubShowToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="space-y-2">
                    <Label htmlFor="githubRepo">
                      2. Default Repository
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      The GitHub repo where backlog items will be created as issues. Format: <code className="bg-muted px-1 rounded">owner/repo</code> — e.g. <code className="bg-muted px-1 rounded">refedo/ots-issues</code>
                    </p>
                    <Input
                      id="githubRepo"
                      value={githubRepo}
                      onChange={e => setGithubRepo(e.target.value)}
                      placeholder="your-org/your-repo"
                      className="font-mono text-sm"
                    />
                  </div>

                  <Button
                    onClick={handleGithubSave}
                    disabled={githubSaving || !githubToken.trim() || !githubRepo.trim()}
                    className="w-full gap-2"
                  >
                    {githubSaving ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Testing connection & saving...</>
                    ) : (
                      <><Github className="h-4 w-4" /> {githubStatus?.configured ? 'Update Connection' : 'Connect GitHub'}</>
                    )}
                  </Button>
                </div>

                {/* How it works */}
                <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How it works</p>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                    <li>Your team submits backlog items in OTS as usual.</li>
                    <li>Open any backlog item → click <strong>Push to GitHub</strong> in the sidebar.</li>
                    <li>OTS creates a GitHub issue with the full context (business reason, type, priority, affected modules).</li>
                    <li>OTS auto-creates labels like <code className="bg-muted px-1 rounded">ots-backlog</code>, <code className="bg-muted px-1 rounded">priority:high</code>, <code className="bg-muted px-1 rounded">type:feature</code> in the repo.</li>
                    <li>Use <strong>Re-sync</strong> to update the issue after edits. When status is Completed or Dropped, the GitHub issue is closed automatically.</li>
                  </ul>
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

          {/* Commits Cheat Sheet */}
          <TabsContent value="commits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conventional Commits Cheat Sheet</CardTitle>
                <CardDescription>
                  Git commit discipline reference for OTS™ development
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => router.push('/settings/commits')}
                  className="w-full"
                >
                  <GitCommitHorizontal className="mr-2 h-4 w-4" />
                  Open Commits Cheat Sheet
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </main>
  );
}

'use client';

/**
 * Version Management UI
 * Simple interface to track versioning system and create releases
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  GitBranch, 
  Tag, 
  Package, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  ExternalLink,
  Terminal,
  BookOpen,
  Rocket
} from 'lucide-react';

const CURRENT_VERSION = '14.0.0';
const PACKAGE_VERSION = '14.0.0';
const GITHUB_REPO = 'refedo/OTS';

export default function VersionManagementPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const versionConsistent = CURRENT_VERSION === PACKAGE_VERSION;

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Version Management</h1>
        <p className="text-muted-foreground mt-2">
          Track system version, create releases, and manage GitHub deployments
        </p>
      </div>

      {/* Current Version Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Current Version Status
          </CardTitle>
          <CardDescription>
            System version information and consistency check
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* System Version */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">System Version</span>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">v{CURRENT_VERSION}</div>
              <div className="text-xs text-muted-foreground mt-1">CHANGELOG.md</div>
            </div>

            {/* Package Version */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Package Version</span>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">v{PACKAGE_VERSION}</div>
              <div className="text-xs text-muted-foreground mt-1">package.json</div>
            </div>

            {/* Consistency Status */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Status</span>
                {versionConsistent ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="text-2xl font-bold">
                {versionConsistent ? 'Synced' : 'Mismatch'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {versionConsistent ? 'All versions aligned' : 'Versions out of sync'}
              </div>
            </div>
          </div>

          {!versionConsistent && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900">Version Mismatch Detected</h4>
                  <p className="text-sm text-red-700 mt-1">
                    System version and package version are not aligned. Run the version manager script to sync.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Release Process */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Create New Release
          </CardTitle>
          <CardDescription>
            Step-by-step guide to create a new release
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                1
              </div>
              <h3 className="font-semibold">Decide Release Type</h3>
            </div>
            <div className="ml-10 space-y-2">
              <p className="text-sm text-muted-foreground">
                Choose the appropriate version bump based on your changes:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 border rounded-lg">
                  <Badge variant="outline" className="mb-2">PATCH</Badge>
                  <p className="text-xs text-muted-foreground">Bug fixes, security patches</p>
                  <p className="text-xs font-mono mt-1">2.9.0 → 2.9.1</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge variant="outline" className="mb-2">MINOR</Badge>
                  <p className="text-xs text-muted-foreground">New features, enhancements</p>
                  <p className="text-xs font-mono mt-1">2.12.0 → 2.13.0</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge variant="outline" className="mb-2">MAJOR</Badge>
                  <p className="text-xs text-muted-foreground">Breaking changes</p>
                  <p className="text-xs font-mono mt-1">2.9.0 → 3.0.0</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                <p className="text-sm text-amber-900">
                  <strong>You decide:</strong> The version bump type (patch/minor/major) is determined by YOU based on the nature of your changes. The script just automates the file updates.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Step 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                2
              </div>
              <h3 className="font-semibold">Run Version Manager Script</h3>
            </div>
            <div className="ml-10 space-y-2">
              <p className="text-sm text-muted-foreground">
                Run the appropriate command based on your release type:
              </p>
              <div className="space-y-2">
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                  <span>node scripts/version-manager.js patch</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('node scripts/version-manager.js patch', 'patch')}
                  >
                    {copied === 'patch' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                  <span>node scripts/version-manager.js minor</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('node scripts/version-manager.js minor', 'minor')}
                  >
                    {copied === 'minor' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                  <span>node scripts/version-manager.js major</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('node scripts/version-manager.js major', 'major')}
                  >
                    {copied === 'major' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This updates: package.json, CHANGELOG.md, app-sidebar.tsx, login-form.tsx
              </p>
            </div>
          </div>

          <Separator />

          {/* Step 3 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                3
              </div>
              <h3 className="font-semibold">Edit CHANGELOG.md</h3>
            </div>
            <div className="ml-10 space-y-2">
              <p className="text-sm text-muted-foreground">
                Add your release notes to CHANGELOG.md under the new version entry
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>Important:</strong> The script creates a template entry. You must fill in the Added/Changed/Fixed sections with your actual changes.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Step 4 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                4
              </div>
              <h3 className="font-semibold">Commit & Tag</h3>
            </div>
            <div className="ml-10 space-y-2">
              <div className="space-y-2">
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                  <span>git add .</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('git add .', 'add')}
                  >
                    {copied === 'add' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                  <span>git commit -m "chore: release v3.0.0"</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('git commit -m "chore: release v3.0.0"', 'commit')}
                  >
                    {copied === 'commit' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                  <span>git tag -a v3.0.0 -m "Release v3.0.0"</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('git tag -a v3.0.0 -m "Release v3.0.0"', 'tag')}
                  >
                    {copied === 'tag' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Step 5 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-semibold text-sm">
                5
              </div>
              <h3 className="font-semibold">Push to GitHub</h3>
            </div>
            <div className="ml-10 space-y-2">
              <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                <span>git push origin main --tags</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard('git push origin main --tags', 'push')}
                >
                  {copied === 'push' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                <p className="text-sm text-green-900">
                  <strong>Automatic:</strong> GitHub Actions will detect the tag and automatically create a release with deployment package!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GitHub Release Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            GitHub Releases
          </CardTitle>
          <CardDescription>
            View releases and download deployment packages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Each release on GitHub includes:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Complete deployment package (.tar.gz)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Deployment instructions (DEPLOYMENT-vX.X.X.md)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Changelog excerpt for this version</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Rollback instructions</span>
            </li>
          </ul>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open(`https://github.com/${GITHUB_REPO}/releases`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Releases on GitHub
          </Button>
        </CardContent>
      </Card>

      {/* Production Server Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Production Server Deployment
          </CardTitle>
          <CardDescription>
            How to deploy releases to production server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Quick Deployment:</h4>
            <div className="space-y-2">
              <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs">
                <div># 1. Download release</div>
                <div>wget https://github.com/{GITHUB_REPO}/releases/download/v3.0.0/hexa-steel-ots-v3.0.0.tar.gz</div>
                <div className="mt-2"># 2. Stop app</div>
                <div>pm2 stop ots-app</div>
                <div className="mt-2"># 3. Extract</div>
                <div>tar -xzf hexa-steel-ots-v3.0.0.tar.gz -C /var/www/hexasteel.sa/ots</div>
                <div className="mt-2"># 4. Install & migrate</div>
                <div>cd /var/www/hexasteel.sa/ots</div>
                <div>npm ci --production</div>
                <div>npx prisma migrate deploy</div>
                <div className="mt-2"># 5. Restart</div>
                <div>pm2 restart ots-app</div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Rollback (if needed):</h4>
            <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs">
              <div>pm2 stop ots-app</div>
              <div>tar -xzf ots-backup-YYYYMMDD.tar.gz -C /var/www/hexasteel.sa/ots</div>
              <div>pm2 restart ots-app</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.open('/RELEASE_QUICK_START.md', '_blank')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Quick Start Guide
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.open('/docs/RELEASE_MANAGEMENT.md', '_blank')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Complete Release Management Guide
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

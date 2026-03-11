'use client';

import { useState } from 'react';
import { ShieldAlert, Send, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';

interface AccessDeniedProps {
  modulePath: string;
}

export function AccessDenied({ modulePath }: AccessDeniedProps) {
  const router = useRouter();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moduleName = getModuleNameFromPath(modulePath);

  async function handleRequestAccess() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/permissions/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modulePath,
          moduleName,
          message: message.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send request');
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl">Access Denied</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            You don&apos;t have permission to access <strong>{moduleName}</strong>.
            Contact your system administrator to request access.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Your access request has been sent to the system administrator.
                You&apos;ll be notified when it&apos;s reviewed.
              </p>
              <Button variant="outline" onClick={() => router.back()} className="mt-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          ) : showRequestForm ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Add an optional message explaining why you need access..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleRequestAccess}
                  disabled={sending}
                  className="flex-1"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Request
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRequestForm(false)}
                  disabled={sending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button onClick={() => setShowRequestForm(true)}>
                <Send className="h-4 w-4 mr-2" />
                Request Access
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Derive a human-friendly module name from the URL path.
 */
function getModuleNameFromPath(path: string): string {
  const moduleNames: Record<string, string> = {
    '/dolibarr': 'Dolibarr Integration',
    '/financial': 'Financial Module',
    '/production': 'Production Management',
    '/qc': 'Quality Control',
    '/itp': 'Inspection & Test Plans',
    '/wps': 'Welding Procedure Specifications',
    '/documents': 'Document Management',
    '/tasks': 'Task Management',
    '/projects': 'Project Operations',
    '/projects-dashboard': 'Projects Dashboard',
    '/buildings': 'Building Management',
    '/business-planning': 'Business Planning & Strategy',
    '/operations-control': 'Operations Control Center',
    '/knowledge-center': 'Knowledge Center',
    '/backlog': 'Product Backlog',
    '/ceo-control-center': 'CEO Control Center',
    '/users': 'User Management',
    '/roles': 'Role Management',
    '/organization': 'Organization',
    '/settings': 'System Settings',
    '/reports': 'Reports & Analytics',
    '/risk-dashboard': 'Risk Management',
    '/ai-assistant': 'AI Assistant',
    '/notifications': 'Notifications',
    '/events': 'Events',
    '/governance': 'Governance',
    '/planning': 'Planning',
    '/timeline': 'Timeline',
    '/pts-sync-simple': 'PTS Sync',
  };

  // Try exact match first, then match by first segment
  const cleanPath = path.split('?')[0];
  if (moduleNames[cleanPath]) return moduleNames[cleanPath];

  const firstSegment = '/' + cleanPath.split('/').filter(Boolean)[0];
  if (moduleNames[firstSegment]) return moduleNames[firstSegment];

  // Fallback: title-case the first segment
  return firstSegment
    .replace('/', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

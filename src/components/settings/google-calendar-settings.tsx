'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, CheckCircle2, XCircle, Loader2, Unplug, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface OAuthStatus {
  connected: boolean;
  email: string | null;
  updatedAt: string | null;
}

export function GoogleCalendarSettings() {
  const { toast } = useToast();
  const [status, setStatus] = useState<OAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);

  useEffect(() => {
    fetchStatus();

    // Handle OAuth callback result from URL params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const result = params.get('google_calendar');
      if (result === 'connected') {
        toast({ title: 'Google Calendar connected', description: 'Meet links will now be generated automatically.' });
      } else if (result === 'error') {
        toast({ title: 'Connection failed', description: 'Google Calendar could not be connected. Please try again.', variant: 'destructive' });
      }
    }
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/google-calendar/status');
      if (res.ok) setStatus(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch('/api/settings/google-calendar/auth-url');
      if (res.status === 503) {
        toast({ title: 'Not configured', description: 'GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set in the server environment.', variant: 'destructive' });
        return;
      }
      if (!res.ok) {
        toast({ title: 'Error', description: 'Could not generate authorization URL.', variant: 'destructive' });
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast({ title: 'Error', description: 'Failed to start Google authorization.', variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/settings/google-calendar', { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Disconnected', description: 'Google Calendar integration removed.' });
        setStatus({ connected: false, email: null, updatedAt: null });
      } else {
        toast({ title: 'Error', description: 'Could not disconnect.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to disconnect.', variant: 'destructive' });
    } finally {
      setDisconnecting(false);
      setShowDisconnect(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <Video className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Google Calendar & Meet</CardTitle>
              <CardDescription>
                Automatically generate Google Meet links when scheduling meetings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connection status…
            </div>
          ) : status?.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-800">Connected</p>
                  <p className="text-xs text-emerald-600 truncate">{status.email}</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs shrink-0">Active</Badge>
              </div>
              {status.updatedAt && (
                <p className="text-xs text-slate-400">
                  Last authorized {new Date(status.updatedAt).toLocaleDateString('en-SA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleConnect} disabled={connecting}>
                  {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ExternalLink className="h-3.5 w-3.5 mr-1.5" />}
                  Re-authorize
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => setShowDisconnect(true)}
                  disabled={disconnecting}
                >
                  {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Unplug className="h-3.5 w-3.5 mr-1.5" />}
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <XCircle className="h-4 w-4 text-slate-400 shrink-0" />
                <p className="text-sm text-slate-600">Not connected — Meet links will not be generated</p>
              </div>
              <p className="text-xs text-slate-500">
                One Google account authorizes once. All users then get Meet links automatically when scheduling meetings.
              </p>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleConnect} disabled={connecting}>
                {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Video className="h-3.5 w-3.5 mr-1.5" />}
                Connect Google Calendar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDisconnect} onOpenChange={setShowDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Google Calendar?</AlertDialogTitle>
            <AlertDialogDescription>
              Meet links will no longer be generated for new meetings. Existing meeting links remain valid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDisconnect}>
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, Send, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const fromPath = searchParams.get('from') || '';
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleRequest = async () => {
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/system/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromPath, message: message.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      setSent(true);
    } catch {
      setError('Failed to send request. Please try again or contact your administrator directly.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <Card className="border-destructive/30">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="size-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            {fromPath && (
              <p className="text-sm text-muted-foreground mt-1">
                You do not have permission to access{' '}
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{fromPath}</span>
              </p>
            )}
            {!fromPath && (
              <p className="text-sm text-muted-foreground mt-1">
                You do not have permission to access this page.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {sent ? (
              <div className="text-center py-4 space-y-2">
                <CheckCircle2 className="size-10 text-green-600 mx-auto" />
                <p className="font-medium text-green-700">Request Sent</p>
                <p className="text-sm text-muted-foreground">
                  Your request has been sent to the system administrators. They will review it and grant access if appropriate.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  You can send a request to the administrators to grant you access to this page.
                </p>
                <Textarea
                  placeholder="Optional: explain why you need access to this page…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  onClick={handleRequest}
                  disabled={sending}
                  className="w-full"
                >
                  <Send className="size-4 mr-2" />
                  {sending ? 'Sending…' : 'Send Access Request'}
                </Button>
              </>
            )}
            <div className="flex justify-center pt-2">
              <Button variant="ghost" asChild size="sm">
                <Link href="/dashboard">
                  <ArrowLeft className="size-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <UnauthorizedContent />
    </Suspense>
  );
}

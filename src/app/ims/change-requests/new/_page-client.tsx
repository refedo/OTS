'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, GitPullRequest, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Document = { id: string; documentNumber: string; title: string };

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export function NewDcrClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedDocId = searchParams.get('documentId');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    reason: '',
    documentId: preselectedDocId ?? '',
    priority: 'MEDIUM',
  });

  useEffect(() => {
    fetch('/api/ims/documents?status=APPROVED')
      .then(r => r.ok ? r.json() : [])
      .then(docs => setDocuments(docs));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/ims/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          reason: form.reason || null,
          documentId: form.documentId || null,
          priority: form.priority,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed to create DCR');
      }
      router.push('/ims/change-requests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create DCR');
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link href="/ims/change-requests">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-1" />
            Back to Change Requests
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950">
          <GitPullRequest className="size-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">New Document Change Request</h1>
          <p className="text-sm text-muted-foreground">DCR number will be auto-generated.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm dark:bg-red-950 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Change Request Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Brief description of the requested change"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="documentId">Related Document</Label>
                <Select value={form.documentId} onValueChange={v => setForm(f => ({ ...f, documentId: v }))}>
                  <SelectTrigger id="documentId"><SelectValue placeholder="Select document (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {documents.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="font-mono text-xs text-muted-foreground mr-2">{d.documentNumber}</span>
                        {d.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="reason">Reason for Change</Label>
              <Textarea
                id="reason"
                rows={3}
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Why is this change needed? (e.g. regulatory update, process improvement, corrective action…)"
              />
            </div>

            <div>
              <Label htmlFor="description">Description of Changes</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the specific changes to be made to the document…"
              />
            </div>
          </CardContent>
        </Card>

        <div className="rounded-lg bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 text-sm dark:bg-blue-950 dark:border-blue-800 dark:text-blue-400">
          <p className="font-medium">Submission note</p>
          <p className="mt-0.5">After submission the DCR will enter the <strong>IMS_CHANGE_REQUEST</strong> approval workflow: Document Controller → Manager.</p>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/ims/change-requests">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving || !form.title}>
            {saving ? (
              <><Loader2 className="size-4 mr-2 animate-spin" />Submitting…</>
            ) : (
              <><Save className="size-4 mr-2" />Submit DCR</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

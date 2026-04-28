'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, FileText, Clock, User, Building2, Shield, GitBranch,
  CheckCircle, AlertTriangle, Plus, Eye, Download, RefreshCw,
  Calendar, Tag, Layers, Send,
} from 'lucide-react';

type Revision = {
  id: string; version: string; changeType: string; changeDescription: string | null;
  status: string; effectiveDate: string | null; fileUrl: string | null;
  preparedBy: { id: string; name: string } | null;
  reviewedBy: { id: string; name: string } | null;
  approvedBy: { id: string; name: string } | null;
  createdAt: string;
};

type Recipient = {
  id: string; userId: string; acknowledgedAt: string | null; acknowledgeMethod: string | null;
  user: { id: string; name: string };
};

type Distribution = {
  id: string; issuedAt: string; notes: string | null; issuedById: string | null;
  recipients: Recipient[];
};

type DCR = {
  id: string; dcrNumber: string; title: string; status: string; priority: string;
  requestedBy: { id: string; name: string }; createdAt: string;
};

type Document = {
  id: string; documentNumber: string; title: string; titleAr: string | null;
  status: string; currentVersion: string; scope: string | null; purpose: string | null;
  confidentiality: string; site: string | null; reviewFrequencyDays: number;
  lastReviewDate: string | null; nextReviewDate: string | null; issuedAt: string | null;
  fileUrl: string | null; applicableStandards: string[] | null;
  category: { id: string; name: string; code: string; level: number };
  department: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
  reviewer: { id: string; name: string } | null;
  revisions: Revision[];
  distributions: Distribution[];
  clauseMappings: { id: string; clause: { standard: string; clause: string; title: string } }[];
};

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
    UNDER_REVIEW: 'bg-blue-100 text-blue-700 border-blue-200',
    APPROVED: 'bg-green-100 text-green-700 border-green-200',
    OBSOLETE: 'bg-red-100 text-red-700 border-red-200',
    SUPERSEDED: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>{status.replace('_', ' ')}</span>;
}

function changeTypeBadge(t: string) {
  const map: Record<string, string> = { MAJOR: 'bg-red-100 text-red-700', MINOR: 'bg-blue-100 text-blue-700', ADMINISTRATIVE: 'bg-gray-100 text-gray-600' };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded ${map[t] ?? 'bg-gray-100 text-gray-600'}`}>{t}</span>;
}

function priorityBadge(p: string) {
  const map: Record<string, string> = { LOW: 'bg-green-100 text-green-700', MEDIUM: 'bg-yellow-100 text-yellow-700', HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700' };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded ${map[p] ?? 'bg-gray-100 text-gray-600'}`}>{p}</span>;
}

function standardBadge(s: string) {
  const map: Record<string, string> = { ISO_9001: 'bg-green-100 text-green-700', ISO_14001: 'bg-blue-100 text-blue-700', ISO_45001: 'bg-purple-100 text-purple-700' };
  const label: Record<string, string> = { ISO_9001: '9001', ISO_14001: '14001', ISO_45001: '45001' };
  return <span key={s} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[s] ?? 'bg-gray-100 text-gray-600'}`}>ISO {label[s] ?? s}</span>;
}

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ImsDocumentDetailClient({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState<Document | null>(null);
  const [dcrs, setDcrs] = useState<DCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Revision dialog
  const [revDialog, setRevDialog] = useState(false);
  const [revForm, setRevForm] = useState({ version: '', changeType: 'MINOR', changeDescription: '', fileUrl: '' });
  const [revSaving, setRevSaving] = useState(false);

  // Distribution dialog
  const [distDialog, setDistDialog] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [distNotes, setDistNotes] = useState('');
  const [distSaving, setDistSaving] = useState(false);

  const fetchDoc = useCallback(async () => {
    const [docRes, dcrRes, meRes] = await Promise.all([
      fetch(`/api/ims/documents/${documentId}`),
      fetch(`/api/ims/change-requests?documentId=${documentId}`),
      fetch('/api/auth/me').catch(() => null),
    ]);
    if (docRes.ok) setDoc(await docRes.json());
    if (dcrRes.ok) setDcrs(await dcrRes.json());
    if (meRes?.ok) { const me = await meRes.json(); setCurrentUserId(me.id); }
    setLoading(false);
  }, [documentId]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  const saveRevision = async () => {
    setRevSaving(true);
    await fetch(`/api/ims/documents/${documentId}/revisions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(revForm),
    });
    setRevDialog(false);
    setRevForm({ version: '', changeType: 'MINOR', changeDescription: '', fileUrl: '' });
    fetchDoc();
    setRevSaving(false);
  };

  const saveDistribution = async () => {
    setDistSaving(true);
    await fetch(`/api/ims/documents/${documentId}/distributions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: selectedUsers, notes: distNotes }),
    });
    setDistDialog(false);
    setSelectedUsers([]);
    setDistNotes('');
    fetchDoc();
    setDistSaving(false);
  };

  const acknowledge = async (distId: string) => {
    await fetch(`/api/ims/documents/${documentId}/distributions/${distId}/acknowledge`, { method: 'POST' });
    fetchDoc();
  };

  const openDistDialog = async () => {
    const res = await fetch('/api/users');
    if (res.ok) { const users = await res.json(); setAllUsers(users); }
    setDistDialog(true);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-6 text-center">
        <FileText className="mx-auto size-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Document not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/ims/documents')}>Back to Registry</Button>
      </div>
    );
  }

  const overdue = doc.nextReviewDate && new Date(doc.nextReviewDate) < new Date();
  const overdueDays = overdue && doc.nextReviewDate
    ? Math.floor((Date.now() - new Date(doc.nextReviewDate).getTime()) / 86_400_000)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/ims" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          IMS Dashboard
        </Link>
        <span className="text-muted-foreground text-xs">/</span>
        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground" onClick={() => router.push('/ims/documents')}>
          <ArrowLeft className="size-3 mr-1" /> Document Registry
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-sm font-semibold text-muted-foreground">{doc.documentNumber}</span>
            {statusBadge(doc.status)}
            <Badge variant="outline">v{doc.currentVersion}</Badge>
            {overdue && <Badge className="bg-red-100 text-red-700 border-red-200">{overdueDays}d overdue</Badge>}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{doc.title}</h1>
          {doc.titleAr && <p className="text-sm text-muted-foreground mt-0.5" dir="rtl">{doc.titleAr}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {(doc.applicableStandards ?? []).map(s => standardBadge(s))}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {doc.fileUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={doc.fileUrl} target="_blank" rel="noreferrer"><Download className="size-4 mr-1" />Download</a>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revisions">Revisions ({doc.revisions.length})</TabsTrigger>
          <TabsTrigger value="distribution">Distribution ({doc.distributions.length})</TabsTrigger>
          <TabsTrigger value="changes">Change History ({dcrs.length})</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Document Metadata</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  {[
                    ['Category', doc.category ? `${doc.category.code} — ${doc.category.name}` : '—'],
                    ['Department', doc.department?.name ?? '—'],
                    ['Owner', doc.owner?.name ?? '—'],
                    ['Reviewer', doc.reviewer?.name ?? '—'],
                    ['Site', doc.site ?? '—'],
                    ['Confidentiality', doc.confidentiality],
                    ['Review Frequency', `${doc.reviewFrequencyDays} days`],
                    ['Last Review', doc.lastReviewDate ? new Date(doc.lastReviewDate).toLocaleDateString() : '—'],
                    ['Next Review', doc.nextReviewDate ? new Date(doc.nextReviewDate).toLocaleDateString() : '—'],
                    ['Issued', doc.issuedAt ? new Date(doc.issuedAt).toLocaleDateString() : '—'],
                  ].map(([label, value]) => (
                    <>
                      <dt className="text-muted-foreground font-medium">{label}</dt>
                      <dd className={label === 'Next Review' && overdue ? 'text-red-600 font-semibold' : ''}>{value}</dd>
                    </>
                  ))}
                </dl>

                {/* Clause mappings */}
                {doc.clauseMappings.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">ISO Clause Mappings ({doc.clauseMappings.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {doc.clauseMappings.map(m => (
                        <span key={m.id} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                          {m.clause.standard.replace('ISO_', '')} §{m.clause.clause}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              {doc.purpose && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Purpose</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{doc.purpose}</p></CardContent>
                </Card>
              )}
              {doc.scope && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Scope</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{doc.scope}</p></CardContent>
                </Card>
              )}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><GitBranch className="size-4" />Workflow</CardTitle></CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href="/workflow/my-approvals"><CheckCircle className="size-4 mr-2" />View My Approvals</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Revisions ── */}
        <TabsContent value="revisions" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Revision History</h3>
            <Button size="sm" onClick={() => setRevDialog(true)}><Plus className="size-4 mr-1" />Create Revision</Button>
          </div>
          {doc.revisions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="mx-auto size-10 mb-2 opacity-40" />
              <p>No revisions yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...doc.revisions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(rev => (
                <Card key={rev.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">v{rev.version}</Badge>
                        {changeTypeBadge(rev.changeType)}
                        {statusBadge(rev.status)}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{relTime(rev.createdAt)}</span>
                    </div>
                    {rev.changeDescription && <p className="text-sm text-muted-foreground mt-2">{rev.changeDescription}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      {rev.preparedBy && <span>Prepared: {rev.preparedBy.name}</span>}
                      {rev.reviewedBy && <span>Reviewed: {rev.reviewedBy.name}</span>}
                      {rev.approvedBy && <span>Approved: {rev.approvedBy.name}</span>}
                      {rev.effectiveDate && <span>Effective: {new Date(rev.effectiveDate).toLocaleDateString()}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Distribution ── */}
        <TabsContent value="distribution" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Distribution Records</h3>
            <Button size="sm" onClick={openDistDialog}><Send className="size-4 mr-1" />Issue Distribution</Button>
          </div>
          {doc.distributions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Send className="mx-auto size-10 mb-2 opacity-40" />
              <p>No distributions issued yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...doc.distributions].sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()).map(dist => (
                <Card key={dist.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Issued {new Date(dist.issuedAt).toLocaleDateString()}</span>
                      <span className="text-xs text-muted-foreground">{dist.recipients.length} recipients</span>
                    </div>
                    {dist.notes && <p className="text-xs text-muted-foreground">{dist.notes}</p>}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {dist.recipients.map(r => (
                        <div key={r.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <User className="size-3.5 text-muted-foreground" />
                            <span>{r.user.name}</span>
                          </div>
                          {r.acknowledgedAt ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle className="size-3" />{new Date(r.acknowledgedAt).toLocaleDateString()}
                            </span>
                          ) : r.userId === currentUserId ? (
                            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => acknowledge(dist.id)}>
                              Acknowledge
                            </Button>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Pending</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Change History ── */}
        <TabsContent value="changes" className="mt-4">
          <h3 className="font-semibold mb-4">Linked Change Requests</h3>
          {dcrs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="mx-auto size-10 mb-2 opacity-40" />
              <p>No change requests linked to this document.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dcrs.map(dcr => (
                <Link key={dcr.id} href={`/ims/change-requests/${dcr.id}`}>
                  <Card className="hover:bg-muted/40 transition-colors cursor-pointer">
                    <CardContent className="pt-4 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-mono text-sm font-semibold">{dcr.dcrNumber}</span>
                        <p className="text-sm text-muted-foreground mt-0.5">{dcr.title}</p>
                        <span className="text-xs text-muted-foreground">by {dcr.requestedBy.name} · {relTime(dcr.createdAt)}</span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {priorityBadge(dcr.priority)}
                        {statusBadge(dcr.status)}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Revision Dialog */}
      <Dialog open={revDialog} onOpenChange={setRevDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Revision</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Version *</Label>
                <Input placeholder="e.g. 2.0" value={revForm.version} onChange={e => setRevForm(f => ({ ...f, version: e.target.value }))} />
              </div>
              <div>
                <Label>Change Type</Label>
                <Select value={revForm.changeType} onValueChange={v => setRevForm(f => ({ ...f, changeType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MINOR">Minor</SelectItem>
                    <SelectItem value="MAJOR">Major</SelectItem>
                    <SelectItem value="ADMINISTRATIVE">Administrative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Change Description</Label>
              <Textarea rows={3} value={revForm.changeDescription} onChange={e => setRevForm(f => ({ ...f, changeDescription: e.target.value }))} />
            </div>
            <div>
              <Label>File URL (optional)</Label>
              <Input placeholder="https://..." value={revForm.fileUrl} onChange={e => setRevForm(f => ({ ...f, fileUrl: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevDialog(false)}>Cancel</Button>
            <Button onClick={saveRevision} disabled={revSaving || !revForm.version}>{revSaving ? 'Saving…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Distribution Dialog */}
      <Dialog open={distDialog} onOpenChange={setDistDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Issue Distribution</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Recipients</Label>
              <div className="mt-1 max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                {allUsers.map(u => (
                  <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u.id)}
                      onChange={e => setSelectedUsers(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))}
                    />
                    {u.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedUsers.length} selected</p>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={distNotes} onChange={e => setDistNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistDialog(false)}>Cancel</Button>
            <Button onClick={saveDistribution} disabled={distSaving || selectedUsers.length === 0}>{distSaving ? 'Issuing…' : 'Issue'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

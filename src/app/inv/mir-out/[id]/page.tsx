'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Printer, ArrowLeft, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';

interface MirOutDetail {
  id: string;
  mirOutNumber: string;
  materialType: string;
  siteId: string;
  status: string;
  notes: string | null;
  projectId: string | null;
  createdAt: string;
  requestedBy: { name: string };
  location: { name: string };
  submittedBy?: { name: string } | null;
  submittedAt?: string | null;
  approvedBy?: { name: string } | null;
  approvedAt?: string | null;
  issuedBy?: { name: string } | null;
  issuedAt?: string | null;
  rejectedBy?: { name: string } | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  lines: {
    id: string;
    item: { code: string; name: string; unit: string };
    warehouse: { code: string; name: string };
    qtyRequested: number;
    qtyIssued: number;
    status: string;
    availableQty?: number;
  }[];
  timeline: {
    step: string;
    label: string;
    actor: { name: string };
    at: string;
    note?: string | null;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  ISSUED: 'bg-green-100 text-green-800',
  PARTIALLY_ISSUED: 'bg-teal-100 text-teal-800',
  REJECTED: 'bg-red-100 text-red-800',
  CLOSED: 'bg-slate-100 text-slate-700',
};

export default function MirOutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [mirOut, setMirOut] = useState<MirOutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Issue modal
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueQtys, setIssueQtys] = useState<Record<string, number>>({});

  // Reject modal
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/inv/mir-out/${id}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Not found'); return; }
      setMirOut(data);
      // Initialize issue qtys from requested qtys
      const initQtys: Record<string, number> = {};
      data.lines?.forEach((l: { id: string; qtyRequested: number }) => { initQtys[l.id] = l.qtyRequested; });
      setIssueQtys(initQtys);
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inv/mir-out/${id}/approve`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      await fetchData();
    } finally { setActionLoading(false); }
  };

  const handleIssue = async () => {
    setActionLoading(true);
    try {
      const lines = mirOut?.lines
        .filter(l => l.status === 'PENDING' || l.status === 'PARTIAL')
        .map(l => ({ lineId: l.id, qtyIssued: issueQtys[l.id] || 0 }))
        .filter(l => l.qtyIssued > 0) ?? [];

      const res = await fetch(`/api/inv/mir-out/${id}/issue`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setIssueOpen(false);
      await fetchData();
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inv/mir-out/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setRejectOpen(false);
      await fetchData();
    } finally { setActionLoading(false); }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;
  if (!mirOut) return <div className="p-6 text-red-500">{error || 'Not found'}</div>;

  const canApprove = mirOut.status === 'PENDING_APPROVAL';
  const canIssue = mirOut.status === 'DRAFT' && mirOut.materialType === 'RAW_MATERIAL' ||
    mirOut.status === 'APPROVED' ||
    mirOut.status === 'PARTIALLY_ISSUED';
  const canReject = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(mirOut.status);
  const pendingLines = mirOut.lines.filter(l => l.status === 'PENDING' || l.status === 'PARTIAL');

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/inv/mir-out" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4" /> Material Issues
          </Link>
          <h1 className="text-2xl font-bold font-mono">{mirOut.mirOutNumber}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-sm font-medium ${STATUS_COLORS[mirOut.status]}`}>
              {mirOut.status.replace('_', ' ')}
            </span>
            <Badge variant="outline" className="text-xs">
              {mirOut.materialType === 'RAW_MATERIAL' ? 'Raw Material' : 'Consumable'}
            </Badge>
            <span className="text-sm text-muted-foreground">Factory {mirOut.siteId}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {canReject && (
            <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => setRejectOpen(true)}>
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
          )}
          {canApprove && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleApprove} disabled={actionLoading}>
              <CheckCircle className="h-4 w-4 mr-1" /> Approve
            </Button>
          )}
          {canIssue && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setIssueOpen(true)}>
              Issue Stock
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Header Info */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Request Details</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">Requested By</p><p className="font-medium">{mirOut.requestedBy?.name}</p></div>
              <div><p className="text-muted-foreground text-xs">Date</p><p>{new Date(mirOut.createdAt).toLocaleDateString('en-SA-u-ca-gregory')}</p></div>
              <div><p className="text-muted-foreground text-xs">Production Location</p><p>{mirOut.location?.name}</p></div>
              {mirOut.notes && <div className="sm:col-span-2"><p className="text-muted-foreground text-xs">Notes</p><p>{mirOut.notes}</p></div>}
            </CardContent>
          </Card>

          {/* Lines */}
          <Card>
            <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Requested</TableHead>
                    <TableHead className="text-right">Issued</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mirOut.lines.map(line => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{line.item.code}</div>
                        <div className="text-xs text-muted-foreground">{line.item.name}</div>
                      </TableCell>
                      <TableCell className="text-sm">{line.warehouse.code}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{line.qtyRequested} {line.item.unit}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{line.qtyIssued} {line.item.unit}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          line.status === 'ISSUED' ? 'bg-green-100 text-green-700' :
                          line.status === 'PARTIAL' ? 'bg-teal-100 text-teal-700' :
                          line.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{line.status}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <div>
          <Card>
            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent>
              {mirOut.timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">No timeline events</p>
              ) : (
                <div className="space-y-4">
                  {mirOut.timeline.map((t, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        {i < mirOut.timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.actor?.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(t.at).toLocaleDateString('en-SA-u-ca-gregory', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        {t.note && <p className="text-xs text-red-600 mt-1">{t.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Issue Modal */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue Stock — {mirOut.mirOutNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter the actual quantity issued for each line. Can be less than requested for partial issue.</p>
            {pendingLines.map(line => (
              <div key={line.id} className="flex items-center gap-3 py-2 border-b">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{line.item.code}</p>
                  <p className="text-xs text-muted-foreground">{line.warehouse.code} · Available: {line.availableQty ?? '?'} {line.item.unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">of {line.qtyRequested}</span>
                  <Input
                    type="number"
                    min={0}
                    max={Math.min(line.qtyRequested, line.availableQty ?? line.qtyRequested)}
                    className="w-24 h-8 text-sm"
                    value={issueQtys[line.id] ?? line.qtyRequested}
                    onChange={e => setIssueQtys(prev => ({ ...prev, [line.id]: parseFloat(e.target.value) || 0 }))}
                  />
                  <span className="text-xs">{line.item.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button onClick={handleIssue} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
              {actionLoading ? 'Issuing...' : 'Confirm Issue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Provide a reason for rejection. This is mandatory.</p>
            <Textarea placeholder="Enter rejection reason..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading || rejectReason.trim().length < 5}>
              {actionLoading ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

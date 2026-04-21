'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Landmark, Wallet, CalendarDays, BookOpen, FileText,
  ChevronDown, ChevronUp, Loader2, CheckCircle2, Plus, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaveType { id: string; nameEn: string; }
interface Policy { id: string; titleEn: string; category: string; contentEn: string | null; }

interface Props {
  employeeId: string;
  employeeName: string;
  canManageLoans: boolean;
  canManageCustodies: boolean;
  canManageLeaves: boolean;
}

function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Loan Request Dialog ──────────────────────────────────────────────────────

function LoanRequestDialog({ open, onClose, employeeId, employeeName }: {
  open: boolean; onClose: () => void; employeeId: string; employeeName: string;
}) {
  const [principal, setPrincipal] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentsTotal, setInstallmentsTotal] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setPrincipal(''); setInstallmentAmount(''); setInstallmentsTotal(''); setReason(''); setSuccess(false); setError(''); };

  async function handleSubmit() {
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/hr/loans', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, principal: Number(principal), installmentAmount: Number(installmentAmount), installmentsTotal: Number(installmentsTotal), startDate, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create loan'); return; }
      setSuccess(true);
    } catch { setError('Network error'); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Loan Request</DialogTitle>
          <DialogDescription>Create a loan for {employeeName}</DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-700">Loan created successfully</p>
            <Button onClick={() => { reset(); onClose(); }}>Close</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Principal (SAR) *</Label><Input type="number" placeholder="5000" value={principal} onChange={e => setPrincipal(e.target.value)} /></div>
                <div className="space-y-1"><Label>Installment (SAR) *</Label><Input type="number" placeholder="500" value={installmentAmount} onChange={e => setInstallmentAmount(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>No. of Installments *</Label><Input type="number" placeholder="10" value={installmentsTotal} onChange={e => setInstallmentsTotal(e.target.value)} /></div>
                <div className="space-y-1"><Label>Start Date *</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label>Reason</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Reason for loan..." /></div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving || !principal || !installmentAmount || !installmentsTotal}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Loan
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Custody Request Dialog ───────────────────────────────────────────────────

function CustodyRequestDialog({ open, onClose, employeeId, employeeName }: {
  open: boolean; onClose: () => void; employeeId: string; employeeName: string;
}) {
  const [amount, setAmount] = useState('');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setAmount(''); setReason(''); setNotes(''); setSuccess(false); setError(''); };

  async function handleSubmit() {
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/hr/custodies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, amount: Number(amount), issuedDate, reason, deductionAmount: Number(deductionAmount), notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create custody'); return; }
      setSuccess(true);
    } catch { setError('Network error'); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Custody / Cash Advance</DialogTitle>
          <DialogDescription>Create a custody record for {employeeName}</DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-700">Custody created successfully</p>
            <Button onClick={() => { reset(); onClose(); }}>Close</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Amount (SAR) *</Label><Input type="number" placeholder="1000" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                <div className="space-y-1"><Label>Issued Date *</Label><Input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label>Reason *</Label><Input placeholder="Purpose of cash advance..." value={reason} onChange={e => setReason(e.target.value)} /></div>
              <div className="space-y-1"><Label>Monthly Deduction (SAR)</Label><Input type="number" placeholder="0" value={deductionAmount} onChange={e => setDeductionAmount(e.target.value)} /></div>
              <div className="space-y-1"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving || !amount || !reason}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Custody
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Leave Request Dialog ─────────────────────────────────────────────────────

function LeaveRequestDialog({ open, onClose, employeeId, employeeName }: {
  open: boolean; onClose: () => void; employeeId: string; employeeName: string;
}) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetch('/api/hr/leave-types').then(r => r.json()).then(d => setLeaveTypes(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, [open]);

  const reset = () => { setLeaveTypeId(''); setStartDate(''); setEndDate(''); setReason(''); setSuccess(false); setError(''); };

  async function handleSubmit() {
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/hr/leave-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveTypeId, startDate, endDate, reason: reason || undefined, employeeId, submit: true }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create leave request'); return; }
      setSuccess(true);
    } catch { setError('Network error'); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Leave Request</DialogTitle>
          <DialogDescription>Create a leave request for {employeeName}</DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-700">Leave request submitted successfully</p>
            <Button onClick={() => { reset(); onClose(); }}>Close</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Leave Type *</Label>
                <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                  <SelectTrigger><SelectValue placeholder="Select leave type..." /></SelectTrigger>
                  <SelectContent>{leaveTypes.map(lt => <SelectItem key={lt.id} value={lt.id}>{lt.nameEn}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Start Date *</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                <div className="space-y-1"><Label>End Date *</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label>Reason</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} /></div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving || !leaveTypeId || !startDate || !endDate}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit Leave
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Policies Modal ───────────────────────────────────────────────────────────

function PoliciesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open && policies.length === 0) {
      setLoading(true);
      fetch('/api/hr/policies').then(r => r.json()).then(d => setPolicies(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [open, policies.length]);

  const filtered = policies.filter(p => !search || p.titleEn.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));
  const categories = [...new Set(filtered.map(p => p.category))];

  const toggle = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setSearch(''); } }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Company Policies</DialogTitle>
          <DialogDescription>Browse all company policies and guidelines</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          <Input placeholder="Search policies..." value={search} onChange={e => setSearch(e.target.value)} />
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-sky-400" /></div>
          ) : categories.map(cat => (
            <div key={cat} className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">{cat}</h3>
              {filtered.filter(p => p.category === cat).map(p => (
                <div key={p.id} className="border rounded-xl bg-white overflow-hidden">
                  <div className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50" onClick={() => toggle(p.id)}>
                    <BookOpen className="h-4 w-4 text-sky-500 shrink-0" />
                    <span className="flex-1 text-sm font-medium text-slate-800">{p.titleEn}</span>
                    {expanded.has(p.id) ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                  {expanded.has(p.id) && p.contentEn && (
                    <div className="px-4 py-3 border-t bg-slate-50 text-sm text-slate-600 whitespace-pre-wrap">{p.contentEn}</div>
                  )}
                </div>
              ))}
            </div>
          ))}
          {!loading && filtered.length === 0 && <p className="text-center text-slate-400 text-sm py-6">No policies found</p>}
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => { onClose(); setSearch(''); }}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Employment Certificate Dialog ───────────────────────────────────────────

function EmploymentCertificateDialog({ open, onClose, employeeId, employeeName }: {
  open: boolean; onClose: () => void; employeeId: string; employeeName: string;
}) {
  const [purpose, setPurpose] = useState('');
  const [language, setLanguage] = useState<'ARABIC' | 'ENGLISH' | 'BILINGUAL'>('BILINGUAL');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setPurpose(''); setSuccess(false); setError(''); };

  async function handleSubmit() {
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/hr/letters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          letterType: 'SALARY_CERTIFICATE',
          classification: 'INTERNAL',
          language,
          subject: 'Employment Certificate',
          content: `This is to certify that ${employeeName} is employed at Hexa Steel®.${purpose ? `\n\nPurpose: ${purpose}` : ''}`,
          contentEn: `This is to certify that ${employeeName} is employed at Hexa Steel®.${purpose ? `\n\nPurpose: ${purpose}` : ''}`,
          issuedAt: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create letter'); return; }
      setSuccess(true);
    } catch { setError('Network error'); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Employment Certificate Request</DialogTitle>
          <DialogDescription>Generate an employment certificate for {employeeName}</DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-700">Certificate letter created — pending CEO approval</p>
            <p className="text-sm text-slate-400">Go to the Letters tab to view and print once approved.</p>
            <Button onClick={() => { reset(); onClose(); }}>Close</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Language</Label>
                <Select value={language} onValueChange={v => setLanguage(v as typeof language)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARABIC">Arabic</SelectItem>
                    <SelectItem value="ENGLISH">English</SelectItem>
                    <SelectItem value="BILINGUAL">Bilingual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Purpose (optional)</Label>
                <Textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={2} placeholder="e.g. For embassy/visa purposes..." />
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />Create Certificate
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard Tab ───────────────────────────────────────────────────────

export function EmployeeSelfDashboardTab({ employeeId, employeeName, canManageLoans, canManageCustodies, canManageLeaves }: Props) {
  const [loanOpen, setLoanOpen] = useState(false);
  const [custodyOpen, setCustodyOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);

  const actions = [
    {
      key: 'loan',
      icon: <Landmark className="h-7 w-7 text-sky-600" />,
      bg: 'from-sky-50 to-white border-sky-200',
      title: 'Request Loan',
      description: 'Create a new salary loan with installment plan',
      action: () => setLoanOpen(true),
      disabled: !canManageLoans,
      disabledMsg: 'Requires loan management permission',
    },
    {
      key: 'custody',
      icon: <Wallet className="h-7 w-7 text-amber-600" />,
      bg: 'from-amber-50 to-white border-amber-200',
      title: 'Cash Advance / Custody',
      description: 'Create a cash advance or company custody record',
      action: () => setCustodyOpen(true),
      disabled: !canManageCustodies,
      disabledMsg: 'Requires custody management permission',
    },
    {
      key: 'leave',
      icon: <CalendarDays className="h-7 w-7 text-emerald-600" />,
      bg: 'from-emerald-50 to-white border-emerald-200',
      title: 'Request Leave',
      description: 'Submit a leave request for approval',
      action: () => setLeaveOpen(true),
      disabled: !canManageLeaves,
      disabledMsg: 'Requires leave management permission',
    },
    {
      key: 'policies',
      icon: <BookOpen className="h-7 w-7 text-violet-600" />,
      bg: 'from-violet-50 to-white border-violet-200',
      title: 'Company Policies',
      description: 'Browse and read all company policies and guidelines',
      action: () => setPoliciesOpen(true),
      disabled: false,
      disabledMsg: '',
    },
    {
      key: 'certificate',
      icon: <FileText className="h-7 w-7 text-rose-600" />,
      bg: 'from-rose-50 to-white border-rose-200',
      title: 'Employment Certificate',
      description: 'Generate an employment certificate for official use',
      action: () => setCertOpen(true),
      disabled: false,
      disabledMsg: '',
    },
  ];

  return (
    <div className="space-y-6 py-2">
      <div className="rounded-xl border bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200 p-4">
        <p className="text-sm font-semibold text-sky-700">HR Quick Actions</p>
        <p className="text-xs text-sky-600 mt-0.5">Manage {employeeName}'s HR records without navigating away — one-stop shop for common actions.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map(a => (
          <button
            key={a.key}
            onClick={a.action}
            disabled={a.disabled}
            className={cn(
              'rounded-2xl border bg-gradient-to-b p-5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0',
              a.bg,
              a.disabled && 'opacity-50 cursor-not-allowed hover:shadow-none hover:translate-y-0'
            )}
          >
            <div className="mb-3">{a.icon}</div>
            <p className="text-sm font-bold text-slate-800">{a.title}</p>
            <p className="text-xs text-slate-500 mt-1">{a.disabled ? a.disabledMsg : a.description}</p>
            {!a.disabled && (
              <div className="flex items-center gap-1 mt-3">
                <Plus className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Click to open</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <LoanRequestDialog open={loanOpen} onClose={() => setLoanOpen(false)} employeeId={employeeId} employeeName={employeeName} />
      <CustodyRequestDialog open={custodyOpen} onClose={() => setCustodyOpen(false)} employeeId={employeeId} employeeName={employeeName} />
      <LeaveRequestDialog open={leaveOpen} onClose={() => setLeaveOpen(false)} employeeId={employeeId} employeeName={employeeName} />
      <PoliciesDialog open={policiesOpen} onClose={() => setPoliciesOpen(false)} />
      <EmploymentCertificateDialog open={certOpen} onClose={() => setCertOpen(false)} employeeId={employeeId} employeeName={employeeName} />
    </div>
  );
}

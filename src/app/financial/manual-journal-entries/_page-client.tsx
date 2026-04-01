'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, BookOpen, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CoaAccount {
  account_code: string;
  account_name: string;
  account_name_ar: string | null;
  account_type: string;
  account_category: string | null;
}

interface JournalLine {
  account_code: string;
  label: string;
  debit: number;
  credit: number;
}

interface ManualEntry {
  piece_num: number;
  entry_date: string;
  journal_code: string;
  reference: string;
  total_debit: number;
  total_credit: number;
  line_count: number;
  lines: Array<{
    id: number;
    account_code: string;
    account_name: string;
    label: string;
    debit: number;
    credit: number;
  }>;
}

function formatSAR(n: number) {
  if (n === 0) return '—';
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// ─── COA Combobox ────────────────────────────────────────────────────────────

function CoaCombobox({
  accounts, value, onChange, placeholder = 'Select account…', disabled,
}: {
  accounts: CoaAccount[];
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = accounts.find(a => a.account_code === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? accounts.filter(a =>
        a.account_code.includes(query) ||
        a.account_name.toLowerCase().includes(query.toLowerCase()) ||
        (a.account_name_ar || '').includes(query),
      )
    : accounts;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className={selected ? '' : 'text-muted-foreground'}>
          {selected ? `${selected.account_code} — ${selected.account_name}` : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-72 overflow-hidden flex flex-col">
          <div className="flex items-center border-b px-3 py-2 gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search code or name…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">No accounts found</p>
            ) : (
              filtered.map(a => (
                <button
                  key={a.account_code}
                  type="button"
                  onClick={() => { onChange(a.account_code); setOpen(false); setQuery(''); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2',
                    a.account_code === value && 'bg-accent font-medium',
                  )}
                >
                  <span>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{a.account_code}</span>
                    {a.account_name}
                  </span>
                  <Badge variant="outline" className="text-xs shrink-0">{a.account_type}</Badge>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

const JOURNAL_CODES = ['OD', 'AN', 'RAN', 'BQ', 'VTE', 'ACH', 'SAL'];

const EMPTY_LINE: JournalLine = { account_code: '', label: '', debit: 0, credit: 0 };

export default function ManualJournalEntriesClient() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<ManualEntry[]>([]);
  const [accounts, setAccounts] = useState<CoaAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPiece, setExpandedPiece] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManualEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formJournal, setFormJournal] = useState('OD');
  const [formRef, setFormRef] = useState('');
  const [formLines, setFormLines] = useState<JournalLine[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/financial/manual-journal-entries');
      if (res.ok) setEntries(await res.json().then(d => d.entries ?? []));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/financial/chart-of-accounts');
      if (res.ok) setAccounts(await res.json());
    } catch { /* */ }
  }, []);

  useEffect(() => { fetchEntries(); fetchAccounts(); }, [fetchEntries, fetchAccounts]);

  const totalDebit = formLines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = formLines.reduce((s, l) => s + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  function updateLine(idx: number, patch: Partial<JournalLine>) {
    setFormLines(lines => lines.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }

  function addLine() {
    setFormLines(lines => [...lines, { ...EMPTY_LINE }]);
  }

  function removeLine(idx: number) {
    if (formLines.length <= 2) return;
    setFormLines(lines => lines.filter((_, i) => i !== idx));
  }

  function resetForm() {
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormJournal('OD');
    setFormRef('');
    setFormLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
  }

  async function handleSave() {
    if (!formRef.trim()) {
      toast({ title: 'Reference required', variant: 'destructive' });
      return;
    }
    if (!isBalanced) {
      toast({ title: 'Entry is not balanced', description: 'Total debits must equal total credits.', variant: 'destructive' });
      return;
    }
    const validLines = formLines.filter(l => l.account_code && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      toast({ title: 'At least 2 lines required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/financial/manual-journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: formDate,
          journal_code: formJournal,
          reference: formRef.trim(),
          lines: validLines,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: 'Failed to save', description: err.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Journal entry saved' });
      setDialogOpen(false);
      resetForm();
      fetchEntries();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/financial/manual-journal-entries/${deleteTarget.piece_num}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: 'Failed to delete', description: err.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Entry deleted' });
      setDeleteTarget(null);
      fetchEntries();
    } catch {
      toast({ title: 'Error deleting entry', variant: 'destructive' });
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Manual Journal Entries
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Locked entries that survive sync — use for equity, opening balances, and corrections.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Entry
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entries ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
              <BookOpen className="h-8 w-8" />
              <p className="text-sm">No manual journal entries yet.</p>
              <p className="text-xs">Create entries for equity, opening balances, and corrections.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Journal</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(entry => (
                  <>
                    <TableRow
                      key={entry.piece_num}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedPiece(expandedPiece === entry.piece_num ? null : entry.piece_num)}
                    >
                      <TableCell>
                        {expandedPiece === entry.piece_num
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{entry.entry_date}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{entry.journal_code}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{entry.reference}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatSAR(entry.total_debit)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatSAR(entry.total_credit)}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">{entry.line_count}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={e => { e.stopPropagation(); setDeleteTarget(entry); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedPiece === entry.piece_num && (
                      <TableRow key={`${entry.piece_num}-detail`}>
                        <TableCell colSpan={8} className="bg-muted/30 p-0">
                          <div className="px-6 py-3">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Account</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead className="text-right">Debit</TableHead>
                                  <TableHead className="text-right">Credit</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {entry.lines.map(line => (
                                  <TableRow key={line.id}>
                                    <TableCell className="font-mono text-xs">
                                      {line.account_code}
                                      {line.account_name && line.account_name !== line.account_code && (
                                        <span className="text-muted-foreground ml-1">— {line.account_name}</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{line.label}</TableCell>
                                    <TableCell className="text-right font-mono text-sm">{formatSAR(Number(line.debit))}</TableCell>
                                    <TableCell className="text-right font-mono text-sm">{formatSAR(Number(line.credit))}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Manual Journal Entry</DialogTitle>
            <DialogDescription>
              This entry is locked — it will not be deleted during sync cycles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Journal</Label>
                <Select value={formJournal} onValueChange={setFormJournal}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOURNAL_CODES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input placeholder="e.g. EQUITY-2026-01" value={formRef} onChange={e => setFormRef(e.target.value)} />
              </div>
            </div>

            {/* Lines */}
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1.5fr_120px_120px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
                <span>Account</span>
                <span>Description</span>
                <span className="text-right">Debit (SAR)</span>
                <span className="text-right">Credit (SAR)</span>
                <span></span>
              </div>
              {formLines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1.5fr_120px_120px_32px] gap-2 items-center">
                  <CoaCombobox
                    accounts={accounts}
                    value={line.account_code}
                    onChange={code => updateLine(idx, { account_code: code })}
                    placeholder="Account…"
                  />
                  <Input
                    placeholder="Description"
                    value={line.label}
                    onChange={e => updateLine(idx, { label: e.target.value })}
                  />
                  <Input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    className="text-right"
                    value={line.debit || ''}
                    onChange={e => updateLine(idx, { debit: parseFloat(e.target.value) || 0, credit: 0 })}
                  />
                  <Input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    className="text-right"
                    value={line.credit || ''}
                    onChange={e => updateLine(idx, { credit: parseFloat(e.target.value) || 0, debit: 0 })}
                  />
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                    onClick={() => removeLine(idx)}
                    disabled={formLines.length <= 2}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addLine} className="text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add line
              </Button>
            </div>

            {/* Balance summary */}
            <div className={cn(
              'flex items-center justify-between rounded-md px-4 py-2.5 text-sm border',
              isBalanced ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900',
            )}>
              <div className="flex items-center gap-2">
                {isBalanced
                  ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  : <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                <span className={isBalanced ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}>
                  {isBalanced ? 'Balanced' : 'Not balanced — debits must equal credits'}
                </span>
              </div>
              <div className="flex gap-6 font-mono text-xs">
                <span>DR {totalDebit.toFixed(2)}</span>
                <span>CR {totalCredit.toFixed(2)}</span>
                {!isBalanced && totalDebit !== totalCredit && (
                  <span className="text-amber-600">Δ {Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !isBalanced || !formRef.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete journal entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete entry <strong>{deleteTarget?.reference}</strong> ({deleteTarget?.line_count} lines).
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

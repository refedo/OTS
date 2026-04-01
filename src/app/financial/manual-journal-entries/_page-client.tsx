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
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Loader2, Plus, Trash2, BookOpen, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, Search, HelpCircle, Info,
} from 'lucide-react';
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

// ─── Journal code reference ───────────────────────────────────────────────────

const JOURNAL_CODES: Array<{ code: string; name: string; use: string; color: string }> = [
  { code: 'OD',  name: 'Miscellaneous / Adjusting',  use: 'Opening balances, equity, corrections, reclassifications. Use this for most manual entries.', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  { code: 'AN',  name: 'Opening Balance',             use: 'Initial opening balances when starting a new fiscal year or migrating data.', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  { code: 'RAN', name: 'Retained Earnings Forward',  use: 'Carrying forward prior-year profit or loss into Retained Earnings.', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { code: 'BQ',  name: 'Bank (Banque)',               use: 'Bank transfers and cash movements not captured by Dolibarr payments.', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300' },
  { code: 'VTE', name: 'Sales (Ventes)',              use: 'Auto-generated for customer invoices. Use manually only for adjustments.', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { code: 'ACH', name: 'Purchases (Achats)',          use: 'Auto-generated for supplier invoices. Use manually only for adjustments.', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  { code: 'SAL', name: 'Salaries (Salaires)',         use: 'Auto-generated from salary records. Use manually for off-cycle corrections.', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' },
];

// ─── COA Combobox ─────────────────────────────────────────────────────────────

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
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = accounts.find(a => a.account_code === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = query.trim()
    ? accounts.filter(a =>
        a.account_code.includes(query) ||
        a.account_name.toLowerCase().includes(query.toLowerCase()) ||
        (a.account_name_ar || '').includes(query),
      )
    : accounts;

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background text-left',
          'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? `${selected.account_code} — ${selected.account_name}` : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-1" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] rounded-md border bg-popover shadow-lg max-h-64 overflow-hidden flex flex-col">
          <div className="flex items-center border-b px-3 py-2 gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
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
                    'w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2',
                    a.account_code === value && 'bg-accent font-medium',
                  )}
                >
                  <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">{a.account_code}</span>
                  <span className="truncate">{a.account_name}</span>
                  <Badge variant="outline" className="text-xs ml-auto shrink-0">{a.account_type}</Badge>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Guide Panel ──────────────────────────────────────────────────────────────

function JournalGuide() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 text-xs h-8">
          <HelpCircle className="h-3.5 w-3.5" />
          Journal codes guide
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-lg border bg-muted/30 p-3 space-y-2">
          <p className="text-xs text-muted-foreground font-medium mb-2">
            Choose the journal code that matches the nature of your entry:
          </p>
          <div className="grid gap-1.5">
            {JOURNAL_CODES.map(jc => (
              <div key={jc.code} className="flex items-start gap-2 text-xs">
                <span className={cn('font-mono font-bold px-1.5 py-0.5 rounded text-xs shrink-0', jc.color)}>{jc.code}</span>
                <span>
                  <span className="font-medium">{jc.name}</span>
                  <span className="text-muted-foreground"> — {jc.use}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2 mt-2">
            <p className="text-xs text-muted-foreground flex gap-1">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                <strong>Double-entry rule:</strong> every entry must balance — total debits must equal total credits.
                An increase in an <em>asset or expense</em> is a debit; an increase in a <em>liability, equity, or revenue</em> is a credit.
              </span>
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Line Row — adapts between mobile (card) and desktop (table row) ──────────

function LineRow({
  line, idx, accounts, onChange, onRemove, canRemove,
}: {
  line: JournalLine;
  idx: number;
  accounts: CoaAccount[];
  onChange: (patch: Partial<JournalLine>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="border rounded-lg p-3 space-y-2 bg-background">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Line {idx + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:pointer-events-none"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <CoaCombobox
        accounts={accounts}
        value={line.account_code}
        onChange={code => onChange({ account_code: code })}
        placeholder="Account…"
      />
      <Input
        placeholder="Description"
        value={line.label}
        onChange={e => onChange({ label: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Debit (SAR)</Label>
          <Input
            type="number" min="0" step="0.01" placeholder="0.00"
            className="text-right"
            value={line.debit || ''}
            onChange={e => onChange({ debit: parseFloat(e.target.value) || 0, credit: 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Credit (SAR)</Label>
          <Input
            type="number" min="0" step="0.01" placeholder="0.00"
            className="text-right"
            value={line.credit || ''}
            onChange={e => onChange({ credit: parseFloat(e.target.value) || 0, debit: 0 })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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

  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formJournal, setFormJournal] = useState('OD');
  const [formRef, setFormRef] = useState('');
  const [formLines, setFormLines] = useState<JournalLine[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/financial/manual-journal-entries');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
      }
    } catch {
      toast({ title: 'Failed to load entries', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
      toast({ title: 'Reference required', description: 'Enter a reference such as EQUITY-2026-01', variant: 'destructive' });
      return;
    }
    if (!isBalanced) {
      toast({ title: 'Entry not balanced', description: `Debits ${totalDebit.toFixed(2)} ≠ Credits ${totalCredit.toFixed(2)}`, variant: 'destructive' });
      return;
    }
    const validLines = formLines.filter(l => l.account_code && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      toast({ title: 'At least 2 lines required', description: 'Each line needs an account and an amount.', variant: 'destructive' });
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
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Failed to save', description: data.error ?? 'Unknown error', variant: 'destructive' });
        return;
      }
      toast({ title: 'Journal entry saved', description: `Entry #${data.piece_num} created successfully.` });
      setDialogOpen(false);
      resetForm();
      await fetchEntries();
    } catch (err: unknown) {
      toast({ title: 'Network error', description: err instanceof Error ? err.message : 'Could not reach the server.', variant: 'destructive' });
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
      await fetchEntries();
    } catch {
      toast({ title: 'Network error deleting entry', variant: 'destructive' });
    }
  }

  const selectedJournalMeta = JOURNAL_CODES.find(j => j.code === formJournal);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 shrink-0" />
            Manual Journal Entries
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Locked entries — survive every sync cycle. Use for equity, opening balances &amp; corrections.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> New Entry
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
              <p className="text-sm">No manual entries yet.</p>
              <p className="text-xs text-center px-8">Create entries for equity capital, opening bank balances, retained earnings, and any corrections Dolibarr cannot provide.</p>
            </div>
          ) : (
            <div className="divide-y">
              {entries.map(entry => (
                <div key={entry.piece_num}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3"
                    onClick={() => setExpandedPiece(expandedPiece === entry.piece_num ? null : entry.piece_num)}
                  >
                    {expandedPiece === entry.piece_num
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{entry.reference}</span>
                        <Badge variant="secondary" className="text-xs">{entry.journal_code}</Badge>
                        <span className="text-xs text-muted-foreground">{entry.entry_date}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {entry.line_count} lines · DR {formatSAR(entry.total_debit)} · CR {formatSAR(entry.total_credit)}
                      </div>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(entry); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </button>
                  {expandedPiece === entry.piece_num && (
                    <div className="px-4 pb-3 bg-muted/20">
                      <div className="overflow-x-auto rounded border">
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
                                    <span className="text-muted-foreground ml-1 font-sans">— {line.account_name}</span>
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── New Entry Dialog ───────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) { setDialogOpen(open); if (!open) resetForm(); } }}>
        <DialogContent className="w-full max-w-lg sm:max-w-2xl max-h-[95dvh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>New Manual Journal Entry</DialogTitle>
            <DialogDescription>
              This entry is locked — it will not be deleted during sync cycles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Date / Journal / Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Journal</Label>
                <Select value={formJournal} onValueChange={setFormJournal}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOURNAL_CODES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="font-mono font-bold mr-2">{c.code}</span>
                        <span className="text-muted-foreground text-xs">{c.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedJournalMeta && (
                  <p className="text-xs text-muted-foreground leading-tight">{selectedJournalMeta.use}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input placeholder="e.g. EQUITY-2026-01" value={formRef} onChange={e => setFormRef(e.target.value)} />
              </div>
            </div>

            {/* Journal codes guide */}
            <JournalGuide />

            {/* Lines */}
            <div className="space-y-2">
              <Label className="text-sm">Lines</Label>
              {formLines.map((line, idx) => (
                <LineRow
                  key={idx}
                  line={line}
                  idx={idx}
                  accounts={accounts}
                  onChange={patch => updateLine(idx, patch)}
                  onRemove={() => removeLine(idx)}
                  canRemove={formLines.length > 2}
                />
              ))}
              <Button variant="ghost" size="sm" onClick={addLine} className="text-xs w-full border-dashed border">
                <Plus className="h-3 w-3 mr-1" /> Add line
              </Button>
            </div>

            {/* Balance indicator */}
            <div className={cn(
              'flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg px-4 py-3 gap-2 border',
              isBalanced
                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900',
            )}>
              <div className="flex items-center gap-2">
                {isBalanced
                  ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  : <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />}
                <span className={cn('text-sm font-medium', isBalanced ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300')}>
                  {isBalanced ? 'Balanced — ready to save' : 'Not balanced — debits must equal credits'}
                </span>
              </div>
              <div className="flex gap-4 font-mono text-xs text-muted-foreground">
                <span>DR {totalDebit.toFixed(2)}</span>
                <span>CR {totalCredit.toFixed(2)}</span>
                {!isBalanced && Math.abs(totalDebit - totalCredit) > 0.001 && (
                  <span className="text-amber-600 font-semibold">Δ {Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !isBalanced || !formRef.trim()}
                className="sm:min-w-[120px]"
              >
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save Entry'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete journal entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently deletes <strong>{deleteTarget?.reference}</strong> ({deleteTarget?.line_count} lines). This cannot be undone.
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

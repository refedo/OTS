'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, RotateCcw, Info } from 'lucide-react';

// Human-readable labels for each column key
const FIELD_LABELS: Record<string, { label: string; group: string; note?: string }> = {
  SN:                'Serial Number (SN):Identity:',
  PROJECT_NUMBER:    'Project Number:Identity:',
  ITEM:              'Item Label:Identity:',
  QTY:               'Quantity:Identity:',
  AMOUNT:            'Amount (Total):Identity:',
  STATUS:            'Status:Identity:',
  BUILDING_NAME:     'Building Name:Identity:',
  REQUEST_DATE:      'Request Date:Timeline:',
  NEEDED_FROM_DATE:  'Needed From Date:Timeline:',
  NEEDED_TO_DATE:    'Needed To Date:Timeline:',
  BUYING_DATE:       'Buying Date:Timeline:',
  RECEIVING_DATE:    'Receiving Date:Timeline:',
  PO_NUMBER:         'PO Number:Purchase:',
  DN_NUMBER:         'DN Number:Purchase:',
  AWARDED_TO:        'Awarded To (Supplier):Purchase:',
  WEIGHT:            'Weight:Purchase:',
  TOTAL_WEIGHT:      'Total Weight:Purchase:',
  TOTAL_LCR1:        'Total LCR 1:LCR Summary:',
  TOTAL_LCR2:        'Total LCR 2:LCR Summary:',
  TARGET_PRICE:      'Target Price:LCR Summary:',
  MRF_NUMBER:        'MRF Number:LCR Summary:',
  RATIO_1TO2_LCR1:   'LCR1/LCR2 Ratio:LCR Summary:',
  LCR1:              'LCR 1 Supplier Name:LCR Bids:',
  LCR1_AMOUNT:       'LCR 1 Amount:LCR Bids:',
  PRICE_PER_TON_LCR1:'LCR 1 Price/Ton:LCR Bids:',
  LCR2:              'LCR 2 Supplier Name:LCR Bids:',
  LCR2_AMOUNT:       'LCR 2 Amount:LCR Bids:',
  PRICE_PER_TON_LCR2:'LCR 2 Price/Ton:LCR Bids:',
  LCR3:              'LCR 3 Supplier Name:LCR Bids:',
  LCR3_AMOUNT:       'LCR 3 Amount:LCR Bids:',
  PRICE_PER_TON_LCR3:'LCR 3 Price/Ton:LCR Bids:',
  THICKNESS:         'Thickness:Other:',
};

function parseLabel(raw: string) {
  const parts = raw.split(':');
  return { label: parts[0], group: parts[1] ?? 'Other', note: parts[2] || undefined };
}

// Convert 0-based index ↔ spreadsheet letter (A=0, Z=25, AA=26, ...)
function indexToLetter(idx: number): string {
  let n = idx + 1;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function letterToIndex(letter: string): number | null {
  const up = letter.toUpperCase().trim();
  if (!/^[A-Z]+$/.test(up)) return null;
  let result = 0;
  for (let i = 0; i < up.length; i++) {
    result = result * 26 + (up.charCodeAt(i) - 64);
  }
  return result - 1;
}

const GROUPS = ['Identity', 'Timeline', 'Purchase', 'LCR Summary', 'LCR Bids', 'Other'];

export default function LcrColumnMappingPage() {
  const { toast } = useToast();
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [defaults, setDefaults] = useState<Record<string, number>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMapping = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/supply-chain/lcr/columns');
      if (res.ok) {
        const data = await res.json();
        setMapping(data.mapping);
        setDefaults(data.defaults);
        const init: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.mapping as Record<string, number>)) {
          init[k] = indexToLetter(v);
        }
        setInputs(init);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMapping(); }, [fetchMapping]);

  const handleChange = (key: string, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value.toUpperCase() }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = (): Record<string, number> | null => {
    const newErrors: Record<string, string> = {};
    const result: Record<string, number> = {};
    for (const key of Object.keys(FIELD_LABELS)) {
      const val = inputs[key]?.trim() ?? '';
      if (!val) { newErrors[key] = 'Required'; continue; }
      const idx = letterToIndex(val);
      if (idx === null) { newErrors[key] = 'Invalid column (use letters like A, AB)'; continue; }
      result[key] = idx;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 ? result : null;
  };

  const handleSave = async () => {
    const validated = validate();
    if (!validated) {
      toast({ title: 'Validation Error', description: 'Fix the highlighted fields before saving.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/supply-chain/lcr/columns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      });
      if (res.ok) {
        toast({ title: 'Mapping Saved', description: 'Run "Force Resync All" on the LCR page to re-process all rows with the new mapping.' });
        fetchMapping();
      } else {
        const err = await res.json();
        toast({ title: 'Save Failed', description: err.error, variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const init: Record<string, string> = {};
    for (const [k, v] of Object.entries(defaults)) {
      init[k] = indexToLetter(v);
    }
    setInputs(init);
    setErrors({});
    toast({ title: 'Reset to defaults', description: 'Click Save to apply.' });
  };

  const isDirty = Object.keys(FIELD_LABELS).some(k => {
    const currentIdx = letterToIndex(inputs[k] ?? '') ?? mapping[k];
    return currentIdx !== mapping[k];
  });

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading column mapping…</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/supply-chain/lcr">
          <Button variant="ghost" size="sm"><ArrowLeft className="size-4 mr-1" />Back to LCR</Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">LCR Spreadsheet Column Mapping</h1>
          <p className="text-sm text-muted-foreground">
            Map each LCR field to its spreadsheet column. Use the column letter (A, B, Z, AA, AB…).
            After saving, run <strong>Force Resync All</strong> on the LCR page to update all existing rows.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="size-4 mr-1" />Reset to Defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
            <Save className="size-4 mr-1" />{saving ? 'Saving…' : 'Save Mapping'}
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="py-3 flex gap-2 items-start">
          <Info className="size-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            The spreadsheet range is <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">Sheet1!A:AJ</code> by default (set via <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">GOOGLE_SHEET_LCR_RANGE</code> env var).
            Column A = index 0, B = 1, Z = 25, AA = 26, AB = 27, etc.
            Each row shows: <strong>current saved column</strong> (index in parentheses) and the default.
          </p>
        </CardContent>
      </Card>

      {/* Mapping groups */}
      {GROUPS.map(group => {
        const groupKeys = Object.keys(FIELD_LABELS).filter(k => parseLabel(FIELD_LABELS[k]).group === group);
        if (groupKeys.length === 0) return null;
        return (
          <Card key={group}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{group}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {groupKeys.map(key => {
                  const { label } = parseLabel(FIELD_LABELS[key]);
                  const defaultIdx = defaults[key] ?? 0;
                  const currentIdx = mapping[key] ?? defaultIdx;
                  const inputVal = inputs[key] ?? indexToLetter(currentIdx);
                  const isChanged = (letterToIndex(inputVal) ?? currentIdx) !== defaultIdx;
                  const err = errors[key];
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{label}</span>
                          {isChanged && <Badge variant="secondary" className="text-xs shrink-0">modified</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          default: {indexToLetter(defaultIdx)} (col {defaultIdx})
                        </span>
                      </div>
                      <div className="w-20 shrink-0">
                        <Input
                          value={inputVal}
                          onChange={e => handleChange(key, e.target.value)}
                          className={`font-mono text-center uppercase text-sm h-8 ${err ? 'border-destructive' : ''}`}
                          maxLength={3}
                          placeholder="AB"
                        />
                        {err && <p className="text-xs text-destructive mt-0.5">{err}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Save button at bottom too */}
      <div className="flex justify-end gap-2 pb-4">
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="size-4 mr-1" />Reset to Defaults
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
          <Save className="size-4 mr-1" />{saving ? 'Saving…' : 'Save Mapping'}
        </Button>
      </div>
    </div>
  );
}

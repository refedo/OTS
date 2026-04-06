'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, RotateCcw, Info, RefreshCw, Loader2, Wand2 } from 'lucide-react';

interface ColumnHeader {
  index: number;
  column: string;
  name: string;
  sample: string;
}

// Human-readable labels for each column key
const FIELD_META: Record<string, { label: string; group: string }> = {
  SN:                { label: 'Serial Number (SN)',       group: 'Identity'    },
  PROJECT_NUMBER:    { label: 'Project Number',           group: 'Identity'    },
  ITEM:              { label: 'Item Label',               group: 'Identity'    },
  QTY:               { label: 'Quantity',                 group: 'Identity'    },
  AMOUNT:            { label: 'Amount (Total)',           group: 'Identity'    },
  STATUS:            { label: 'Status',                   group: 'Identity'    },
  BUILDING_NAME:     { label: 'Building Name',            group: 'Identity'    },
  REQUEST_DATE:      { label: 'Request Date',             group: 'Timeline'    },
  NEEDED_FROM_DATE:  { label: 'Needed From Date',         group: 'Timeline'    },
  NEEDED_TO_DATE:    { label: 'Needed To Date',           group: 'Timeline'    },
  BUYING_DATE:       { label: 'Buying Date',              group: 'Timeline'    },
  RECEIVING_DATE:    { label: 'Receiving Date',           group: 'Timeline'    },
  PO_NUMBER:         { label: 'PO Number',                group: 'Purchase'    },
  DN_NUMBER:         { label: 'DN Number',                group: 'Purchase'    },
  AWARDED_TO:        { label: 'Awarded To (Supplier)',    group: 'Purchase'    },
  WEIGHT:            { label: 'Weight',                   group: 'Purchase'    },
  TOTAL_WEIGHT:      { label: 'Total Weight',             group: 'Purchase'    },
  TOTAL_LCR1:        { label: 'Total LCR 1',             group: 'LCR Summary' },
  TOTAL_LCR2:        { label: 'Total LCR 2',             group: 'LCR Summary' },
  TARGET_PRICE:      { label: 'Target Price',             group: 'LCR Summary' },
  MRF_NUMBER:        { label: 'MRF Number',               group: 'LCR Summary' },
  RATIO_1TO2_LCR1:   { label: 'LCR1/LCR2 Ratio',         group: 'LCR Summary' },
  LCR1:              { label: 'LCR 1 Supplier Name',      group: 'LCR Bids'    },
  LCR1_AMOUNT:       { label: 'LCR 1 Amount',             group: 'LCR Bids'    },
  PRICE_PER_TON_LCR1:{ label: 'LCR 1 Price/Ton',         group: 'LCR Bids'    },
  LCR2:              { label: 'LCR 2 Supplier Name',      group: 'LCR Bids'    },
  LCR2_AMOUNT:       { label: 'LCR 2 Amount',             group: 'LCR Bids'    },
  PRICE_PER_TON_LCR2:{ label: 'LCR 2 Price/Ton',         group: 'LCR Bids'    },
  LCR3:              { label: 'LCR 3 Supplier Name',      group: 'LCR Bids'    },
  LCR3_AMOUNT:       { label: 'LCR 3 Amount',             group: 'LCR Bids'    },
  PRICE_PER_TON_LCR3:{ label: 'LCR 3 Price/Ton',         group: 'LCR Bids'    },
  THICKNESS:         { label: 'Thickness',                group: 'Other'       },
};

const GROUPS = ['Identity', 'Timeline', 'Purchase', 'LCR Summary', 'LCR Bids', 'Other'];

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

// Keywords to match against sheet column header names (case-insensitive)
const AUTO_MAP_KEYWORDS: Record<string, string[]> = {
  SN:                ['sn', 's/n', 'serial', 'serial no', 'serial number', 'no.', '#'],
  PROJECT_NUMBER:    ['project number', 'project no', 'project#', 'proj no', 'proj number', 'project num'],
  ITEM:              ['item', 'item label', 'item name', 'description', 'material'],
  QTY:               ['qty', 'quantity', 'count', 'pcs'],
  AMOUNT:            ['amount', 'total amount', 'value', 'total value'],
  STATUS:            ['status', 'state'],
  BUILDING_NAME:     ['building', 'building name', 'building no', 'bldg'],
  REQUEST_DATE:      ['request date', 'req date', 'requested date', 'request'],
  NEEDED_FROM_DATE:  ['needed from', 'need from', 'from date', 'start date'],
  NEEDED_TO_DATE:    ['needed to', 'need to', 'to date', 'end date', 'delivery date'],
  BUYING_DATE:       ['buying date', 'purchase date', 'buy date', 'po date'],
  RECEIVING_DATE:    ['receiving date', 'received date', 'delivery', 'receive date'],
  PO_NUMBER:         ['po number', 'po no', 'po#', 'purchase order'],
  DN_NUMBER:         ['dn number', 'dn no', 'dn#', 'delivery note'],
  AWARDED_TO:        ['awarded to', 'supplier', 'vendor', 'contractor'],
  WEIGHT:            ['weight', 'wt', 'unit weight'],
  TOTAL_WEIGHT:      ['total weight', 'total wt', 'gross weight'],
  TOTAL_LCR1:        ['total lcr1', 'total lcr 1', 'lcr1 total'],
  TOTAL_LCR2:        ['total lcr2', 'total lcr 2', 'lcr2 total'],
  TARGET_PRICE:      ['target price', 'target', 'budget price'],
  MRF_NUMBER:        ['mrf', 'mrf number', 'mrf no', 'mrf#'],
  RATIO_1TO2_LCR1:   ['ratio', 'lcr1/lcr2', 'ratio lcr1', '1to2'],
  LCR1:              ['lcr1 supplier', 'lcr 1 supplier', 'lcr1 name', 'supplier 1', 'lcr1'],
  LCR1_AMOUNT:       ['lcr1 amount', 'lcr 1 amount', 'amount lcr1'],
  PRICE_PER_TON_LCR1:['lcr1 price/ton', 'lcr 1 price/ton', 'price per ton lcr1', 'lcr1 ppt'],
  LCR2:              ['lcr2 supplier', 'lcr 2 supplier', 'lcr2 name', 'supplier 2', 'lcr2'],
  LCR2_AMOUNT:       ['lcr2 amount', 'lcr 2 amount', 'amount lcr2'],
  PRICE_PER_TON_LCR2:['lcr2 price/ton', 'lcr 2 price/ton', 'price per ton lcr2', 'lcr2 ppt'],
  LCR3:              ['lcr3 supplier', 'lcr 3 supplier', 'lcr3 name', 'supplier 3', 'lcr3'],
  LCR3_AMOUNT:       ['lcr3 amount', 'lcr 3 amount', 'amount lcr3'],
  PRICE_PER_TON_LCR3:['lcr3 price/ton', 'lcr 3 price/ton', 'price per ton lcr3', 'lcr3 ppt'],
  THICKNESS:         ['thickness', 'thick', 'thk'],
};

export default function LcrColumnMappingPage() {
  const { toast } = useToast();

  // Saved mapping from DB (key → 0-based index)
  const [mapping, setMapping]   = useState<Record<string, number>>({});
  const [defaults, setDefaults] = useState<Record<string, number>>({});

  // In-progress selections (key → column letter like "A", "AB")
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Google Sheet columns
  const [sheetColumns, setSheetColumns]     = useState<ColumnHeader[]>([]);
  const [loadingSheet, setLoadingSheet]     = useState(false);
  const [sheetError, setSheetError]         = useState<string | null>(null);

  const [loadingMapping, setLoadingMapping] = useState(true);
  const [saving, setSaving]                 = useState(false);

  // ── Fetch saved mapping from DB ──────────────────────────────────────────
  const fetchMapping = useCallback(async () => {
    setLoadingMapping(true);
    try {
      const res = await fetch('/api/supply-chain/lcr/columns');
      if (!res.ok) throw new Error('Failed to load mapping');
      const data = await res.json();
      setMapping(data.mapping);
      setDefaults(data.defaults);
      const init: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.mapping as Record<string, number>)) {
        init[k] = indexToLetter(v);
      }
      setSelections(init);
    } catch (error) {
      toast({ title: 'Failed to load mapping', description: String(error), variant: 'destructive' });
    } finally {
      setLoadingMapping(false);
    }
  }, [toast]);

  // ── Fetch Google Sheet column headers ────────────────────────────────────
  const fetchSheetColumns = useCallback(async () => {
    setLoadingSheet(true);
    setSheetError(null);
    try {
      const res = await fetch('/api/supply-chain/lcr/columns/sheet-headers');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to fetch sheet columns');
      }
      const data = await res.json();
      setSheetColumns(data.headers);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setSheetError(msg);
      toast({ title: 'Could not fetch sheet columns', description: msg, variant: 'destructive' });
    } finally {
      setLoadingSheet(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMapping();
    fetchSheetColumns();
  }, [fetchMapping, fetchSheetColumns]);

  const handleChange = (key: string, columnLetter: string) => {
    setSelections(prev => ({ ...prev, [key]: columnLetter }));
  };

  const handleReset = () => {
    const init: Record<string, string> = {};
    for (const [k, v] of Object.entries(defaults)) {
      init[k] = indexToLetter(v);
    }
    setSelections(init);
    toast({ title: 'Reset to defaults', description: 'Click Save Mapping to apply.' });
  };

  const handleAutoMap = () => {
    if (sheetColumns.length === 0) {
      toast({ title: 'No sheet columns loaded', description: 'Fetch sheet columns first before auto-mapping.', variant: 'destructive' });
      return;
    }
    const newSelections: Record<string, string> = { ...selections };
    let matched = 0;
    for (const key of Object.keys(FIELD_META)) {
      const keywords = AUTO_MAP_KEYWORDS[key] ?? [];
      const found = sheetColumns.find(col =>
        keywords.some(kw => col.name.toLowerCase().trim() === kw)
      );
      if (found) {
        newSelections[key] = found.column;
        matched++;
      }
    }
    setSelections(newSelections);
    toast({
      title: `Auto-mapped ${matched} field${matched !== 1 ? 's' : ''}`,
      description: matched > 0
        ? 'Review the mappings below and click Save Mapping to apply.'
        : 'No matching column headers found. Check that the sheet columns are loaded.',
    });
  };

  const handleSave = async () => {
    // Convert column letters → 0-based indices
    const payload: Record<string, number> = {};
    for (const key of Object.keys(FIELD_META)) {
      const letter = selections[key];
      if (!letter) continue;
      // find index from sheetColumns first (exact match), fall back to mapping from defaults
      const col = sheetColumns.find(c => c.column === letter);
      if (col) {
        payload[key] = col.index;
      } else {
        // letter-based fallback (no sheet columns loaded)
        let n = 0;
        for (let i = 0; i < letter.length; i++) {
          n = n * 26 + (letter.toUpperCase().charCodeAt(i) - 64);
        }
        payload[key] = n - 1;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/supply-chain/lcr/columns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({
          title: 'Mapping Saved',
          description: 'Run "Force Resync All" on the LCR page to re-process all rows with the new mapping.',
        });
        fetchMapping();
      } else {
        const err = await res.json();
        toast({ title: 'Save Failed', description: err.error, variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const isDirty = Object.keys(FIELD_META).some(k => {
    const col = sheetColumns.find(c => c.column === selections[k]);
    const currentIdx = col ? col.index : (mapping[k] ?? defaults[k]);
    return currentIdx !== (mapping[k] ?? defaults[k]);
  });

  if (loadingMapping) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading column mapping…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/supply-chain/lcr">
          <Button variant="ghost" size="sm"><ArrowLeft className="size-4 mr-1" />Back to LCR</Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">LCR Spreadsheet Column Mapping</h1>
          <p className="text-sm text-muted-foreground">
            Map each OTS database field to its Google Sheet column. After saving, run{' '}
            <strong>Force Resync All</strong> on the LCR page to re-process all rows.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAutoMap} disabled={sheetColumns.length === 0 || loadingSheet}>
            <Wand2 className="size-4 mr-1" />Auto Map
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="size-4 mr-1" />Reset to Defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Save className="size-4 mr-1" />}
            {saving ? 'Saving…' : 'Save Mapping'}
          </Button>
        </div>
      </div>

      {/* Sheet column fetch status */}
      <Card className={sheetError ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20' : 'border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800'}>
        <CardContent className="py-3 flex items-center gap-3">
          <Info className="size-4 text-blue-600 shrink-0" />
          <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
            {loadingSheet ? (
              <span className="flex items-center gap-2"><Loader2 className="size-3 animate-spin" /> Fetching column headers from Google Sheet…</span>
            ) : sheetError ? (
              <span className="text-yellow-800 dark:text-yellow-200">
                Could not fetch sheet columns: <em>{sheetError}</em>. Dropdowns show saved column letters only.
              </span>
            ) : (
              <span>
                Loaded <strong>{sheetColumns.length}</strong> columns from the LCR Google Sheet.
                Each dropdown shows the column letter, header name, and a sample value.
                Select the matching column for each OTS field.
              </span>
            )}
          </div>
          {!loadingSheet && (
            <Button variant="outline" size="sm" onClick={fetchSheetColumns} className="shrink-0">
              <RefreshCw className="size-3 mr-1" />Refresh
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Mapping groups */}
      {GROUPS.map(group => {
        const groupKeys = Object.keys(FIELD_META).filter(k => FIELD_META[k].group === group);
        if (groupKeys.length === 0) return null;
        return (
          <Card key={group}>
            <CardHeader className="py-3 pb-0">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {group}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {groupKeys.map(key => {
                  const { label } = FIELD_META[key];
                  const defaultIdx = defaults[key] ?? 0;
                  const savedIdx   = mapping[key] ?? defaultIdx;
                  const currentLetter = selections[key] ?? indexToLetter(savedIdx);
                  const currentCol = sheetColumns.find(c => c.column === currentLetter);
                  const isModified = currentCol ? currentCol.index !== defaultIdx : (savedIdx !== defaultIdx);

                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{label}</span>
                        {isModified && (
                          <Badge variant="secondary" className="text-xs">modified</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        default: {indexToLetter(defaultIdx)} (col {defaultIdx})
                        {savedIdx !== defaultIdx && ` · saved: ${indexToLetter(savedIdx)} (col ${savedIdx})`}
                      </p>

                      {sheetColumns.length > 0 ? (
                        <Select value={currentLetter} onValueChange={v => handleChange(key, v)}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select column…" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {sheetColumns.map(col => (
                              <SelectItem key={col.column} value={col.column}>
                                <span className="font-mono text-xs w-6 inline-block">{col.column}</span>
                                <span className="ml-1 truncate max-w-[160px]">{col.name}</span>
                                {col.sample && (
                                  <Badge variant="outline" className="ml-2 text-xs font-normal max-w-[80px] truncate">
                                    {col.sample}
                                  </Badge>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="h-9 flex items-center px-3 rounded-md border bg-muted/40 text-sm font-mono text-muted-foreground">
                          {currentLetter}
                          {loadingSheet && <Loader2 className="size-3 ml-2 animate-spin" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Bottom save bar */}
      <div className="flex justify-end gap-2 pb-4">
        <Button variant="outline" size="sm" onClick={handleAutoMap} disabled={sheetColumns.length === 0 || loadingSheet}>
          <Wand2 className="size-4 mr-1" />Auto Map
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="size-4 mr-1" />Reset to Defaults
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
          {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Save className="size-4 mr-1" />}
          {saving ? 'Saving…' : 'Save Mapping'}
        </Button>
      </div>
    </div>
  );
}

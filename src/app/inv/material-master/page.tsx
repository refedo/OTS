'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Database,
  Package,
  CheckCircle2,
  AlertTriangle,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Bot,
  Wand2,
  Sparkles,
  Eye,
} from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Dimensions {
  h_mm: number | null;
  b_mm: number | null;
  tf_mm: number | null;
  tw_mm: number | null;
  width_mm: number | null;
  length_mm: number | null;
  thickness_mm: number | null;
}

interface SectionProps {
  weight_kg_per_m: number | null;
  area_cm2: number | null;
  Ix_cm4: number | null;
  Iy_cm4: number | null;
  Wx_cm3: number | null;
  Wy_cm3: number | null;
  ix_cm: number | null;
  iy_cm: number | null;
}

interface Welding {
  aws_class: string | null;
  weld_process: string | null;
  weld_base_material: string | null;
  weld_diameter_mm: number | null;
}

interface Fastener {
  standard: string | null;
  thread: string | null;
  length_mm: number | null;
  grade: string | null;
  surface: string | null;
}

interface Enrichment {
  item_class: string;
  material_nature: string;
  material_category: string;
  grade: string | null;
  finish: string | null;
  unit_of_measure: string;
  profile_type: string | null;
  profile_designation: string | null;
  section_standard: string | null;
  bar_length_m: number | null;
  dimensions: Dimensions;
  section_props: SectionProps;
  section_props_json: unknown;
  welding: Welding;
  fastener: Fastener;
  kg_per_m2: number | null;
  kg_per_lm: number | null;
  unit_area_m2: number | null;
  kg_per_unit: number | null;
  disburse_unit: string;
  conversions: Record<string, number> | null;
  manufacturer: string | null;
  image_url: string | null;
  tds_url: string | null;
  technical_attrs_json: Record<string, unknown> | null;
  classified_by: string;
  classification_conf: number;
  review_required: boolean;
  enriched_at: string | null;
}

interface Product {
  dolibarr_id: number;
  ref: string;
  label: string;
  enrichment: Enrichment;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface GlobalStats {
  classifiedCount: number;
  needsReviewCount: number;
  avgConfidence: number | null;
}

interface ApiResponse {
  products: Product[];
  pagination: Pagination;
  stats?: GlobalStats;
}

type ClassifyPass = 'rule' | 'ai' | 'enrichment' | 'all';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getItemClassColor(itemClass: string): string {
  switch (itemClass) {
    case 'RAW_MATERIAL':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'CONSUMABLE':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'SERVICE':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function getItemClassLabel(itemClass: string): string {
  const labels: Record<string, string> = {
    RAW_MATERIAL: 'Raw Material',
    CONSUMABLE: 'Consumable',
    SERVICE: 'Service',
    TOOL: 'Tool',
    SPARE_PART: 'Spare Part',
    UNKNOWN: 'Unknown',
  };
  return labels[itemClass] ?? itemClass;
}

function getClassifiedByBadge(classifiedBy: string) {
  switch (classifiedBy) {
    case 'RULE_ENGINE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="text-emerald-600">✓</span> Rule
        </span>
      );
    case 'AI_BATCH':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
          <span className="text-purple-600">✓</span> AI
        </span>
      );
    case 'MANUAL':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <span className="text-blue-600">✓</span> Manual
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-300">
          ⚠ Pending
        </span>
      );
  }
}

function ConfidenceDot({ conf }: { conf: number }) {
  if (conf <= 0) {
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300" title="No data" />;
  }
  if (conf >= 0.95) {
    return (
      <span
        className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"
        title={`${(conf * 100).toFixed(0)}%`}
      />
    );
  }
  if (conf >= 0.75) {
    return (
      <span
        className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400"
        title={`${(conf * 100).toFixed(0)}%`}
      />
    );
  }
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full bg-red-500"
      title={`${(conf * 100).toFixed(0)}%`}
    />
  );
}

function getKeyDims(p: Product): string {
  const e = p.enrichment;
  const cat = e.material_category;
  const d = e.dimensions;
  const sp = e.section_props;

  if (cat === 'SHEET' || cat === 'PLATE') {
    if (d.thickness_mm) return `${d.thickness_mm}mm thick`;
  }
  if (
    cat === 'PROFILE_H' ||
    cat === 'PROFILE_I' ||
    cat === 'PROFILE_HEA' ||
    cat === 'PROFILE_HEB' ||
    cat === 'PROFILE_IPE'
  ) {
    const dims = d.h_mm && d.b_mm ? `${d.h_mm}×${d.b_mm}mm` : null;
    const weight = sp.weight_kg_per_m ? `${sp.weight_kg_per_m}kg/m` : null;
    if (dims || weight) return [dims, weight].filter(Boolean).join(', ');
  }
  if (cat === 'BOLT' || cat === 'NUT') {
    const thread = e.fastener.thread;
    const length = e.fastener.length_mm;
    if (thread) return length ? `${thread} L${length}mm` : thread;
  }
  if (cat === 'WELDING_ELECTRODE' || cat === 'WELDING_WIRE_FLUX') {
    const aws = e.welding.aws_class;
    const dia = e.welding.weld_diameter_mm;
    if (aws) return dia ? `${aws} ∅${dia}mm` : aws;
  }
  return '—';
}

function getConversions(p: Product): string {
  const e = p.enrichment;
  const cat = e.material_category;

  if (cat === 'SHEET' || cat === 'PLATE') {
    const kgm2 = e.kg_per_m2;
    if (!kgm2 || kgm2 <= 0) return '—';
    const m2PerTon = (1000 / kgm2).toFixed(1);
    return `${kgm2} kg/m² | ${m2PerTon} m²/t`;
  }
  if (
    cat === 'PROFILE_H' ||
    cat === 'PROFILE_I' ||
    cat === 'PROFILE_HEA' ||
    cat === 'PROFILE_HEB' ||
    cat === 'PROFILE_IPE' ||
    cat === 'FLAT_BAR' ||
    cat === 'ROUND_BAR' ||
    cat === 'PROFILE_C' ||
    cat === 'PROFILE_ANGLE'
  ) {
    const kgLm = e.kg_per_lm ?? e.section_props.weight_kg_per_m;
    if (!kgLm || kgLm <= 0) return '—';
    const lmPerTon = (1000 / kgLm).toFixed(1);
    return `${kgLm} kg/m | ${lmPerTon} m/t`;
  }
  return '—';
}

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined) return '—';
  return n.toFixed(decimals);
}

// ─── Conversion Widget ────────────────────────────────────────────────────────

type ConvUnit = 'KG' | 'TON' | 'M2' | 'LM' | 'PC';

function ConversionWidget({ product }: { product: Product }) {
  const e = product.enrichment;
  const cat = e.material_category;
  const [qty, setQty] = useState<string>('1');
  const [fromUnit, setFromUnit] = useState<ConvUnit>('TON');

  const isSheet = cat === 'SHEET' || cat === 'PLATE';
  const isProfile =
    cat === 'PROFILE_H' ||
    cat === 'PROFILE_I' ||
    cat === 'PROFILE_HEA' ||
    cat === 'PROFILE_HEB' ||
    cat === 'PROFILE_IPE' ||
    cat === 'FLAT_BAR' ||
    cat === 'ROUND_BAR' ||
    cat === 'PROFILE_C' ||
    cat === 'PROFILE_ANGLE';

  const availableUnits: ConvUnit[] = isSheet
    ? ['KG', 'TON', 'M2', 'PC']
    : isProfile
      ? ['KG', 'TON', 'LM', 'PC']
      : ['KG', 'TON'];

  // Convert input qty to KG first
  function toKg(value: number, unit: ConvUnit): number | null {
    switch (unit) {
      case 'KG':
        return value;
      case 'TON':
        return value * 1000;
      case 'M2': {
        const kpm2 = e.kg_per_m2;
        if (!kpm2) return null;
        return value * kpm2;
      }
      case 'LM': {
        const kplm = e.kg_per_lm ?? e.section_props.weight_kg_per_m;
        if (!kplm) return null;
        return value * kplm;
      }
      case 'PC': {
        if (!e.kg_per_unit) return null;
        return value * e.kg_per_unit;
      }
    }
  }

  function fromKg(kg: number, unit: ConvUnit): number | null {
    switch (unit) {
      case 'KG':
        return kg;
      case 'TON':
        return kg / 1000;
      case 'M2': {
        const kpm2 = e.kg_per_m2;
        if (!kpm2) return null;
        return kg / kpm2;
      }
      case 'LM': {
        const kplm = e.kg_per_lm ?? e.section_props.weight_kg_per_m;
        if (!kplm) return null;
        return kg / kplm;
      }
      case 'PC': {
        if (!e.kg_per_unit) return null;
        return kg / e.kg_per_unit;
      }
    }
  }

  const inputVal = parseFloat(qty) || 0;
  const kg = toKg(inputVal, fromUnit);

  const results: { unit: ConvUnit; value: number | null }[] = availableUnits
    .filter(u => u !== fromUnit)
    .map(u => ({ unit: u, value: kg !== null ? fromKg(kg, u) : null }));

  const summaryLine = (() => {
    if (isSheet && e.kg_per_m2 && e.kg_per_m2 > 0) {
      const m2pt = (1000 / e.kg_per_m2).toFixed(1);
      const sheetsPerTon = e.kg_per_unit
        ? (1000 / e.kg_per_unit).toFixed(1)
        : null;
      return `1 TON = ${m2pt} m²${sheetsPerTon ? ` = ${sheetsPerTon} sheets` : ''}`;
    }
    const kplm = e.kg_per_lm ?? e.section_props.weight_kg_per_m;
    if (isProfile && kplm && kplm > 0) {
      const lmpt = (1000 / kplm).toFixed(1);
      const barLen = e.bar_length_m;
      const barsPerTon = barLen && kplm ? (1000 / (kplm * barLen)).toFixed(1) : null;
      return `1 TON = ${lmpt} m${barsPerTon ? ` = ${barsPerTon} bars` : ''}`;
    }
    return null;
  })();

  return (
    <div className="space-y-4">
      {summaryLine && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
          {summaryLine}
        </div>
      )}

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Label className="text-xs text-slate-500 mb-1.5 block">Quantity</Label>
          <Input
            type="number"
            value={qty}
            onChange={e => setQty(e.target.value)}
            className="font-mono"
            min="0"
            step="any"
          />
        </div>
        <div className="w-32">
          <Label className="text-xs text-slate-500 mb-1.5 block">From Unit</Label>
          <Select value={fromUnit} onValueChange={v => setFromUnit(v as ConvUnit)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableUnits.map(u => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs">Unit</TableHead>
              <TableHead className="text-xs text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map(r => (
              <TableRow key={r.unit}>
                <TableCell className="font-medium text-sm">{r.unit}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {r.value !== null ? r.value.toLocaleString('en-SA-u-ca-gregory', { maximumFractionDigits: 4 }) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Review Form ──────────────────────────────────────────────────────────────

interface ReviewFormProps {
  product: Product;
  onSuccess: (updated: Product) => void;
}

function ReviewForm({ product, onSuccess }: ReviewFormProps) {
  const e = product.enrichment;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    item_class: e.item_class,
    material_nature: e.material_nature ?? '',
    material_category: e.material_category,
    grade: e.grade ?? '',
    unit_of_measure: e.unit_of_measure ?? '',
    manufacturer: e.manufacturer ?? '',
  });

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/material-master/review/${product.dolibarr_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          review_required: false,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated: Product = {
        ...product,
        enrichment: {
          ...product.enrichment,
          ...form,
          review_required: false,
          classified_by: 'MANUAL',
        },
      };
      toast({ title: 'Review saved', description: `${product.ref} marked as reviewed.` });
      onSuccess(updated);
    } catch {
      toast({ title: 'Save failed', description: 'Could not save review. Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function field(label: string, key: keyof typeof form, node: React.ReactNode) {
    return (
      <div key={key} className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">{label}</Label>
        {node}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {e.review_required && (
        <div className="flex items-center gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          This product needs review — classification confidence is low or data is incomplete.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {field(
          'Item Class',
          'item_class',
          <Select value={form.item_class} onValueChange={v => setForm(f => ({ ...f, item_class: v }))}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['RAW_MATERIAL', 'CONSUMABLE', 'SERVICE', 'TOOL', 'SPARE_PART', 'UNKNOWN'].map(v => (
                <SelectItem key={v} value={v} className="text-sm">
                  {getItemClassLabel(v)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
        )}
        {field(
          'Material Category',
          'material_category',
          <Select
            value={form.material_category}
            onValueChange={v => setForm(f => ({ ...f, material_category: v }))}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                'SHEET', 'PLATE', 'PROFILE_H', 'PROFILE_I', 'PROFILE_C', 'PROFILE_ANGLE',
                'FLAT_BAR', 'ROUND_BAR', 'BOLT', 'NUT', 'WELDING_ELECTRODE',
                'WELDING_WIRE_FLUX', 'WELDING_PPE', 'PAINT', 'GAS_CYLINDER', 'OTHER',
              ].map(v => (
                <SelectItem key={v} value={v} className="text-sm">
                  {v.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
        )}
        {field(
          'Material Nature',
          'material_nature',
          <Input
            value={form.material_nature}
            onChange={ev => setForm(f => ({ ...f, material_nature: ev.target.value }))}
            className="h-8 text-sm"
            placeholder="e.g. Carbon Steel"
          />,
        )}
        {field(
          'Grade',
          'grade',
          <Input
            value={form.grade}
            onChange={ev => setForm(f => ({ ...f, grade: ev.target.value }))}
            className="h-8 text-sm"
            placeholder="e.g. S275"
          />,
        )}
        {field(
          'Unit of Measure',
          'unit_of_measure',
          <Input
            value={form.unit_of_measure}
            onChange={ev => setForm(f => ({ ...f, unit_of_measure: ev.target.value }))}
            className="h-8 text-sm"
            placeholder="e.g. KG"
          />,
        )}
        {field(
          'Manufacturer',
          'manufacturer',
          <Input
            value={form.manufacturer}
            onChange={ev => setForm(f => ({ ...f, manufacturer: ev.target.value }))}
            className="h-8 text-sm"
            placeholder="Manufacturer name"
          />,
        )}
      </div>

      <Separator />

      <Button onClick={handleSave} disabled={saving} className="w-full active:scale-[0.97] transition-transform">
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving…
          </>
        ) : (
          'Approve & Save'
        )}
      </Button>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onReviewSuccess: (updated: Product) => void;
}

function DetailPanel({ product, open, onClose, isAdmin, onReviewSuccess }: DetailPanelProps) {
  if (!product) return null;
  const e = product.enrichment;

  function OverviewRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    if (!value && value !== 0) return null;
    return (
      <div className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
        <span className="text-xs font-medium text-slate-500 w-36 shrink-0">{label}</span>
        <span className="text-sm text-slate-800 break-words">{String(value)}</span>
      </div>
    );
  }

  const hasDimensions = (() => {
    const d = e.dimensions;
    const f = e.fastener;
    const w = e.welding;
    return (
      d.h_mm ||
      d.b_mm ||
      d.width_mm ||
      d.length_mm ||
      d.thickness_mm ||
      f.thread ||
      f.standard ||
      w.aws_class
    );
  })();

  const hasSectionProps = e.section_props.weight_kg_per_m !== null;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-2xl sm:max-w-2xl overflow-y-auto flex flex-col gap-0 p-0"
        style={{ transition: 'transform 250ms ease-out' }}
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <SheetTitle className="font-mono text-lg font-semibold tracking-tight text-slate-900">
                {product.ref}
              </SheetTitle>
              <SheetDescription className="text-sm text-slate-600 leading-snug">
                {product.label}
              </SheetDescription>
            </div>
            <div className="flex flex-col gap-1.5 items-end shrink-0">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getItemClassColor(e.item_class)}`}
              >
                {getItemClassLabel(e.item_class)}
              </span>
              {getClassifiedByBadge(e.classified_by)}
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex-1 px-6 py-4">
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-6 mb-4 transition-all duration-150">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="dimensions" className="text-xs">Dims</TabsTrigger>
              <TabsTrigger value="section-props" className="text-xs">Section</TabsTrigger>
              <TabsTrigger value="conversions" className="text-xs">Convert</TabsTrigger>
              <TabsTrigger value="tds" className="text-xs">TDS</TabsTrigger>
              {isAdmin && <TabsTrigger value="review" className="text-xs">Review</TabsTrigger>}
              {!isAdmin && <TabsTrigger value="review" className="text-xs" disabled>Review</TabsTrigger>}
            </TabsList>

            {/* TAB 1: Overview */}
            <TabsContent value="overview" className="mt-0 space-y-0">
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 bg-slate-50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Classification</span>
                </div>
                <div className="px-4">
                  <OverviewRow label="Item Class" value={getItemClassLabel(e.item_class)} />
                  <OverviewRow label="Material Nature" value={e.material_nature} />
                  <OverviewRow label="Category" value={e.material_category?.replace(/_/g, ' ')} />
                  <OverviewRow label="Grade" value={e.grade} />
                  <OverviewRow label="Finish" value={e.finish} />
                  <OverviewRow label="Unit of Measure" value={e.unit_of_measure} />
                  <OverviewRow label="Profile Type" value={e.profile_type} />
                  <OverviewRow label="Profile Designation" value={e.profile_designation} />
                  <OverviewRow label="Disburse Unit" value={e.disburse_unit} />
                </div>
                <div className="px-4 py-2 bg-slate-50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meta</span>
                </div>
                <div className="px-4">
                  <OverviewRow label="Manufacturer" value={e.manufacturer} />
                  <OverviewRow
                    label="Classified By"
                    value={e.classified_by?.replace(/_/g, ' ')}
                  />
                  <OverviewRow
                    label="Confidence"
                    value={e.classification_conf > 0 ? `${(e.classification_conf * 100).toFixed(0)}%` : null}
                  />
                  <OverviewRow
                    label="Enriched At"
                    value={
                      e.enriched_at
                        ? new Date(e.enriched_at).toLocaleString('en-SA-u-ca-gregory', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : null
                    }
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Dimensions */}
            <TabsContent value="dimensions" className="mt-0">
              {hasDimensions ? (
                <div className="space-y-4">
                  {/* Profile dims */}
                  {(e.dimensions.h_mm || e.dimensions.b_mm || e.dimensions.tf_mm || e.dimensions.tw_mm) && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Profile Dimensions
                      </p>
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-xs">H (mm)</TableHead>
                              <TableHead className="text-xs">B (mm)</TableHead>
                              <TableHead className="text-xs">tf (mm)</TableHead>
                              <TableHead className="text-xs">tw (mm)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-mono text-sm">{fmt(e.dimensions.h_mm, 1)}</TableCell>
                              <TableCell className="font-mono text-sm">{fmt(e.dimensions.b_mm, 1)}</TableCell>
                              <TableCell className="font-mono text-sm">{fmt(e.dimensions.tf_mm, 1)}</TableCell>
                              <TableCell className="font-mono text-sm">{fmt(e.dimensions.tw_mm, 1)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Sheet/Plate dims */}
                  {(e.dimensions.width_mm || e.dimensions.length_mm || e.dimensions.thickness_mm) && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Sheet / Plate Dimensions
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Width', value: e.dimensions.width_mm, unit: 'mm' },
                          { label: 'Length', value: e.dimensions.length_mm, unit: 'mm' },
                          { label: 'Thickness', value: e.dimensions.thickness_mm, unit: 'mm' },
                        ].map(item => (
                          <div key={item.label} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                            <p className="text-xs text-slate-500">{item.label}</p>
                            <p className="font-mono text-base font-semibold text-slate-800 mt-0.5">
                              {item.value !== null ? `${item.value}` : '—'}
                              {item.value !== null && (
                                <span className="text-xs font-normal text-slate-500 ml-1">{item.unit}</span>
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fastener */}
                  {(e.fastener.thread || e.fastener.standard) && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Fastener Data
                      </p>
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-xs">Standard</TableHead>
                              <TableHead className="text-xs">Thread</TableHead>
                              <TableHead className="text-xs">Length</TableHead>
                              <TableHead className="text-xs">Grade</TableHead>
                              <TableHead className="text-xs">Surface</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="text-sm">{e.fastener.standard ?? '—'}</TableCell>
                              <TableCell className="font-mono text-sm">{e.fastener.thread ?? '—'}</TableCell>
                              <TableCell className="font-mono text-sm">
                                {e.fastener.length_mm ? `${e.fastener.length_mm}mm` : '—'}
                              </TableCell>
                              <TableCell className="text-sm">{e.fastener.grade ?? '—'}</TableCell>
                              <TableCell className="text-sm">{e.fastener.surface ?? '—'}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Welding */}
                  {e.welding.aws_class && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Welding Data
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'AWS Class', value: e.welding.aws_class },
                          { label: 'Process', value: e.welding.weld_process },
                          { label: 'Base Material', value: e.welding.weld_base_material },
                          {
                            label: 'Diameter',
                            value: e.welding.weld_diameter_mm ? `${e.welding.weld_diameter_mm}mm` : null,
                          },
                        ].map(item => (
                          <div key={item.label} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                            <p className="text-xs text-slate-500">{item.label}</p>
                            <p className="text-sm font-medium text-slate-800 mt-0.5">{item.value ?? '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-slate-400 text-sm">No dimensional data available for this product.</p>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: Section Properties */}
            <TabsContent value="section-props" className="mt-0">
              {hasSectionProps ? (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs font-semibold">Property</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Value</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { prop: 'A (Area)', value: e.section_props.area_cm2, unit: 'cm²', decimals: 2 },
                        { prop: 'G (Weight)', value: e.section_props.weight_kg_per_m, unit: 'kg/m', decimals: 2 },
                        { prop: 'Ix', value: e.section_props.Ix_cm4, unit: 'cm⁴', decimals: 1 },
                        { prop: 'Iy', value: e.section_props.Iy_cm4, unit: 'cm⁴', decimals: 1 },
                        { prop: 'Wx', value: e.section_props.Wx_cm3, unit: 'cm³', decimals: 1 },
                        { prop: 'Wy', value: e.section_props.Wy_cm3, unit: 'cm³', decimals: 1 },
                        { prop: 'ix', value: e.section_props.ix_cm, unit: 'cm', decimals: 2 },
                        { prop: 'iy', value: e.section_props.iy_cm, unit: 'cm', decimals: 2 },
                        { prop: 'Standard', value: e.section_standard, unit: '—', decimals: 0, isString: true },
                      ].map(row => (
                        <TableRow key={row.prop}>
                          <TableCell className="font-medium text-sm py-2">{row.prop}</TableCell>
                          <TableCell className="text-right font-mono text-sm py-2">
                            {'isString' in row && row.isString
                              ? (row.value as string | null) ?? '—'
                              : fmt(row.value as number | null, row.decimals)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-slate-500 py-2">{row.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-slate-400 text-sm">No section properties available for this product.</p>
                </div>
              )}
            </TabsContent>

            {/* TAB 4: Conversions */}
            <TabsContent value="conversions" className="mt-0">
              <ConversionWidget product={product} />
            </TabsContent>

            {/* TAB 5: TDS & Media */}
            <TabsContent value="tds" className="mt-0 space-y-4">
              {!e.image_url && !e.tds_url && !e.technical_attrs_json && (
                <div className="py-12 text-center">
                  <p className="text-slate-400 text-sm">No TDS or media available for this product.</p>
                </div>
              )}
              {e.image_url && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Product Image</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={e.image_url}
                    alt={product.label}
                    className="rounded-lg border border-slate-200 object-cover w-full max-h-64"
                  />
                </div>
              )}
              {e.tds_url && (
                <a
                  href={e.tds_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors active:scale-[0.97]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Download TDS
                </a>
              )}
              {e.technical_attrs_json && Object.keys(e.technical_attrs_json).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Technical Attributes
                  </p>
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableBody>
                        {Object.entries(e.technical_attrs_json).map(([key, val]) => (
                          <TableRow key={key}>
                            <TableCell className="text-xs font-medium text-slate-600 py-2 w-44">
                              {key.replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell className="text-sm py-2 font-mono">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 6: Review (admin only) */}
            <TabsContent value="review" className="mt-0">
              {isAdmin ? (
                <ReviewForm product={product} onSuccess={onReviewSuccess} />
              ) : (
                <div className="py-12 text-center">
                  <p className="text-slate-400 text-sm">Admin access required.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string | number | null;
  icon: React.ReactNode;
  colorClass: string;
  loading?: boolean;
}

function KpiCard({ title, value, icon, colorClass, loading }: KpiCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-20 mt-1.5" />
            ) : (
              <p className={`text-2xl font-semibold tracking-tight mt-1 ${colorClass}`}>
                {value === null ? '—' : value}
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-lg ${colorClass.includes('emerald') ? 'bg-emerald-50' : colorClass.includes('amber') ? 'bg-amber-50' : colorClass.includes('sky') ? 'bg-sky-50' : 'bg-slate-100'}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MaterialMasterPage() {
  const { permissions } = usePermissions();
  const isAdmin = permissions.includes('inv.admin');
  const { toast } = useToast();

  // ── Filters ──
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [itemClass, setItemClass] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [profileType, setProfileType] = useState('ALL');
  const [needsReview, setNeedsReview] = useState(false);
  const [enrichedOnly, setEnrichedOnly] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);

  // ── Data ──
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 0, limit: 50, total: 0, totalPages: 0 });
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Detail panel ──
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // ── Classification running state ──
  const [classifyStatus, setClassifyStatus] = useState<{
    running: boolean;
    pass: ClassifyPass | null;
    result: string | null;
  }>({ running: false, pass: null, result: null });

  // ── Debounce search ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Reset page on filter change ──
  useEffect(() => {
    setPage(0);
  }, [itemClass, category, profileType, needsReview, enrichedOnly, pageSize]);

  // ── Fetch products ──
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        page: String(page),
        search: debouncedSearch,
        item_class: itemClass === 'ALL' ? '' : itemClass,
        material_category: category === 'ALL' ? '' : category,
        enrichment_profile_type: profileType === 'ALL' ? '' : profileType,
        review_required: needsReview ? 'true' : '',
        enriched: enrichedOnly ? 'true' : '',
      });
      const res = await fetch(`/api/dolibarr/products?${params.toString()}`);
      if (!res.ok) throw new Error('Fetch failed');
      const data: ApiResponse = await res.json();
      setProducts(data.products ?? []);
      setPagination(data.pagination ?? { page: 0, limit: pageSize, total: 0, totalPages: 0 });
      if (data.stats) setGlobalStats(data.stats);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, itemClass, category, profileType, needsReview, enrichedOnly]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Classify runner ──
  const runClassify = useCallback(
    async (pass: ClassifyPass, label: string) => {
      if (classifyStatus.running) return;
      setClassifyStatus({ running: true, pass, result: null });
      try {
        const res = await fetch('/api/admin/material-master/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pass }),
        });
        if (!res.ok) throw new Error('Classify failed');
        const data = await res.json();
        const resultText =
          data?.message ??
          (data?.classified !== undefined
            ? `${data.classified} classified, ${data.pending ?? 0} pending`
            : `${label} completed`);
        setClassifyStatus({ running: false, pass: null, result: resultText });
        await fetchProducts();
        // Clear result after 8s
        setTimeout(() => setClassifyStatus(s => ({ ...s, result: null })), 8000);
      } catch {
        setClassifyStatus({ running: false, pass: null, result: null });
        toast({ title: 'Classification failed', description: 'Could not run classifier.', variant: 'destructive' });
      }
    },
    [classifyStatus.running, fetchProducts, toast],
  );

  // ── KPIs (global stats from API — not filtered by current page) ──
  const totalProducts = pagination.total;
  const classifiedCount = globalStats?.classifiedCount ?? 0;
  const needsReviewCount = globalStats?.needsReviewCount ?? 0;
  const avgConf = globalStats?.avgConfidence ?? null;

  // ── Detail panel handlers ──
  function openProduct(p: Product) {
    setSelectedProduct(p);
    setPanelOpen(true);
  }

  function handleReviewSuccess(updated: Product) {
    setProducts(prev => prev.map(p => (p.dolibarr_id === updated.dolibarr_id ? updated : p)));
    if (selectedProduct?.dolibarr_id === updated.dolibarr_id) {
      setSelectedProduct(updated);
    }
  }

  // ── Classify pass button label map ──
  const passButtons: { pass: ClassifyPass; label: string; icon: React.ReactNode }[] = [
    { pass: 'rule', label: 'Run Rule Engine', icon: <Wand2 className="h-4 w-4" /> },
    { pass: 'ai', label: 'Run AI Classifier', icon: <Bot className="h-4 w-4" /> },
    { pass: 'enrichment', label: 'Enrich Consumables', icon: <Sparkles className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* ── SECTION 1: HERO ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
            <Database className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Material Master</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Product intelligence &amp; unit conversion engine for 5,000+ materials
            </p>
          </div>
        </div>

        {/* Right: admin actions */}
        {isAdmin && (
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex gap-2 flex-wrap justify-end">
              {passButtons.map(btn => (
                <Button
                  key={btn.pass}
                  variant="outline"
                  size="sm"
                  disabled={classifyStatus.running}
                  onClick={() => runClassify(btn.pass, btn.label)}
                  className="active:scale-[0.97] transition-transform gap-1.5 text-xs"
                >
                  {classifyStatus.running && classifyStatus.pass === btn.pass ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>
                        Classifying
                        <ClassifyDots />
                      </span>
                    </>
                  ) : (
                    <>
                      {btn.icon}
                      {btn.label}
                    </>
                  )}
                </Button>
              ))}
            </div>
            {classifyStatus.result && (
              <p className="text-xs text-slate-500">
                <span className="text-emerald-600 font-medium">Last run:</span> {classifyStatus.result}
              </p>
            )}
            {classifyStatus.running && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                Classification in progress…
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 2: KPI STRIP ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total Products"
          value={loading ? null : totalProducts.toLocaleString('en-SA-u-ca-gregory')}
          icon={<Package className="h-5 w-5 text-slate-500" />}
          colorClass="text-slate-800"
          loading={loading}
        />
        <KpiCard
          title="Classified"
          value={loading ? null : classifiedCount.toLocaleString('en-SA-u-ca-gregory')}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          colorClass="text-emerald-700"
          loading={loading}
        />
        <KpiCard
          title="Needs Review"
          value={loading ? null : needsReviewCount.toLocaleString('en-SA-u-ca-gregory')}
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          colorClass="text-amber-700"
          loading={loading}
        />
        <KpiCard
          title="Avg Confidence"
          value={loading ? null : avgConf !== null ? `${(avgConf * 100).toFixed(1)}%` : '—'}
          icon={<BarChart2 className="h-5 w-5 text-sky-500" />}
          colorClass="text-sky-700"
          loading={loading}
        />
      </div>

      {/* ── SECTION 3: FILTER BAR ─────────────────────────────────────────── */}
      <Card className="border-slate-200">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Input
                placeholder="Search ref or label…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-3 pr-3 h-9 text-sm"
              />
            </div>

            {/* Item Class */}
            <Select value={itemClass} onValueChange={setItemClass}>
              <SelectTrigger className="h-9 w-40 text-sm">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Classes</SelectItem>
                <SelectItem value="RAW_MATERIAL">Raw Material</SelectItem>
                <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                <SelectItem value="SERVICE">Service</SelectItem>
                <SelectItem value="TOOL">Tool</SelectItem>
                <SelectItem value="SPARE_PART">Spare Part</SelectItem>
              </SelectContent>
            </Select>

            {/* Category */}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-44 text-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {[
                  'SHEET', 'PLATE', 'PROFILE_H', 'PROFILE_I', 'PROFILE_C',
                  'PROFILE_ANGLE', 'FLAT_BAR', 'ROUND_BAR', 'BOLT', 'NUT',
                  'WELDING_ELECTRODE', 'WELDING_WIRE_FLUX', 'WELDING_PPE',
                  'PAINT', 'GAS_CYLINDER', 'OTHER',
                ].map(c => (
                  <SelectItem key={c} value={c} className="text-sm">
                    {c.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Profile Type */}
            <Select value={profileType} onValueChange={setProfileType}>
              <SelectTrigger className="h-9 w-40 text-sm">
                <SelectValue placeholder="All Profiles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Profiles</SelectItem>
                {['HEA', 'HEB', 'IPE', 'UPN', 'EQUAL_ANGLE', 'FLAT_BAR', 'ROUND_BAR'].map(pt => (
                  <SelectItem key={pt} value={pt} className="text-sm">
                    {pt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Toggle: Needs Review */}
            <Button
              variant={needsReview ? 'default' : 'outline'}
              size="sm"
              onClick={() => setNeedsReview(v => !v)}
              className={`h-9 text-xs gap-1.5 active:scale-[0.97] transition-transform ${needsReview ? 'bg-amber-500 hover:bg-amber-600 border-amber-500 text-white' : 'border-slate-200 text-slate-600'}`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Needs Review
            </Button>

            {/* Toggle: Enriched Only */}
            <Button
              variant={enrichedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEnrichedOnly(v => !v)}
              className={`h-9 text-xs gap-1.5 active:scale-[0.97] transition-transform ${enrichedOnly ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white' : 'border-slate-200 text-slate-600'}`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Enriched Only
            </Button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Page size */}
            <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 w-20 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchProducts}
              disabled={loading}
              className="h-9 px-2 active:scale-[0.97] transition-transform"
            >
              <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 4: PRODUCT TABLE ──────────────────────────────────────── */}
      <Card className="border-slate-200">
        <CardHeader className="py-3 px-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Products
              {!loading && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {pagination.total.toLocaleString('en-SA-u-ca-gregory')} total
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-600 w-32">REF</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Label</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 w-36">Category</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 w-24">Grade</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 w-28">Classified By</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 w-12 text-center">Conf</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 w-44">Key Dims</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 w-44">Conversions</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 w-16 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j} className="py-3">
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-16 text-center text-slate-400 text-sm">
                      No products found — adjust filters
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product, idx) => (
                    <TableRow
                      key={product.dolibarr_id}
                      onClick={() => openProduct(product)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    >
                      {/* REF */}
                      <TableCell className="py-2.5">
                        <span className="font-mono text-xs font-medium text-slate-800 hover:text-emerald-700 transition-colors">
                          {product.ref}
                        </span>
                      </TableCell>

                      {/* Label */}
                      <TableCell className="py-2.5">
                        <span className="text-sm text-slate-700 truncate block max-w-xs" title={product.label}>
                          {product.label.length > 45 ? `${product.label.slice(0, 45)}…` : product.label}
                        </span>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border transition-all hover:brightness-95 ${getItemClassColor(product.enrichment.item_class)}`}
                        >
                          {product.enrichment.material_category?.replace(/_/g, ' ') || getItemClassLabel(product.enrichment.item_class)}
                        </span>
                      </TableCell>

                      {/* Grade */}
                      <TableCell className="py-2.5">
                        <span className="text-xs text-slate-500 font-mono">
                          {product.enrichment.grade || '—'}
                        </span>
                      </TableCell>

                      {/* Classified By */}
                      <TableCell className="py-2.5">
                        {getClassifiedByBadge(product.enrichment.classified_by)}
                      </TableCell>

                      {/* Confidence */}
                      <TableCell className="py-2.5 text-center">
                        <ConfidenceDot conf={product.enrichment.classification_conf} />
                      </TableCell>

                      {/* Key Dims */}
                      <TableCell className="py-2.5">
                        <span className="text-xs text-slate-600 font-mono">{getKeyDims(product)}</span>
                      </TableCell>

                      {/* Conversions */}
                      <TableCell className="py-2.5">
                        <span className="text-xs text-slate-600 font-mono">{getConversions(product)}</span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            openProduct(product);
                          }}
                          className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 active:scale-[0.97] transition-transform gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 5: PAGINATION ─────────────────────────────────────────── */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="gap-1.5 active:scale-[0.97] transition-transform"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-slate-600 font-medium px-2">
            Page {page + 1} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="gap-1.5 active:scale-[0.97] transition-transform"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── SECTION 6: DETAIL SIDE PANEL ─────────────────────────────────── */}
      <DetailPanel
        product={selectedProduct}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        isAdmin={isAdmin}
        onReviewSuccess={handleReviewSuccess}
      />
    </div>
  );
}

// ── Animated dots for "Classifying..." ────────────────────────────────────────

function ClassifyDots() {
  const [dots, setDots] = useState('');
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      setDots(d => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, []);

  return <span className="inline-block w-4 text-left">{dots}</span>;
}

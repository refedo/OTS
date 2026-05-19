'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Loader2, FileSpreadsheet, FileText, ShoppingCart,
  Package, DollarSign, Hash, Search, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductRow {
  productRef: string;
  productLabel: string;
  coaCode: string;
  coaLabel: string;
  coaCategory: string;
  totalQty: number;
  totalAmount: number;
}

interface ReportData {
  from: string;
  to: string;
  products: ProductRow[];
  categories: string[];
  summary: {
    productCount: number;
    totalAmount: number;
    totalQty: number;
  };
}

type SortField = 'productRef' | 'productLabel' | 'coaCode' | 'coaLabel' | 'coaCategory' | 'totalQty' | 'totalAmount';
type SortDir = 'asc' | 'desc';

// ── Formatters ────────────────────────────────────────────────────────────────

function formatSAR(n: number) {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(n);
}

function formatQty(n: number) {
  if (n === 0) return '0.000';
  if (Number.isInteger(n)) return n.toLocaleString('en-US');
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color = 'blue',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'amber';
}) {
  const ring: Record<string, string> = {
    blue: 'border-l-blue-500',
    green: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
  };
  const iconBg: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className={`rounded-xl border border-l-4 bg-white px-5 py-4 shadow-sm ${ring[color]} flex items-start gap-4`}>
      <div className={`rounded-lg p-2 ${iconBg[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Sort Icon ─────────────────────────────────────────────────────────────────

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="h-3 w-3 ml-1 text-indigo-600" />
    : <ArrowDown className="h-3 w-3 ml-1 text-indigo-600" />;
}

// ── Logo loader for PDF ───────────────────────────────────────────────────────

async function loadLogoForPDF() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return undefined;
    const data = await res.json();
    const logoPath: string | undefined = data.logoWhite || data.companyLogo;
    if (!logoPath) return undefined;

    const imgRes = await fetch(logoPath);
    if (!imgRes.ok) return undefined;
    const blob = await imgRes.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    const aspectRatio = await new Promise<number>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1);
      img.onerror = () => resolve(1);
      img.src = base64;
    });
    return { base64, aspectRatio, isWhite: !!data.logoWhite };
  } catch {
    return undefined;
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProcurementByProductPage() {
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [fromDate, setFromDate] = useState(yearStart);
  const [toDate, setToDate] = useState(today);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  // Filters & sort
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('__all__');
  const [sortField, setSortField] = useState<SortField>('totalAmount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const buildParams = () => new URLSearchParams({ from: fromDate, to: toDate });

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setReport(null);
    setSearch('');
    setCategoryFilter('__all__');
    try {
      const res = await fetch(`/api/financial/reports/procurement-by-product?${buildParams()}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to load report'); return; }
      setReport(data);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Client-side filter + sort
  const filteredProducts = useMemo(() => {
    if (!report) return [];
    let rows = report.products;

    if (categoryFilter !== '__all__') {
      rows = rows.filter((p) => p.coaCategory === categoryFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) =>
          p.productRef.toLowerCase().includes(q) ||
          p.productLabel.toLowerCase().includes(q) ||
          p.coaCode.toLowerCase().includes(q) ||
          p.coaLabel.toLowerCase().includes(q) ||
          p.coaCategory.toLowerCase().includes(q),
      );
    }

    rows = [...rows].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return rows;
  }, [report, search, categoryFilter, sortField, sortDir]);

  const filteredTotal = useMemo(
    () => filteredProducts.reduce((s, p) => s + p.totalAmount, 0),
    [filteredProducts],
  );
  const filteredQty = useMemo(
    () => filteredProducts.reduce((s, p) => s + p.totalQty, 0),
    [filteredProducts],
  );

  const exportExcel = async () => {
    const params = buildParams();
    params.set('export', 'excel');
    if (categoryFilter !== '__all__') params.set('category', categoryFilter);
    const res = await fetch(`/api/financial/reports/procurement-by-product?${params}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procurement-by-product-${fromDate}-to-${toDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!report) return;
    setExportingPdf(true);
    try {
      const { PDFReportBuilder } = await import('@/lib/pdf-builder');
      const logo = await loadLogoForPDF();
      const pdf = new PDFReportBuilder('landscape', 'steel');

      pdf.addHeader('Hexa Steel®', 'Financial Reports — Procurement by Product', logo);

      pdf.addTitle(
        'Procurement by Product',
        `Period: ${formatDate(report.from)} — ${formatDate(report.to)}`,
      );

      const metaEntries: Record<string, string> = {
        'From': formatDate(report.from),
        'To': formatDate(report.to),
        'Products': String(filteredProducts.length),
        'Total Amount': formatSAR(filteredTotal),
        'Generated': new Date().toLocaleDateString('en-SA-u-ca-gregory', {
          day: '2-digit', month: 'short', year: 'numeric',
        }),
      };
      if (categoryFilter !== '__all__') {
        metaEntries['Category'] = categoryFilter;
      }

      pdf.addMetadataBox(metaEntries);

      pdf.addSectionHeader('Product Procurement Summary');

      pdf.addTable(
        ['Product Ref', 'Product Description', 'COA Code', 'COA Account Name', 'Category', 'Total Qty', 'Total Amount (SAR)'],
        filteredProducts.map((p) => [
          p.productRef,
          p.productLabel,
          p.coaCode,
          p.coaLabel,
          p.coaCategory,
          formatQty(p.totalQty),
          formatSAR(p.totalAmount),
        ]),
        { alternateRows: true },
      );

      pdf.addSectionHeader('Summary');
      pdf.addInfoGrid({
        'Total Products': String(filteredProducts.length),
        'Total Amount': formatSAR(filteredTotal),
      }, 2);

      pdf.addFooter('Hexa Steel® OTS · Financial Reports · hexasteel.sa/ots');
      pdf.save(`procurement-by-product-${fromDate}-to-${toDate}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  };

  const thBtn = (field: SortField, label: string, align: 'left' | 'right' = 'left', cls = '') => (
    <th
      className={`py-2.5 px-3 font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-100 transition-colors ${cls}`}
      onClick={() => handleSort(field)}
    >
      <span className={`inline-flex items-center ${align === 'right' ? 'justify-end w-full' : ''}`}>
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="rounded-2xl border bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-6 m-4 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/financial">
            <button className="inline-flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white h-8 w-8 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="rounded-xl bg-white/20 p-2.5">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Procurement by Product</h1>
            <p className="text-blue-100 text-sm mt-0.5">
              Total quantities and amounts per purchased product, with Chart of Accounts classification
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-white/70 mb-1">From</label>
            <Input
              type="date"
              className="bg-white text-slate-800 w-36"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1">To</label>
            <Input
              type="date"
              className="bg-white text-slate-800 w-36"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-white text-indigo-700 hover:bg-white/90 font-semibold"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Generate Report
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {report && !loading && (
          <>
            {/* KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard
                label="Products Purchased"
                value={String(filteredProducts.length)}
                sub={filteredProducts.length !== report.summary.productCount ? `of ${report.summary.productCount} total` : 'unique product references'}
                icon={Package}
                color="blue"
              />
              <KpiCard
                label="Total Quantity"
                value={formatQty(filteredQty)}
                sub="combined units across filtered products"
                icon={Hash}
                color="amber"
              />
              <KpiCard
                label="Total Amount"
                value={`SAR ${compact(filteredTotal)}`}
                sub={`${formatDate(report.from)} — ${formatDate(report.to)}`}
                icon={DollarSign}
                color="green"
              />
            </div>

            {/* Report Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    Product Procurement — {formatDate(report.from)} to {formatDate(report.to)}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({filteredProducts.length} products)
                    </span>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                      Export Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportPDF}
                      disabled={exportingPdf}
                    >
                      {exportingPdf
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <FileText className="h-4 w-4 mr-2 text-red-500" />}
                      Export PDF
                    </Button>
                  </div>
                </div>

                {/* Search + Category filter */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by product ref, description, or account…"
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  {report.categories.length > 0 && (
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All categories</SelectItem>
                        {report.categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    {report.products.length === 0
                      ? 'No procurement data found for this period.'
                      : 'No products match the current filters.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 bg-slate-50">
                          {thBtn('productRef', 'Product Ref', 'left', 'w-[140px]')}
                          {thBtn('productLabel', 'Product Description')}
                          {thBtn('coaCode', 'COA Code', 'left', 'w-[110px]')}
                          {thBtn('coaLabel', 'COA Account Name')}
                          {thBtn('coaCategory', 'Category', 'left', 'w-[180px]')}
                          {thBtn('totalQty', 'Total Qty', 'right', 'w-[110px]')}
                          {thBtn('totalAmount', 'Total Amount', 'right', 'w-[150px]')}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((p, idx) => (
                          <tr
                            key={`${p.productRef}-${p.coaCode}-${idx}`}
                            className={`border-b transition-colors hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                          >
                            <td className="py-2 px-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                              {p.productRef}
                            </td>
                            <td className="py-2 px-3 text-slate-800 max-w-[320px]">
                              <span title={p.productLabel}>{p.productLabel}</span>
                            </td>
                            <td className="py-2 px-3 font-mono text-xs text-indigo-700 font-semibold whitespace-nowrap">
                              {p.coaCode}
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-xs max-w-[200px] truncate" title={p.coaLabel}>
                              {p.coaLabel}
                            </td>
                            <td className="py-2 px-3 text-xs max-w-[180px] truncate" title={p.coaCategory}>
                              <span className="inline-block rounded px-1.5 py-0.5 bg-slate-100 text-slate-600 font-medium">
                                {p.coaCategory}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-xs text-slate-700 whitespace-nowrap">
                              {formatQty(p.totalQty)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-xs font-semibold text-emerald-700 whitespace-nowrap">
                              {formatSAR(p.totalAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 bg-slate-100 font-bold">
                          <td className="py-2.5 px-3 text-slate-700" colSpan={5}>
                            TOTAL {filteredProducts.length !== report.summary.productCount && `(filtered: ${filteredProducts.length} of ${report.summary.productCount})`}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-700">
                            {formatQty(filteredQty)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-xs text-emerald-800 bg-emerald-50">
                            {formatSAR(filteredTotal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!report && !loading && !error && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a date range and click <strong>Generate Report</strong> to view procurement data.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

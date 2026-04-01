'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Download, ArrowLeft, Search, FileDown, Sheet, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Thirdparty Combobox (mobile-friendly search + select) ───────────────────

function ThirdpartyCombobox({
  thirdparties, value, onChange, loading, type,
}: {
  thirdparties: { id: number; name: string; invoice_count: number }[];
  value: string;
  onChange: (id: string) => void;
  loading: boolean;
  type: 'ar' | 'ap';
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = thirdparties.find(t => String(t.id) === value);
  const filtered = query.trim()
    ? thirdparties.filter(t => t.name.toLowerCase().includes(query.toLowerCase()))
    : thirdparties;

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring text-left"
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {loading ? 'Loading…' : selected ? selected.name : `Select ${type === 'ar' ? 'customer' : 'supplier'}…`}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-1" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[260px] rounded-md border bg-popover shadow-lg max-h-72 overflow-hidden flex flex-col">
          <div className="flex items-center border-b px-3 py-2 gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${type === 'ar' ? 'customer' : 'supplier'}…`}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">No results</p>
            ) : (
              filtered.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { onChange(String(t.id)); setOpen(false); setQuery(''); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2',
                    String(t.id) === value && 'bg-accent font-medium',
                  )}
                >
                  <span className="truncate">{t.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{t.invoice_count} inv</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

function fmtNum(amount: number): string {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

// ============================================
// PDF EXPORT — Official Statement of Account
// ============================================
async function exportToPDF(report: any, type: 'ar' | 'ap', fromDate: string, toDate: string) {
  const jsPDF = (await import('jspdf')).default;
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 15;
  let y = 0;

  const primary = '#1e3a5f';
  const accent = '#2563eb';

  // ---- HEADER BAR ----
  doc.setFillColor(primary);
  doc.rect(0, 0, pw, 28, 'F');
  doc.setTextColor('#ffffff');
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('HEXA STEEL', m, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Steel Structure Manufacturing & Erection', m, 17);
  doc.text('CR: 2050113697  |  VAT: 310228428700003', m, 22);

  // Right side — document title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('STATEMENT OF ACCOUNT', pw - m, 12, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(type === 'ar' ? 'Accounts Receivable' : 'Accounts Payable', pw - m, 18, { align: 'right' });

  y = 35;

  // ---- PARTY INFO BOX ----
  doc.setDrawColor(accent);
  doc.setLineWidth(0.5);
  doc.roundedRect(m, y, pw - 2 * m, 24, 2, 2);

  doc.setTextColor('#374151');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(type === 'ar' ? 'Customer:' : 'Supplier:', m + 3, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(report.thirdpartyName || '—', m + 28, y + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Period:', m + 3, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(`${fromDate}  to  ${toDate}`, m + 28, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('Date Issued:', m + 3, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toISOString().slice(0, 10), m + 28, y + 20);

  // Right side — balance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Balance Due:', pw - m - 3, y + 6, { align: 'right' });
  doc.setFontSize(14);
  doc.setTextColor(report.balance > 0 ? '#dc2626' : '#16a34a');
  doc.text(`SAR ${fmtNum(report.balance)}`, pw - m - 3, y + 16, { align: 'right' });

  y += 30;

  // ---- SUMMARY ROW ----
  const summaryBoxW = (pw - 2 * m) / 3;
  const summaryItems = [
    { label: 'Total Invoiced', value: report.totalInvoiced, color: '#1f2937' },
    { label: 'Total Paid', value: report.totalPaid, color: '#16a34a' },
    { label: 'Outstanding Balance', value: report.balance, color: '#dc2626' },
  ];

  summaryItems.forEach((item, i) => {
    const bx = m + i * summaryBoxW;
    doc.setFillColor('#f3f4f6');
    doc.rect(bx, y, summaryBoxW - 2, 14, 'F');
    doc.setTextColor('#6b7280');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, bx + (summaryBoxW - 2) / 2, y + 5, { align: 'center' });
    doc.setTextColor(item.color);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`SAR ${fmtNum(item.value)}`, bx + (summaryBoxW - 2) / 2, y + 11, { align: 'center' });
  });

  y += 20;

  // ---- TRANSACTION TABLE ----
  const tableHeaders = type === 'ap' 
    ? ['#', 'Date', 'Reference', 'Supplier Ref', 'Type', 'Debit (SAR)', 'Credit (SAR)', 'Remain to Pay', 'Balance (SAR)']
    : ['#', 'Date', 'Reference', 'Type', 'Debit (SAR)', 'Credit (SAR)', 'Remain to Pay', 'Balance (SAR)'];
  const tableRows = report.lines.map((line: any, i: number) => {
    const baseRow = [
      String(i + 1),
      line.date || '',
      line.ref || '',
    ];
    if (type === 'ap') {
      baseRow.push(line.refSupplier || '');
    }
    const remainStr = line.remainToPay !== null && line.remainToPay > 0 
      ? fmtNum(line.remainToPay) 
      : (line.type === 'Invoice' || line.type === 'Credit Note') ? 'Paid' : '';
    baseRow.push(
      line.type || '',
      line.debit > 0 ? fmtNum(line.debit) : '',
      line.credit > 0 ? fmtNum(line.credit) : '',
      remainStr,
      fmtNum(line.balance)
    );
    return baseRow;
  });

  autoTable(doc, {
    head: [tableHeaders],
    body: tableRows,
    startY: y,
    margin: { left: m, right: m },
    theme: 'grid',
    headStyles: {
      fillColor: primary,
      textColor: '#ffffff',
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: '#374151',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 22 },
      2: { cellWidth: 30 },
      3: { cellWidth: 22 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 28 },
      6: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 3) {
        const val = data.cell.raw;
        if (val === 'Payment') {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Credit Note') {
          data.cell.styles.textColor = [37, 99, 235];
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 5;

  // ---- TOTALS ROW ----
  const totY = finalY;
  doc.setFillColor('#e5e7eb');
  doc.rect(m, totY, pw - 2 * m, 8, 'F');
  doc.setTextColor('#1f2937');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTALS', m + 3, totY + 5.5);

  const totalDebit = report.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
  const totalCredit = report.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
  doc.text(`SAR ${fmtNum(totalDebit)}`, pw - m - 60, totY + 5.5, { align: 'right' });
  doc.setTextColor('#16a34a');
  doc.text(`SAR ${fmtNum(totalCredit)}`, pw - m - 30, totY + 5.5, { align: 'right' });
  doc.setTextColor(report.balance > 0 ? '#dc2626' : '#16a34a');
  doc.text(`SAR ${fmtNum(report.balance)}`, pw - m - 2, totY + 5.5, { align: 'right' });

  // ---- FOOTER on all pages ----
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Footer line
    doc.setDrawColor('#d1d5db');
    doc.setLineWidth(0.3);
    doc.line(m, ph - 15, pw - m, ph - 15);
    // Footer text
    doc.setTextColor('#9ca3af');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Hexa Steel Co. — P.O. Box 14491, Dammam 31424, Saudi Arabia — Tel: +966 13 812 4422', pw / 2, ph - 11, { align: 'center' });
    doc.text('This is a computer-generated statement and does not require a signature.', pw / 2, ph - 7.5, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, pw - m, ph - 7.5, { align: 'right' });
  }

  const safeName = (report.thirdpartyName || 'SOA').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`SOA_${safeName}_${fromDate}_${toDate}.pdf`);
}

// ============================================
// EXCEL EXPORT
// ============================================
async function exportToExcel(report: any, type: 'ar' | 'ap', fromDate: string, toDate: string) {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  // Header rows
  const headerRows = [
    ['Statement of Account'],
    [type === 'ar' ? 'Customer' : 'Supplier', report.thirdpartyName],
    ['Period', `${fromDate} to ${toDate}`],
    ['Date Issued', new Date().toISOString().slice(0, 10)],
    [],
    ['Total Invoiced', report.totalInvoiced],
    ['Total Paid', report.totalPaid],
    ['Outstanding Balance', report.balance],
    [],
  ];

  // Table header
  const tableHeader = type === 'ap'
    ? ['#', 'Date', 'Reference', 'Supplier Ref', 'Type', 'Debit (SAR)', 'Credit (SAR)', 'Remain to Pay', 'Balance (SAR)']
    : ['#', 'Date', 'Reference', 'Type', 'Debit (SAR)', 'Credit (SAR)', 'Remain to Pay', 'Balance (SAR)'];
  const tableRows = report.lines.map((line: any, i: number) => {
    const baseRow: any[] = [i + 1, line.date || '', line.ref || ''];
    if (type === 'ap') {
      baseRow.push(line.refSupplier || '');
    }
    const remainVal = line.remainToPay !== null && line.remainToPay > 0 
      ? line.remainToPay 
      : (line.type === 'Invoice' || line.type === 'Credit Note') ? 'Paid' : '';
    baseRow.push(
      line.type || '',
      line.debit > 0 ? line.debit : '',
      line.credit > 0 ? line.credit : '',
      remainVal,
      line.balance
    );
    return baseRow;
  });

  // Totals row
  const totalDebit = report.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
  const totalCredit = report.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
  const totalsRow = type === 'ap'
    ? ['', '', '', '', 'TOTALS', totalDebit, totalCredit, report.balance]
    : ['', '', '', 'TOTALS', totalDebit, totalCredit, report.balance];

  const allRows = [...headerRows, tableHeader, ...tableRows, [], totalsRow];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Column widths
  ws['!cols'] = [
    { wch: 5 }, { wch: 14 }, { wch: 22 }, { wch: 14 },
    { wch: 16 }, { wch: 16 }, { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Statement of Account');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (report.thirdpartyName || 'SOA').replace(/[^a-zA-Z0-9]/g, '_');
  a.href = url;
  a.download = `SOA_${safeName}_${fromDate}_${toDate}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// PAGE COMPONENT
// ============================================
type SortField = 'date' | 'ref' | 'type' | 'debit' | 'credit' | 'balance' | 'remainToPay';
type SortDir = 'asc' | 'desc';

export default function SOAReportPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [thirdpartyId, setThirdpartyId] = useState('');
  const [type, setType] = useState<'ar' | 'ap'>('ar');
  const [fromDate, setFromDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [thirdparties, setThirdparties] = useState<any[]>([]);
  const [tpLoading, setTpLoading] = useState(false);
  const [tpSearch, setTpSearch] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDir === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const sortedLines = report?.lines ? [...report.lines].sort((a: any, b: any) => {
    let aVal: any, bVal: any;
    switch (sortField) {
      case 'date':
        aVal = a.sortDate || new Date(a.date).getTime() || 0;
        bVal = b.sortDate || new Date(b.date).getTime() || 0;
        break;
      case 'ref':
        aVal = a.ref || '';
        bVal = b.ref || '';
        break;
      case 'type':
        aVal = a.type || '';
        bVal = b.type || '';
        break;
      case 'debit':
        aVal = a.debit || 0;
        bVal = b.debit || 0;
        break;
      case 'credit':
        aVal = a.credit || 0;
        bVal = b.credit || 0;
        break;
      case 'balance':
        aVal = a.balance || 0;
        bVal = b.balance || 0;
        break;
      case 'remainToPay':
        aVal = a.remainToPay ?? -1;
        bVal = b.remainToPay ?? -1;
        break;
      default:
        aVal = 0;
        bVal = 0;
    }
    if (typeof aVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  }) : [];

  useEffect(() => {
    async function loadThirdparties() {
      setTpLoading(true);
      try {
        const res = await fetch(`/api/financial/reports/soa/thirdparties?type=${type}`);
        if (res.ok) setThirdparties(await res.json());
      } catch (e) { console.error(e); }
      finally { setTpLoading(false); }
    }
    loadThirdparties();
  }, [type]);

  const filteredTp = thirdparties.filter(tp =>
    !tpSearch || tp.name.toLowerCase().includes(tpSearch.toLowerCase()) || String(tp.id).includes(tpSearch)
  );

  const fetchReport = async () => {
    if (!thirdpartyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/financial/reports/soa?thirdparty_id=${thirdpartyId}&type=${type}&from=${fromDate}&to=${toDate}`);
      if (res.ok) setReport(await res.json());
    } catch (e) {
      console.error('Failed to fetch SOA:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!report) return;
    setExporting('pdf');
    try { await exportToPDF(report, type, fromDate, toDate); }
    catch (e) { console.error('PDF export failed:', e); }
    finally { setExporting(null); }
  };

  const handleExportExcel = async () => {
    if (!report) return;
    setExporting('excel');
    try { await exportToExcel(report, type, fromDate, toDate); }
    catch (e) { console.error('Excel export failed:', e); }
    finally { setExporting(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/financial">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Statement of Account</h1>
            <p className="text-sm text-muted-foreground">View invoices and payments for a specific client or supplier</p>
          </div>
        </div>
        {report && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting === 'pdf'}>
              {exporting === 'pdf' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting === 'excel'}>
              {exporting === 'excel' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sheet className="h-4 w-4 mr-2" />}
              Export Excel
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setType('ar'); setThirdpartyId(''); }}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    type === 'ar'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'border-input bg-background hover:bg-green-50 text-green-700 dark:hover:bg-green-950/30',
                  )}
                >
                  AR
                </button>
                <button
                  type="button"
                  onClick={() => { setType('ap'); setThirdpartyId(''); }}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    type === 'ap'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'border-input bg-background hover:bg-red-50 text-red-700 dark:hover:bg-red-950/30',
                  )}
                >
                  AP
                </button>
              </div>
            </div>
            <div className="space-y-1 min-w-[280px]">
              <label className="text-sm font-medium">{type === 'ar' ? 'Customer' : 'Supplier'}</label>
              <ThirdpartyCombobox
                thirdparties={thirdparties}
                value={thirdpartyId}
                onChange={setThirdpartyId}
                loading={tpLoading}
                type={type}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[160px]" />
            </div>
            <Button onClick={fetchReport} disabled={loading || !thirdpartyId}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <span className="text-lg">{report.thirdpartyName}</span>
                  <Badge
                    className={cn(
                      'ml-3',
                      type === 'ar'
                        ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
                    )}
                    variant="outline"
                  >
                    {type === 'ar' ? 'AR — Customer' : 'AP — Supplier'}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Period Balance</div>
                  <div className={`text-xl font-bold ${report.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatSAR(report.balance)}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const today = new Date().toISOString().slice(0, 10);
                const totalRemaining = (report.lines as any[])
                  .filter((l: any) => l.remainToPay !== null && l.remainToPay > 0)
                  .reduce((s: number, l: any) => s + Number(l.remainToPay), 0);
                const overdueBalance = (report.lines as any[])
                  .filter((l: any) => l.remainToPay > 0 && l.dateDue && l.dateDue < today)
                  .reduce((s: number, l: any) => s + Number(l.remainToPay), 0);
                const paidPct = report.totalInvoiced > 0
                  ? Math.round((report.totalPaid / report.totalInvoiced) * 100)
                  : 0;
                const cols = report.creditLimit != null ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4';
                return (
                  <div className={cn('grid gap-3 mb-6', cols)}>
                    <div className="p-3 border rounded-lg text-center">
                      <div className="text-xs text-muted-foreground">Total Invoiced</div>
                      <div className="text-base font-bold">{formatSAR(report.totalInvoiced)}</div>
                    </div>
                    <div className="p-3 border rounded-lg text-center">
                      <div className="text-xs text-muted-foreground">Total Paid</div>
                      <div className="text-base font-bold text-green-600">{formatSAR(report.totalPaid)}</div>
                      <div className="text-xs text-muted-foreground">{paidPct}% collected</div>
                    </div>
                    <div className="p-3 border rounded-lg text-center">
                      <div className="text-xs text-muted-foreground">Overdue Balance</div>
                      <div className={`text-base font-bold ${overdueBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatSAR(overdueBalance)}
                      </div>
                      <div className="text-xs text-muted-foreground">past due date</div>
                    </div>
                    <div className={cn(
                      'p-3 border-2 rounded-lg text-center',
                      type === 'ar' ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20' : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20',
                    )}>
                      <div className="text-xs text-muted-foreground">Total Outstanding</div>
                      <div className={`text-base font-bold ${type === 'ar' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {formatSAR(totalRemaining)}
                      </div>
                      <div className="text-xs text-muted-foreground">remaining to pay</div>
                    </div>
                    {report.creditLimit != null && (
                      <div className="p-3 border rounded-lg text-center border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
                        <div className="text-xs text-muted-foreground">Credit Limit</div>
                        <div className="text-base font-bold text-amber-700 dark:text-amber-400">
                          {formatSAR(report.creditLimit)}
                        </div>
                        <div className={cn(
                          'text-xs font-medium',
                          totalRemaining > report.creditLimit ? 'text-red-600' : 'text-green-600',
                        )}>
                          {totalRemaining > report.creditLimit
                            ? `Over by ${formatSAR(totalRemaining - report.creditLimit)}`
                            : `${formatSAR(report.creditLimit - totalRemaining)} available`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 cursor-pointer hover:bg-muted/70" onClick={() => handleSort('date')}>
                        <div className="flex items-center">Date {getSortIcon('date')}</div>
                      </th>
                      <th className="text-left p-3 cursor-pointer hover:bg-muted/70" onClick={() => handleSort('ref')}>
                        <div className="flex items-center">Reference {getSortIcon('ref')}</div>
                      </th>
                      {type === 'ap' && <th className="text-left p-3">Supplier Ref</th>}
                      <th className="text-left p-3 cursor-pointer hover:bg-muted/70" onClick={() => handleSort('type')}>
                        <div className="flex items-center">Type {getSortIcon('type')}</div>
                      </th>
                      <th className="text-right p-3 cursor-pointer hover:bg-muted/70" onClick={() => handleSort('debit')}>
                        <div className="flex items-center justify-end">Debit {getSortIcon('debit')}</div>
                      </th>
                      <th className="text-right p-3 cursor-pointer hover:bg-muted/70" onClick={() => handleSort('credit')}>
                        <div className="flex items-center justify-end">Credit {getSortIcon('credit')}</div>
                      </th>
                      <th className="text-right p-3 cursor-pointer hover:bg-muted/70" onClick={() => handleSort('remainToPay')}>
                        <div className="flex items-center justify-end">Remain to Pay {getSortIcon('remainToPay')}</div>
                      </th>
                      <th className="text-right p-3 cursor-pointer hover:bg-muted/70" onClick={() => handleSort('balance')}>
                        <div className="flex items-center justify-end">Balance {getSortIcon('balance')}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLines.map((line: any, i: number) => (
                      <tr key={i} className={`border-b ${line.type === 'Payment' ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                        <td className="p-3">{line.date}</td>
                        <td className="p-3 font-mono text-xs">{line.ref}</td>
                        {type === 'ap' && (
                          <td className="p-3 font-mono text-xs text-muted-foreground">{line.refSupplier || '—'}</td>
                        )}
                        <td className="p-3">
                          <Badge variant={line.type === 'Payment' ? 'default' : line.type === 'Credit Note' ? 'secondary' : 'outline'}>
                            {line.type}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">{line.debit > 0 ? formatSAR(line.debit) : ''}</td>
                        <td className="p-3 text-right text-green-600">{line.credit > 0 ? formatSAR(line.credit) : ''}</td>
                        <td className="p-3 text-right">
                          {line.remainToPay !== null && line.remainToPay > 0 ? (
                            <span className="text-orange-600 font-medium">{formatSAR(line.remainToPay)}</span>
                          ) : line.type === 'Invoice' || line.type === 'Credit Note' ? (
                            <span className="text-green-600 text-xs">Paid</span>
                          ) : ''}
                        </td>
                        <td className="p-3 text-right font-semibold">{formatSAR(line.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

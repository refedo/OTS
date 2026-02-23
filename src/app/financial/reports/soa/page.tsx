'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Download, ArrowLeft, Search, FileDown, Sheet } from 'lucide-react';
import Link from 'next/link';

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
  const tableHeaders = ['#', 'Date', 'Reference', 'Type', 'Debit (SAR)', 'Credit (SAR)', 'Balance (SAR)'];
  const tableRows = report.lines.map((line: any, i: number) => [
    String(i + 1),
    line.date || '',
    line.ref || '',
    line.type || '',
    line.debit > 0 ? fmtNum(line.debit) : '',
    line.credit > 0 ? fmtNum(line.credit) : '',
    fmtNum(line.balance),
  ]);

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
  const tableHeader = ['#', 'Date', 'Reference', 'Type', 'Debit (SAR)', 'Credit (SAR)', 'Balance (SAR)'];
  const tableRows = report.lines.map((line: any, i: number) => [
    i + 1,
    line.date || '',
    line.ref || '',
    line.type || '',
    line.debit > 0 ? line.debit : '',
    line.credit > 0 ? line.credit : '',
    line.balance,
  ]);

  // Totals row
  const totalDebit = report.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
  const totalCredit = report.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
  const totalsRow = ['', '', '', 'TOTALS', totalDebit, totalCredit, report.balance];

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
              <Select value={type} onValueChange={(v) => { setType(v as 'ar' | 'ap'); setThirdpartyId(''); }}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">Accounts Receivable (AR)</SelectItem>
                  <SelectItem value="ap">Accounts Payable (AP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-[280px]">
              <label className="text-sm font-medium">{type === 'ar' ? 'Customer' : 'Supplier'}</label>
              <Select value={thirdpartyId} onValueChange={setThirdpartyId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tpLoading ? 'Loading...' : `Select ${type === 'ar' ? 'customer' : 'supplier'}...`} />
                </SelectTrigger>
                <SelectContent>
                  {filteredTp.map(tp => (
                    <SelectItem key={tp.id} value={String(tp.id)}>
                      {tp.name} ({tp.invoice_count} invoices)
                    </SelectItem>
                  ))}
                  {filteredTp.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">No {type === 'ar' ? 'customers' : 'suppliers'} found</div>
                  )}
                </SelectContent>
              </Select>
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
                  <Badge variant="outline" className="ml-3">{type === 'ar' ? 'Customer' : 'Supplier'}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Balance</div>
                  <div className={`text-xl font-bold ${report.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatSAR(report.balance)}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 border rounded-lg text-center">
                  <div className="text-sm text-muted-foreground">Total Invoiced</div>
                  <div className="text-lg font-bold">{formatSAR(report.totalInvoiced)}</div>
                </div>
                <div className="p-3 border rounded-lg text-center">
                  <div className="text-sm text-muted-foreground">Total Paid</div>
                  <div className="text-lg font-bold text-green-600">{formatSAR(report.totalPaid)}</div>
                </div>
                <div className="p-3 border rounded-lg text-center">
                  <div className="text-sm text-muted-foreground">Outstanding</div>
                  <div className="text-lg font-bold text-red-600">{formatSAR(report.balance)}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Reference</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-right p-3">Debit</th>
                      <th className="text-right p-3">Credit</th>
                      <th className="text-right p-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.lines.map((line: any, i: number) => (
                      <tr key={i} className={`border-b ${line.type === 'Payment' ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                        <td className="p-3">{line.date}</td>
                        <td className="p-3 font-mono text-xs">{line.ref}</td>
                        <td className="p-3">
                          <Badge variant={line.type === 'Payment' ? 'default' : line.type === 'Credit Note' ? 'secondary' : 'outline'}>
                            {line.type}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">{line.debit > 0 ? formatSAR(line.debit) : ''}</td>
                        <td className="p-3 text-right text-green-600">{line.credit > 0 ? formatSAR(line.credit) : ''}</td>
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

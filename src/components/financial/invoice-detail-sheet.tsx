'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Loader2, Receipt, CreditCard, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

function fmtSAR(n: number) {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

interface InvoiceDetail {
  id: number;
  ref: string;
  refSupplier: string | null;
  thirdpartyName: string;
  type: 'customer' | 'supplier';
  dateInvoice: string | null;
  dateDue: string | null;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  isPaid: boolean;
  status: number;
  isCreditNote: boolean;
  lines: {
    lineId: number;
    productRef: string | null;
    productLabel: string | null;
    qty: number;
    unitPriceHt: number;
    vatRate: number;
    totalHt: number;
    totalTva: number;
    totalTtc: number;
    accountingCode: string | null;
  }[];
  payments: {
    ref: string | null;
    amount: number;
    date: string | null;
    method: string | null;
    bankLabel: string | null;
    bankName: string | null;
  }[];
}

interface InvoiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number | null;
  invoiceType: 'ar' | 'ap';
  /** Optional: if provided, show a payment detail header instead of invoice detail */
  paymentContext?: {
    ref: string;
    amount: number;
    date: string;
    invoiceRef: string;
  };
}

export function InvoiceDetailSheet({
  open,
  onOpenChange,
  invoiceId,
  invoiceType,
  paymentContext,
}: InvoiceDetailSheetProps) {
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !invoiceId) { setDetail(null); return; }
    setLoading(true);
    setError(null);
    fetch(`/api/financial/invoices/${invoiceId}?type=${invoiceType}`)
      .then(r => r.ok ? r.json() : r.json().then((b: any) => { throw new Error(b.error || 'Failed to load'); }))
      .then(setDetail)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, invoiceId, invoiceType]);

  const totalPaid = detail?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const remaining = detail ? detail.totalTtc - totalPaid : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            {paymentContext ? (
              <><CreditCard className="h-5 w-5 text-green-600" /> Payment Detail</>
            ) : (
              <><Receipt className="h-5 w-5 text-blue-600" /> Invoice Detail</>
            )}
          </SheetTitle>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {paymentContext && detail && !loading && (
          <div className="mb-6 rounded-xl border bg-gradient-to-b from-green-50 to-white p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Payment Ref</span>
              <span className="font-mono font-semibold text-sm">{paymentContext.ref}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Amount</span>
              <span className="font-semibold text-green-700">SAR {fmtSAR(paymentContext.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Date</span>
              <span className="text-sm">{paymentContext.date}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Applied to Invoice</span>
              <span className="font-mono text-xs text-blue-700">{paymentContext.invoiceRef}</span>
            </div>
          </div>
        )}

        {detail && !loading && (
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="rounded-xl border bg-gradient-to-b from-slate-50 to-white p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-base">{detail.ref}</span>
                    {detail.isCreditNote && (
                      <Badge variant="secondary">Credit Note</Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        detail.isPaid
                          ? 'border-green-300 text-green-700 bg-green-50'
                          : 'border-orange-300 text-orange-700 bg-orange-50',
                      )}
                    >
                      {detail.isPaid ? 'Paid' : 'Outstanding'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        invoiceType === 'ar'
                          ? 'border-emerald-300 text-emerald-700'
                          : 'border-red-300 text-red-700',
                      )}
                    >
                      {invoiceType === 'ar' ? 'Customer' : 'Supplier'}
                    </Badge>
                  </div>
                  {detail.refSupplier && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Supplier Ref: <span className="font-mono">{detail.refSupplier}</span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-muted-foreground">Total (incl. VAT)</div>
                  <div className="text-lg font-bold">SAR {fmtSAR(detail.totalTtc)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Party</div>
                  <div className="font-medium truncate">{detail.thirdpartyName}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Invoice Date</div>
                  <div>{detail.dateInvoice || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Due Date</div>
                  <div className={cn(
                    detail.dateDue && !detail.isPaid && detail.dateDue < new Date().toISOString().slice(0, 10)
                      ? 'text-red-600 font-medium'
                      : '',
                  )}>
                    {detail.dateDue || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Remaining</div>
                  <div className={cn(
                    'font-semibold',
                    remaining > 0.01 ? 'text-orange-600' : 'text-green-600',
                  )}>
                    SAR {fmtSAR(Math.max(0, remaining))}
                  </div>
                </div>
              </div>

              {/* Amount breakdown */}
              <div className="border-t pt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Subtotal (HT)</div>
                  <div className="font-mono font-medium">SAR {fmtSAR(detail.totalHt)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">VAT</div>
                  <div className="font-mono font-medium">SAR {fmtSAR(detail.totalTva)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Total (TTC)</div>
                  <div className="font-mono font-bold">SAR {fmtSAR(detail.totalTtc)}</div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            {detail.lines.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-slate-700">Line Items</span>
                  <Badge variant="secondary" className="text-xs">{detail.lines.length}</Badge>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left p-2 font-medium">Description</th>
                        <th className="text-right p-2 font-medium">Qty</th>
                        <th className="text-right p-2 font-medium">Unit (HT)</th>
                        <th className="text-right p-2 font-medium">VAT%</th>
                        <th className="text-right p-2 font-medium">Total (TTC)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.lines.map((line, i) => (
                        <tr key={line.lineId} className={cn('border-b last:border-0', i % 2 === 1 && 'bg-muted/20')}>
                          <td className="p-2">
                            <div className="font-medium">{line.productLabel || line.productRef || `Line ${i + 1}`}</div>
                            {line.productRef && line.productLabel && (
                              <div className="text-muted-foreground font-mono">{line.productRef}</div>
                            )}
                            {line.accountingCode && (
                              <div className="text-muted-foreground">{line.accountingCode}</div>
                            )}
                          </td>
                          <td className="p-2 text-right tabular-nums">{line.qty}</td>
                          <td className="p-2 text-right tabular-nums">{fmtSAR(line.unitPriceHt)}</td>
                          <td className="p-2 text-right tabular-nums">{line.vatRate}%</td>
                          <td className="p-2 text-right tabular-nums font-medium">SAR {fmtSAR(line.totalTtc)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payment History */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-slate-700">Payment History</span>
                <Badge variant="secondary" className="text-xs">{detail.payments.length}</Badge>
              </div>
              {detail.payments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No payments recorded
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left p-2 font-medium">Reference</th>
                        <th className="text-left p-2 font-medium">Date</th>
                        <th className="text-left p-2 font-medium">Method</th>
                        <th className="text-right p-2 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.payments.map((pmt, i) => (
                        <tr key={i} className={cn('border-b last:border-0', i % 2 === 1 && 'bg-muted/20')}>
                          <td className="p-2 font-mono">{pmt.ref || '—'}</td>
                          <td className="p-2">{pmt.date || '—'}</td>
                          <td className="p-2">
                            <div>{pmt.method || '—'}</div>
                            {(pmt.bankLabel || pmt.bankName) && (
                              <div className="text-muted-foreground">{pmt.bankLabel || pmt.bankName}</div>
                            )}
                          </td>
                          <td className="p-2 text-right font-semibold text-green-700 tabular-nums">
                            SAR {fmtSAR(pmt.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/30">
                        <td colSpan={3} className="p-2 font-semibold text-right text-xs">Total Paid</td>
                        <td className="p-2 text-right font-bold text-green-700 tabular-nums">
                          SAR {fmtSAR(totalPaid)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

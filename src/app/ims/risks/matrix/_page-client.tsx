'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Grid3X3 } from 'lucide-react';

type MatrixRisk = { id: string; riskNumber: string; title: string; type: string; status: string };
type Cell = { likelihood: number; severity: number; riskLevel: number; riskRating: string; risks: MatrixRisk[] };
type MatrixData = { cells: Cell[]; summary: Record<string, number>; total: number };

const STANDARDS = [
  { key: 'all', label: 'All Standards' },
  { key: 'ISO_9001', label: 'ISO 9001' },
  { key: 'ISO_14001', label: 'ISO 14001' },
  { key: 'ISO_45001', label: 'ISO 45001' },
];

function cellColor(rating: string) {
  return { LOW: 'bg-green-100 hover:bg-green-200 border-green-200', MEDIUM: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-200', HIGH: 'bg-orange-100 hover:bg-orange-200 border-orange-200', CRITICAL: 'bg-red-100 hover:bg-red-200 border-red-200' }[rating] ?? 'bg-gray-100 border-gray-200';
}

function ratingBadge(r: string) {
  const map: Record<string, string> = { LOW: 'bg-green-100 text-green-700', MEDIUM: 'bg-yellow-100 text-yellow-700', HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700' };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded ${map[r]}`}>{r}</span>;
}

export default function ImsRiskMatrixClient() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [standard, setStandard] = useState('all');
  const [selected, setSelected] = useState<Cell | null>(null);

  const fetchMatrix = async (std: string) => {
    setLoading(true);
    const url = std === 'all' ? '/api/ims/risks/matrix' : `/api/ims/risks/matrix?standard=${std}`;
    const res = await fetch(url);
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchMatrix(standard); }, [standard]);

  const getCell = (likelihood: number, severity: number) =>
    data?.cells.find(c => c.likelihood === likelihood && c.severity === severity);

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-orange-800/30 via-transparent to-transparent" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white/10"><Grid3X3 className="size-7 text-slate-200" /></div>
            <div>
              <h1 className="text-2xl font-bold">Risk Matrix</h1>
              <p className="text-slate-300 text-sm mt-0.5">5 × 5 Likelihood × Severity heat map</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => fetchMatrix(standard)}><RefreshCw className="size-4" /></Button>
        </div>
      </div>

      {/* Standard filter + summary */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border overflow-hidden">
          {STANDARDS.map(s => (
            <button key={s.key} onClick={() => { setStandard(s.key); setSelected(null); }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${standard === s.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
              {s.label}
            </button>
          ))}
        </div>
        {data && (
          <div className="flex gap-2 ml-auto">
            {Object.entries(data.summary).map(([k, v]) => (
              <span key={k} className={`text-xs font-bold px-3 py-1.5 rounded-full ${k==='CRITICAL'?'bg-red-100 text-red-700':k==='HIGH'?'bg-orange-100 text-orange-700':k==='MEDIUM'?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'}`}>
                {v} {k}
              </span>
            ))}
            <span className="text-xs text-muted-foreground self-center ml-2">{data.total} total</span>
          </div>
        )}
      </div>

      {/* Matrix */}
      {loading ? (
        <div className="h-80 bg-muted animate-pulse rounded-xl" />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              {/* Y-axis label */}
              <div className="flex items-center justify-center w-6">
                <span className="text-xs text-muted-foreground font-medium -rotate-90 whitespace-nowrap">Severity ↑</span>
              </div>
              <div className="flex-1">
                {/* Grid rows: severity 5 down to 1 */}
                {[5, 4, 3, 2, 1].map(severity => (
                  <div key={severity} className="flex gap-1 mb-1 items-center">
                    <div className="w-6 text-center text-xs font-bold text-muted-foreground">{severity}</div>
                    {[1, 2, 3, 4, 5].map(likelihood => {
                      const cell = getCell(likelihood, severity);
                      const count = cell?.risks.length ?? 0;
                      const rating = cell?.riskRating ?? 'LOW';
                      const isSelected = selected?.likelihood === likelihood && selected?.severity === severity;
                      return (
                        <button key={likelihood}
                          onClick={() => setSelected(cell && count > 0 ? (isSelected ? null : cell) : null)}
                          className={`flex-1 aspect-square min-h-[56px] rounded-lg border text-center flex flex-col items-center justify-center transition-all ${cellColor(rating)} ${count > 0 ? 'cursor-pointer' : 'cursor-default'} ${isSelected ? 'ring-2 ring-offset-1 ring-primary' : ''}`}>
                          {count > 0 && <span className="text-lg font-black text-foreground/80">{count}</span>}
                          <span className="text-[10px] font-semibold text-foreground/50">{likelihood * severity}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
                {/* X-axis */}
                <div className="flex gap-1 mt-1 ml-7">
                  {[1, 2, 3, 4, 5].map(l => (
                    <div key={l} className="flex-1 text-center text-xs font-bold text-muted-foreground">{l}</div>
                  ))}
                </div>
                <p className="text-center text-xs text-muted-foreground mt-1">Likelihood →</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-3 mt-4 justify-center flex-wrap">
              {[['LOW','bg-green-100 border-green-200'],['MEDIUM','bg-yellow-100 border-yellow-200'],['HIGH','bg-orange-100 border-orange-200'],['CRITICAL','bg-red-100 border-red-200']].map(([label, cls]) => (
                <div key={label} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${cls}`}>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected cell detail */}
      {selected && selected.risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Risks at Likelihood {selected.likelihood} × Severity {selected.severity} = {selected.riskLevel}
              {ratingBadge(selected.riskRating)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selected.risks.map(r => (
                <Link key={r.id} href={`/ims/risks/${r.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition-colors">
                  <div>
                    <span className="font-mono text-sm font-bold">{r.riskNumber}</span>
                    <span className="ml-3 text-sm">{r.title}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${r.type==='RISK'?'border-red-400 text-red-600':'border-green-400 text-green-600'}`}>{r.type}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{r.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

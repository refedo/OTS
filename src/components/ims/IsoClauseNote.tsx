'use client';

import { useState, useEffect } from 'react';
import { BookOpen, X } from 'lucide-react';

type Clause = {
  standard: string;
  clause: string;
  title: string;
};

type Props = {
  storageKey: string;
  clauses: Clause[];
};

const STANDARD_COLORS: Record<string, { dot: string; badge: string }> = {
  'ISO 9001': { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  'ISO 9001:2015': { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  'ISO 14001': { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200' },
  'ISO 14001:2015': { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200' },
  'ISO 45001': { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  'ISO 45001:2018': { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
};

function getColors(standard: string) {
  return STANDARD_COLORS[standard] ?? { dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-600 border-slate-200' };
}

export function IsoClauseNote({ storageKey, clauses }: Props) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const val = localStorage.getItem(`iso-note-dismissed:${storageKey}`);
      setDismissed(val === 'true');
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(`iso-note-dismissed:${storageKey}`, 'true');
    } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm">
      <BookOpen className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-indigo-700 font-semibold text-xs uppercase tracking-wide mr-2">ISO Reference</span>
        <span className="flex flex-wrap gap-1.5 mt-1">
          {clauses.map((c, i) => {
            const colors = getColors(c.standard);
            return (
              <span
                key={i}
                className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-xs font-medium ${colors.badge}`}
                title={c.title}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                {c.standard} {c.clause}
                <span className="text-xs opacity-70">— {c.title}</span>
              </span>
            );
          })}
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="text-indigo-400 hover:text-indigo-600 transition-colors shrink-0 mt-0.5"
        aria-label="Dismiss ISO reference note"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

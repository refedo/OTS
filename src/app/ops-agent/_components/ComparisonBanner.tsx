'use client';

import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

export function ComparisonBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
      <p className="text-sm flex-1">
        <span className="font-semibold">Comparison Mode Active</span> — Ops Agent running alongside the existing Early Warning System.
        Results are being compared. EWS will be deprecated after the validation period.
      </p>
      <button onClick={() => setDismissed(true)} className="text-amber-500 hover:text-amber-700 flex-shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

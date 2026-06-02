'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { computeWeightedScore, scoreToRating, ratingToOutcome } from '@/lib/services/supply-chain/supplier-evaluation-scoring';

export interface EvaluationFormData {
  evaluation_date: string;
  evaluation_period: string;
  score_quality: number;
  score_delivery: number;
  score_price: number;
  score_service: number;
  score_documentation: number;
  score_hse: number;
  notes_quality: string;
  notes_delivery: string;
  notes_price: string;
  notes_service: string;
  notes_documentation: string;
  notes_hse: string;
  general_notes: string;
}

const CRITERIA = [
  { key: 'quality',       label: 'Product Quality',            weight: '25%', description: 'Conformity to specs, defect rate, reject history' },
  { key: 'delivery',      label: 'Delivery & Lead Time',       weight: '20%', description: 'On-time delivery rate, communication of delays' },
  { key: 'price',         label: 'Price / Value',              weight: '20%', description: 'Competitiveness, price stability, invoice accuracy' },
  { key: 'service',       label: 'Service & Communication',    weight: '15%', description: 'Responsiveness, issue resolution, account management' },
  { key: 'documentation', label: 'Documentation & Compliance', weight: '15%', description: 'MTCs, certifications, traceability, regulatory compliance' },
  { key: 'hse',           label: 'HSE & Ethics',               weight: '5%',  description: 'Safety record, environmental practices, ethical conduct' },
] as const;

const SCORE_LABELS: Record<number, string> = {
  1: '1 — Poor',
  2: '2 — Below Average',
  3: '3 — Acceptable',
  4: '4 — Good',
  5: '5 — Excellent',
};

const RATING_COLORS: Record<string, string> = {
  A: 'text-green-700 bg-green-100',
  B: 'text-amber-700 bg-amber-100',
  C: 'text-orange-700 bg-orange-100',
  D: 'text-red-700 bg-red-100',
};

const OUTCOME_COLORS: Record<string, string> = {
  APPROVED:    'text-green-700 bg-green-100',
  CONDITIONAL: 'text-amber-700 bg-amber-100',
  SUSPENDED:   'text-orange-700 bg-orange-100',
  REJECTED:    'text-red-700 bg-red-100',
};

const EMPTY: EvaluationFormData = {
  evaluation_date: new Date().toISOString().slice(0, 10),
  evaluation_period: '',
  score_quality: 3,
  score_delivery: 3,
  score_price: 3,
  score_service: 3,
  score_documentation: 3,
  score_hse: 3,
  notes_quality: '',
  notes_delivery: '',
  notes_price: '',
  notes_service: '',
  notes_documentation: '',
  notes_hse: '',
  general_notes: '',
};

interface Props {
  value: EvaluationFormData;
  onChange: (v: EvaluationFormData) => void;
}

export function EvaluationScoreForm({ value, onChange }: Props) {
  const weighted = computeWeightedScore({
    quality: value.score_quality,
    delivery: value.score_delivery,
    price: value.score_price,
    service: value.score_service,
    documentation: value.score_documentation,
    hse: value.score_hse,
  });
  const rating = scoreToRating(weighted);
  const outcome = ratingToOutcome(rating);

  const set = (k: keyof EvaluationFormData, v: string | number) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-6">
      {/* Header fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="eval-date">Evaluation Date *</Label>
          <input
            id="eval-date"
            type="date"
            value={value.evaluation_date}
            onChange={e => set('evaluation_date', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eval-period">Period (optional)</Label>
          <input
            id="eval-period"
            type="text"
            placeholder="e.g. Q1 2025 or Jan–Jun 2025"
            value={value.evaluation_period}
            onChange={e => set('evaluation_period', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Live score preview */}
      <div className="rounded-xl border bg-slate-50 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Weighted Score</p>
          <p className="text-3xl font-bold tabular-nums">{weighted.toFixed(1)}<span className="text-base font-normal text-muted-foreground">/100</span></p>
        </div>
        <div className="flex gap-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Rating</p>
            <span className={`text-2xl font-bold px-3 py-1 rounded-lg ${RATING_COLORS[rating]}`}>{rating}</span>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Outcome</p>
            <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${OUTCOME_COLORS[outcome]}`}>{outcome}</span>
          </div>
        </div>
      </div>

      {/* Criteria scoring */}
      <div className="space-y-4">
        {CRITERIA.map(criterion => (
          <div key={criterion.key} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{criterion.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{criterion.description}</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium ml-4 shrink-0">
                Weight {criterion.weight}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs shrink-0 w-10">Score</Label>
              <Select
                value={String(value[`score_${criterion.key}` as keyof EvaluationFormData])}
                onValueChange={v => set(`score_${criterion.key}` as keyof EvaluationFormData, parseInt(v))}
              >
                <SelectTrigger className="w-48 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => (
                    <SelectItem key={n} value={String(n)}>{SCORE_LABELS[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Mini score bar */}
              <div className="flex gap-1 ml-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <div
                    key={n}
                    className={`h-2 w-6 rounded-sm transition-colors ${
                      n <= (value[`score_${criterion.key}` as keyof EvaluationFormData] as number)
                        ? (value[`score_${criterion.key}` as keyof EvaluationFormData] as number) >= 4 ? 'bg-green-500' :
                          (value[`score_${criterion.key}` as keyof EvaluationFormData] as number) >= 3 ? 'bg-amber-400' : 'bg-red-400'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            <Textarea
              placeholder={`Notes on ${criterion.label.toLowerCase()} (optional)`}
              value={value[`notes_${criterion.key}` as keyof EvaluationFormData] as string}
              onChange={e => set(`notes_${criterion.key}` as keyof EvaluationFormData, e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>
        ))}
      </div>

      {/* General notes */}
      <div className="space-y-1.5">
        <Label>General Notes / Recommendations</Label>
        <Textarea
          placeholder="Overall assessment, action items, or recommendations…"
          value={value.general_notes}
          onChange={e => set('general_notes', e.target.value)}
          rows={3}
          className="text-sm"
        />
      </div>
    </div>
  );
}

export { EMPTY as EMPTY_EVALUATION_FORM };

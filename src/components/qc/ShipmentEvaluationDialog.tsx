'use client';

import { useState, useEffect } from 'react';
import { Loader2, Star, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreKey {
  key: 'quality' | 'otif' | 'service' | 'documentation' | 'hse' | 'stacking';
  label: string;
  weight: string;
  weightNum: number;
  description: string;
}

const MIR_CRITERIA: ScoreKey[] = [
  { key: 'quality',       label: 'Shipment Quality',          weight: '30%', weightNum: 0.30, description: 'Material conformity to spec, defect rate, physical condition' },
  { key: 'otif',          label: 'OTIF',                      weight: '25%', weightNum: 0.25, description: 'On Time In Full — punctuality and completeness of delivery' },
  { key: 'service',       label: 'Service & Communication',   weight: '15%', weightNum: 0.15, description: 'Supplier responsiveness, account management, coordination' },
  { key: 'documentation', label: 'Documentation & Compliance',weight: '15%', weightNum: 0.15, description: 'MTCs, certifications, packing lists, traceability documents' },
  { key: 'hse',           label: 'HSE & Ethics',              weight: '10%', weightNum: 0.10, description: 'Driver behavior, site safety compliance, ethical conduct' },
  { key: 'stacking',      label: 'Stacking & Packaging',      weight: '5%',  weightNum: 0.05, description: 'Packaging condition, stacking quality, protection of materials' },
];

const SCORE_LABELS: Record<number, string> = {
  1: '1 — Poor',
  2: '2 — Below Average',
  3: '3 — Acceptable',
  4: '4 — Good',
  5: '5 — Excellent',
};

const RATING_COLORS: Record<string, string> = {
  A: 'bg-green-100 text-green-800 border-green-200',
  B: 'bg-blue-100 text-blue-800 border-blue-200',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  D: 'bg-red-100 text-red-800 border-red-200',
};

type Scores = Record<ScoreKey['key'], number>;
type Notes  = Partial<Record<ScoreKey['key'] | 'general', string>>;

export interface ExistingEvaluation {
  id: string;
  scoreQuality: number;
  scoreOtif: number;
  scoreService: number;
  scoreDocumentation: number;
  scoreHse: number;
  scoreStacking: number;
  notesQuality?: string | null;
  notesOtif?: string | null;
  notesService?: string | null;
  notesDocumentation?: string | null;
  notesHse?: string | null;
  notesStacking?: string | null;
  generalNotes?: string | null;
  weightedScore: number;
  rating: string;
  outcome: string;
  evaluationDate?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mirId: string;
  mirNumber: string;
  supplierName?: string | null;
  existingEvaluation?: ExistingEvaluation | null;
  onSuccess: () => void;
}

// ─── Pure helpers (match server-side weights exactly) ─────────────────────────

function computeScore(scores: Scores): number {
  return MIR_CRITERIA.reduce(
    (sum, c) => sum + scores[c.key] * 20 * c.weightNum,
    0,
  );
}

function scoreToRating(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

function ratingToOutcome(rating: string): string {
  if (rating === 'A') return 'APPROVED';
  if (rating === 'B') return 'CONDITIONAL';
  if (rating === 'C') return 'SUSPENDED';
  return 'REJECTED';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShipmentEvaluationDialog({
  open,
  onOpenChange,
  mirId,
  mirNumber,
  supplierName,
  existingEvaluation,
  onSuccess,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const isReadOnly = !!existingEvaluation;

  const initialScores: Scores = existingEvaluation
    ? {
        quality:       existingEvaluation.scoreQuality,
        otif:          existingEvaluation.scoreOtif,
        service:       existingEvaluation.scoreService,
        documentation: existingEvaluation.scoreDocumentation,
        hse:           existingEvaluation.scoreHse,
        stacking:      existingEvaluation.scoreStacking,
      }
    : { quality: 3, otif: 3, service: 3, documentation: 3, hse: 3, stacking: 3 };

  const initialNotes: Notes = existingEvaluation
    ? {
        quality:       existingEvaluation.notesQuality       ?? '',
        otif:          existingEvaluation.notesOtif          ?? '',
        service:       existingEvaluation.notesService       ?? '',
        documentation: existingEvaluation.notesDocumentation ?? '',
        hse:           existingEvaluation.notesHse           ?? '',
        stacking:      existingEvaluation.notesStacking      ?? '',
        general:       existingEvaluation.generalNotes       ?? '',
      }
    : {};

  const [scores, setScores] = useState<Scores>(initialScores);
  const [notes, setNotes]   = useState<Notes>(initialNotes);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setScores(initialScores);
      setNotes(initialNotes);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const liveScore  = computeScore(scores);
  const liveRating = scoreToRating(liveScore);
  const liveOutcome = ratingToOutcome(liveRating);

  const displayScore  = isReadOnly ? existingEvaluation!.weightedScore : liveScore;
  const displayRating = isReadOnly ? existingEvaluation!.rating        : liveRating;
  const displayOutcome = isReadOnly ? existingEvaluation!.outcome       : liveOutcome;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/qc/material-receipts/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mirId,
          evaluationDate: today,
          scoreQuality:       scores.quality,
          scoreOtif:          scores.otif,
          scoreService:       scores.service,
          scoreDocumentation: scores.documentation,
          scoreHse:           scores.hse,
          scoreStacking:      scores.stacking,
          notesQuality:       notes.quality       || null,
          notesOtif:          notes.otif          || null,
          notesService:       notes.service       || null,
          notesDocumentation: notes.documentation || null,
          notesHse:           notes.hse           || null,
          notesStacking:      notes.stacking      || null,
          generalNotes:       notes.general       || null,
        }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json();
        throw new Error(data.error ?? 'Failed to save evaluation');
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save evaluation');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            {isReadOnly ? 'Shipment Evaluation' : 'Evaluate Shipment'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mirNumber}{supplierName ? ` · ${supplierName}` : ''}
          </p>
        </DialogHeader>

        {/* Live score preview */}
        <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/40">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Weighted Score</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{displayScore.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
              <Badge className={`text-sm font-bold ${RATING_COLORS[displayRating]}`}>
                {displayRating}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {displayOutcome}
              </Badge>
            </div>
          </div>
          {/* Score bar */}
          <div className="w-32">
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  displayRating === 'A' ? 'bg-green-500' :
                  displayRating === 'B' ? 'bg-blue-500'  :
                  displayRating === 'C' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(displayScore, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">0</span>
              <span className="text-[10px] text-muted-foreground">100</span>
            </div>
          </div>
        </div>

        {/* Criteria rows */}
        <div className="space-y-4">
          {MIR_CRITERIA.map(criterion => (
            <div key={criterion.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{criterion.label}</span>
                  <Badge variant="outline" className="ml-2 text-xs">{criterion.weight}</Badge>
                  <p className="text-xs text-muted-foreground mt-0.5">{criterion.description}</p>
                </div>
                {isReadOnly ? (
                  <Badge variant="secondary" className="min-w-[80px] justify-center">
                    {SCORE_LABELS[scores[criterion.key]] ?? scores[criterion.key]}
                  </Badge>
                ) : (
                  <Select
                    value={String(scores[criterion.key])}
                    onValueChange={val =>
                      setScores(prev => ({ ...prev, [criterion.key]: parseInt(val) }))
                    }
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={String(n)}>
                          {SCORE_LABELS[n]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {!isReadOnly && (
                <Textarea
                  placeholder={`Notes for ${criterion.label} (optional)`}
                  value={notes[criterion.key] ?? ''}
                  onChange={e => setNotes(prev => ({ ...prev, [criterion.key]: e.target.value }))}
                  className="text-sm resize-none h-16"
                />
              )}
              {isReadOnly && notes[criterion.key] && (
                <p className="text-xs text-muted-foreground italic px-1">{notes[criterion.key]}</p>
              )}
            </div>
          ))}

          {/* General notes */}
          <div>
            <label className="text-sm font-medium">General Notes</label>
            {isReadOnly ? (
              notes.general
                ? <p className="text-sm text-muted-foreground mt-1 italic">{notes.general}</p>
                : <p className="text-sm text-muted-foreground mt-1">—</p>
            ) : (
              <Textarea
                placeholder="Overall comments, recommendations, or observations (optional)"
                value={notes.general ?? ''}
                onChange={e => setNotes(prev => ({ ...prev, general: e.target.value }))}
                className="mt-1 resize-none h-20"
              />
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isReadOnly ? 'Close' : 'Cancel'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Evaluation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

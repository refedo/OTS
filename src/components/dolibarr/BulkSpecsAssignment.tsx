'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Zap,
  Search,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Package,
} from 'lucide-react';

interface BulkSpecsAssignmentProps {
  refData: any;
  onApplied: () => void;
}

export function BulkSpecsAssignment({ refData, onApplied }: BulkSpecsAssignmentProps) {
  const [matchField, setMatchField] = useState<'ref' | 'label'>('ref');
  const [matchPattern, setMatchPattern] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [applyResult, setApplyResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Specs to assign
  const [specs, setSpecs] = useState({
    steel_grade: '',
    profile_type: '',
    profile_size: '',
    surface_finish: '',
    is_standard_stock: false,
    lead_time_days: '',
    fabrication_notes: '',
    welding_notes: '',
  });

  const handlePreview = async () => {
    if (!matchPattern.trim()) {
      setError('Please enter a match pattern');
      return;
    }
    setPreviewing(true);
    setError('');
    setPreviewResult(null);
    setApplyResult(null);

    try {
      const res = await fetch('/api/dolibarr/steel-specs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_field: matchField,
          match_pattern: matchPattern,
          specs: buildSpecsPayload(),
          preview: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Preview failed');
      setPreviewResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (!matchPattern.trim()) return;
    setApplying(true);
    setError('');
    setApplyResult(null);

    try {
      const res = await fetch('/api/dolibarr/steel-specs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_field: matchField,
          match_pattern: matchPattern,
          specs: buildSpecsPayload(),
          preview: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Apply failed');
      setApplyResult(data);
      onApplied();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const buildSpecsPayload = () => {
    const payload: any = {};
    if (specs.steel_grade) payload.steel_grade = specs.steel_grade;
    if (specs.profile_type) payload.profile_type = specs.profile_type;
    if (specs.profile_size) payload.profile_size = specs.profile_size;
    if (specs.surface_finish) payload.surface_finish = specs.surface_finish;
    payload.is_standard_stock = specs.is_standard_stock;
    if (specs.lead_time_days) payload.lead_time_days = parseInt(specs.lead_time_days, 10);
    if (specs.fabrication_notes) payload.fabrication_notes = specs.fabrication_notes;
    if (specs.welding_notes) payload.welding_notes = specs.welding_notes;

    // Auto-fill dimensions from profile reference
    if (specs.profile_size && refData?.profiles) {
      const profile = refData.profiles.find((p: any) => p.profile_size === specs.profile_size);
      if (profile) {
        payload.height_mm = profile.height_mm;
        payload.width_mm = profile.width_mm;
        payload.weight_per_meter = profile.weight_per_meter;
      }
    }

    return payload;
  };

  const availableProfileSizes = refData?.profiles?.filter(
    (p: any) => p.profile_type === specs.profile_type
  ) || [];

  return (
    <div className="space-y-4">
      {/* Pattern Matching */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Bulk Specs Assignment
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Assign steel specifications to multiple products at once by matching their ref or label.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Match Pattern */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="w-full md:w-auto">
              <Label className="text-xs">Match Field</Label>
              <Select value={matchField} onValueChange={(v: 'ref' | 'label') => setMatchField(v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ref">Ref</SelectItem>
                  <SelectItem value="label">Label</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs">Pattern (contains)</Label>
              <div className="flex gap-2">
                <Input
                  value={matchPattern}
                  onChange={e => setMatchPattern(e.target.value)}
                  placeholder={matchField === 'ref' ? 'e.g. IPE, HEA300, 0.35mm' : 'e.g. Steel Plate'}
                />
                <Button variant="outline" onClick={handlePreview} disabled={previewing || !matchPattern.trim()}>
                  {previewing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                  Preview
                </Button>
              </div>
            </div>
          </div>

          {/* Specs to Assign */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Steel Grade</Label>
              <Select value={specs.steel_grade} onValueChange={v => setSpecs(s => ({ ...s, steel_grade: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(refData?.grades || []).map((g: any) => (
                    <SelectItem key={g.grade_code} value={g.grade_code}>{g.grade_code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Profile Type</Label>
              <Select value={specs.profile_type} onValueChange={v => setSpecs(s => ({ ...s, profile_type: v === 'none' ? '' : v, profile_size: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {['IPE', 'HEA', 'HEB', 'UPN', 'Plate', 'Tube-Round', 'Tube-Square', 'Flat Bar', 'Round Bar', 'L-Angle', 'T-Section'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Profile Size</Label>
              {availableProfileSizes.length > 0 ? (
                <Select value={specs.profile_size} onValueChange={v => setSpecs(s => ({ ...s, profile_size: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableProfileSizes.map((p: any) => (
                      <SelectItem key={p.profile_size} value={p.profile_size}>{p.profile_size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={specs.profile_size} onChange={e => setSpecs(s => ({ ...s, profile_size: e.target.value }))} placeholder="e.g. IPE200" />
              )}
            </div>
            <div>
              <Label className="text-xs">Surface Finish</Label>
              <Select value={specs.surface_finish} onValueChange={v => setSpecs(s => ({ ...s, surface_finish: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(refData?.surfaceFinishes || []).map((sf: string) => (
                    <SelectItem key={sf} value={sf}>{sf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bulk_standard_stock"
                checked={specs.is_standard_stock}
                onChange={e => setSpecs(s => ({ ...s, is_standard_stock: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor="bulk_standard_stock" className="text-xs cursor-pointer">Standard Stock</Label>
            </div>
            <div className="w-[120px]">
              <Label className="text-xs">Lead Time (days)</Label>
              <Input type="number" value={specs.lead_time_days} onChange={e => setSpecs(s => ({ ...s, lead_time_days: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Results */}
      {previewResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Preview: {previewResult.matchCount} products matched
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewResult.matchCount === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No products match the pattern &quot;{matchPattern}&quot; in the {matchField} field.
              </p>
            ) : (
              <>
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-medium">Dolibarr ID</th>
                        <th className="text-left py-2 px-2 font-medium">Ref</th>
                        <th className="text-left py-2 px-2 font-medium">Label</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewResult.matchedProducts.map((p: any) => (
                        <tr key={p.dolibarr_id} className="border-b last:border-0">
                          <td className="py-1 px-2 text-muted-foreground">{p.dolibarr_id}</td>
                          <td className="py-1 px-2 font-mono text-xs">{p.ref}</td>
                          <td className="py-1 px-2">{p.label}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-4">
                  <Button onClick={handleApply} disabled={applying}>
                    {applying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
                    Apply to {previewResult.matchCount} Products
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Apply Result */}
      {applyResult && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="py-3 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="font-medium">
              Successfully applied specs to {applyResult.applied} products.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

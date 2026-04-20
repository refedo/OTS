'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, AlertTriangle } from 'lucide-react';

type Building = {
  id: string;
  designation: string;
  name: string;
  description: string | null;
};

type ChildCounts = {
  tasks: number;
  assemblyParts: number;
  rfiRequests: number;
  ncrReports: number;
  documentSubmissions: number;
  workOrders: number;
  lcrEntries: number;
};

type BuildingDialogProps = {
  projectId: string;
  building: Building | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (building: Building) => void;
};

export function BuildingDialog({ projectId, building, open, onOpenChange, onSaved }: BuildingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [childCounts, setChildCounts] = useState<ChildCounts | null>(null);

  useEffect(() => {
    if (building && open) {
      fetch(`/api/projects/${projectId}/buildings/${building.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?._count) setChildCounts(data._count as ChildCounts);
        })
        .catch(() => {});
    } else {
      setChildCounts(null);
    }
  }, [building, open, projectId]);

  const totalChildren = childCounts
    ? childCounts.tasks + childCounts.assemblyParts + childCounts.rfiRequests +
      childCounts.ncrReports + childCounts.documentSubmissions + childCounts.workOrders + childCounts.lcrEntries
    : 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string | null> = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
    };
    if (!building) {
      data.designation = (formData.get('designation') as string || '').toUpperCase();
    }

    try {
      const url = building
        ? `/api/projects/${projectId}/buildings/${building.id}`
        : `/api/projects/${projectId}/buildings`;

      const response = await fetch(url, {
        method: building ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save building');

      onSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{building ? 'Edit Building' : 'Add Building'}</DialogTitle>
            <DialogDescription>
              {building ? 'Update the building details below' : 'Enter the details for the new building'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {building && totalChildren > 0 && (
              <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <AlertTriangle className="size-4 mt-0.5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-medium">This building has linked records</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {[
                      childCounts!.tasks > 0 && `${childCounts!.tasks} task${childCounts!.tasks !== 1 ? 's' : ''}`,
                      childCounts!.assemblyParts > 0 && `${childCounts!.assemblyParts} assembly part${childCounts!.assemblyParts !== 1 ? 's' : ''}`,
                      childCounts!.rfiRequests > 0 && `${childCounts!.rfiRequests} RFI${childCounts!.rfiRequests !== 1 ? 's' : ''}`,
                      childCounts!.ncrReports > 0 && `${childCounts!.ncrReports} NCR${childCounts!.ncrReports !== 1 ? 's' : ''}`,
                      childCounts!.documentSubmissions > 0 && `${childCounts!.documentSubmissions} document${childCounts!.documentSubmissions !== 1 ? 's' : ''}`,
                      childCounts!.workOrders > 0 && `${childCounts!.workOrders} work order${childCounts!.workOrders !== 1 ? 's' : ''}`,
                      childCounts!.lcrEntries > 0 && `${childCounts!.lcrEntries} LCR entr${childCounts!.lcrEntries !== 1 ? 'ies' : 'y'}`,
                    ].filter(Boolean).join(', ')}.{' '}
                    Changing the name will be reflected across all linked records automatically.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="designation">
                Designation <span className="text-destructive">*</span>
              </Label>
              <Input
                id="designation"
                name="designation"
                placeholder="e.g., BLD1, WH, MAIN1"
                defaultValue={building?.designation || ''}
                required
                disabled={loading || !!building}
                maxLength={5}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                2-5 uppercase letters/numbers (e.g., BLD1, WH, MAIN1)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Building Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Main Warehouse"
                defaultValue={building?.name || ''}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Optional description..."
                defaultValue={building?.description || ''}
                disabled={loading}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin mr-2" />}
              {building ? 'Update' : 'Create'} Building
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

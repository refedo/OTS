'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { List, Plus, Edit, Trash2, Loader2, Search, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type KPIDefinition = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  formula: string;
  frequency: string;
  weight: number;
  target: number | null;
  unit: string | null;
  calculationType: string;
  isActive: boolean;
  createdAt: string;
  createdBy: { name: string };
  _count: {
    scores: number;
    targets: number;
    manualEntries: number;
    alerts: number;
  };
};

export default function KPIDefinitionsPage() {
  const [definitions, setDefinitions] = useState<KPIDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    formula: '',
    frequency: 'monthly',
    weight: 10,
    target: '',
    unit: '',
    calculationType: 'auto',
    isActive: true,
  });

  useEffect(() => {
    fetchDefinitions();
  }, []);

  const fetchDefinitions = async () => {
    try {
      const response = await fetch('/api/kpi/definitions');
      if (response.ok) {
        setDefinitions(await response.json());
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/kpi/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          target: formData.target ? parseFloat(formData.target) : null,
        }),
      });
      
      if (response.ok) {
        setShowCreateDialog(false);
        fetchDefinitions();
        // Reset form
        setFormData({
          code: '',
          name: '',
          description: '',
          formula: '',
          frequency: 'monthly',
          weight: 10,
          target: '',
          unit: '',
          calculationType: 'auto',
          isActive: true,
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create KPI definition');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create KPI definition');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this KPI definition? This will also delete all related scores, targets, and alerts.')) {
      return;
    }

    try {
      const response = await fetch(`/api/kpi/definitions/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchDefinitions();
      } else {
        alert('Failed to delete KPI definition');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to delete KPI definition');
    }
  };

  const handleRecalculateAll = async () => {
    try {
      setRecalculating(true);
      const response = await fetch('/api/kpi/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency: 'monthly' }),
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Success! Recalculated ${result.count || 'all'} KPIs.\n\nGo to Dashboard to view results.`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to recalculate KPIs');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to recalculate KPIs');
    } finally {
      setRecalculating(false);
    }
  };

  const filteredDefinitions = definitions.filter((def) =>
    def.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    def.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <List className="h-8 w-8" />
            KPI Definitions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage KPI formulas and configurations
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRecalculateAll}
            disabled={recalculating}
          >
            {recalculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recalculate All KPIs
              </>
            )}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New KPI Definition
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search KPI definitions..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Definitions List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredDefinitions.map((def) => (
          <Card key={def.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{def.name}</CardTitle>
                    {def.isActive ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Code: {def.code} | Frequency: {def.frequency} | Type: {def.calculationType}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(def.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {def.description && (
                  <p className="text-sm text-muted-foreground">{def.description}</p>
                )}
                
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Formula:</p>
                  <code className="text-sm font-mono">{def.formula}</code>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Target</p>
                    <p className="font-medium">
                      {def.target !== null ? `${def.target} ${def.unit || ''}` : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Weight</p>
                    <p className="font-medium">{def.weight}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Scores</p>
                    <p className="font-medium">{def._count.scores}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Alerts</p>
                    <p className="font-medium text-orange-600">{def._count.alerts}</p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Created by {def.createdBy.name} on {new Date(def.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDefinitions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <List className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              No KPI definitions found
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First KPI Definition
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New KPI Definition</DialogTitle>
            <DialogDescription>
              Create a new KPI definition with formula and configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., PROD_PRODUCTIVITY"
                />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Production Productivity"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this KPI"
              />
            </div>

            <div className="space-y-2">
              <Label>Formula *</Label>
              <Textarea
                rows={3}
                value={formData.formula}
                onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                placeholder="e.g., {PRODUCTION.PROCESSED_TONS_30D} / {PRODUCTION.MAN_HOURS_30D}"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use tokens like {'{PRODUCTION.PROCESSED_TONS_30D}'} in your formula
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Frequency *</Label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Calculation Type</Label>
                <select
                  value={formData.calculationType}
                  onChange={(e) => setFormData({ ...formData, calculationType: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border"
                >
                  <option value="auto">Automatic</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Weight</Label>
                <Input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  placeholder="e.g., 0.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., tons/hr, %"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active (KPI will be calculated automatically)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create KPI Definition'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

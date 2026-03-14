'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Plus, Target, TrendingUp, Lightbulb, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AnnualPlansPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    year: new Date().getFullYear() + 1,
    theme: '',
    strategicPriorities: [] as string[],
    status: 'Draft',
  });

  const [newPriority, setNewPriority] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/business-planning/annual-plans');
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setLoading(false);
    }
  };

  const addPriority = () => {
    if (newPriority.trim()) {
      setFormData({
        ...formData,
        strategicPriorities: [...formData.strategicPriorities, newPriority.trim()],
      });
      setNewPriority('');
    }
  };

  const removePriority = (index: number) => {
    setFormData({
      ...formData,
      strategicPriorities: formData.strategicPriorities.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    if (!formData.theme || !formData.year) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/business-planning/annual-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Annual Plan created successfully',
        });
        setDialogOpen(false);
        setFormData({
          year: new Date().getFullYear() + 1,
          theme: '',
          strategicPriorities: [],
          status: 'Draft',
        });
        fetchPlans();
      } else {
        throw new Error('Failed to create plan');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create annual plan',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      case 'Archived': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[1, 2].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Annual Plans
          </h1>
          <p className="text-muted-foreground mt-2">
            Yearly strategic plans with objectives, KPIs, and initiatives
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Annual Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Annual Plan</DialogTitle>
              <DialogDescription>
                Define your strategic plan for the year
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Year */}
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                />
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <Label htmlFor="theme">Theme *</Label>
                <Input
                  id="theme"
                  value={formData.theme}
                  onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                  placeholder="e.g., Digital Transformation & Operational Excellence"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Strategic Priorities */}
              <div className="space-y-2">
                <Label>Strategic Priorities (3-7 recommended)</Label>
                <div className="flex gap-2">
                  <Input
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    placeholder="Add a strategic priority..."
                    onKeyPress={(e) => e.key === 'Enter' && addPriority()}
                  />
                  <Button type="button" size="sm" onClick={addPriority}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.strategicPriorities.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {formData.strategicPriorities.map((priority, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                        <span className="text-sm">{priority}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePriority(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Creating...' : 'Create Annual Plan'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getStatusColor(plan.status)}>
                      {plan.status}
                    </Badge>
                    <span className="text-2xl font-bold text-muted-foreground">
                      {plan.year}
                    </span>
                  </div>
                  <CardTitle className="text-2xl">{plan.theme}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Strategic Priorities */}
              {plan.strategicPriorities && plan.strategicPriorities.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Strategic Priorities</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {plan.strategicPriorities.map((priority: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                        <span>{priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs">Objectives</span>
                  </div>
                  <div className="text-2xl font-bold">{plan._count?.objectives || 0}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">KPIs</span>
                  </div>
                  <div className="text-2xl font-bold">{plan._count?.bscKPIs || 0}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Lightbulb className="h-4 w-4" />
                    <span className="text-xs">Initiatives</span>
                  </div>
                  <div className="text-2xl font-bold">{plan._count?.initiatives || 0}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Dept Plans</span>
                  </div>
                  <div className="text-2xl font-bold">{plan._count?.departmentPlans || 0}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/business-planning/annual-plans/${plan.id}`}>
                    View Details
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href={`/business-planning/dashboard?year=${plan.year}`}>
                    View Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plans.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No annual plans found</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create First Annual Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

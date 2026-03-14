'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Target, TrendingUp, Lightbulb, ArrowLeft, Edit, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AnnualPlanDetailPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    year: 0,
    theme: '',
    strategicPriorities: [] as string[],
    status: '',
  });

  const [newPriority, setNewPriority] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchPlan();
    }
  }, [params.id]);

  const fetchPlan = async () => {
    try {
      const res = await fetch(`/api/business-planning/annual-plans/${params.id}`);
      const data = await res.json();
      setPlan(data);
      setFormData({
        year: data.year,
        theme: data.theme,
        strategicPriorities: data.strategicPriorities || [],
        status: data.status,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching plan:', error);
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

  const handleUpdate = async () => {
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
      const res = await fetch(`/api/business-planning/annual-plans/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Annual Plan updated successfully',
        });
        setEditDialogOpen(false);
        fetchPlan();
      } else {
        throw new Error('Failed to update plan');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update annual plan',
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
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Annual Plan not found</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{plan.year} Annual Plan</h1>
              <Badge className={getStatusColor(plan.status)}>{plan.status}</Badge>
            </div>
            <p className="text-xl text-muted-foreground">{plan.theme}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Annual Plan</DialogTitle>
                <DialogDescription>
                  Update your strategic plan details
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
                  <Label>Strategic Priorities</Label>
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
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button asChild>
            <Link href={`/business-planning/dashboard?year=${plan.year}`}>
              View Dashboard
            </Link>
          </Button>
        </div>
      </div>

      {/* Strategic Priorities */}
      {plan.strategicPriorities && plan.strategicPriorities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Strategic Priorities</CardTitle>
            <CardDescription>Key focus areas for {plan.year}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plan.strategicPriorities.map((priority: string, index: number) => (
                <div key={index} className="flex items-start gap-3 bg-muted p-3 rounded-lg">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="flex-1">{priority}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Objectives</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plan.objectives?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Company OKRs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">KPIs</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plan.bscKPIs?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Balanced Scorecard</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Initiatives</CardTitle>
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plan.initiatives?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Strategic Projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Dept Plans</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plan.departmentPlans?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Departments</p>
          </CardContent>
        </Card>
      </div>

      {/* Objectives */}
      {plan.objectives && plan.objectives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Company Objectives</CardTitle>
            <CardDescription>OKRs for {plan.year}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {plan.objectives.map((objective: any) => (
                <div key={objective.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{objective.category}</Badge>
                        <Badge className={
                          objective.status === 'On Track' ? 'bg-green-100 text-green-800' :
                          objective.status === 'At Risk' ? 'bg-yellow-100 text-yellow-800' :
                          objective.status === 'Behind' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {objective.status}
                        </Badge>
                      </div>
                      <h4 className="font-medium">{objective.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{objective.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{objective.progress}%</div>
                      <div className="text-xs text-muted-foreground">Progress</div>
                    </div>
                  </div>
                  {objective.keyResults && objective.keyResults.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-sm font-medium">Key Results:</div>
                      {objective.keyResults.map((kr: any) => (
                        <div key={kr.id} className="text-sm bg-muted p-2 rounded flex items-center justify-between">
                          <span>{kr.title}</span>
                          <span className="text-muted-foreground">
                            {kr.currentValue} / {kr.targetValue} {kr.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="justify-start" asChild>
              <Link href={`/business-planning/objectives?annualPlanId=${plan.id}`}>
                <Target className="h-4 w-4 mr-2" />
                Manage Objectives
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href={`/business-planning/kpis?annualPlanId=${plan.id}`}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Manage KPIs
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href={`/business-planning/initiatives?annualPlanId=${plan.id}`}>
                <Lightbulb className="h-4 w-4 mr-2" />
                Manage Initiatives
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

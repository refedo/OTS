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
import { TrendingUp, Plus, DollarSign, Users, Cog, GraduationCap, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function KPIsPage() {
  const { toast } = useToast();
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    objectiveId: '',
    name: '',
    description: '',
    category: 'Financial',
    targetValue: '',
    currentValue: '0',
    unit: '',
    frequency: 'Monthly',
    ownerId: '',
    formula: '',
    status: 'On Track',
  });
  const [customCategory, setCustomCategory] = useState('');

  useEffect(() => {
    fetchKPIs();
  }, [selectedYear]);

  useEffect(() => {
    fetchUsers();
    fetchObjectives();
  }, []);

  const fetchKPIs = async () => {
    try {
      const res = await fetch(`/api/business-planning/kpis?year=${selectedYear}`);
      const data = await res.json();
      setKpis(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchObjectives = async (year?: number) => {
    try {
      const targetYear = year || selectedYear;
      const res = await fetch(`/api/business-planning/objectives?year=${targetYear}`);
      const data = await res.json();
      setObjectives(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching objectives:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.targetValue || !formData.ownerId || formData.ownerId === 'none') {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields (Name, Target Value, Owner)',
        variant: 'destructive',
      });
      return;
    }

    // Use custom category if "Custom" is selected
    const finalCategory = formData.category === 'Custom' ? customCategory : formData.category;
    
    if (formData.category === 'Custom' && !customCategory.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a custom category name',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/business-planning/kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, category: finalCategory }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'KPI created successfully',
        });
        setDialogOpen(false);
        setFormData({
          year: new Date().getFullYear(),
          objectiveId: '',
          name: '',
          description: '',
          category: 'Financial',
          targetValue: '',
          currentValue: '0',
          unit: '',
          frequency: 'Monthly',
          ownerId: '',
          formula: '',
          status: 'On Track',
        });
        setCustomCategory('');
        fetchKPIs();
      } else {
        throw new Error('Failed to create KPI');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create KPI',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Track': return 'bg-green-100 text-green-800';
      case 'At Risk': return 'bg-yellow-100 text-yellow-800';
      case 'Behind': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Financial': return DollarSign;
      case 'Customer': return Users;
      case 'Internal Process': return Cog;
      case 'Learning & Growth': return GraduationCap;
      default: return TrendingUp;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Financial': return 'border-purple-200 bg-purple-50';
      case 'Customer': return 'border-blue-200 bg-blue-50';
      case 'Internal Process': return 'border-green-200 bg-green-50';
      case 'Learning & Growth': return 'border-orange-200 bg-orange-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getTrendIcon = (current: number, target: number) => {
    const percentage = (current / target) * 100;
    if (percentage >= 90) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (percentage >= 70) return <Minus className="h-4 w-4 text-yellow-600" />;
    return <ArrowDown className="h-4 w-4 text-red-600" />;
  };

  const filteredKPIs = filter === 'all' 
    ? kpis 
    : kpis.filter(kpi => kpi.category === filter);

  // Get all unique categories from KPIs, including custom ones
  const bscCategories = ['Financial', 'Customer', 'Internal Process', 'Learning & Growth'];
  const customCategories = Array.from(new Set(
    kpis
      .map(k => k.category)
      .filter(c => c && !bscCategories.includes(c))
  )).sort();
  const categories = [...bscCategories, ...customCategories];
  const availableYears = [2024, 2025, 2026, 2027, 2028];

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
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
            <TrendingUp className="h-8 w-8" />
            Key Performance Indicators
          </h1>
          <p className="text-muted-foreground mt-2">
            Track KPIs across Balanced Scorecard perspectives and custom categories
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Year Selector */}
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New KPI
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New KPI</DialogTitle>
                <DialogDescription>
                  Define a KPI to measure strategic performance across BSC perspectives or custom categories
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Year */}
                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Select
                    value={formData.year.toString()}
                    onValueChange={(value) => {
                      const newYear = parseInt(value);
                      setFormData({ ...formData, year: newYear, objectiveId: '' });
                      fetchObjectives(newYear);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Objective (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="objective">Linked Objective (Optional)</Label>
                  <Select
                    value={formData.objectiveId || "none"}
                    onValueChange={(value) => setFormData({ ...formData, objectiveId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select objective (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {objectives.map((obj) => (
                        <SelectItem key={obj.id} value={obj.id}>
                          {obj.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {objectives.length > 0 
                      ? `${objectives.length} objective${objectives.length !== 1 ? 's' : ''} available for ${formData.year}`
                      : `No objectives found for ${formData.year}`
                    }
                  </p>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">KPI Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Revenue Growth Rate"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this KPI measures..."
                    rows={2}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      setFormData({ ...formData, category: value });
                      if (value !== 'Custom') {
                        setCustomCategory('');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Financial">Financial (BSC)</SelectItem>
                      <SelectItem value="Customer">Customer (BSC)</SelectItem>
                      <SelectItem value="Internal Process">Internal Process (BSC)</SelectItem>
                      <SelectItem value="Learning & Growth">Learning & Growth (BSC)</SelectItem>
                      {customCategories.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            Custom Categories
                          </div>
                          {customCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      <SelectItem value="Custom">+ Create New Category</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.category === 'Custom' && (
                    <Input
                      placeholder="Enter custom category name"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="mt-2"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Select a standard Balanced Scorecard perspective or create a custom category
                  </p>
                </div>

                {/* Target Value & Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetValue">Target Value *</Label>
                    <Input
                      id="targetValue"
                      type="number"
                      step="0.01"
                      value={formData.targetValue}
                      onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit *</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="%, $, count, etc."
                    />
                  </div>
                </div>

                {/* Current Value */}
                <div className="space-y-2">
                  <Label htmlFor="currentValue">Current Value</Label>
                  <Input
                    id="currentValue"
                    type="number"
                    step="0.01"
                    value={formData.currentValue}
                    onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                    placeholder="0"
                  />
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <Label htmlFor="frequency">Measurement Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Owner */}
                <div className="space-y-2">
                  <Label htmlFor="owner">Owner *</Label>
                  <Select
                    value={formData.ownerId || "none"}
                    onValueChange={(value) => setFormData({ ...formData, ownerId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select owner...</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} - {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Formula */}
                <div className="space-y-2">
                  <Label htmlFor="formula">Formula / Data Source</Label>
                  <Textarea
                    id="formula"
                    value={formData.formula}
                    onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                    placeholder="e.g., (Current Year Revenue - Previous Year Revenue) / Previous Year Revenue * 100"
                    rows={2}
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
                      <SelectItem value="On Track">On Track</SelectItem>
                      <SelectItem value="At Risk">At Risk</SelectItem>
                      <SelectItem value="Behind">Behind</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Creating...' : 'Create KPI'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((category) => {
          const categoryKPIs = kpis.filter(k => k.category === category);
          const Icon = getCategoryIcon(category);
          const isBSC = bscCategories.includes(category);
          return (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{category}</span>
                  {!isBSC && (
                    <Badge variant="outline" className="text-xs">Custom</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categoryKPIs.length}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {categoryKPIs.filter(k => k.status === 'On Track').length} on track
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All KPIs
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={filter === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* KPIs by Category */}
      {filter === 'all' ? (
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryKPIs = kpis.filter(k => k.category === category);
            const Icon = getCategoryIcon(category);
            
            if (categoryKPIs.length === 0) return null;

            return (
              <div key={category}>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {category}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryKPIs.map((kpi) => (
                    <Card key={kpi.id} className={getCategoryColor(category)}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{kpi.name}</CardTitle>
                            <CardDescription className="mt-1">{kpi.description}</CardDescription>
                          </div>
                          <Badge className={getStatusColor(kpi.status)}>
                            {kpi.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Current vs Target */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-muted-foreground">Current</div>
                            <div className="text-2xl font-bold">
                              {kpi.currentValue} {kpi.unit}
                            </div>
                          </div>
                          <div className="text-center">
                            {getTrendIcon(kpi.currentValue, kpi.targetValue)}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Target</div>
                            <div className="text-2xl font-bold text-muted-foreground">
                              {kpi.targetValue} {kpi.unit}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>{Math.round((kpi.currentValue / kpi.targetValue) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                kpi.status === 'On Track' ? 'bg-green-500' :
                                kpi.status === 'At Risk' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min((kpi.currentValue / kpi.targetValue) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <span>{kpi.frequency}</span>
                          <span>Owner: {kpi.owner?.name}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredKPIs.map((kpi) => (
            <Card key={kpi.id} className={getCategoryColor(kpi.category)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{kpi.name}</CardTitle>
                    <CardDescription className="mt-1">{kpi.description}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(kpi.status)}>
                    {kpi.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Current</div>
                    <div className="text-2xl font-bold">
                      {kpi.currentValue} {kpi.unit}
                    </div>
                  </div>
                  <div className="text-center">
                    {getTrendIcon(kpi.currentValue, kpi.targetValue)}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Target</div>
                    <div className="text-2xl font-bold text-muted-foreground">
                      {kpi.targetValue} {kpi.unit}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Progress</span>
                    <span>{Math.round((kpi.currentValue / kpi.targetValue) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        kpi.status === 'On Track' ? 'bg-green-500' :
                        kpi.status === 'At Risk' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((kpi.currentValue / kpi.targetValue) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>{kpi.frequency}</span>
                  <span>Owner: {kpi.owner?.name}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredKPIs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No KPIs found</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create First KPI
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

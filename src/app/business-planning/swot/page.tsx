'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Activity, Save, Plus, X, TrendingUp, TrendingDown, AlertCircle, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SwotAnalysisPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [swot, setSwot] = useState<any>({
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
    strategies: [],
  });

  const [newItem, setNewItem] = useState({
    strength: '',
    weakness: '',
    opportunity: '',
    threat: '',
    strategy: '',
  });

  useEffect(() => {
    fetchSwot();
  }, [year]);

  const fetchSwot = async () => {
    try {
      const res = await fetch(`/api/business-planning/swot?year=${year}`);
      const data = await res.json();
      if (data && data.id) {
        setSwot(data);
      } else {
        setSwot({
          strengths: [],
          weaknesses: [],
          opportunities: [],
          threats: [],
          strategies: [],
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching SWOT:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/business-planning/swot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...swot, year }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'SWOT Analysis saved successfully',
        });
        fetchSwot();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save SWOT Analysis',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addItem = (category: 'strengths' | 'weaknesses' | 'opportunities' | 'threats' | 'strategies', value: string) => {
    if (value.trim()) {
      setSwot({
        ...swot,
        [category]: [...(swot[category] || []), value.trim()],
      });
      setNewItem({ ...newItem, [category.slice(0, -1)]: '' });
    }
  };

  const removeItem = (category: string, index: number) => {
    setSwot({
      ...swot,
      [category]: swot[category].filter((_: any, i: number) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
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
            <Activity className="h-8 w-8" />
            SWOT Analysis
          </h1>
          <p className="text-muted-foreground mt-2">
            Strategic analysis for year {year}
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-24"
          />
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* SWOT Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <Card className="border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <TrendingUp className="h-5 w-5" />
              Strengths
            </CardTitle>
            <CardDescription>Internal positive attributes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Input
                value={newItem.strength}
                onChange={(e) => setNewItem({ ...newItem, strength: e.target.value })}
                placeholder="Add a strength..."
                onKeyPress={(e) => e.key === 'Enter' && addItem('strengths', newItem.strength)}
              />
              <Button onClick={() => addItem('strengths', newItem.strength)} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {swot.strengths?.map((item: string, index: number) => (
                <div key={index} className="flex items-start justify-between bg-green-50 p-3 rounded-lg">
                  <span className="text-sm flex-1">{item}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem('strengths', index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card className="border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <TrendingDown className="h-5 w-5" />
              Weaknesses
            </CardTitle>
            <CardDescription>Internal areas for improvement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Input
                value={newItem.weakness}
                onChange={(e) => setNewItem({ ...newItem, weakness: e.target.value })}
                placeholder="Add a weakness..."
                onKeyPress={(e) => e.key === 'Enter' && addItem('weaknesses', newItem.weakness)}
              />
              <Button onClick={() => addItem('weaknesses', newItem.weakness)} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {swot.weaknesses?.map((item: string, index: number) => (
                <div key={index} className="flex items-start justify-between bg-red-50 p-3 rounded-lg">
                  <span className="text-sm flex-1">{item}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem('weaknesses', index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Opportunities */}
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Lightbulb className="h-5 w-5" />
              Opportunities
            </CardTitle>
            <CardDescription>External favorable conditions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Input
                value={newItem.opportunity}
                onChange={(e) => setNewItem({ ...newItem, opportunity: e.target.value })}
                placeholder="Add an opportunity..."
                onKeyPress={(e) => e.key === 'Enter' && addItem('opportunities', newItem.opportunity)}
              />
              <Button onClick={() => addItem('opportunities', newItem.opportunity)} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {swot.opportunities?.map((item: string, index: number) => (
                <div key={index} className="flex items-start justify-between bg-blue-50 p-3 rounded-lg">
                  <span className="text-sm flex-1">{item}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem('opportunities', index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Threats */}
        <Card className="border-yellow-200">
          <CardHeader className="bg-yellow-50">
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="h-5 w-5" />
              Threats
            </CardTitle>
            <CardDescription>External challenges and risks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Input
                value={newItem.threat}
                onChange={(e) => setNewItem({ ...newItem, threat: e.target.value })}
                placeholder="Add a threat..."
                onKeyPress={(e) => e.key === 'Enter' && addItem('threats', newItem.threat)}
              />
              <Button onClick={() => addItem('threats', newItem.threat)} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {swot.threats?.map((item: string, index: number) => (
                <div key={index} className="flex items-start justify-between bg-yellow-50 p-3 rounded-lg">
                  <span className="text-sm flex-1">{item}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem('threats', index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Strategies */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Strategies</CardTitle>
          <CardDescription>Strategic actions based on SWOT analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newItem.strategy}
              onChange={(e) => setNewItem({ ...newItem, strategy: e.target.value })}
              placeholder="Add a strategy..."
              onKeyPress={(e) => e.key === 'Enter' && addItem('strategies', newItem.strategy)}
            />
            <Button onClick={() => addItem('strategies', newItem.strategy)} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {swot.strategies?.map((item: string, index: number) => (
              <div key={index} className="flex items-start justify-between bg-muted p-3 rounded-lg">
                <span className="flex-1">{item}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem('strategies', index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save SWOT Analysis'}
        </Button>
      </div>
    </div>
  );
}

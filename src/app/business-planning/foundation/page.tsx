'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, Save, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function StrategicFoundationPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [foundation, setFoundation] = useState<any>({
    vision: '',
    mission: '',
    coreValues: [],
    bhag: '',
    threeYearOutlook: '',
    strategicPillars: [],
  });

  const [newValue, setNewValue] = useState('');
  const [newPillar, setNewPillar] = useState('');

  useEffect(() => {
    fetchFoundation();
  }, []);

  const fetchFoundation = async () => {
    try {
      const res = await fetch('/api/business-planning/strategic-foundation');
      const data = await res.json();
      if (data && data.id) {
        setFoundation(data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching foundation:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/business-planning/strategic-foundation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(foundation),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Strategic Foundation saved successfully',
        });
        fetchFoundation();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save Strategic Foundation',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addCoreValue = () => {
    if (newValue.trim()) {
      setFoundation({
        ...foundation,
        coreValues: [...(foundation.coreValues || []), newValue.trim()],
      });
      setNewValue('');
    }
  };

  const removeCoreValue = (index: number) => {
    setFoundation({
      ...foundation,
      coreValues: foundation.coreValues.filter((_: any, i: number) => i !== index),
    });
  };

  const addPillar = () => {
    if (newPillar.trim()) {
      setFoundation({
        ...foundation,
        strategicPillars: [...(foundation.strategicPillars || []), newPillar.trim()],
      });
      setNewPillar('');
    }
  };

  const removePillar = (index: number) => {
    setFoundation({
      ...foundation,
      strategicPillars: foundation.strategicPillars.filter((_: any, i: number) => i !== index),
    });
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

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8" />
            Strategic Foundation
          </h1>
          <p className="text-muted-foreground mt-2">
            Define your company's long-term vision, mission, and core values
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Vision */}
      <Card>
        <CardHeader>
          <CardTitle>Vision Statement</CardTitle>
          <CardDescription>Where do you want to be in the future?</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={foundation.vision || ''}
            onChange={(e) => setFoundation({ ...foundation, vision: e.target.value })}
            placeholder="Enter your vision statement..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Mission */}
      <Card>
        <CardHeader>
          <CardTitle>Mission Statement</CardTitle>
          <CardDescription>What is your purpose and how do you achieve it?</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={foundation.mission || ''}
            onChange={(e) => setFoundation({ ...foundation, mission: e.target.value })}
            placeholder="Enter your mission statement..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Core Values */}
      <Card>
        <CardHeader>
          <CardTitle>Core Values (DNA)</CardTitle>
          <CardDescription>What principles guide your decisions and actions?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Add a core value..."
              onKeyPress={(e) => e.key === 'Enter' && addCoreValue()}
            />
            <Button onClick={addCoreValue} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {foundation.coreValues?.map((value: string, index: number) => (
              <div key={index} className="flex items-center justify-between bg-muted p-3 rounded-lg">
                <span>{value}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCoreValue(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* BHAG */}
      <Card>
        <CardHeader>
          <CardTitle>BHAG (Big Hairy Audacious Goal)</CardTitle>
          <CardDescription>Your 10-25 year ambitious target</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={foundation.bhag || ''}
            onChange={(e) => setFoundation({ ...foundation, bhag: e.target.value })}
            placeholder="Enter your BHAG..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* 3-Year Outlook */}
      <Card>
        <CardHeader>
          <CardTitle>3-Year Outlook</CardTitle>
          <CardDescription>Where will you be in 3 years?</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={foundation.threeYearOutlook || ''}
            onChange={(e) => setFoundation({ ...foundation, threeYearOutlook: e.target.value })}
            placeholder="Enter your 3-year outlook..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Strategic Pillars */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Pillars</CardTitle>
          <CardDescription>Key focus areas that support your strategy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newPillar}
              onChange={(e) => setNewPillar(e.target.value)}
              placeholder="Add a strategic pillar..."
              onKeyPress={(e) => e.key === 'Enter' && addPillar()}
            />
            <Button onClick={addPillar} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {foundation.strategicPillars?.map((pillar: string, index: number) => (
              <div key={index} className="flex items-center justify-between bg-muted p-3 rounded-lg">
                <span>{pillar}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePillar(index)}
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
          {saving ? 'Saving...' : 'Save Strategic Foundation'}
        </Button>
      </div>
    </div>
  );
}

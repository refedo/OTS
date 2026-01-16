'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ProjectSummaryData {
  total: number;
  active: number;
  completed: number;
  delayed: number;
  weeklyProgress: number;
  weeklyWeightProduced: number;
}

export default function ProjectSummaryWidget() {
  const [data, setData] = useState<ProjectSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/projects/summary');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load project data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-blue-600" />
            Project Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-blue-600" />
            Project Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error || 'No data available'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link href="/projects">
      <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-blue-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="size-5 text-blue-600" />
            Project Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Projects</p>
              <p className="text-3xl font-bold">{data.total}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-3xl font-bold text-green-600">{data.active}</p>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
            <div className="flex items-center justify-between p-2 rounded-lg bg-green-50">
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-semibold text-green-700">{data.completed}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-red-50">
              <div>
                <p className="text-xs text-muted-foreground">Delayed</p>
                <p className="text-lg font-semibold text-red-700">{data.delayed}</p>
              </div>
            </div>
          </div>

          {/* Weekly Progress Indicator */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Weekly Production</span>
              <div className="flex items-center gap-1">
                {data.weeklyProgress >= 0 ? (
                  <TrendingUp className="size-4 text-green-600" />
                ) : (
                  <TrendingDown className="size-4 text-red-600" />
                )}
                <span className={`text-sm font-semibold ${
                  data.weeklyProgress >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {data.weeklyProgress > 0 ? '+' : ''}{data.weeklyProgress}%
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.weeklyWeightProduced.toLocaleString()} kg this week
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

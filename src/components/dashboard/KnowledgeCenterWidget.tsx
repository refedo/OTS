'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface KnowledgeStats {
  total: number;
  validated: number;
  openChallenges: number;
  byType: Record<string, number>;
  byProcess: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  recent: Array<{
    id: string;
    type: string;
    title: string;
    severity: string;
    status: string;
    createdAt: string;
  }>;
}

export function KnowledgeCenterWidget() {
  const router = useRouter();
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/knowledge/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching knowledge stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Knowledge Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Knowledge Center
            </CardTitle>
            <CardDescription>Operational memory and intelligence</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/knowledge-center')}
          >
            View All
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Entries</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-600">{stats.validated}</p>
            <p className="text-xs text-muted-foreground">Validated</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-orange-600">{stats.openChallenges}</p>
            <p className="text-xs text-muted-foreground">Open Challenges</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">By Type</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <span className="text-sm">{type.replace('_', ' ')}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">By Severity</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(stats.bySeverity).map(([severity, count]) => (
              <div key={severity} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <span className="text-sm">{severity}</span>
                <Badge className={getSeverityColor(severity)}>{count}</Badge>
              </div>
            ))}
          </div>
        </div>

        {stats.recent && stats.recent.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Recent Entries</h4>
            <div className="space-y-2">
              {stats.recent.slice(0, 3).map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => router.push(`/knowledge-center/${entry.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {entry.type.replace('_', ' ')}
                        </Badge>
                        <Badge className={`text-xs ${getSeverityColor(entry.severity)}`}>
                          {entry.severity}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push('/knowledge-center/new')}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Create New Entry
        </Button>
      </CardContent>
    </Card>
  );
}

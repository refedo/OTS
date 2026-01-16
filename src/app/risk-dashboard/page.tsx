'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  Users,
  Package,
  TrendingDown,
  GitBranch,
  RefreshCw,
  Loader2,
  ChevronRight,
  ExternalLink,
  Filter,
  Zap,
} from 'lucide-react';

interface AffectedItem {
  type: string;
  id: string;
  name: string;
  link: string;
}

interface Project {
  id: string;
  projectNumber: string;
  name: string;
}

interface LeadingIndicator {
  id: string;
  level: 'critical' | 'high' | 'medium' | 'low';
  category: 'task_delay' | 'cascade_risk' | 'resource_overload' | 'procurement_risk' | 'schedule_slip';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  affectedItems: AffectedItem[];
  project?: Project;
  detectedAt: string;
  daysUntilImpact?: number;
  metadata?: Record<string, unknown>;
}

interface LeadingIndicatorsSummary {
  totalRisks: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byCategory: {
    task_delay: number;
    cascade_risk: number;
    resource_overload: number;
    procurement_risk: number;
    schedule_slip: number;
  };
  indicators: LeadingIndicator[];
  generatedAt: string;
}

const levelConfig = {
  critical: { 
    color: 'bg-red-100 text-red-800 border-red-300', 
    bgColor: 'bg-red-50',
    icon: AlertTriangle, 
    iconColor: 'text-red-600',
    label: 'Critical',
    dot: 'bg-red-500',
  },
  high: { 
    color: 'bg-orange-100 text-orange-800 border-orange-300', 
    bgColor: 'bg-orange-50',
    icon: AlertCircle, 
    iconColor: 'text-orange-600',
    label: 'High',
    dot: 'bg-orange-500',
  },
  medium: { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
    bgColor: 'bg-yellow-50',
    icon: AlertCircle, 
    iconColor: 'text-yellow-600',
    label: 'Medium',
    dot: 'bg-yellow-500',
  },
  low: { 
    color: 'bg-blue-100 text-blue-800 border-blue-300', 
    bgColor: 'bg-blue-50',
    icon: AlertCircle, 
    iconColor: 'text-blue-600',
    label: 'Low',
    dot: 'bg-blue-500',
  },
};

const categoryConfig = {
  task_delay: { 
    icon: Clock, 
    label: 'Task Delay', 
    description: 'Tasks not started but due soon',
    color: 'text-red-600',
  },
  cascade_risk: { 
    icon: GitBranch, 
    label: 'Cascade Risk', 
    description: 'Upstream delays affecting downstream',
    color: 'text-purple-600',
  },
  resource_overload: { 
    icon: Users, 
    label: 'Resource Overload', 
    description: 'Team members with too many tasks',
    color: 'text-orange-600',
  },
  procurement_risk: { 
    icon: Package, 
    label: 'Procurement Risk', 
    description: 'Materials not ready for upcoming work',
    color: 'text-blue-600',
  },
  schedule_slip: { 
    icon: TrendingDown, 
    label: 'Schedule Slip', 
    description: 'Behind planned progress',
    color: 'text-yellow-600',
  },
  capacity_overload: { 
    icon: TrendingDown, 
    label: 'Capacity Overload', 
    description: 'Production capacity exceeded',
    color: 'text-red-600',
  },
};

export default function RiskDashboardPage() {
  const [data, setData] = useState<LeadingIndicatorsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/leading-indicators');
      if (!response.ok) {
        throw new Error('Failed to fetch risk data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredIndicators = data?.indicators.filter(indicator => {
    if (selectedCategory && indicator.category !== selectedCategory) return false;
    if (selectedLevel && indicator.level !== selectedLevel) return false;
    return true;
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Analyzing risks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500" />
          <p className="mt-2 text-red-600">{error}</p>
          <Button onClick={fetchData} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Zap className="h-8 w-8 text-yellow-500" />
            Early Warning System
          </h1>
          <p className="text-muted-foreground mt-1">
            Leading indicators - detect problems before they happen
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${selectedLevel === null ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
          onClick={() => setSelectedLevel(null)}
        >
          <CardContent className="pt-6">
            <div className="text-4xl font-bold">{data.totalRisks}</div>
            <p className="text-sm text-muted-foreground">Total Risks</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all border-red-200 ${selectedLevel === 'critical' ? 'ring-2 ring-red-500' : 'hover:shadow-md'}`}
          onClick={() => setSelectedLevel(selectedLevel === 'critical' ? null : 'critical')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-4xl font-bold text-red-600">{data.critical}</span>
            </div>
            <p className="text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all border-orange-200 ${selectedLevel === 'high' ? 'ring-2 ring-orange-500' : 'hover:shadow-md'}`}
          onClick={() => setSelectedLevel(selectedLevel === 'high' ? null : 'high')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-4xl font-bold text-orange-600">{data.high}</span>
            </div>
            <p className="text-sm text-muted-foreground">High</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all border-yellow-200 ${selectedLevel === 'medium' ? 'ring-2 ring-yellow-500' : 'hover:shadow-md'}`}
          onClick={() => setSelectedLevel(selectedLevel === 'medium' ? null : 'medium')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-4xl font-bold text-yellow-600">{data.medium}</span>
            </div>
            <p className="text-sm text-muted-foreground">Medium</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all border-blue-200 ${selectedLevel === 'low' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
          onClick={() => setSelectedLevel(selectedLevel === 'low' ? null : 'low')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-4xl font-bold text-blue-600">{data.low}</span>
            </div>
            <p className="text-sm text-muted-foreground">Low</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All ({data.totalRisks})
            </Button>
            {Object.entries(categoryConfig).map(([key, config]) => {
              const count = data.byCategory[key as keyof typeof data.byCategory];
              const Icon = config.icon;
              return (
                <Button
                  key={key}
                  variant={selectedCategory === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                  className="gap-2"
                >
                  <Icon className={`h-4 w-4 ${selectedCategory !== key ? config.color : ''}`} />
                  {config.label} ({count})
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Risk List */}
      <div className="space-y-4">
        {filteredIndicators.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-green-700">No Risks Detected</h3>
              <p className="text-muted-foreground mt-1">
                {selectedCategory || selectedLevel 
                  ? 'No risks match your current filters.'
                  : 'All systems operating normally. Great job!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredIndicators.map((indicator) => {
            const levelCfg = levelConfig[indicator.level];
            const categoryCfg = categoryConfig[indicator.category];
            const LevelIcon = levelCfg.icon;
            const CategoryIcon = categoryCfg.icon;
            
            return (
              <Card 
                key={indicator.id} 
                className={`border-l-4 ${indicator.level === 'critical' ? 'border-l-red-500' : indicator.level === 'high' ? 'border-l-orange-500' : indicator.level === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'}`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${levelCfg.bgColor}`}>
                      <LevelIcon className={`h-6 w-6 ${levelCfg.iconColor}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{indicator.title}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${levelCfg.color}`}>
                              {levelCfg.label}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CategoryIcon className={`h-3 w-3 ${categoryCfg.color}`} />
                              {categoryCfg.label}
                            </span>
                          </div>
                          {indicator.project && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Project: {indicator.project.projectNumber} - {indicator.project.name}
                            </p>
                          )}
                        </div>
                        {indicator.daysUntilImpact !== undefined && indicator.daysUntilImpact >= 0 && (
                          <div className="text-right shrink-0">
                            <div className={`text-2xl font-bold ${indicator.daysUntilImpact <= 3 ? 'text-red-600' : indicator.daysUntilImpact <= 7 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                              {indicator.daysUntilImpact}
                            </div>
                            <div className="text-xs text-muted-foreground">days until impact</div>
                          </div>
                        )}
                      </div>
                      
                      {/* Description */}
                      <p className="mt-3 text-sm">{indicator.description}</p>
                      
                      {/* Impact & Recommendation */}
                      <div className="mt-4 grid md:grid-cols-2 gap-4">
                        <div className="bg-red-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-red-800 mb-1">Impact</div>
                          <p className="text-sm text-red-700">{indicator.impact}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-800 mb-1">Recommendation</div>
                          <p className="text-sm text-green-700">{indicator.recommendation}</p>
                        </div>
                      </div>
                      
                      {/* Affected Items */}
                      {indicator.affectedItems.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs font-medium text-muted-foreground mb-2">Affected Items</div>
                          <div className="flex flex-wrap gap-2">
                            {indicator.affectedItems.slice(0, 5).map((item, idx) => (
                              <Link 
                                key={idx} 
                                href={item.link}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs hover:bg-muted/80 transition-colors"
                              >
                                {item.type}: {item.name}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ))}
                            {indicator.affectedItems.length > 5 && (
                              <span className="px-2 py-1 text-xs text-muted-foreground">
                                +{indicator.affectedItems.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {new Date(data.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionValidator } from '@/hooks/use-session-validator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Target, Zap, Eye, RefreshCw } from 'lucide-react';

interface CEOInsights {
  strategicSnapshot: {
    totalItems: number;
    approvedItems: number;
    notApprovedItems: number;
    highCriticalPriority: number;
    complianceItems: number;
    techDebtPercentage: string;
  };
  priorityRadar: Array<{
    id: string;
    code: string;
    title: string;
    priority: string;
    status: string;
    riskLevel: string;
    type: string;
    category: string;
    hasNoTasks: boolean;
    approvedButNotPlanned: boolean;
    inProgressTooLong: boolean;
  }>;
  whyDashboard: {
    [key: string]: number;
  };
  investmentInsight: {
    byCategory: Array<{ category: string; count: number; percentage: string }>;
    byType: Array<{ type: string; count: number; percentage: string }>;
    byModule: Array<{ module: string; count: number; percentage: string }>;
  };
  silentOperationsHealth: {
    automationPercentage: string;
    visibilityPercentage: string;
    manualReductionFocus: number;
  };
}

export default function CEOControlCenter() {
  const { isValidating } = useSessionValidator();
  const router = useRouter();
  const [insights, setInsights] = useState<CEOInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCEOInsights();
  }, []);

  const fetchCEOInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/backlog/ceo-insights');
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      } else if (response.status === 403) {
        setError('Access denied. This page is for CEO only.');
      } else {
        setError('Failed to load insights');
      }
    } catch (error) {
      console.error('Error fetching CEO insights:', error);
      setError('Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  if (isValidating || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading CEO insights...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
          <Card className="max-w-md mx-auto mt-20">
            <CardHeader>
              <CardTitle className="text-destructive">Access Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">CEO Control Center</h1>
          <p className="text-muted-foreground">
            Strategic oversight of system evolution and product backlog
          </p>
        </div>

        {/* Section 1: Strategic Snapshot */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Strategic Snapshot</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Total Items</div>
                <div className="text-3xl font-bold">{insights.strategicSnapshot.totalItems}</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="text-sm text-green-700 mb-1">Approved</div>
                <div className="text-3xl font-bold text-green-600">{insights.strategicSnapshot.approvedItems}</div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="pt-6">
                <div className="text-sm text-yellow-700 mb-1">Not Approved</div>
                <div className="text-3xl font-bold text-yellow-600">{insights.strategicSnapshot.notApprovedItems}</div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="pt-6">
                <div className="text-sm text-orange-700 mb-1">High/Critical</div>
                <div className="text-3xl font-bold text-orange-600">{insights.strategicSnapshot.highCriticalPriority}</div>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="pt-6">
                <div className="text-sm text-purple-700 mb-1">Compliance</div>
                <div className="text-3xl font-bold text-purple-600">{insights.strategicSnapshot.complianceItems}</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="pt-6">
                <div className="text-sm text-red-700 mb-1">Tech Debt</div>
                <div className="text-3xl font-bold text-red-600">{insights.strategicSnapshot.techDebtPercentage}%</div>
              </CardContent>
            </Card>
          </div>
        </div>

          {/* Section 2: Priority Radar */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Priority Radar</h2>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-200">
                <p className="text-sm text-gray-700">
                  Top 10 items requiring attention - High & Critical priority items with risk indicators
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alerts</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {insights.priorityRadar.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          No high or critical priority items at this time
                        </td>
                      </tr>
                    ) : (
                      insights.priorityRadar.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/backlog/${item.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.code}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.title}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {item.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.status.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                              item.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {item.riskLevel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex flex-col gap-1">
                              {item.hasNoTasks && item.status === 'APPROVED' && (
                                <span className="text-xs text-orange-600">⚠️ No tasks created</span>
                              )}
                              {item.approvedButNotPlanned && (
                                <span className="text-xs text-yellow-600">⚠️ Approved but not planned</span>
                              )}
                              {item.inProgressTooLong && (
                                <span className="text-xs text-red-600">⚠️ In progress &gt; 30 days</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 3: WHY Dashboard */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">WHY Dashboard</h2>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm p-6 border-2 border-blue-200">
              <p className="text-sm text-gray-700 mb-6">
                Understanding <strong>why</strong> the system is evolving - grouped by business reason themes
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                {Object.entries(insights.whyDashboard).map(([theme, count]) => (
                  <div key={theme} className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">{count}</div>
                    <div className="text-xs text-gray-600 mt-1">{theme}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Investment Insight */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Investment Insight</h2>
            <p className="text-sm text-gray-600 mb-4">Where are we investing our system effort?</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* By Category */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">By Category</h3>
                <div className="space-y-3">
                  {insights.investmentInsight.byCategory.map((item) => (
                    <div key={item.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{item.category.replace('_', ' ')}</span>
                        <span className="font-medium text-gray-900">{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Type */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">By Type</h3>
                <div className="space-y-3">
                  {insights.investmentInsight.byType.map((item) => (
                    <div key={item.type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{item.type.replace('_', ' ')}</span>
                        <span className="font-medium text-gray-900">{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Module */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">By Module</h3>
                <div className="space-y-3">
                  {insights.investmentInsight.byModule.slice(0, 8).map((item) => (
                    <div key={item.module}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{item.module}</span>
                        <span className="font-medium text-gray-900">{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Silent Operations Health */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Silent Operations Health</h2>
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg shadow-sm p-6 border-2 border-emerald-200">
              <p className="text-sm text-gray-700 mb-6">
                Indicators of progress toward silent, self-managing operations
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="text-sm text-gray-600 mb-2">Automation Focus</div>
                  <div className="text-4xl font-bold text-emerald-600 mb-2">
                    {insights.silentOperationsHealth.automationPercentage}%
                  </div>
                  <div className="text-xs text-gray-500">
                    of backlog linked to automation & manual reduction
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="text-sm text-gray-600 mb-2">Visibility & Prediction</div>
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {insights.silentOperationsHealth.visibilityPercentage}%
                  </div>
                  <div className="text-xs text-gray-500">
                    of backlog improving tracking & prediction
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="text-sm text-gray-600 mb-2">Manual Reduction Items</div>
                  <div className="text-4xl font-bold text-teal-600 mb-2">
                    {insights.silentOperationsHealth.manualReductionFocus}
                  </div>
                  <div className="text-xs text-gray-500">
                    items focused on reducing manual effort
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={() => router.push('/backlog')}>
                View Full Backlog
              </Button>
              <Button variant="outline" onClick={fetchCEOInsights}>
                <RefreshCw className="size-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

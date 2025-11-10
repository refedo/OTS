'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Loader2, RefreshCw } from 'lucide-react';

type KPIScore = {
  id: string;
  value: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  kpiDefinition: {
    id: string;
    code: string;
    name: string;
    unit: string | null;
    target: number | null;
  };
};

type Alert = {
  id: string;
  level: string;
  message: string;
  createdAt: string;
  kpiDefinition: {
    code: string;
    name: string;
  };
};

type DashboardData = {
  summary: {
    totalKPIs: number;
    okCount: number;
    warningCount: number;
    criticalCount: number;
    activeAlerts: number;
  };
  scores: KPIScore[];
  alerts: Alert[];
  trendData: any[];
};

export default function KPIDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState('company');

  useEffect(() => {
    fetchDashboard();
  }, [entityType]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/kpi/dashboard?entityType=${entityType}`);
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      ok: <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">OK</span>,
      warning: <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Warning</span>,
      critical: <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Critical</span>,
    };
    return badges[status] || <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
  };

  const calculatePercentage = (value: number, target: number | null) => {
    if (!target) return null;
    return ((value / target) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="text-center p-8">
          <p className="text-muted-foreground">No dashboard data available</p>
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
            <Activity className="h-8 w-8" />
            KPI Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Performance metrics and key indicators
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="h-10 px-3 rounded-md border bg-background"
          >
            <option value="company">Company-Wide</option>
            <option value="department">My Department</option>
            <option value="user">My Performance</option>
          </select>
          <Button onClick={fetchDashboard} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{data.summary.totalKPIs}</div>
            <p className="text-xs text-muted-foreground">Total KPIs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{data.summary.okCount}</div>
            <p className="text-xs text-muted-foreground">OK</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{data.summary.warningCount}</div>
            <p className="text-xs text-muted-foreground">Warning</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{data.summary.criticalCount}</div>
            <p className="text-xs text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{data.summary.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">Active Alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {data.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Active Alerts ({data.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    alert.level === 'critical'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          alert.level === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {alert.level.toUpperCase()}
                        </span>
                        <span className="font-medium text-sm">{alert.kpiDefinition.name}</span>
                      </div>
                      <p className="text-sm mt-1 text-muted-foreground">{alert.message}</p>
                      <p className="text-xs mt-1 text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Acknowledge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.scores.map((score) => {
          const percentage = calculatePercentage(score.value, score.kpiDefinition.target);
          const trend = percentage ? (parseFloat(percentage) >= 90 ? 'up' : 'down') : null;

          return (
            <Card key={score.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{score.kpiDefinition.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{score.kpiDefinition.code}</p>
                  </div>
                  {getStatusIcon(score.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">
                        {score.value.toFixed(2)}
                      </span>
                      {score.kpiDefinition.unit && (
                        <span className="text-sm text-muted-foreground">
                          {score.kpiDefinition.unit}
                        </span>
                      )}
                      {trend && (
                        trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )
                      )}
                    </div>
                    {score.kpiDefinition.target && (
                      <div className="mt-1 text-sm text-muted-foreground">
                        Target: {score.kpiDefinition.target} {score.kpiDefinition.unit}
                        {percentage && (
                          <span className={`ml-2 font-medium ${
                            parseFloat(percentage) >= 90 ? 'text-green-600' :
                            parseFloat(percentage) >= 70 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            ({percentage}%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {getStatusBadge(score.status)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(score.periodEnd).toLocaleDateString()}
                    </span>
                  </div>

                  {score.kpiDefinition.target && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          score.status === 'ok' ? 'bg-green-600' :
                          score.status === 'warning' ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}
                        style={{
                          width: `${Math.min(100, (score.value / score.kpiDefinition.target) * 100)}%`
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {data.scores.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              No KPI scores available for this view
            </p>
            <Button onClick={fetchDashboard}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

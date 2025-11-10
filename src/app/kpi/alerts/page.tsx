'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Loader2, Filter } from 'lucide-react';

type Alert = {
  id: string;
  level: string;
  message: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  kpiDefinition: {
    code: string;
    name: string;
    unit: string | null;
  };
  acknowledger: {
    name: string;
  } | null;
};

export default function KPIAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unacknowledged');
  const [levelFilter, setLevelFilter] = useState('all');

  useEffect(() => {
    fetchAlerts();
  }, [filter, levelFilter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter === 'unacknowledged') {
        params.append('acknowledged', 'false');
      } else if (filter === 'acknowledged') {
        params.append('acknowledged', 'true');
      }
      if (levelFilter !== 'all') {
        params.append('level', levelFilter);
      }

      const response = await fetch(`/api/kpi/alerts?${params}`);
      if (response.ok) {
        setAlerts(await response.json());
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await fetch(`/api/kpi/alerts/${alertId}/acknowledge`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        fetchAlerts();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to acknowledge alert');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to acknowledge alert');
    }
  };

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.level === 'critical').length,
    warning: alerts.filter(a => a.level === 'warning').length,
    unacknowledged: alerts.filter(a => !a.acknowledgedBy).length,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8" />
            KPI Alerts
          </h1>
          <p className="text-muted-foreground mt-1">
            Threshold breach notifications and warnings
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Alerts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
            <p className="text-xs text-muted-foreground">Warning</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.unacknowledged}</div>
            <p className="text-xs text-muted-foreground">Unacknowledged</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 px-3 rounded-md border bg-background"
            >
              <option value="all">All Alerts</option>
              <option value="unacknowledged">Unacknowledged</option>
              <option value="acknowledged">Acknowledged</option>
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="h-10 px-3 rounded-md border bg-background"
            >
              <option value="all">All Levels</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card
            key={alert.id}
            className={`${
              alert.level === 'critical'
                ? 'border-red-200 bg-red-50'
                : 'border-yellow-200 bg-yellow-50'
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        alert.level === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {alert.level.toUpperCase()}
                    </span>
                    <span className="font-semibold">{alert.kpiDefinition.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({alert.kpiDefinition.code})
                    </span>
                  </div>

                  <p className="text-sm mb-2">{alert.message}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Entity: {alert.entityType}
                    </span>
                    <span>•</span>
                    <span>
                      Created: {new Date(alert.createdAt).toLocaleString()}
                    </span>
                    {alert.acknowledgedBy && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          Acknowledged by {alert.acknowledger?.name} on{' '}
                          {new Date(alert.acknowledgedAt!).toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {!alert.acknowledgedBy && (
                  <Button
                    size="sm"
                    onClick={() => handleAcknowledge(alert.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Acknowledge
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600 opacity-50" />
            <p className="text-muted-foreground mb-2">
              {filter === 'unacknowledged'
                ? 'No unacknowledged alerts'
                : 'No alerts found'}
            </p>
            <p className="text-sm text-muted-foreground">
              All KPIs are performing within acceptable thresholds
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

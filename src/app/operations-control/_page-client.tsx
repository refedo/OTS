'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, RefreshCw, Clock, Zap, Link2, Gauge } from 'lucide-react';

interface RiskEvent {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'DELAY' | 'BOTTLENECK' | 'DEPENDENCY' | 'OVERLOAD';
  reason: string;
  recommendedAction: string;
  affectedProjects: string[];
  detectedAt: string;
}

interface AffectedProject {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
  clientName: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface PriorityAction {
  riskId: string;
  severity: string;
  type: string;
  action: string;
}

interface OperationsControlData {
  summary: {
    totalRisks: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    byType: {
      delay: number;
      bottleneck: number;
      dependency: number;
      overload: number;
    };
    affectedProjectCount: number;
  };
  risks: RiskEvent[];
  affectedProjects: AffectedProject[];
  priorityActions: PriorityAction[];
  generatedAt: string;
}

const severityConfig = {
  CRITICAL: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle, iconColor: 'text-red-600' },
  HIGH: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle, iconColor: 'text-orange-600' },
  MEDIUM: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Info, iconColor: 'text-yellow-600' },
  LOW: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle, iconColor: 'text-blue-600' },
};

const typeConfig = {
  DELAY: { icon: Clock, label: 'Delay' },
  BOTTLENECK: { icon: Zap, label: 'Bottleneck' },
  DEPENDENCY: { icon: Link2, label: 'Dependency' },
  OVERLOAD: { icon: Gauge, label: 'Overload' },
};

export default function OperationsControlPage() {
  const [data, setData] = useState<OperationsControlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/operations-control');
      if (!response.ok) {
        throw new Error('Failed to fetch operations control data');
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading operations control data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Control</h1>
          <p className="text-sm text-gray-500 mt-1">
            Early Warning Engine • Last updated: {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Active Risks</div>
          <div className="text-3xl font-bold text-gray-900">{data.summary.totalRisks}</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="text-sm text-red-600">Critical</div>
          <div className="text-3xl font-bold text-red-700">{data.summary.bySeverity.critical}</div>
        </div>
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <div className="text-sm text-orange-600">High</div>
          <div className="text-3xl font-bold text-orange-700">{data.summary.bySeverity.high}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Affected Projects</div>
          <div className="text-3xl font-bold text-gray-900">{data.summary.affectedProjectCount}</div>
        </div>
      </div>

      {/* No Risks State */}
      {data.risks.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-800">No Active Risks</h3>
          <p className="text-green-600 mt-1">All operations are within normal parameters.</p>
        </div>
      )}

      {/* Active Risks Table */}
      {data.risks.length > 0 && (
        <div className="bg-white rounded-lg border mb-6">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900">Active Risks</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projects</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detected</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.risks.map((risk) => {
                  const SeverityIcon = severityConfig[risk.severity].icon;
                  const TypeIcon = typeConfig[risk.type].icon;
                  return (
                    <tr key={risk.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${severityConfig[risk.severity].color}`}>
                          <SeverityIcon className={`w-3 h-3 mr-1 ${severityConfig[risk.severity].iconColor}`} />
                          {risk.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center text-sm text-gray-700">
                          <TypeIcon className="w-4 h-4 mr-1 text-gray-500" />
                          {typeConfig[risk.type].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {risk.affectedProjects.map((proj) => (
                            <span key={proj} className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">
                              {proj}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700 max-w-md">{risk.reason}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(risk.detectedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Affected Projects */}
        {data.affectedProjects.length > 0 && (
          <div className="bg-white rounded-lg border">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">Affected Projects</h2>
            </div>
            <div className="divide-y">
              {data.affectedProjects.map((project) => (
                <div key={project.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-medium text-gray-900">{project.projectNumber}</span>
                      <span className="text-gray-500 ml-2">• {project.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {project.critical > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                          {project.critical} Critical
                        </span>
                      )}
                      {project.high > 0 && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                          {project.high} High
                        </span>
                      )}
                      {project.medium > 0 && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                          {project.medium} Med
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {project.clientName} • {project.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Priority Actions */}
        {data.priorityActions.length > 0 && (
          <div className="bg-white rounded-lg border">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">Recommended Actions</h2>
              <p className="text-xs text-gray-500 mt-0.5">From CRITICAL and HIGH severity risks</p>
            </div>
            <div className="divide-y">
              {data.priorityActions.slice(0, 10).map((action, index) => (
                <div key={action.riskId} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-medium ${
                      action.severity === 'CRITICAL' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {index + 1}
                    </span>
                    <p className="text-sm text-gray-700">{action.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Risk Type Breakdown */}
      {data.risks.length > 0 && (
        <div className="mt-6 bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Risk Type Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">Delay: {data.summary.byType.delay}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">Bottleneck: {data.summary.byType.bottleneck}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">Dependency: {data.summary.byType.dependency}</span>
            </div>
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">Overload: {data.summary.byType.overload}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

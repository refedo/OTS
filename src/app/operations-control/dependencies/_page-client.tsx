'use client';

import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Plus, 
  AlertCircle,
  Network,
  ArrowRight,
  Clock,
  CheckCircle,
  Pause,
  AlertTriangle,
  Link2,
  Unlink
} from 'lucide-react';

interface Node {
  id: string;
  label: string;
  type: string;
  status: string;
  referenceModule: string;
  referenceId: string;
  projectNumber: string;
  owner: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  upstreamCount: number;
  downstreamCount: number;
  isCritical: boolean;
}

interface Edge {
  id: string;
  from: string;
  to: string;
  type: 'FS' | 'SS' | 'FF';
  lagDays: number;
  fromLabel: string;
  toLabel: string;
}

interface Summary {
  totalNodes: number;
  totalEdges: number;
  criticalNodes: number;
  byDependencyType: {
    FS: number;
    SS: number;
    FF: number;
  };
  blockedNodes: number;
}

const statusConfig: Record<string, { color: string; icon: any }> = {
  NOT_STARTED: { color: 'bg-gray-200 border-gray-400', icon: Clock },
  IN_PROGRESS: { color: 'bg-blue-200 border-blue-400', icon: RefreshCw },
  BLOCKED: { color: 'bg-red-200 border-red-400', icon: Pause },
  COMPLETED: { color: 'bg-green-200 border-green-400', icon: CheckCircle },
};

const dependencyTypeLabels: Record<string, { label: string; description: string }> = {
  FS: { label: 'Finish-to-Start', description: 'B cannot start until A finishes' },
  SS: { label: 'Start-to-Start', description: 'B cannot start until A starts' },
  FF: { label: 'Finish-to-Finish', description: 'B cannot finish until A finishes' },
};

export default function DependenciesPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    fromWorkUnitId: '',
    toWorkUnitId: '',
    dependencyType: 'FS',
    lagDays: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/operations-control/dependencies');
      if (!response.ok) throw new Error('Failed to fetch dependencies');
      
      const data = await response.json();
      setNodes(data.nodes);
      setEdges(data.edges);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/operations-control/dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          lagDays: Number(formData.lagDays),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create dependency');
      }

      setShowAddForm(false);
      setFormData({ fromWorkUnitId: '', toWorkUnitId: '', dependencyType: 'FS', lagDays: 0 });
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create dependency');
    }
  };

  const getNodeDependencies = (nodeId: string) => {
    const upstream = edges.filter(e => e.to === nodeId);
    const downstream = edges.filter(e => e.from === nodeId);
    return { upstream, downstream };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading dependency graph...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
          <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dependency Graph</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage work unit dependencies • Critical path analysis
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Dependency
          </button>
          <button
            onClick={fetchData}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Work Units</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalNodes}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Dependencies</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalEdges}</div>
          </div>
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
            <div className="text-sm text-orange-600">Critical Path</div>
            <div className="text-2xl font-bold text-orange-700">{summary.criticalNodes}</div>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="text-sm text-red-600">Blocked</div>
            <div className="text-2xl font-bold text-red-700">{summary.blockedNodes}</div>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="text-sm text-blue-600">FS Links</div>
            <div className="text-2xl font-bold text-blue-700">{summary.byDependencyType.FS}</div>
          </div>
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
            <div className="text-sm text-purple-600">SS/FF Links</div>
            <div className="text-2xl font-bold text-purple-700">
              {summary.byDependencyType.SS + summary.byDependencyType.FF}
            </div>
          </div>
        </div>
      )}

      {/* Dependency Type Legend */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Dependency Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(dependencyTypeLabels).map(([type, info]) => (
            <div key={type} className="flex items-start gap-2">
              <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono font-bold">{type}</span>
              <div>
                <div className="text-sm font-medium text-gray-900">{info.label}</div>
                <div className="text-xs text-gray-500">{info.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Dependency Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Dependency</h3>
          <form onSubmit={handleAddDependency} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From (Predecessor)</label>
              <select
                value={formData.fromWorkUnitId}
                onChange={(e) => setFormData({ ...formData, fromWorkUnitId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="">Select work unit...</option>
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.label} ({n.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To (Successor)</label>
              <select
                value={formData.toWorkUnitId}
                onChange={(e) => setFormData({ ...formData, toWorkUnitId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="">Select work unit...</option>
                {nodes.filter(n => n.id !== formData.fromWorkUnitId).map(n => (
                  <option key={n.id} value={n.id}>
                    {n.label} ({n.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.dependencyType}
                onChange={(e) => setFormData({ ...formData, dependencyType: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="FS">FS - Finish-to-Start</option>
                <option value="SS">SS - Start-to-Start</option>
                <option value="FF">FF - Finish-to-Finish</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lag (Days)</label>
              <input
                type="number"
                value={formData.lagDays}
                onChange={(e) => setFormData({ ...formData, lagDays: Number(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="md:col-span-4 flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create Dependency
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* No Dependencies State */}
      {nodes.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Network className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">No Work Units Found</h3>
          <p className="text-gray-500 mt-1">
            Work units are created automatically when you create Tasks, WorkOrders, RFIs, or DocumentSubmissions.
          </p>
        </div>
      ) : edges.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <Unlink className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-700">No Dependencies Defined</h3>
          <p className="text-yellow-600 mt-1">
            Add dependencies between work units to enable critical path analysis and cascade risk detection.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add First Dependency
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dependencies List */}
          <div className="bg-white rounded-lg border">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">All Dependencies ({edges.length})</h2>
            </div>
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {edges.map((edge) => (
                <div key={edge.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate max-w-[120px]" title={edge.fromLabel}>
                      {edge.fromLabel}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                      {edge.type}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900 truncate max-w-[120px]" title={edge.toLabel}>
                      {edge.toLabel}
                    </span>
                  </div>
                  {edge.lagDays !== 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Lag: {edge.lagDays > 0 ? '+' : ''}{edge.lagDays} days
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Critical Path Nodes */}
          <div className="bg-white rounded-lg border">
            <div className="px-4 py-3 border-b bg-orange-50">
              <h2 className="font-semibold text-orange-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Critical Path Items
              </h2>
              <p className="text-xs text-orange-600 mt-0.5">
                Work units with downstream dependencies (delays cascade)
              </p>
            </div>
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {nodes.filter(n => n.isCritical).length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  No critical path items identified
                </div>
              ) : (
                nodes.filter(n => n.isCritical).map((node) => {
                  const StatusIcon = statusConfig[node.status]?.icon || Clock;
                  const deps = getNodeDependencies(node.id);
                  
                  return (
                    <div
                      key={node.id}
                      className="px-4 py-3 hover:bg-orange-50 cursor-pointer"
                      onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{node.label}</div>
                          <div className="text-xs text-gray-500">
                            {node.type} • {node.projectNumber} • {node.owner}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${statusConfig[node.status]?.color || 'bg-gray-200'}`}>
                            <StatusIcon className="w-3 h-3 inline mr-1" />
                            {node.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      {selectedNode?.id === node.id && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500 mb-1">Upstream ({deps.upstream.length})</div>
                              {deps.upstream.length === 0 ? (
                                <span className="text-gray-400">None</span>
                              ) : (
                                deps.upstream.map(e => (
                                  <div key={e.id} className="text-gray-700">{e.fromLabel}</div>
                                ))
                              )}
                            </div>
                            <div>
                              <div className="text-gray-500 mb-1">Downstream ({deps.downstream.length})</div>
                              {deps.downstream.length === 0 ? (
                                <span className="text-gray-400">None</span>
                              ) : (
                                deps.downstream.map(e => (
                                  <div key={e.id} className="text-gray-700">{e.toLabel}</div>
                                ))
                              )}
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            Planned: {new Date(node.plannedStart).toLocaleDateString()} → {new Date(node.plannedEnd).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* All Nodes List */}
      {nodes.length > 0 && (
        <div className="mt-6 bg-white rounded-lg border">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900">All Work Units ({nodes.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Upstream</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Downstream</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Critical</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {nodes.map((node) => {
                  const StatusIcon = statusConfig[node.status]?.icon || Clock;
                  return (
                    <tr key={node.id} className={`hover:bg-gray-50 ${node.isCritical ? 'bg-orange-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{node.label}</div>
                        <div className="text-xs text-gray-500">{node.referenceModule}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{node.type}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{node.projectNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${statusConfig[node.status]?.color || 'bg-gray-200'}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {node.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{node.upstreamCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{node.downstreamCount}</td>
                      <td className="px-4 py-3">
                        {node.isCritical && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                            Critical
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

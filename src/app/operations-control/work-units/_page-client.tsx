'use client';

import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Pause,
  ArrowRight,
  ArrowLeft,
  FileText,
  Wrench,
  ClipboardCheck,
  Package,
  PenTool
} from 'lucide-react';

interface WorkUnit {
  id: string;
  projectId: string;
  type: 'DESIGN' | 'PROCUREMENT' | 'PRODUCTION' | 'QC' | 'DOCUMENTATION';
  referenceModule: string;
  referenceId: string;
  referenceName: string;
  ownerId: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  quantity: number | null;
  weight: number | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
  project: {
    id: string;
    projectNumber: string;
    name: string;
  };
  owner: {
    id: string;
    name: string;
    email: string;
  };
  upstreamCount: number;
  downstreamCount: number;
  createdAt: string;
}

interface Summary {
  total: number;
  byStatus: {
    notStarted: number;
    inProgress: number;
    blocked: number;
    completed: number;
  };
  byType: {
    design: number;
    procurement: number;
    production: number;
    qc: number;
    documentation: number;
  };
}

const statusConfig = {
  NOT_STARTED: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock, label: 'Not Started' },
  IN_PROGRESS: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: RefreshCw, label: 'In Progress' },
  BLOCKED: { color: 'bg-red-100 text-red-700 border-red-200', icon: Pause, label: 'Blocked' },
  COMPLETED: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Completed' },
};

const typeConfig = {
  DESIGN: { color: 'bg-purple-100 text-purple-700', icon: PenTool, label: 'Design' },
  PROCUREMENT: { color: 'bg-yellow-100 text-yellow-700', icon: Package, label: 'Procurement' },
  PRODUCTION: { color: 'bg-orange-100 text-orange-700', icon: Wrench, label: 'Production' },
  QC: { color: 'bg-cyan-100 text-cyan-700', icon: ClipboardCheck, label: 'QC' },
  DOCUMENTATION: { color: 'bg-indigo-100 text-indigo-700', icon: FileText, label: 'Documentation' },
};

export default function WorkUnitsPage() {
  const [workUnits, setWorkUnits] = useState<WorkUnit[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      
      const response = await fetch(`/api/operations-control/work-units?${params}`);
      if (!response.ok) throw new Error('Failed to fetch work units');
      
      const data = await response.json();
      setWorkUnits(data.workUnits);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, typeFilter]);

  const filteredWorkUnits = workUnits.filter(wu => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      wu.referenceName.toLowerCase().includes(search) ||
      wu.project.projectNumber.toLowerCase().includes(search) ||
      wu.project.name.toLowerCase().includes(search) ||
      wu.owner.name.toLowerCase().includes(search) ||
      wu.referenceModule.toLowerCase().includes(search)
    );
  });

  const isOverdue = (wu: WorkUnit) => {
    if (wu.status === 'COMPLETED') return false;
    return new Date(wu.plannedEnd) < new Date();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading work units...</span>
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
          <h1 className="text-2xl font-bold text-gray-900">Work Units</h1>
          <p className="text-sm text-gray-500 mt-1">
            All tracked work items in Operations Control
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
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Not Started</div>
            <div className="text-2xl font-bold text-gray-700">{summary.byStatus.notStarted}</div>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="text-sm text-blue-600">In Progress</div>
            <div className="text-2xl font-bold text-blue-700">{summary.byStatus.inProgress}</div>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="text-sm text-red-600">Blocked</div>
            <div className="text-2xl font-bold text-red-700">{summary.byStatus.blocked}</div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <div className="text-sm text-green-600">Completed</div>
            <div className="text-2xl font-bold text-green-700">{summary.byStatus.completed}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, project, owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="BLOCKED">Blocked</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="DESIGN">Design</option>
            <option value="PROCUREMENT">Procurement</option>
            <option value="PRODUCTION">Production</option>
            <option value="QC">QC</option>
            <option value="DOCUMENTATION">Documentation</option>
          </select>
        </div>
      </div>

      {/* Work Units Table */}
      {filteredWorkUnits.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">No Work Units Found</h3>
          <p className="text-gray-500 mt-1">
            Work units are automatically created when you create Tasks, WorkOrders, RFIs, or DocumentSubmissions.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Planned</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dependencies</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredWorkUnits.map((wu) => {
                  const StatusIcon = statusConfig[wu.status].icon;
                  const TypeIcon = typeConfig[wu.type].icon;
                  const overdue = isOverdue(wu);
                  
                  return (
                    <tr key={wu.id} className={`hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${typeConfig[wu.type].color}`}>
                          <TypeIcon className="w-3 h-3 mr-1" />
                          {typeConfig[wu.type].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{wu.referenceName}</div>
                        <div className="text-xs text-gray-500">{wu.referenceModule}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-mono text-gray-900">{wu.project.projectNumber}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px]">{wu.project.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{wu.owner.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {new Date(wu.plannedStart).toLocaleDateString()}
                        </div>
                        <div className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          → {new Date(wu.plannedEnd).toLocaleDateString()}
                          {overdue && ' (Overdue)'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig[wu.status].color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[wu.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {wu.upstreamCount > 0 && (
                            <span className="flex items-center" title="Upstream dependencies">
                              <ArrowLeft className="w-3 h-3 mr-0.5" />
                              {wu.upstreamCount}
                            </span>
                          )}
                          {wu.downstreamCount > 0 && (
                            <span className="flex items-center" title="Downstream dependencies">
                              <ArrowRight className="w-3 h-3 mr-0.5" />
                              {wu.downstreamCount}
                            </span>
                          )}
                          {wu.upstreamCount === 0 && wu.downstreamCount === 0 && (
                            <span className="text-gray-400">None</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Type Breakdown */}
      {summary && (
        <div className="mt-6 bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Work Unit Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <PenTool className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-600">Design: {summary.byType.design}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-gray-600">Procurement: {summary.byType.procurement}</span>
            </div>
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-gray-600">Production: {summary.byType.production}</span>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-cyan-600" />
              <span className="text-sm text-gray-600">QC: {summary.byType.qc}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span className="text-sm text-gray-600">Documentation: {summary.byType.documentation}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

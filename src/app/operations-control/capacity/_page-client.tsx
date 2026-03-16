'use client';

import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Plus, 
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Gauge,
  Users,
  Wrench,
  ClipboardCheck,
  Package,
  PenTool,
  Zap
} from 'lucide-react';

interface ResourceCapacity {
  id: string;
  resourceType: 'DESIGNER' | 'LASER' | 'WELDER' | 'QC' | 'PROCUREMENT';
  resourceId: string | null;
  resourceName: string;
  capacityPerDay: number;
  unit: 'HOURS' | 'TONS' | 'DRAWINGS';
  workingDaysPerWeek: number;
  isActive: boolean;
  notes: string | null;
  weeklyCapacity: number;
  currentLoad: number;
  loadPercentage: number;
  status: 'OVERLOADED' | 'HIGH' | 'MODERATE' | 'LOW';
  activeWorkUnits: number;
}

interface Summary {
  totalResources: number;
  overloaded: number;
  highLoad: number;
  moderate: number;
  low: number;
}

const resourceTypeConfig = {
  DESIGNER: { icon: PenTool, color: 'text-purple-600', bg: 'bg-purple-100' },
  LASER: { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  WELDER: { icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-100' },
  QC: { icon: ClipboardCheck, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  PROCUREMENT: { icon: Package, color: 'text-green-600', bg: 'bg-green-100' },
};

const statusConfig = {
  OVERLOADED: { color: 'bg-red-500', textColor: 'text-red-700', label: 'Overloaded' },
  HIGH: { color: 'bg-orange-500', textColor: 'text-orange-700', label: 'High Load' },
  MODERATE: { color: 'bg-yellow-500', textColor: 'text-yellow-700', label: 'Moderate' },
  LOW: { color: 'bg-green-500', textColor: 'text-green-700', label: 'Low' },
};

export default function CapacityPage() {
  const [capacities, setCapacities] = useState<ResourceCapacity[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    resourceType: 'DESIGNER',
    resourceName: '',
    capacityPerDay: 8,
    unit: 'HOURS',
    workingDaysPerWeek: 5,
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/operations-control/capacity');
      if (!response.ok) throw new Error('Failed to fetch capacity data');
      
      const data = await response.json();
      setCapacities(data.capacities);
      setSummary(data.summary);
      setPeriod(data.period);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/operations-control/capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          capacityPerDay: Number(formData.capacityPerDay),
          workingDaysPerWeek: Number(formData.workingDaysPerWeek),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create capacity');
      }

      setShowForm(false);
      setFormData({
        resourceType: 'DESIGNER',
        resourceName: '',
        capacityPerDay: 8,
        unit: 'HOURS',
        workingDaysPerWeek: 5,
        notes: '',
      });
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create capacity');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading capacity data...</span>
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
          <h1 className="text-2xl font-bold text-gray-900">Capacity Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define resource capacities and monitor load vs capacity
            {period && (
              <span className="ml-2">
                • Week: {new Date(period.start).toLocaleDateString()} - {new Date(period.end).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Resource
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Total Resources</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalResources}</div>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="text-sm text-red-600">Overloaded</div>
            <div className="text-2xl font-bold text-red-700">{summary.overloaded}</div>
          </div>
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
            <div className="text-sm text-orange-600">High Load</div>
            <div className="text-2xl font-bold text-orange-700">{summary.highLoad}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
            <div className="text-sm text-yellow-600">Moderate</div>
            <div className="text-2xl font-bold text-yellow-700">{summary.moderate}</div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <div className="text-sm text-green-600">Low Load</div>
            <div className="text-2xl font-bold text-green-700">{summary.low}</div>
          </div>
        </div>
      )}

      {/* Add Resource Form */}
      {showForm && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add New Resource Capacity</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
              <select
                value={formData.resourceType}
                onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="DESIGNER">Designer</option>
                <option value="LASER">Laser Machine</option>
                <option value="WELDER">Welder</option>
                <option value="QC">QC Inspector</option>
                <option value="PROCUREMENT">Procurement</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource Name</label>
              <input
                type="text"
                value={formData.resourceName}
                onChange={(e) => setFormData({ ...formData, resourceName: e.target.value })}
                placeholder="e.g., Design Team A, Laser Machine 1"
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity Per Day</label>
              <input
                type="number"
                value={formData.capacityPerDay}
                onChange={(e) => setFormData({ ...formData, capacityPerDay: Number(e.target.value) })}
                min="0.1"
                step="0.1"
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="HOURS">Hours</option>
                <option value="TONS">Tons</option>
                <option value="DRAWINGS">Drawings</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Working Days/Week</label>
              <input
                type="number"
                value={formData.workingDaysPerWeek}
                onChange={(e) => setFormData({ ...formData, workingDaysPerWeek: Number(e.target.value) })}
                min="1"
                max="7"
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="md:col-span-3 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Resource
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Capacity Cards */}
      {capacities.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Gauge className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">No Resources Defined</h3>
          <p className="text-gray-500 mt-1">
            Add resource capacities to track load vs capacity for your teams and equipment.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add First Resource
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {capacities.map((cap) => {
            const TypeIcon = resourceTypeConfig[cap.resourceType]?.icon || Users;
            const typeConfig = resourceTypeConfig[cap.resourceType];
            const status = statusConfig[cap.status];

            return (
              <div key={cap.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${typeConfig?.bg || 'bg-gray-100'}`}>
                      <TypeIcon className={`w-5 h-5 ${typeConfig?.color || 'text-gray-600'}`} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{cap.resourceName}</div>
                      <div className="text-xs text-gray-500">{cap.resourceType}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${status.textColor} bg-opacity-20`}>
                    {status.label}
                  </span>
                </div>

                {/* Load Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Load</span>
                    <span className={`font-medium ${cap.loadPercentage > 100 ? 'text-red-600' : 'text-gray-900'}`}>
                      {cap.loadPercentage}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${status.color} transition-all duration-300`}
                      style={{ width: `${Math.min(cap.loadPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Capacity/Day:</span>
                    <span className="ml-1 font-medium">{cap.capacityPerDay} {cap.unit.toLowerCase()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Weekly:</span>
                    <span className="ml-1 font-medium">{cap.weeklyCapacity} {cap.unit.toLowerCase()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Current Load:</span>
                    <span className="ml-1 font-medium">{cap.currentLoad.toFixed(1)} {cap.unit.toLowerCase()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Active Units:</span>
                    <span className="ml-1 font-medium">{cap.activeWorkUnits}</span>
                  </div>
                </div>

                {cap.notes && (
                  <div className="mt-2 text-xs text-gray-500 italic">{cap.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

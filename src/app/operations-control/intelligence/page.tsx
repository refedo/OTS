'use client';

/**
 * Operations Intelligence Page
 * 
 * Unified view of WorkUnits, Dependencies, and Capacity
 * Features:
 * - System-wide view with project/building filters
 * - Live dashboard with real-time updates
 * - Network graph for dependencies
 * - Capacity utilization per resource type
 * - Interactive WorkUnit creation with blocking/capacity preview
 * - Multiple layout options (table, graph, split)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Filter,
  Table,
  Network,
  LayoutGrid,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Pause,
  ArrowRight,
  Zap,
  Users,
  Wrench,
  FileText,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  X,
  Info,
} from 'lucide-react';

// Types
interface WorkUnit {
  id: string;
  type: string;
  status: string;
  referenceModule: string;
  referenceId: string;
  referenceName: string;
  ownerId: string;
  ownerName: string;
  projectId: string;
  projectNumber: string;
  projectName: string;
  buildingId?: string;
  buildingDesignation?: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  quantity?: number;
  weight?: number;
  blockedBy: Array<{
    id: string;
    type: string;
    status: string;
    referenceName: string;
    dependencyType: string;
    lagDays: number;
  }>;
  blocks: Array<{
    id: string;
    type: string;
    status: string;
    referenceName: string;
    dependencyType: string;
    lagDays: number;
  }>;
  isBlocked: boolean;
  capacityImpact: {
    resourceType: string;
    load: number;
    unit: string;
  } | null;
}

interface DependencyEdge {
  id: string;
  fromId: string;
  toId: string;
  fromType: string;
  toType: string;
  fromName: string;
  toName: string;
  dependencyType: string;
  lagDays: number;
}

interface CapacitySummary {
  resourceType: string;
  resourceName: string;
  capacityPerDay: number;
  unit: string;
  currentLoad: number;
  utilizationPercent: number;
  isOverloaded: boolean;
  workUnitCount: number;
}

interface FilterOption {
  id: string;
  projectNumber?: string;
  name?: string;
  designation?: string;
}

interface OperationsData {
  workUnits: WorkUnit[];
  dependencies: DependencyEdge[];
  capacities: CapacitySummary[];
  summary: {
    totalWorkUnits: number;
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
    blockedCount: number;
    totalDependencies: number;
    overloadedResources: number;
  };
  filters: {
    projects: FilterOption[];
    buildings: FilterOption[];
    selectedProjectId: string | null;
    selectedBuildingId: string | null;
  };
  generatedAt: string;
}

type LayoutMode = 'table' | 'graph' | 'split';

// Preview types
interface PreviewResult {
  preview: {
    projectId: string;
    projectNumber: string;
    projectName: string;
    type: string;
    plannedStart: string;
    plannedEnd: string;
  };
  blocking: {
    count: number;
    workUnits: Array<{
      id: string;
      type: string;
      status: string;
      referenceName: string;
      ownerName: string;
      plannedEnd: string;
      isBlocking: boolean;
    }>;
    isBlocked: boolean;
    message: string;
  };
  capacity: {
    resourceType: string;
    unit: string;
    estimatedLoad: number;
    currentLoad: number;
    newLoad: number;
    weeklyCapacity: number | string;
    currentUtilization: number;
    newUtilization: number;
    wouldOverload: boolean;
    message: string;
  };
  recommendation: {
    canProceed: boolean;
    warnings: string[];
  };
}

// Status config
const statusConfig: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  NOT_STARTED: { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Not Started' },
  IN_PROGRESS: { color: 'bg-blue-100 text-blue-700', icon: Zap, label: 'In Progress' },
  BLOCKED: { color: 'bg-red-100 text-red-700', icon: Pause, label: 'Blocked' },
  COMPLETED: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Completed' },
};

// Type config
const typeConfig: Record<string, { color: string; icon: typeof FileText; label: string }> = {
  DESIGN: { color: 'bg-purple-100 text-purple-700', icon: FileText, label: 'Design' },
  PROCUREMENT: { color: 'bg-orange-100 text-orange-700', icon: ShoppingCart, label: 'Procurement' },
  PRODUCTION: { color: 'bg-blue-100 text-blue-700', icon: Wrench, label: 'Production' },
  QC: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'QC' },
  DOCUMENTATION: { color: 'bg-gray-100 text-gray-700', icon: FileText, label: 'Documentation' },
};

// Network Graph Component
function DependencyGraph({ workUnits, dependencies }: { workUnits: WorkUnit[]; dependencies: DependencyEdge[] }) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Create node positions using a simple force-directed layout simulation
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const typeOrder = ['DESIGN', 'PROCUREMENT', 'PRODUCTION', 'QC', 'DOCUMENTATION'];
    
    // Group by type
    const byType: Record<string, WorkUnit[]> = {};
    workUnits.forEach((wu) => {
      if (!byType[wu.type]) byType[wu.type] = [];
      byType[wu.type].push(wu);
    });

    // Position nodes in columns by type
    const colWidth = 200;
    const rowHeight = 80;
    
    typeOrder.forEach((type, colIndex) => {
      const units = byType[type] || [];
      units.forEach((wu, rowIndex) => {
        positions[wu.id] = {
          x: 100 + colIndex * colWidth,
          y: 60 + rowIndex * rowHeight,
        };
      });
    });

    return positions;
  }, [workUnits]);

  const selectedWorkUnit = selectedNode ? workUnits.find((wu) => wu.id === selectedNode) : null;

  // Calculate SVG dimensions
  const maxX = Math.max(...Object.values(nodePositions).map((p) => p.x), 800) + 150;
  const maxY = Math.max(...Object.values(nodePositions).map((p) => p.y), 400) + 100;

  return (
    <div className="relative bg-white rounded-lg border overflow-hidden">
      <div className="absolute top-2 left-2 z-10 flex gap-2">
        {Object.entries(typeConfig).map(([type, config]) => (
          <span key={type} className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        ))}
      </div>

      <div className="overflow-auto" style={{ maxHeight: '500px' }}>
        <svg width={maxX} height={maxY} className="min-w-full">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Draw edges */}
          {dependencies.map((dep) => {
            const from = nodePositions[dep.fromId];
            const to = nodePositions[dep.toId];
            if (!from || !to) return null;

            const isHighlighted = selectedNode === dep.fromId || selectedNode === dep.toId;

            return (
              <g key={dep.id}>
                <line
                  x1={from.x + 60}
                  y1={from.y + 20}
                  x2={to.x - 10}
                  y2={to.y + 20}
                  stroke={isHighlighted ? '#3b82f6' : '#cbd5e1'}
                  strokeWidth={isHighlighted ? 2 : 1}
                  markerEnd="url(#arrowhead)"
                />
                {dep.lagDays > 0 && (
                  <text
                    x={(from.x + to.x) / 2 + 30}
                    y={(from.y + to.y) / 2 + 15}
                    fontSize="10"
                    fill="#64748b"
                  >
                    +{dep.lagDays}d
                  </text>
                )}
              </g>
            );
          })}

          {/* Draw nodes */}
          {workUnits.map((wu) => {
            const pos = nodePositions[wu.id];
            if (!pos) return null;

            const config = typeConfig[wu.type] || typeConfig.DESIGN;
            const statusCfg = statusConfig[wu.status] || statusConfig.NOT_STARTED;
            const isSelected = selectedNode === wu.id;

            return (
              <g
                key={wu.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelectedNode(isSelected ? null : wu.id)}
                className="cursor-pointer"
              >
                <rect
                  x="0"
                  y="0"
                  width="120"
                  height="40"
                  rx="6"
                  fill={isSelected ? '#dbeafe' : '#f8fafc'}
                  stroke={isSelected ? '#3b82f6' : wu.isBlocked ? '#ef4444' : '#e2e8f0'}
                  strokeWidth={isSelected ? 2 : 1}
                />
                <text x="10" y="16" fontSize="11" fontWeight="500" fill="#1e293b">
                  {wu.referenceName.slice(0, 14)}
                </text>
                <text x="10" y="30" fontSize="9" fill="#64748b">
                  {config.label} • {statusCfg.label}
                </text>
                {wu.isBlocked && (
                  <circle cx="110" cy="10" r="6" fill="#ef4444" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected node details */}
      {selectedWorkUnit && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold">{selectedWorkUnit.referenceName}</h4>
              <p className="text-sm text-gray-500">
                {selectedWorkUnit.projectNumber} • {selectedWorkUnit.ownerName}
              </p>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex gap-4 text-sm">
            <div>
              <span className="text-gray-500">Blocked by:</span>{' '}
              <span className="font-medium">{selectedWorkUnit.blockedBy.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Blocks:</span>{' '}
              <span className="font-medium">{selectedWorkUnit.blocks.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Capacity:</span>{' '}
              <span className="font-medium">
                {selectedWorkUnit.capacityImpact?.load} {selectedWorkUnit.capacityImpact?.unit}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// WorkUnit Row Component
function WorkUnitRow({ workUnit, onSelect }: { workUnit: WorkUnit; onSelect: (wu: WorkUnit) => void }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = statusConfig[workUnit.status] || statusConfig.NOT_STARTED;
  const typeCfg = typeConfig[workUnit.type] || typeConfig.DESIGN;
  const StatusIcon = statusCfg.icon;
  const TypeIcon = typeCfg.icon;

  return (
    <>
      <tr
        className={`hover:bg-gray-50 cursor-pointer ${workUnit.isBlocked ? 'bg-red-50' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {(workUnit.blockedBy.length > 0 || workUnit.blocks.length > 0) ? (
              expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
            ) : (
              <span className="w-4" />
            )}
            <span className="font-medium">{workUnit.referenceName}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${typeCfg.color}`}>
            <TypeIcon className="w-3 h-3" />
            {typeCfg.label}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusCfg.color}`}>
            <StatusIcon className="w-3 h-3" />
            {statusCfg.label}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          <span className="font-mono">{workUnit.projectNumber}</span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {workUnit.buildingDesignation || '-'}
        </td>
        <td className="px-4 py-3 text-sm">
          {workUnit.isBlocked ? (
            <span className="inline-flex items-center gap-1 text-red-600">
              <AlertTriangle className="w-3 h-3" />
              {workUnit.blockedBy.length} blocking
            </span>
          ) : workUnit.blockedBy.length > 0 ? (
            <span className="text-gray-500">{workUnit.blockedBy.length} deps</span>
          ) : (
            <span className="text-green-600">Ready</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {workUnit.capacityImpact ? (
            <span>
              {workUnit.capacityImpact.load} {workUnit.capacityImpact.unit.toLowerCase()}
            </span>
          ) : (
            '-'
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {workUnit.ownerName}
        </td>
      </tr>
      {expanded && (workUnit.blockedBy.length > 0 || workUnit.blocks.length > 0) && (
        <tr className="bg-gray-50">
          <td colSpan={8} className="px-8 py-3">
            <div className="flex gap-8">
              {workUnit.blockedBy.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Blocked By</h5>
                  <ul className="space-y-1">
                    {workUnit.blockedBy.map((dep) => (
                      <li key={dep.id} className="flex items-center gap-2 text-sm">
                        <span className={`w-2 h-2 rounded-full ${dep.status === 'COMPLETED' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span>{dep.referenceName}</span>
                        <span className="text-gray-400">({dep.type})</span>
                        {dep.lagDays > 0 && <span className="text-gray-400">+{dep.lagDays}d</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {workUnit.blocks.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Blocks</h5>
                  <ul className="space-y-1">
                    {workUnit.blocks.map((dep) => (
                      <li key={dep.id} className="flex items-center gap-2 text-sm">
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span>{dep.referenceName}</span>
                        <span className="text-gray-400">({dep.type})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Capacity Card Component
function CapacityCard({ capacity }: { capacity: CapacitySummary }) {
  const getUtilizationColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-orange-500';
    if (percent >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`bg-white rounded-lg border p-4 ${capacity.isOverloaded ? 'border-red-300 bg-red-50' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{capacity.resourceName}</h4>
        {capacity.isOverloaded && <AlertTriangle className="w-4 h-4 text-red-500" />}
      </div>
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-500">Utilization</span>
          <span className={`font-medium ${capacity.isOverloaded ? 'text-red-600' : 'text-gray-900'}`}>
            {capacity.utilizationPercent}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getUtilizationColor(capacity.utilizationPercent)} transition-all`}
            style={{ width: `${Math.min(capacity.utilizationPercent, 100)}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          Load: {capacity.currentLoad} {capacity.unit.toLowerCase()}
        </span>
        <span>
          Cap: {capacity.capacityPerDay * 5} {capacity.unit.toLowerCase()}/wk
        </span>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        {capacity.workUnitCount} active work units
      </div>
    </div>
  );
}

// Create WorkUnit Preview Modal Component
function CreateWorkUnitPreviewModal({
  isOpen,
  onClose,
  projects,
}: {
  isOpen: boolean;
  onClose: () => void;
  projects: FilterOption[];
}) {
  const [formData, setFormData] = useState({
    projectId: '',
    type: 'DESIGN',
    plannedStart: new Date().toISOString().split('T')[0],
    plannedEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    quantity: '',
    weight: '',
  });
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPreview = async () => {
    if (!formData.projectId) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/operations-intelligence/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: formData.projectId,
          type: formData.type,
          plannedStart: formData.plannedStart,
          plannedEnd: formData.plannedEnd,
          quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        setPreview(result);
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch preview when form changes
  useEffect(() => {
    if (isOpen && formData.projectId) {
      const timer = setTimeout(fetchPreview, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, formData.projectId, formData.type, formData.plannedStart, formData.plannedEnd]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create WorkUnit - Impact Preview</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Form */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectNumber} - {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="DESIGN">Design</option>
                <option value="PROCUREMENT">Procurement</option>
                <option value="PRODUCTION">Production</option>
                <option value="QC">QC</option>
                <option value="DOCUMENTATION">Documentation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Planned Start *</label>
              <input
                type="date"
                value={formData.plannedStart}
                onChange={(e) => setFormData({ ...formData, plannedStart: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Planned End *</label>
              <input
                type="date"
                value={formData.plannedEnd}
                onChange={(e) => setFormData({ ...formData, plannedEnd: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity {formData.type === 'DESIGN' ? '(drawings)' : ''}
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="Auto-estimated if empty"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight {formData.type === 'PRODUCTION' ? '(tons)' : ''}
              </label>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                placeholder="For production only"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Preview Results */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Calculating impact...</span>
            </div>
          )}

          {preview && !loading && (
            <div className="space-y-4">
              {/* Recommendation Banner */}
              <div
                className={`p-4 rounded-lg ${
                  preview.recommendation.canProceed
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {preview.recommendation.canProceed ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <span
                    className={`font-medium ${
                      preview.recommendation.canProceed ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {preview.recommendation.canProceed
                      ? 'Ready to create - no blocking issues'
                      : 'Issues detected - review before creating'}
                  </span>
                </div>
                {preview.recommendation.warnings.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {preview.recommendation.warnings.map((w, i) => (
                      <li key={i} className="text-sm text-red-700 flex items-center gap-2">
                        <span className="w-1 h-1 bg-red-500 rounded-full" />
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Blocking Dependencies */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Pause className="w-4 h-4" />
                  Blocking Dependencies
                </h3>
                <p className="text-sm text-gray-600 mb-3">{preview.blocking.message}</p>
                {preview.blocking.workUnits.length > 0 && (
                  <div className="space-y-2">
                    {preview.blocking.workUnits.slice(0, 5).map((wu) => (
                      <div
                        key={wu.id}
                        className={`flex items-center justify-between p-2 rounded ${
                          wu.isBlocking ? 'bg-red-50' : 'bg-green-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              wu.isBlocking ? 'bg-red-500' : 'bg-green-500'
                            }`}
                          />
                          <span className="text-sm font-medium">{wu.referenceName}</span>
                          <span className="text-xs text-gray-500">({wu.type})</span>
                        </div>
                        <span className="text-xs text-gray-500">{wu.ownerName}</span>
                      </div>
                    ))}
                    {preview.blocking.workUnits.length > 5 && (
                      <p className="text-xs text-gray-500">
                        +{preview.blocking.workUnits.length - 5} more...
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Capacity Impact */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Capacity Impact
                </h3>
                <p className="text-sm text-gray-600 mb-3">{preview.capacity.message}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Resource:</span>
                    <span className="ml-2 font-medium">{preview.capacity.resourceType}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">This WorkUnit:</span>
                    <span className="ml-2 font-medium">
                      {preview.capacity.estimatedLoad} {preview.capacity.unit.toLowerCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Weekly Capacity:</span>
                    <span className="ml-2 font-medium">
                      {typeof preview.capacity.weeklyCapacity === 'number'
                        ? `${preview.capacity.weeklyCapacity} ${preview.capacity.unit.toLowerCase()}`
                        : preview.capacity.weeklyCapacity}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Current: {preview.capacity.currentUtilization}%</span>
                    <span
                      className={preview.capacity.wouldOverload ? 'text-red-600 font-medium' : ''}
                    >
                      After: {preview.capacity.newUtilization}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-blue-500 absolute left-0"
                      style={{ width: `${Math.min(preview.capacity.currentUtilization, 100)}%` }}
                    />
                    <div
                      className={`h-full absolute left-0 ${
                        preview.capacity.wouldOverload ? 'bg-red-500' : 'bg-green-500'
                      } opacity-50`}
                      style={{ width: `${Math.min(preview.capacity.newUtilization, 100)}%` }}
                    />
                    {/* 100% marker */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-gray-800" style={{ left: '100%' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {!formData.projectId && (
            <div className="text-center py-8 text-gray-500">
              <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              Select a project to see the impact preview
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            disabled={!preview?.recommendation.canProceed}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              preview?.recommendation.canProceed
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            Create WorkUnit
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Page Component
export default function OperationsIntelligencePage() {
  const [data, setData] = useState<OperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutMode>('split');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedWorkUnit, setSelectedWorkUnit] = useState<WorkUnit | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedProjectId) params.set('projectId', selectedProjectId);
      if (selectedBuildingId) params.set('buildingId', selectedBuildingId);

      const response = await fetch(`/api/operations-intelligence?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, selectedBuildingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset building when project changes
  useEffect(() => {
    setSelectedBuildingId('');
  }, [selectedProjectId]);

  if (loading && !data) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading operations intelligence...</span>
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
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Intelligence</h1>
          <p className="text-sm text-gray-500 mt-1">
            WorkUnits • Dependencies • Capacity • Last updated: {new Date(data.generatedAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Layout Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setLayout('table')}
              className={`p-2 rounded ${layout === 'table' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
              title="Table View"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('graph')}
              className={`p-2 rounded ${layout === 'graph' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
              title="Graph View"
            >
              <Network className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('split')}
              className={`p-2 rounded ${layout === 'split' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
              title="Split View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create WorkUnit
          </button>
        </div>
      </div>

      {/* Create WorkUnit Modal */}
      <CreateWorkUnitPreviewModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projects={data.filters.projects}
      />

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filters:</span>
        </div>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="">All Projects</option>
          {data.filters.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.projectNumber} - {p.name}
            </option>
          ))}
        </select>
        {selectedProjectId && data.filters.buildings.length > 0 && (
          <select
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="">All Buildings</option>
            {data.filters.buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.designation}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total WorkUnits</div>
          <div className="text-2xl font-bold text-gray-900">{data.summary.totalWorkUnits}</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="text-sm text-blue-600">In Progress</div>
          <div className="text-2xl font-bold text-blue-700">{data.summary.byStatus.inProgress}</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="text-sm text-red-600">Blocked</div>
          <div className="text-2xl font-bold text-red-700">{data.summary.blockedCount}</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="text-sm text-green-600">Completed</div>
          <div className="text-2xl font-bold text-green-700">{data.summary.byStatus.completed}</div>
        </div>
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <div className="text-sm text-purple-600">Dependencies</div>
          <div className="text-2xl font-bold text-purple-700">{data.summary.totalDependencies}</div>
        </div>
        <div className={`rounded-lg border p-4 ${data.summary.overloadedResources > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
          <div className={`text-sm ${data.summary.overloadedResources > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
            Overloaded Resources
          </div>
          <div className={`text-2xl font-bold ${data.summary.overloadedResources > 0 ? 'text-orange-700' : 'text-gray-900'}`}>
            {data.summary.overloadedResources}
          </div>
        </div>
      </div>

      {/* Capacity Overview */}
      {data.capacities.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Resource Capacity (This Week)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {data.capacities.map((cap, index) => (
              <CapacityCard key={`${cap.resourceType}-${index}`} capacity={cap} />
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      {layout === 'table' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">WorkUnits</h2>
            <span className="text-sm text-gray-500">{data.workUnits.length} items</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Building</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dependencies</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.workUnits.map((wu) => (
                  <WorkUnitRow key={wu.id} workUnit={wu} onSelect={setSelectedWorkUnit} />
                ))}
              </tbody>
            </table>
          </div>
          {data.workUnits.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              No WorkUnits found. Create tasks, work orders, RFIs, or documents to generate WorkUnits.
            </div>
          )}
        </div>
      )}

      {layout === 'graph' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Dependency Network</h2>
            <span className="text-sm text-gray-500">
              {data.workUnits.length} nodes • {data.dependencies.length} edges
            </span>
          </div>
          <DependencyGraph workUnits={data.workUnits} dependencies={data.dependencies} />
        </div>
      )}

      {layout === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Table */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">WorkUnits</h2>
              <span className="text-sm text-gray-500">{data.workUnits.length} items</span>
            </div>
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deps</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.workUnits.slice(0, 50).map((wu) => {
                    const statusCfg = statusConfig[wu.status] || statusConfig.NOT_STARTED;
                    const typeCfg = typeConfig[wu.type] || typeConfig.DESIGN;
                    return (
                      <tr
                        key={wu.id}
                        className={`hover:bg-gray-50 cursor-pointer ${wu.isBlocked ? 'bg-red-50' : ''}`}
                        onClick={() => setSelectedWorkUnit(wu)}
                      >
                        <td className="px-4 py-2 text-sm font-medium">{wu.referenceName}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${typeCfg.color}`}>
                            {typeCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {wu.isBlocked ? (
                            <span className="text-red-600">{wu.blockedBy.length} blocking</span>
                          ) : (
                            <span className="text-gray-500">{wu.blockedBy.length}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {wu.capacityImpact?.load} {wu.capacityImpact?.unit?.toLowerCase()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Graph */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Dependency Network</h2>
            </div>
            <DependencyGraph workUnits={data.workUnits} dependencies={data.dependencies} />
          </div>
        </div>
      )}

      {/* Selected WorkUnit Detail Panel */}
      {selectedWorkUnit && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selectedWorkUnit.referenceName}</h3>
                <p className="text-sm text-gray-500">
                  {selectedWorkUnit.projectNumber} • {selectedWorkUnit.buildingDesignation || 'No building'} • {selectedWorkUnit.ownerName}
                </p>
              </div>
              <button onClick={() => setSelectedWorkUnit(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Blocked By ({selectedWorkUnit.blockedBy.length})</h4>
                {selectedWorkUnit.blockedBy.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedWorkUnit.blockedBy.map((dep) => (
                      <li key={dep.id} className="flex items-center gap-2 text-sm">
                        <span className={`w-2 h-2 rounded-full ${dep.status === 'COMPLETED' ? 'bg-green-500' : 'bg-red-500'}`} />
                        {dep.referenceName} ({dep.type})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-green-600">No blocking dependencies</p>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Blocks ({selectedWorkUnit.blocks.length})</h4>
                {selectedWorkUnit.blocks.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedWorkUnit.blocks.map((dep) => (
                      <li key={dep.id} className="flex items-center gap-2 text-sm">
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        {dep.referenceName} ({dep.type})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No downstream dependencies</p>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Capacity Impact</h4>
                {selectedWorkUnit.capacityImpact ? (
                  <div className="text-sm">
                    <p>
                      <span className="font-medium">{selectedWorkUnit.capacityImpact.load}</span>{' '}
                      {selectedWorkUnit.capacityImpact.unit.toLowerCase()} on{' '}
                      <span className="font-medium">{selectedWorkUnit.capacityImpact.resourceType}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No capacity data</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

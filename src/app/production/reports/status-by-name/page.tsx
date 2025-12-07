'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart3, Download, Search, Filter } from 'lucide-react';

type AssemblyPart = {
  id: string;
  partDesignation: string;
  name: string;
  quantity: number;
  netWeightTotal: number | null;
  project: { id: string; name: string; projectNumber: string };
  building: { id: string; name: string; designation: string } | null;
  productionLogs?: { processType: string; processedQty: number }[];
};

type Project = {
  id: string;
  name: string;
  projectNumber: string;
};

type Building = {
  id: string;
  name: string;
  designation: string;
};

type NameGroup = {
  name: string;
  totalWeight: number;
  totalQty: number;
  processes: {
    [key: string]: {
      weight: number;
      percentage: number;
    };
  };
};

const PROCESS_TYPES = [
  'Fit-up',
  'Welding',
  'Visualization',
  'Dispatched to customer',
];

const PROCESS_COLORS: { [key: string]: string } = {
  'Fit-up': 'bg-yellow-400',
  'Welding': 'bg-red-500',
  'Visualization': 'bg-green-500',
  'Dispatched to customer': 'bg-purple-500',
};

export default function StatusByNamePage() {
  const [parts, setParts] = useState<AssemblyPart[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [partsRes, projectsRes] = await Promise.all([
        fetch('/api/production/assembly-parts?includeLogs=true'),
        fetch('/api/projects'),
      ]);

      if (partsRes.ok) {
        const partsData = await partsRes.json();
        setParts(partsData);

        // Extract unique buildings
        const uniqueBuildings = Array.from(
          new Map(
            partsData
              .filter((p: AssemblyPart) => p.building)
              .map((p: AssemblyPart) => [p.building!.id, p.building!])
          ).values()
        ) as Building[];
        setBuildings(uniqueBuildings);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedData = useMemo(() => {
    let filteredParts = parts;

    // Filter by project
    if (selectedProject !== 'all') {
      filteredParts = filteredParts.filter(p => p.project.id === selectedProject);
    }

    // Filter by building
    if (selectedBuilding !== 'all') {
      filteredParts = filteredParts.filter(p => p.building?.id === selectedBuilding);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredParts = filteredParts.filter(p =>
        p.name.toLowerCase().includes(query)
      );
    }

    // Group by name
    const groups = new Map<string, NameGroup>();

    filteredParts.forEach(part => {
      if (!groups.has(part.name)) {
        groups.set(part.name, {
          name: part.name,
          totalWeight: 0,
          totalQty: 0,
          processes: {},
        });
      }

      const group = groups.get(part.name)!;
      const partWeight = Number(part.netWeightTotal) || 0;
      
      group.totalWeight = (group.totalWeight || 0) + (isNaN(partWeight) ? 0 : partWeight);
      group.totalQty = (group.totalQty || 0) + (part.quantity || 0);

      // Calculate processed weight for each process
      PROCESS_TYPES.forEach(processType => {
        if (!group.processes[processType]) {
          group.processes[processType] = { weight: 0, percentage: 0 };
        }

        const processedQty = (part.productionLogs || [])
          .filter(log => log.processType === processType)
          .reduce((sum, log) => sum + log.processedQty, 0);

        const processedWeight = part.quantity > 0 
          ? (processedQty / part.quantity) * partWeight 
          : 0;
        group.processes[processType].weight += isNaN(processedWeight) ? 0 : processedWeight;
      });
    });

    // Calculate percentages
    groups.forEach(group => {
      PROCESS_TYPES.forEach(processType => {
        if (group.totalWeight > 0) {
          group.processes[processType].percentage =
            (group.processes[processType].weight / group.totalWeight) * 100;
        }
      });
    });

    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [parts, selectedProject, selectedBuilding, searchQuery]);

  const handleExport = () => {
    // Create CSV content
    const headers = ['Item', 'Weight', 'Qty', ...PROCESS_TYPES.flatMap(p => [`${p} Weight`, `${p} %`])];
    const rows = groupedData.map(group => [
      group.name,
      group.totalWeight.toFixed(1),
      group.totalQty,
      ...PROCESS_TYPES.flatMap(p => [
        group.processes[p].weight.toFixed(1),
        `${group.processes[p].percentage.toFixed(0)}%`,
      ]),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `status-by-name-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            Status by Name
          </h1>
          <p className="text-muted-foreground">
            Production progress grouped by part name
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.projectNumber} - {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="building">Building/Zone</Label>
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger>
                  <SelectValue placeholder="All Buildings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map(building => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.designation} - {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium border-r">Item</th>
                  <th className="text-right p-3 font-medium border-r">Weight</th>
                  <th className="text-right p-3 font-medium border-r">Qty</th>
                  {PROCESS_TYPES.map(processType => (
                    <th
                      key={processType}
                      colSpan={2}
                      className={`text-center p-3 font-medium border-r ${PROCESS_COLORS[processType]} text-white`}
                    >
                      {processType}
                    </th>
                  ))}
                </tr>
                <tr className="bg-muted/30 text-xs">
                  <th className="border-r"></th>
                  <th className="border-r"></th>
                  <th className="border-r"></th>
                  {PROCESS_TYPES.map(processType => (
                    <th key={`${processType}-headers`} colSpan={2} className="border-r">
                      <div className="flex">
                        <span className="flex-1 text-right p-2 border-r">Weight</span>
                        <span className="flex-1 text-right p-2">%</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedData.map((group, idx) => (
                  <tr key={group.name} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="p-3 font-medium border-r">{group.name}</td>
                    <td className="p-3 text-right border-r">{(Number(group.totalWeight) || 0).toFixed(1)}</td>
                    <td className="p-3 text-right border-r">{group.totalQty || 0}</td>
                    {PROCESS_TYPES.map(processType => {
                      const process = group.processes[processType];
                      const percentage = process?.percentage || 0;
                      
                      return [
                        <td key={`${processType}-weight`} className="p-3 text-right border-r">
                          {(Number(process?.weight) || 0).toFixed(1)}
                        </td>,
                        <td key={`${processType}-percentage`} className="p-3 border-r">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-6 bg-muted rounded-sm overflow-hidden">
                              <div
                                className={`h-full ${PROCESS_COLORS[processType]} transition-all`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium w-12 text-right">
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      ];
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {groupedData.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No data found matching the filters
        </div>
      )}
    </div>
  );
}

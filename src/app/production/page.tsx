'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Factory, 
  Upload, 
  Activity, 
  Package, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Filter, 
  TrendingUp, 
  Truck, 
  HardHat, 
  Calendar 
} from 'lucide-react';
import { getProcessColor } from '@/lib/process-colors';

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

type ProductionLog = {
  id: string;
  processType: string;
  processedQty: number;
  dateProcessed: string;
  assemblyPart: {
    partDesignation: string;
    name: string;
  };
  createdBy: {
    name: string;
  };
};

export default function ProductionDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalParts: 0,
    completedParts: 0,
    inProgressParts: 0,
    pendingParts: 0,
    totalLogs: 0,
    totalProcessedQty: 0,
    completionRate: '0',
    contractualTonnage: 0,
    engineeringTonnage: 0,
    overallProducedTonnage: 0,
    overallProductionPercentage: 0,
    monthlyTarget: 0,
  });
  const [processData, setProcessData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<ProductionLog[]>([]);
  const [dailyProgress, setDailyProgress] = useState<any[]>([]);
  const [projectPlanning, setProjectPlanning] = useState<any>(null);
  const [benchmarks, setBenchmarks] = useState<any>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject && selectedProject !== 'all') {
      fetchBuildings(selectedProject);
    } else {
      setBuildings([]);
      setSelectedBuilding('all');
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchStats();
  }, [selectedProject, selectedBuilding, selectedPeriod]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchBuildings = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/buildings`);
      if (response.ok) {
        const data = await response.json();
        setBuildings(data);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProject !== 'all') params.append('projectId', selectedProject);
      if (selectedBuilding !== 'all') params.append('buildingId', selectedBuilding);
      if (selectedPeriod !== 'all') params.append('period', selectedPeriod);

      const response = await fetch(`/api/production/stats?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        
        // Calculate overall produced tonnage (average of Fit-up, Welding, Visualization)
        const productionProcesses = data.processData.filter((p: any) => 
          ['Fit-up', 'Welding', 'Visualization'].includes(p.processType)
        );
        const avgTonnage = productionProcesses.length > 0
          ? productionProcesses.reduce((sum: number, p: any) => sum + p.tonnage, 0) / productionProcesses.length
          : 0;
        
        const totalTonnage = data.stats.engineeringTonnage || data.stats.contractualTonnage || 1;
        const percentage = (avgTonnage / totalTonnage) * 100;
        
        setStats({
          ...data.stats,
          overallProducedTonnage: avgTonnage,
          overallProductionPercentage: percentage,
          monthlyTarget: data.stats.monthlyTarget || 0,
        });
        setProcessData(data.processData);
        setRecentActivity(data.recentActivity);
        setDailyProgress(data.dailyProgress || []);
        setProjectPlanning(data.projectPlanning);
        setBenchmarks(data.benchmarks);
        console.log('Project Planning Data:', data.projectPlanning);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Factory className="h-8 w-8" />
              Production Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and manage production activities
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/production/upload">
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Parts
              </Button>
            </Link>
          </div>
        </div>

        {/* Compact Filters */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label htmlFor="project" className="text-xs">Project</Label>
            <select
              id="project"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm mt-1"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectNumber} - {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <Label htmlFor="building" className="text-xs">Building</Label>
            <select
              id="building"
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              disabled={selectedProject === 'all' || buildings.length === 0}
              className="w-full h-9 px-3 rounded-md border bg-background disabled:opacity-50 text-sm mt-1"
            >
              <option value="all">All Buildings</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.designation} - {building.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <Label htmlFor="period" className="text-xs">Period</Label>
            <select
              id="period"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm mt-1"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Production Benchmarks */}
      {benchmarks && selectedProject !== 'all' && (
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Production Benchmarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Avg Production Rate</p>
                <p className="text-2xl font-bold text-purple-700">{benchmarks.avgProductionRate}</p>
                <p className="text-xs text-muted-foreground">tons/day</p>
              </div>
              <div className="text-center border-l pl-4">
                <p className="text-xs text-muted-foreground mb-1">Max Productivity</p>
                <p className="text-2xl font-bold text-purple-700">{benchmarks.maxProductivityPerDay}</p>
                <p className="text-xs text-muted-foreground">tons/day</p>
              </div>
              <div className="text-center border-l pl-4">
                <p className="text-xs text-muted-foreground mb-1">Balance Tonnage</p>
                <p className="text-2xl font-bold text-orange-600">{benchmarks.balanceTonnage}</p>
                <p className="text-xs text-muted-foreground">tons remaining</p>
              </div>
              <div className="text-center border-l pl-4">
                <p className="text-xs text-muted-foreground mb-1">Days Left</p>
                <p className="text-2xl font-bold text-blue-700">
                  {benchmarks.daysLeftToEnd !== null ? benchmarks.daysLeftToEnd : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">days</p>
              </div>
              <div className="text-center border-l pl-4">
                <p className="text-xs text-muted-foreground mb-1">Expected Finish</p>
                <p className="text-sm font-bold text-green-700">
                  {benchmarks.expectedFinishDate 
                    ? new Date(benchmarks.expectedFinishDate).toLocaleDateString()
                    : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">date</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tonnage Summary with Production Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Contractual Tonnage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contractualTonnage.toFixed(2)} <span className="text-lg">tons</span></div>
            <p className="text-xs text-muted-foreground mt-1">From project contract</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Engineering Tonnage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.engineeringTonnage.toFixed(2)} <span className="text-lg">tons</span></div>
            <p className="text-xs text-muted-foreground mt-1">From engineering calculations</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Monthly Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.monthlyTarget.toFixed(2)} <span className="text-lg">tons</span></div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} target
            </p>
          </CardContent>
        </Card>

        {projectPlanning && selectedProject !== 'all' && projectPlanning.phases && (() => {
          const fabricationPhase = projectPlanning.phases.find((p: any) => p.phase === 'Fabrication');
          if (fabricationPhase && (fabricationPhase.plannedStart || fabricationPhase.plannedEnd)) {
            return (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Production Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-blue-700">Planned</p>
                      {fabricationPhase.plannedStart && (
                        <div>
                          <p className="text-xs text-muted-foreground">Start</p>
                          <p className="text-sm font-semibold">
                            {new Date(fabricationPhase.plannedStart).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {fabricationPhase.plannedEnd && (
                        <div>
                          <p className="text-xs text-muted-foreground">End</p>
                          <p className="text-sm font-semibold">
                            {new Date(fabricationPhase.plannedEnd).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 border-l pl-3">
                      <p className="text-xs font-semibold text-green-700">Actual</p>
                      {projectPlanning.actualStartDate ? (
                        <div>
                          <p className="text-xs text-muted-foreground">Start</p>
                          <p className="text-sm font-semibold text-green-600">
                            {new Date(projectPlanning.actualStartDate).toLocaleDateString()}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-muted-foreground">Start</p>
                          <p className="text-sm text-gray-400">Not started</p>
                        </div>
                      )}
                      {projectPlanning.actualEndDate ? (
                        <div>
                          <p className="text-xs text-muted-foreground">End</p>
                          <p className="text-sm font-semibold text-green-600">
                            {new Date(projectPlanning.actualEndDate).toLocaleDateString()}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-muted-foreground">End</p>
                          <p className="text-sm text-gray-400">In progress</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }
          return null;
        })()}

        <Card className={`bg-gradient-to-r ${
          stats.overallProductionPercentage <= 33 
            ? 'from-red-50 to-red-100 border-red-200' 
            : stats.overallProductionPercentage <= 60 
            ? 'from-amber-50 to-amber-100 border-amber-200' 
            : 'from-emerald-50 to-emerald-100 border-emerald-200'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className={`h-4 w-4 ${
                stats.overallProductionPercentage <= 33 
                  ? 'text-red-600' 
                  : stats.overallProductionPercentage <= 60 
                  ? 'text-amber-600' 
                  : 'text-emerald-600'
              }`} />
              Overall Produced Tonnage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl font-bold ${
                  stats.overallProductionPercentage <= 33 
                    ? 'text-red-700' 
                    : stats.overallProductionPercentage <= 60 
                    ? 'text-amber-700' 
                    : 'text-emerald-700'
                }`}>
                  {stats.overallProducedTonnage.toFixed(2)} <span className="text-lg">tons</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg. of Fit-up, Welding, Visualization
                </p>
              </div>
              <div className="text-right">
                <div className={`text-6xl font-bold ${
                  stats.overallProductionPercentage <= 33 
                    ? 'text-red-600' 
                    : stats.overallProductionPercentage <= 60 
                    ? 'text-amber-600' 
                    : 'text-emerald-600'
                }`}>
                  {stats.overallProductionPercentage.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  of engineering tonnage
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Processes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Production
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No process data yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Process</th>
                    <th className="px-4 py-2 text-center font-semibold">Prod./Ton</th>
                    <th className="px-4 py-2 text-center font-semibold">Prod./Pc</th>
                    <th className="px-4 py-2 text-center font-semibold">Progress %</th>
                  </tr>
                </thead>
                <tbody>
                  {processData
                    .filter(p => ['Preparation', 'Fit-up', 'Welding', 'Visualization'].includes(p.processType))
                    .map((process, index) => {
                      const colors = getProcessColor(process.processType);
                      return (
                        <tr key={process.processType} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/30'}>
                          <td className="px-4 py-2">
                            <span className={`${colors.bg} ${colors.text} px-2 py-1 rounded text-xs font-semibold`}>
                              {process.processType}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center font-semibold">{process.tonnage.toFixed(2)}</td>
                          <td className="px-4 py-2 text-center">{process.totalQty}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`font-semibold ${
                              parseFloat(process.completionPercentage) === 100 ? 'text-green-600' :
                              parseFloat(process.completionPercentage) === 0 ? 'text-red-600' :
                              'text-blue-600'
                            }`}>
                              {parseFloat(process.completionPercentage) === 0 ? 'No Data' : `${process.completionPercentage}%`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispatching Processes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Dispatching
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No dispatch data yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Process</th>
                    <th className="px-4 py-2 text-center font-semibold">Prod./Ton</th>
                    <th className="px-4 py-2 text-center font-semibold">Prod./Pc</th>
                    <th className="px-4 py-2 text-center font-semibold">Progress %</th>
                  </tr>
                </thead>
                <tbody>
                  {processData
                    .filter(p => [
                      'Dispatch to Sandblasting',
                      'Sandblasting',
                      'Dispatch to Galvanization',
                      'Galvanization',
                      'Dispatch to Painting',
                      'Painting',
                      'Dispatch to Customs',
                      'Dispatch to Site',
                      'Dispatch to Customer'
                    ].includes(p.processType))
                    .map((process, index) => {
                      const colors = getProcessColor(process.processType);
                      return (
                        <tr key={process.processType} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/30'}>
                          <td className="px-4 py-2">
                            <span className={`${colors.bg} ${colors.text} px-2 py-1 rounded text-xs font-semibold`}>
                              {process.processType}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center font-semibold">{process.tonnage.toFixed(2)}</td>
                          <td className="px-4 py-2 text-center">{process.totalQty}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`font-semibold ${
                              parseFloat(process.completionPercentage) === 100 ? 'text-green-600' :
                              parseFloat(process.completionPercentage) === 0 ? 'text-red-600' :
                              'text-blue-600'
                            }`}>
                              {parseFloat(process.completionPercentage) === 0 ? 'No Data' : `${process.completionPercentage}%`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Erection Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Erection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HardHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No erection data yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Process</th>
                    <th className="px-4 py-2 text-center font-semibold">Prod./Ton</th>
                    <th className="px-4 py-2 text-center font-semibold">Prod./Pc</th>
                    <th className="px-4 py-2 text-center font-semibold">Progress %</th>
                  </tr>
                </thead>
                <tbody>
                  {processData
                    .filter(p => ['Erection'].includes(p.processType))
                    .map((process, index) => {
                      const colors = getProcessColor(process.processType);
                      return (
                        <tr key={process.processType} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/30'}>
                          <td className="px-4 py-2">
                            <span className={`${colors.bg} ${colors.text} px-2 py-1 rounded text-xs font-semibold`}>
                              {process.processType}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center font-semibold">{process.tonnage.toFixed(2)}</td>
                          <td className="px-4 py-2 text-center">{process.totalQty}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`font-semibold ${
                              parseFloat(process.completionPercentage) === 100 ? 'text-green-600' :
                              parseFloat(process.completionPercentage) === 0 ? 'text-red-600' :
                              'text-blue-600'
                            }`}>
                              {parseFloat(process.completionPercentage) === 0 ? 'No Data' : `${process.completionPercentage}%`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Production Activities Progress */}
      {dailyProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Production Activities Progress
              {selectedProject !== 'all' && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Selected Project)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="px-2 py-2 text-left font-semibold border border-blue-700">Date</th>
                    <th className="px-2 py-2 text-center font-semibold border border-blue-700 bg-amber-500">Preparation</th>
                    <th className="px-2 py-2 text-center font-semibold border border-blue-700 bg-amber-500">Preparation Qty</th>
                    <th className="px-2 py-2 text-center font-semibold border border-blue-700 bg-green-600">Fit-Up Weight</th>
                    <th className="px-2 py-2 text-center font-semibold border border-blue-700 bg-green-600">Fit-Up Qty</th>
                    <th className="px-2 py-2 text-center font-semibold border border-blue-700 bg-green-600">Welding Weight</th>
                    <th className="px-2 py-2 text-center font-semibold border border-blue-700 bg-green-600">Welding Qty</th>
                    <th className="px-2 py-2 text-center font-semibold border border-blue-700 bg-sky-500">Visualization Weight</th>
                    <th className="px-2 py-2 text-center font-semibold border border-blue-700 bg-sky-500">Visualization Qty</th>
                    <th className="px-2 py-2 text-center font-semibold border border-blue-700 bg-gray-500">Sandblasting</th>
                    <th className="px-2 py-2 text-center font-semibold border border-blue-700 bg-gray-500">Sandblasting Qty</th>
                    <th className="px-2 py-2 text-center font-semibold border border-blue-700 bg-yellow-500">Galvanization</th>
                    <th className="px-2 py-2 text-center font-semibold border border-blue-700 bg-yellow-500">Galvanization Qty</th>
                    <th className="px-2 py-2 text-center font-semibold border border-blue-700 bg-red-500">Painting</th>
                    <th className="px-2 py-2 text-center font-semibold border border-blue-700 bg-red-500">Painting Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Daily Average Row */}
                  {dailyProgress.length > 0 && (
                    <tr className="bg-blue-100 font-semibold">
                      <td className="px-2 py-2 border text-blue-800">Daily Average</td>
                      {['Preparation', 'Fit-up', 'Welding', 'Visualization', 'Sandblasting', 'Galvanization', 'Painting'].map(process => {
                        const totalWeight = dailyProgress.reduce((sum, day) => sum + (day.processes[process]?.weight || 0), 0);
                        const totalQty = dailyProgress.reduce((sum, day) => sum + (day.processes[process]?.qty || 0), 0);
                        const avgWeight = dailyProgress.length > 0 ? totalWeight / dailyProgress.length : 0;
                        const avgQty = dailyProgress.length > 0 ? totalQty / dailyProgress.length : 0;
                        return (
                          <>
                            <td key={`${process}-weight`} className="px-2 py-2 text-center border">{avgWeight.toFixed(1)}</td>
                            <td key={`${process}-qty`} className="px-2 py-2 text-center border">{avgQty.toFixed(0)}</td>
                          </>
                        );
                      })}
                    </tr>
                  )}
                  {dailyProgress.map((day, index) => {
                    const rowColors = ['bg-red-50', 'bg-orange-50', 'bg-yellow-50', 'bg-green-50', 'bg-teal-50', 'bg-cyan-50', 'bg-sky-50', 'bg-blue-50', 'bg-indigo-50', 'bg-purple-50'];
                    const rowColor = rowColors[index % rowColors.length];
                    const dateObj = new Date(day.date);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                    const formattedDate = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
                    
                    return (
                      <tr key={day.date} className={rowColor}>
                        <td className="px-2 py-2 border font-medium text-blue-800">
                          {dayName}-{formattedDate}
                        </td>
                        {['Preparation', 'Fit-up', 'Welding', 'Visualization', 'Sandblasting', 'Galvanization', 'Painting'].map(process => (
                          <>
                            <td key={`${day.date}-${process}-weight`} className="px-2 py-2 text-center border">
                              {day.processes[process]?.weight?.toFixed(1) || '0.0'}
                            </td>
                            <td key={`${day.date}-${process}-qty`} className="px-2 py-2 text-center border">
                              {day.processes[process]?.qty || 0}
                            </td>
                          </>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <Link href="/production/logs">
                <span className="text-sm text-primary hover:underline cursor-pointer">
                  View All Production Logs →
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/production/assembly-parts">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">View All Parts</h3>
                    <p className="text-sm text-muted-foreground">Browse assembly parts list</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/production/upload">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Upload Parts</h3>
                    <p className="text-sm text-muted-foreground">Import from Excel file</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
    </div>
  );
}

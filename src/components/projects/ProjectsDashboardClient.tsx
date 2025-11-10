'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Building2, CheckCircle, Clock, Circle } from 'lucide-react';
import Link from 'next/link';

interface BuildingStage {
  stageCode: string;
  stageName: string;
  status: 'completed' | 'pending' | 'not_started' | 'out_of_scope';
  eventDate?: string;
  clientCode?: string | null;
  clientResponse?: string | null;
  progressPercentage?: number;
  outOfScope?: boolean;
}

interface Building {
  id: string;
  designation: string;
  name: string;
  stages: BuildingStage[];
  completedCount: number;
  pendingCount: number;
  notStartedCount: number;
  progress: number;
  productionProgress: number;
  totalTonnage: number;
  completedTonnage: number;
}

interface Project {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
  contractDate: string | null;
  downPaymentDate: string | null;
  buildings: Building[];
}

export function ProjectsDashboardClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects-dashboard');
      if (response.ok) {
        const data = await response.json();
        console.log('Projects data received:', data);
        
        // Log stages for first project with buildings
        const projectWithBuildings = data.find((p: any) => p.buildings && p.buildings.length > 0);
        if (projectWithBuildings) {
          console.log('Sample project:', projectWithBuildings.name);
          console.log('Sample building:', projectWithBuildings.buildings[0]);
          console.log('Sample stages:', projectWithBuildings.buildings[0].stages);
        }
        
        setProjects(data);
      } else {
        const errorData = await response.json();
        console.error('API error:', errorData);
      }
    } catch (error) {
      console.error('Error fetching projects dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-white" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-white" />;
      case 'not_started':
        return <Circle className="h-4 w-4 text-white" />;
      case 'out_of_scope':
        return <span className="text-white font-bold text-lg">✕</span>;
      default:
        return <Circle className="h-4 w-4 text-white" />;
    }
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'not_started':
        return 'bg-gray-300';
      case 'out_of_scope':
        return 'bg-gray-800';
      default:
        return 'bg-gray-300';
    }
  };

  const getConnectorColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'not_started':
        return 'bg-gray-200';
      case 'out_of_scope':
        return 'bg-gray-400';
      default:
        return 'bg-gray-200';
    }
  };

  // Filter projects and buildings
  const filteredProjects = projects
    .filter((project) => selectedProject === 'all' || project.id === selectedProject)
    .map((project) => ({
      ...project,
      buildings: project.buildings.filter(
        (building) => selectedBuilding === 'all' || building.id === selectedBuilding
      ),
    }));

  // Get all buildings for filter dropdown
  const allBuildings = projects.flatMap((p) =>
    p.buildings.map((b) => ({
      id: b.id,
      label: `${p.projectNumber} - ${b.designation}`,
      projectId: p.id,
    }))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {/* Project Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Project</label>
              <select
                value={selectedProject}
                onChange={(e) => {
                  setSelectedProject(e.target.value);
                  setSelectedBuilding('all'); // Reset building filter when project changes
                }}
                className="w-full px-3 py-2 border rounded-md bg-white"
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectNumber} - {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Building Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Building</label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white"
                disabled={selectedProject !== 'all' && allBuildings.filter(b => b.projectId === selectedProject).length === 0}
              >
                <option value="all">All Buildings</option>
                {(selectedProject === 'all' ? allBuildings : allBuildings.filter(b => b.projectId === selectedProject)).map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            {(selectedProject !== 'all' || selectedBuilding !== 'all') && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedProject('all');
                    setSelectedBuilding('all');
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium">No projects found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        filteredProjects.map((project) => (
        <Card key={project.id} className="overflow-hidden">
          {/* Project Header */}
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-2xl font-bold hover:underline"
                  >
                    {project.projectNumber}
                  </Link>
                  <Badge
                    variant="outline"
                    className={
                      project.status === 'Active'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-gray-100 text-gray-800 border-gray-300'
                    }
                  >
                    {project.status}
                  </Badge>
                </div>
                <p className="text-lg text-gray-700">{project.name}</p>
              </div>
            </div>
          </CardHeader>

          {/* Buildings */}
          <CardContent className="p-6 space-y-6">
            {/* Project Dates Card */}
            {(project.contractDate || project.downPaymentDate) && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Project Milestones
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.contractDate && (
                    <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Contract Signed</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {new Date(project.contractDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {project.downPaymentDate && (
                    <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Down Payment Received</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {new Date(project.downPaymentDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Buildings List */}
            {project.buildings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No buildings configured for this project</p>
              </div>
            ) : (
              <div className="space-y-6">
                {project.buildings.map((building) => (
                  <div
                    key={building.id}
                    className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                  >
                    {/* Building Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-gray-600" />
                        <h3 className="font-semibold text-lg">
                          {building.designation} - {building.name}
                        </h3>
                      </div>
                      <div className="text-sm text-gray-600">
                        Progress: <span className="font-semibold">{Math.round(building.progress)}%</span>
                      </div>
                    </div>

                    {/* Building Timeline */}
                    <div className="relative">
                      <div className="flex items-center justify-between gap-1">
                        {building.stages.map((stage, index) => {
                          console.log('Stage:', stage.stageName, 'Progress:', stage.progressPercentage, 'Status:', stage.status);
                          
                          // Determine actual status based on progress
                          const actualStatus = stage.progressPercentage !== undefined && stage.progressPercentage >= 100 
                            ? 'completed' 
                            : stage.status;
                          
                          return (
                          <React.Fragment key={stage.stageCode}>
                            {/* Stage Circle */}
                            <div className="flex flex-col items-center flex-shrink-0 group relative">
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center ${getStageColor(
                                  actualStatus
                                )} transition-transform hover:scale-110 relative`}
                              >
                                {stage.progressPercentage !== undefined && stage.progressPercentage > 0 ? (
                                  <span className="text-xs font-bold text-white">
                                    {Math.round(stage.progressPercentage)}%
                                  </span>
                                ) : (
                                  getStageIcon(actualStatus)
                                )}
                              </div>

                              {/* Tooltip */}
                              <div className="absolute top-14 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                  <div className="font-medium">{stage.stageName}</div>
                                  {stage.eventDate && (
                                    <div className="text-green-300 font-semibold">
                                      Started: {new Date(stage.eventDate).toLocaleDateString()}
                                    </div>
                                  )}
                                  {stage.progressPercentage !== undefined && stage.progressPercentage > 0 && (
                                    <div className="text-blue-300">
                                      Progress: {Math.round(stage.progressPercentage)}%
                                    </div>
                                  )}
                                  {stage.clientCode && (
                                    <div className="mt-1">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        stage.clientCode === 'A' 
                                          ? 'bg-green-500 text-white' 
                                          : stage.clientCode === 'B'
                                          ? 'bg-yellow-500 text-white'
                                          : stage.clientCode === 'C'
                                          ? 'bg-red-500 text-white'
                                          : 'bg-gray-500 text-white'
                                      }`}>
                                        Code {stage.clientCode}
                                      </span>
                                    </div>
                                  )}
                                  {stage.clientResponse && (
                                    <div className="text-gray-300 text-[10px] mt-0.5">
                                      {stage.clientResponse}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Connector Line */}
                            {index < building.stages.length - 1 && (
                              <div
                                className={`flex-1 h-1 ${getConnectorColor(actualStatus)}`}
                              />
                            )}
                          </React.Fragment>
                        );
                        })}
                      </div>

                      {/* Stage Labels */}
                      <div className="flex items-start justify-between gap-1 mt-3">
                        {building.stages.map((stage) => (
                          <div
                            key={stage.stageCode}
                            className="flex-shrink-0 w-12 text-center"
                          >
                            <p className={`text-[10px] leading-tight font-medium ${
                              stage.outOfScope ? 'text-gray-500' : 'text-gray-700'
                            }`}>
                              {stage.outOfScope ? 'Out of Scope' : stage.stageName}
                            </p>
                            {stage.clientCode && (
                              <div className={`mt-1 text-[9px] font-bold rounded px-1 ${
                                stage.clientCode === 'A' 
                                  ? 'bg-green-100 text-green-700' 
                                  : stage.clientCode === 'B'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : stage.clientCode === 'C'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {stage.clientCode}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Production Progress Bar */}
                    {building.totalTonnage > 0 && (
                      <div className="mt-4 pt-3 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-xs font-medium text-gray-700">Production Progress</span>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {building.completedTonnage.toFixed(2)} / {building.totalTonnage.toFixed(2)} tons
                            </div>
                          </div>
                          <span className="text-xs font-bold text-blue-600">
                            {Math.round(building.productionProgress)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                            style={{ width: `${building.productionProgress}%` }}
                          >
                            {building.productionProgress > 15 && (
                              <span className="text-[10px] font-bold text-white">
                                {Math.round(building.productionProgress)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href="/production/logs" className="text-[10px] text-blue-600 hover:underline mt-1 inline-block">
                          View Production Logs →
                        </Link>
                      </div>
                    )}

                    {/* Building Summary */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-gray-600">Completed: {building.completedCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-gray-600">Pending: {building.pendingCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-gray-300" />
                        <span className="text-gray-600">Not Started: {building.notStartedCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )))}
    </div>
  );
}

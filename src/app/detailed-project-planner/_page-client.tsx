'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { PlannerProjectData } from './lib/types';
import { Plus, Calendar, FolderKanban, Trash2, Edit2, MoreVertical } from 'lucide-react';

export default function DetailedProjectPlannerPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<PlannerProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/detailed-project-planner/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const res = await fetch('/detailed-project-planner/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null,
        }),
      });

      if (res.ok) {
        const project = await res.json();
        setShowCreateDialog(false);
        setNewProjectName('');
        setNewProjectDescription('');
        router.push(`/detailed-project-planner/${project.id}`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project and all its tasks?')) return;

    try {
      const res = await fetch(`/detailed-project-planner/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-700';
      case 'Completed': return 'bg-blue-100 text-blue-700';
      case 'On Hold': return 'bg-yellow-100 text-yellow-700';
      case 'Archived': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <ResponsiveLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FolderKanban className="w-7 h-7 text-blue-600" />
              Detailed Project Planner
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              MS Project-style scheduling with Gantt charts for steel fabrication projects
            </p>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Project Plan
          </button>
        </div>

        {/* Project Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <Calendar className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium mb-1">No project plans yet</p>
            <p className="text-sm mb-4">Create your first project plan to get started</p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Project Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => router.push(`/detailed-project-planner/${project.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    <button
                      onClick={e => handleDeleteProject(project.id, e)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {project.description && (
                  <p className="text-[13px] text-gray-500 mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-[12px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {project.startDate
                      ? new Date(project.startDate).toLocaleDateString()
                      : 'No dates'}
                  </span>
                  <span>
                    {(project as any)._count?.tasks || 0} tasks
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Project Dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-semibold mb-4">Create New Project Plan</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="e.g., Al Othaim Circle Project"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreateProject();
                      if (e.key === 'Escape') setShowCreateDialog(false);
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={e => setNewProjectDescription(e.target.value)}
                    placeholder="Optional project description..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewProjectName('');
                    setNewProjectDescription('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create & Open
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
}

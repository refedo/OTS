'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { ProjectPlanner } from '../components/ProjectPlanner';
import { PlannerProjectData } from '../lib/types';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectPlannerPage({ params }: PageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const [projects, setProjects] = useState<PlannerProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

    fetchProjects();
  }, []);

  if (isLoading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-[calc(100vh-80px)] text-gray-400">
          Loading...
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="h-[calc(100vh-40px)] flex flex-col">
        {/* Back button */}
        <div className="flex items-center gap-3 mb-2 flex-shrink-0">
          <button
            onClick={() => router.push('/detailed-project-planner')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </button>
        </div>

        {/* Main Planner */}
        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <ProjectPlanner
            projects={projects}
            initialProjectId={projectId}
          />
        </div>
      </div>
    </ResponsiveLayout>
  );
}

'use client';

import React from 'react';
import { CheckCircle, Clock, Circle } from 'lucide-react';
import Link from 'next/link';

interface ProjectTimelineVisualProps {
  projectId: string;
  projectNumber: string;
  projectName: string;
  stages: {
    stageCode: string;
    stageName: string;
    status: 'completed' | 'pending' | 'not_started';
    eventDate?: string;
  }[];
  progress: number;
  completedCount: number;
  pendingCount: number;
  notStartedCount: number;
}

export function ProjectTimelineVisual({
  projectId,
  projectNumber,
  projectName,
  stages,
  progress,
  completedCount,
  pendingCount,
  notStartedCount,
}: ProjectTimelineVisualProps) {
  const getStageIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-white" />;
      case 'pending':
        return <Clock className="h-6 w-6 text-white" />;
      default:
        return <Circle className="h-6 w-6 text-white" />;
    }
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getConnectorColor = (currentStatus: string, nextStatus: string) => {
    if (currentStatus === 'completed') {
      return 'bg-green-500';
    }
    return 'bg-gray-300';
  };

  console.log('ProjectTimelineVisual render:', { projectNumber, stagesCount: stages.length, stages });

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-white hover:shadow-md transition-shadow">
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${projectId}/timeline`}
          className="flex items-center gap-2 hover:underline"
        >
          <h3 className="font-semibold text-lg">{projectNumber}</h3>
          <span className="text-sm text-gray-600">{projectName}</span>
        </Link>
      </div>

      {/* Timeline */}
      <div className="relative">
        {stages.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No stages configured</p>
        ) : (
          <div className="flex items-center justify-between gap-1">
            {stages.map((stage, index) => (
            <React.Fragment key={stage.stageCode}>
              {/* Stage Circle */}
              <div className="flex flex-col items-center flex-shrink-0 group relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${getStageColor(
                    stage.status
                  )} transition-transform hover:scale-110`}
                >
                  {getStageIcon(stage.status)}
                </div>
                
                {/* Tooltip */}
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                  <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                    <div className="font-medium">{stage.stageName}</div>
                    {stage.eventDate && (
                      <div className="text-gray-300">
                        {new Date(stage.eventDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < stages.length - 1 && (
                <div
                  className={`flex-1 h-1 ${getConnectorColor(
                    stage.status,
                    stages[index + 1].status
                  )}`}
                />
              )}
            </React.Fragment>
          ))}
          </div>
        )}

        {/* Stage Labels (abbreviated) */}
        {stages.length > 0 && (
          <div className="flex items-start justify-between gap-1 mt-2">
            {stages.map((stage) => (
              <div
                key={stage.stageCode}
                className="flex-shrink-0 w-10 text-center"
              >
                <p className="text-[10px] text-gray-600 leading-tight">
                  {stage.stageName.split(' ').map(word => word[0]).join('')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress Summary */}
      <div className="flex items-center justify-between text-sm pt-2 border-t">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">Completed: {completedCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-600">Pending: {pendingCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <span className="text-gray-600">Not Started: {notStartedCount}</span>
          </div>
        </div>
        <div className="font-semibold text-gray-700">Progress: {Math.round(progress)}%</div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, Clock, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OperationEvent {
  id: string;
  stage: string;
  eventDate: string;
  status: string;
  description?: string;
  eventSource: string;
}

interface StageConfig {
  stageCode: string;
  stageName: string;
  orderIndex: number;
  color: string;
  icon: string;
  isMandatory: boolean;
  description?: string;
}

interface TimelineItem {
  stage: string;
  stageName: string;
  orderIndex: number;
  color: string;
  icon: string;
  isMandatory: boolean;
  description?: string;
  event: OperationEvent | null;
}

interface OperationTimelineProps {
  timeline: TimelineItem[];
  mode?: 'horizontal' | 'vertical';
  showDetails?: boolean;
}

export function OperationTimeline({
  timeline,
  mode = 'horizontal',
  showDetails = true,
}: OperationTimelineProps) {
  const [selectedStage, setSelectedStage] = useState<TimelineItem | null>(null);

  const getStatusIcon = (item: TimelineItem) => {
    if (!item.event) {
      return <div className="w-3 h-3 rounded-full bg-gray-300" />;
    }

    switch (item.event.status) {
      case 'Completed':
        return <Check className="w-4 h-4 text-white" />;
      case 'Pending':
        return <Clock className="w-4 h-4 text-white" />;
      case 'Delayed':
        return <AlertCircle className="w-4 h-4 text-white" />;
      case 'Failed':
        return <X className="w-4 h-4 text-white" />;
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-300" />;
    }
  };

  const getStatusColor = (item: TimelineItem) => {
    if (!item.event) {
      return 'bg-gray-300';
    }

    switch (item.event.status) {
      case 'Completed':
        return 'bg-green-500';
      case 'Pending':
        return 'bg-yellow-500';
      case 'Delayed':
        return 'bg-red-500';
      case 'Failed':
        return 'bg-red-600';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      Completed: 'bg-green-100 text-green-800',
      Pending: 'bg-yellow-100 text-yellow-800',
      Delayed: 'bg-red-100 text-red-800',
      Failed: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={cn('text-xs', variants[status] || 'bg-gray-100 text-gray-800')}>
        {status}
      </Badge>
    );
  };

  if (mode === 'vertical') {
    return (
      <div className="space-y-4">
        {timeline.map((item, index) => (
          <div key={item.stage} className="flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  getStatusColor(item)
                )}
              >
                {getStatusIcon(item)}
              </div>
              {index < timeline.length - 1 && (
                <div className="w-0.5 h-16 bg-gray-200 my-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-8">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{item.stageName}</h4>
                {item.event && getStatusBadge(item.event.status)}
              </div>
              {item.event ? (
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Date: {format(new Date(item.event.eventDate), 'MMM dd, yyyy')}</p>
                  {item.event.description && <p>{item.event.description}</p>}
                  <p className="text-xs text-gray-500">Source: {item.event.eventSource}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Not started</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Horizontal mode
  return (
    <div className="space-y-6">
      {/* Timeline visualization */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {timeline.map((item, index) => (
            <React.Fragment key={item.stage}>
              {/* Stage circle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSelectedStage(item)}
                      className={cn(
                        'relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110',
                        getStatusColor(item),
                        selectedStage?.stage === item.stage && 'ring-4 ring-blue-300'
                      )}
                    >
                      {getStatusIcon(item)}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-semibold">{item.stageName}</p>
                      {item.event ? (
                        <>
                          <p className="text-xs text-gray-500">
                            {format(new Date(item.event.eventDate), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-xs">{item.event.status}</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">Not started</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Connecting line */}
              {index < timeline.length - 1 && (
                <div className="flex-1 h-1 bg-gray-200 mx-2">
                  {item.event && item.event.status === 'Completed' && (
                    <div className="h-full bg-green-500" />
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Stage labels */}
        <div className="flex items-start justify-between mt-4">
          {timeline.map((item) => (
            <div key={item.stage} className="flex-1 text-center px-2">
              <p className="text-xs font-medium text-gray-700 line-clamp-2">
                {item.stageName}
              </p>
              {item.event && (
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(item.event.eventDate), 'MMM dd')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Details panel */}
      {showDetails && selectedStage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedStage.stageName}</span>
              {selectedStage.event && getStatusBadge(selectedStage.event.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedStage.event ? (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Event Date</p>
                  <p className="text-sm">
                    {format(new Date(selectedStage.event.eventDate), 'MMMM dd, yyyy')}
                  </p>
                </div>
                {selectedStage.event.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <p className="text-sm">{selectedStage.event.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Source</p>
                  <p className="text-sm capitalize">{selectedStage.event.eventSource.replace('_', ' ')}</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <Info className="w-4 h-4" />
                <p className="text-sm">This stage has not been started yet.</p>
              </div>
            )}
            {selectedStage.description && (
              <div>
                <p className="text-sm font-medium text-gray-500">Stage Information</p>
                <p className="text-sm text-gray-600">{selectedStage.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>
              Completed: {timeline.filter((t) => t.event?.status === 'Completed').length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>
              Pending: {timeline.filter((t) => t.event?.status === 'Pending').length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <span>
              Not Started: {timeline.filter((t) => !t.event).length}
            </span>
          </div>
        </div>
        <div>
          Progress: {Math.round((timeline.filter((t) => t.event?.status === 'Completed').length / timeline.length) * 100)}%
        </div>
      </div>
    </div>
  );
}

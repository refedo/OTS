'use client';

import { HeartPulse } from 'lucide-react';
import { SystemHealthDashboard } from '@/components/events/SystemHealthDashboard';

export default function SystemHealthPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <HeartPulse className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-semibold">System Health</h1>
          <p className="text-sm text-muted-foreground">
            Monitor cron jobs, integration syncs, and system errors
          </p>
        </div>
      </div>

      <SystemHealthDashboard />
    </div>
  );
}

'use client';

import { useServiceWorker } from '@/hooks/useServiceWorker';
import { PwaInstallPrompt } from '@/components/notifications/PwaInstallPrompt';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const { updateAvailable, applyUpdate } = useServiceWorker();

  return (
    <>
      {children}
      <PwaInstallPrompt />
      {updateAvailable && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground rounded-lg shadow-lg px-4 py-2 flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <span className="text-sm">A new version is available</span>
          <Button size="sm" variant="secondary" onClick={applyUpdate}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Update
          </Button>
        </div>
      )}
    </>
  );
}

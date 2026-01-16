'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Wrench, Sparkles, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type ChangelogVersion = {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch';
  mainTitle: string;
  highlights: string[];
  changes: {
    added: Array<{ title: string; items: string[] }>;
    fixed: string[];
    changed: string[];
  };
};

export function UpdateNotificationDialog() {
  const [open, setOpen] = useState(false);
  const [latestVersion, setLatestVersion] = useState<ChangelogVersion | null>(null);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const response = await fetch('/api/system/latest-version');
      if (response.ok) {
        const data = await response.json();
        
        // Check if user has seen this version
        const lastSeenVersion = localStorage.getItem('lastSeenVersion');
        
        if (data.version && lastSeenVersion !== data.version) {
          setLatestVersion(data);
          setOpen(true);
        }
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  };

  const handleClose = () => {
    if (latestVersion) {
      // Mark this version as seen
      localStorage.setItem('lastSeenVersion', latestVersion.version);
      
      // Also update on server
      fetch('/api/system/mark-version-seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: latestVersion.version }),
      }).catch(err => console.error('Failed to mark version as seen:', err));
    }
    setOpen(false);
  };

  if (!latestVersion) return null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'major':
        return 'bg-purple-500 text-white';
      case 'minor':
        return 'bg-blue-500 text-white';
      case 'patch':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl">What's New in OTS™</DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Badge className={getTypeColor(latestVersion.type)}>
                    v{latestVersion.version}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{latestVersion.date}</span>
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-180px)] pr-4">
          <div className="space-y-6">
            {/* Main Title */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {latestVersion.mainTitle}
              </h3>
            </div>

            {/* Highlights */}
            {latestVersion.highlights.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  Key Highlights
                </h4>
                <ul className="space-y-2">
                  {latestVersion.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* New Features */}
            {latestVersion.changes.added.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  New Features
                </h4>
                <div className="space-y-4">
                  {latestVersion.changes.added.map((feature, idx) => (
                    <div key={idx} className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <h5 className="font-medium text-sm mb-2 text-green-900 dark:text-green-100">
                        {feature.title}
                      </h5>
                      <ul className="space-y-1 ml-4">
                        {feature.items.map((item, itemIdx) => (
                          <li key={itemIdx} className="text-sm text-green-800 dark:text-green-200 list-disc">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bug Fixes */}
            {latestVersion.changes.fixed.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <Wrench className="h-4 w-4" />
                  Bug Fixes
                </h4>
                <ul className="space-y-2">
                  {latestVersion.changes.fixed.map((fix, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-orange-50 dark:bg-orange-950/30 p-2 rounded border border-orange-200 dark:border-orange-800">
                      <Wrench className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-orange-800 dark:text-orange-200">{fix}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {latestVersion.changes.changed.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <AlertCircle className="h-4 w-4" />
                  Improvements
                </h4>
                <ul className="space-y-2">
                  {latestVersion.changes.changed.map((change, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 p-2 rounded border border-blue-200 dark:border-blue-800">
                      <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-blue-800 dark:text-blue-200">{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="link"
            onClick={() => {
              handleClose();
              window.location.href = '/changelog';
            }}
            className="text-sm"
          >
            View Full Changelog
          </Button>
          <Button onClick={handleClose}>
            Got it, thanks!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

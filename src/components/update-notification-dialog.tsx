'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, X } from 'lucide-react';

type ChangelogVersion = {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch';
  mainTitle: string;
  highlights: string[];
  changes: {
    added: Array<string | { title: string; items: string[] }>;
    fixed: Array<{ title: string; items: string[] } | string>;
    changed: string[];
  };
  alreadySeen?: boolean;
};

export function UpdateNotificationDialog() {
  const [open, setOpen] = useState(false);
  const [latestVersion, setLatestVersion] = useState<ChangelogVersion | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const response = await fetch('/api/system/latest-version');
      if (response.ok) {
        const data: ChangelogVersion = await response.json();
        if (data.version && !data.alreadySeen) {
          setLatestVersion(data);
          setOpen(true);
        }
      }
    } catch {
      // Non-critical
    }
  };

  const markSeen = (version: string) => {
    localStorage.setItem('lastSeenVersion', version);
    fetch('/api/system/mark-version-seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version }),
    }).catch(() => {});
  };

  const handleClose = () => {
    if (latestVersion && dontShowAgain) {
      markSeen(latestVersion.version);
    }
    setOpen(false);
  };

  if (!latestVersion) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-slate-100 rounded-lg">
              <Sparkles className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">What's New in OTS™</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  v{latestVersion.version}
                </span>
                <span className="text-xs text-slate-400">{latestVersion.date}</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-7 w-7 text-slate-400 hover:text-slate-600 -mt-0.5 -mr-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Release title */}
        <div className="px-5 pb-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            {latestVersion.type === 'major' ? 'Major Release' : latestVersion.type === 'minor' ? 'New in this release' : 'Improvements & fixes'}
          </p>
          <p className="text-sm font-semibold text-slate-800 leading-snug mb-4">
            {latestVersion.mainTitle}
          </p>
          {latestVersion.highlights.length > 0 && (
            <ul className="space-y-2.5">
              {latestVersion.highlights.map((highlight, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                  <span className="text-sm text-slate-600 leading-snug">{highlight}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              className="h-3.5 w-3.5"
            />
            <label
              htmlFor="dont-show-again"
              className="text-xs text-slate-400 cursor-pointer select-none"
            >
              Don&apos;t show again
            </label>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { handleClose(); window.location.href = '/changelog'; }}
              className="text-xs text-slate-400 hover:text-slate-600 h-7 px-2"
            >
              View Changelog
            </Button>
            <Button
              size="sm"
              onClick={handleClose}
              className="h-7 text-xs px-3"
            >
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

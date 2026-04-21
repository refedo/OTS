'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, X, Zap, Wrench, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const TYPE_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  major: { label: 'Major Release', bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  minor: { label: 'New Features', bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  patch: { label: 'Improvements', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

const GRADIENT_STYLES: Record<string, string> = {
  major: 'from-violet-600 via-purple-600 to-indigo-600',
  minor: 'from-sky-600 via-sky-500 to-blue-600',
  patch: 'from-emerald-600 via-emerald-500 to-teal-600',
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

  const typeStyle = TYPE_STYLES[latestVersion.type] ?? TYPE_STYLES.patch;
  const gradientStyle = GRADIENT_STYLES[latestVersion.type] ?? GRADIENT_STYLES.patch;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl">

        {/* Gradient Hero Header */}
        <div className={cn('relative bg-gradient-to-br p-6 text-white overflow-hidden', gradientStyle)}>
          <div className="absolute -top-4 -right-4 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-6 -left-6 w-36 h-36 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold opacity-90">What&apos;s New in OTS™</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20 -mt-0.5 -mr-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', typeStyle.bg, typeStyle.text)}>
                {typeStyle.label}
              </span>
              <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded-md">
                v{latestVersion.version}
              </span>
            </div>

            <h2 className="text-lg font-bold leading-snug">{latestVersion.mainTitle}</h2>
            <p className="text-xs opacity-70 mt-1">{latestVersion.date}</p>
          </div>
        </div>

        {/* Highlights */}
        {latestVersion.highlights.length > 0 && (
          <div className="px-5 py-4 bg-white">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Highlights</p>
            <ul className="space-y-2.5">
              {latestVersion.highlights.slice(0, 4).map((highlight, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className={cn('mt-[5px] h-1.5 w-1.5 rounded-full flex-shrink-0', typeStyle.dot)} />
                  <span className="text-sm text-slate-600 leading-snug">{highlight}</span>
                </li>
              ))}
            </ul>

            {/* Quick stats */}
            {(latestVersion.changes.added.length > 0 || latestVersion.changes.fixed.length > 0 || latestVersion.changes.changed.length > 0) && (
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100">
                {latestVersion.changes.added.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-sky-500" />
                    <span className="text-xs font-medium text-slate-600">
                      {latestVersion.changes.added.length} added
                    </span>
                  </div>
                )}
                {latestVersion.changes.fixed.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Wrench className="h-3 w-3 text-emerald-500" />
                    <span className="text-xs font-medium text-slate-600">
                      {latestVersion.changes.fixed.length} fixed
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/80">
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
              className="text-xs text-slate-500 hover:text-slate-700 h-7 px-2 gap-1"
            >
              Full Changelog
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              onClick={handleClose}
              className={cn('h-7 text-xs px-4 text-white bg-gradient-to-r', gradientStyle, 'hover:opacity-90')}
            >
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

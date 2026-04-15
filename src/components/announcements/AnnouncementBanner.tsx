'use client';

import { useState, useEffect, useCallback } from 'react';
import { Megaphone, X, ChevronLeft, ChevronRight, Globe, Users, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Announcement {
  id: string;
  serialNumber: string;
  subject: string;
  content: string;
  startDate: string;
  endDate: string;
  bannerEnabled: boolean;
  targetType: 'ALL' | 'SPECIFIC';
  isDismissed: boolean;
  createdBy: { id: string; name: string };
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements/active');
      if (!res.ok) return;
      const data: Announcement[] = await res.json();
      // Only show banners that are enabled and not dismissed server-side
      const banners = data.filter((a) => a.bannerEnabled && !a.isDismissed);
      setAnnouncements(banners);
      setCurrentIndex(0);
    } catch {
      // silently fail — banner is non-critical
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
    // Re-check every 5 minutes
    const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAnnouncements]);

  const visible = announcements.filter((a) => !dismissed.has(a.id));

  const handleDismiss = async (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    try {
      await fetch(`/api/announcements/${id}/dismiss`, { method: 'POST' });
    } catch {
      // best effort
    }
  };

  if (!loaded || visible.length === 0) return null;

  const safeIndex = Math.min(currentIndex, visible.length - 1);
  const current = visible[safeIndex];
  if (!current) return null;

  const hasMultiple = visible.length > 1;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-full max-w-sm',
        'animate-in slide-in-from-bottom-4 fade-in duration-300'
      )}
    >
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 text-white shadow-2xl overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-2 -right-2 w-16 h-16 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-4 pt-3 pb-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Megaphone className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold tracking-wide">Announcement</span>
              <span className="text-xs text-violet-200 font-mono bg-white/10 rounded px-1">
                {current.serialNumber}
              </span>
            </div>
            {current.targetType === 'SPECIFIC' ? (
              <Users className="h-3 w-3 text-violet-200" />
            ) : (
              <Globe className="h-3 w-3 text-violet-200" />
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDismiss(current.id)}
            className="h-6 w-6 p-0 text-violet-200 hover:text-white hover:bg-white/20 rounded-full"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Body */}
        <div className="relative px-4 pt-2 pb-3">
          <h4 className="font-semibold text-sm leading-snug mb-1">{current.subject}</h4>
          <p className="text-xs text-violet-100 leading-relaxed line-clamp-3">{current.content}</p>
          <p className="text-xs text-violet-200 mt-2">— {current.createdBy.name}</p>
        </div>

        {/* Footer */}
        <div className="relative flex items-center justify-between px-4 py-2 border-t border-white/20 bg-white/5">
          <div className="flex items-center gap-1">
            {hasMultiple && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={safeIndex === 0}
                  className="h-6 w-6 p-0 text-violet-200 hover:text-white hover:bg-white/20 disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-violet-200">
                  {safeIndex + 1} / {visible.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentIndex((i) => Math.min(visible.length - 1, i + 1))}
                  disabled={safeIndex === visible.length - 1}
                  className="h-6 w-6 p-0 text-violet-200 hover:text-white hover:bg-white/20 disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {!hasMultiple && (
              <span className="text-xs text-violet-200">
                Until {new Date(current.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismiss(current.id)}
              className="h-6 px-2 text-xs text-violet-200 hover:text-white hover:bg-white/20"
            >
              Dismiss
            </Button>
            <Link href="/notifications/announcements">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-white bg-white/20 hover:bg-white/30"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View All
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

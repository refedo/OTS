'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { History, Bookmark, BookmarkCheck, X, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface LinkEntry {
  url: string;
  label: string;
  visitedAt: string;
}

interface BookmarkEntry {
  url: string;
  label: string;
  addedAt: string;
}

const RECENT_KEY = 'ots_recent_links';
const BOOKMARK_KEY = 'ots_bookmarks';
const MAX_RECENT = 15;

function getPageLabel(pathname: string): string {
  const map: Record<string, string> = {
    '/': 'Dashboard',
    '/dashboard': 'Dashboard',
    '/tasks': 'Tasks',
    '/projects': 'Projects',
    '/buildings': 'Buildings',
    '/planning': 'Planning',
    '/production': 'Production',
    '/production/mass-log': 'Mass Log',
    '/supply-chain': 'Supply Chain',
    '/supply-chain/lcr': 'LCR',
    '/supply-chain/lcr/reports': 'LCR Reports',
    '/supply-chain/purchase-orders': 'Purchase Orders',
    '/qc': 'Quality Control',
    '/reports': 'Reports',
    '/documents': 'Documents',
    '/timeline': 'Timeline',
    '/financial': 'Financial',
    '/governance': 'Governance',
    '/risk-dashboard': 'Risk Dashboard',
    '/notifications': 'Notifications',
    '/settings': 'Settings',
    '/users': 'Users',
    '/roles': 'Roles',
    '/organization': 'Organization',
    '/backlog': 'Backlog',
    '/itp': 'ITP',
    '/wps': 'WPS',
    '/events': 'Events',
    '/business-planning': 'Business Planning',
    '/ceo-control-center': 'CEO Control Center',
    '/operations': 'Operations',
    '/operations-control': 'Operations Control',
    '/knowledge-center': 'Knowledge Center',
    '/ai-assistant': 'AI Assistant',
  };
  if (map[pathname]) return map[pathname];
  // Try prefix match
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const base = '/' + segments.slice(0, 2).join('/');
    if (map[base]) return map[base];
  }
  if (segments.length >= 1) {
    const base = '/' + segments[0];
    if (map[base]) return map[base];
  }
  // Fallback: capitalize segments
  return segments.map(s => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(' › ') || 'Home';
}

function loadRecent(): LinkEntry[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveRecent(entries: LinkEntry[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

function loadBookmarks(): BookmarkEntry[] {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARK_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveBookmarks(entries: BookmarkEntry[]) {
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export default function RecentLinksPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<LinkEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [tab, setTab] = useState<'recent' | 'bookmarks'>('recent');

  // Load bookmarks immediately on mount so the amber dot shows correctly
  useEffect(() => {
    setBookmarks(loadBookmarks());
    setRecent(loadRecent());
  }, []);

  // Track page visits
  useEffect(() => {
    if (!pathname || pathname.startsWith('/api') || pathname === '/login') return;
    const label = getPageLabel(pathname);
    const newEntry: LinkEntry = { url: pathname, label, visitedAt: new Date().toISOString() };
    const prev = loadRecent();
    // Remove duplicate for same URL
    const filtered = prev.filter(e => e.url !== pathname);
    const updated = [newEntry, ...filtered].slice(0, MAX_RECENT);
    saveRecent(updated);
    setRecent(updated);
  }, [pathname]);

  // Load on open
  useEffect(() => {
    if (open) {
      setRecent(loadRecent());
      setBookmarks(loadBookmarks());
    }
  }, [open]);

  const isBookmarked = useCallback(
    (url: string) => bookmarks.some(b => b.url === url),
    [bookmarks]
  );

  const toggleBookmark = useCallback((url: string, label: string) => {
    const prev = loadBookmarks();
    let updated: BookmarkEntry[];
    if (prev.some(b => b.url === url)) {
      updated = prev.filter(b => b.url !== url);
    } else {
      updated = [{ url, label, addedAt: new Date().toISOString() }, ...prev];
    }
    saveBookmarks(updated);
    setBookmarks(updated);
  }, []);

  const removeBookmark = useCallback((url: string) => {
    const updated = loadBookmarks().filter(b => b.url !== url);
    saveBookmarks(updated);
    setBookmarks(updated);
  }, []);

  const removeRecent = useCallback((url: string) => {
    const updated = loadRecent().filter(e => e.url !== url);
    saveRecent(updated);
    setRecent(updated);
  }, []);

  const currentLabel = getPageLabel(pathname ?? '');
  const currentBookmarked = isBookmarked(pathname ?? '');
  const hasItems = tab === 'recent' ? recent.length > 0 : bookmarks.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Recent pages &amp; bookmarks"
          className={cn(
            'text-muted-foreground hover:text-foreground hover:bg-accent',
            bookmarks.length > 0 && 'relative'
          )}
        >
          <History className="h-5 w-5" />
          {bookmarks.length > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {/* Header with tabs */}
        <div className="flex items-center border-b">
          <button
            onClick={() => setTab('recent')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors',
              tab === 'recent'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            Recent
          </button>
          <button
            onClick={() => setTab('bookmarks')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors',
              tab === 'bookmarks'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Star className="h-3.5 w-3.5" />
            Bookmarks
            {bookmarks.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-1.5 leading-4">
                {bookmarks.length}
              </span>
            )}
          </button>
        </div>

        {/* Bookmark current page button */}
        <div className="px-3 py-2 border-b bg-muted/30">
          <button
            onClick={() => toggleBookmark(pathname ?? '/', currentLabel)}
            className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {currentBookmarked ? (
              <BookmarkCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            ) : (
              <Bookmark className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">
              {currentBookmarked ? 'Remove bookmark for this page' : 'Bookmark this page'}
            </span>
            <span className="truncate text-xs opacity-60 ml-auto max-w-[100px]">{currentLabel}</span>
          </button>
        </div>

        <ScrollArea className="max-h-72">
          {!hasItems ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {tab === 'recent' ? (
                <>
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No recent pages yet
                </>
              ) : (
                <>
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No bookmarks yet
                  <p className="text-xs mt-1 opacity-60">Bookmark pages you visit often</p>
                </>
              )}
            </div>
          ) : (
            <div className="p-1">
              {tab === 'recent'
                ? recent.map((entry) => (
                    <div key={entry.url + entry.visitedAt} className="flex items-center gap-1 group rounded-md hover:bg-accent/50">
                      <Link
                        href={entry.url}
                        onClick={() => setOpen(false)}
                        className="flex-1 flex items-center gap-2 px-2 py-2 text-sm min-w-0"
                      >
                        <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{entry.label}</span>
                        <span className="text-xs text-muted-foreground truncate opacity-0 group-hover:opacity-100 ml-auto shrink-0">
                          {entry.url}
                        </span>
                      </Link>
                      <button
                        onClick={() => toggleBookmark(entry.url, entry.label)}
                        title={isBookmarked(entry.url) ? 'Remove bookmark' : 'Bookmark'}
                        className="p-1.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-500 transition-all shrink-0"
                      >
                        {isBookmarked(entry.url)
                          ? <BookmarkCheck className="h-3.5 w-3.5 text-amber-500" />
                          : <Bookmark className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => removeRecent(entry.url)}
                        title="Remove from recent"
                        className="p-1.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                : bookmarks.map((entry) => (
                    <div key={entry.url} className="flex items-center gap-1 group rounded-md hover:bg-accent/50">
                      <Link
                        href={entry.url}
                        onClick={() => setOpen(false)}
                        className="flex-1 flex items-center gap-2 px-2 py-2 text-sm min-w-0"
                      >
                        <Star className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span className="truncate">{entry.label}</span>
                      </Link>
                      <button
                        onClick={() => removeBookmark(entry.url)}
                        title="Remove bookmark"
                        className="p-1.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

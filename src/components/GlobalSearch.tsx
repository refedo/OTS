'use client';

import { useState, useEffect, useRef, useCallback, type ComponentType, type SVGProps, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { Search, X, Loader2, ClipboardList, FolderKanban, Lightbulb, AlertCircle, BookOpen, FileWarning, FileSearch, Wrench, Package } from 'lucide-react';

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  url: string;
  type: string;
}

interface SearchResults {
  tasks: SearchResult[];
  projects: SearchResult[];
  initiatives: SearchResult[];
  weeklyIssues: SearchResult[];
  backlogItems: SearchResult[];
  ncrs: SearchResult[];
  rfis: SearchResult[];
  assemblyParts: SearchResult[];
  lcrEntries: SearchResult[];
}

const CATEGORY_META: Record<
  keyof SearchResults,
  { label: string; icon: IconComponent; color: string }
> = {
  tasks: { label: 'Tasks', icon: ClipboardList, color: 'text-blue-500' },
  projects: { label: 'Projects', icon: FolderKanban, color: 'text-emerald-500' },
  initiatives: { label: 'Initiatives', icon: Lightbulb, color: 'text-amber-500' },
  weeklyIssues: { label: 'Weekly Issues', icon: AlertCircle, color: 'text-orange-500' },
  backlogItems: { label: 'Backlog', icon: BookOpen, color: 'text-purple-500' },
  ncrs: { label: 'NCRs', icon: FileWarning, color: 'text-red-500' },
  rfis: { label: 'RFIs', icon: FileSearch, color: 'text-sky-500' },
  assemblyParts: { label: 'Assembly Marks', icon: Wrench, color: 'text-teal-500' },
  lcrEntries: { label: 'LCR Items', icon: Package, color: 'text-indigo-500' },
};

const EMPTY_RESULTS: SearchResults = {
  tasks: [],
  projects: [],
  initiatives: [],
  weeklyIssues: [],
  backlogItems: [],
  ncrs: [],
  rfis: [],
  assemblyParts: [],
  lcrEntries: [],
};

function statusBadgeVariant(badge: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const lower = badge.toLowerCase();
  if (lower === 'completed' || lower === 'closed' || lower === 'resolved') return 'secondary';
  if (lower === 'overdue' || lower === 'critical' || lower === 'rejected') return 'destructive';
  if (lower === 'active' || lower === 'in progress' || lower === 'open') return 'default';
  return 'outline';
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flatResults = Object.entries(results).flatMap(([, items]) => items as SearchResult[]);

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(EMPTY_RESULTS);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? EMPTY_RESULTS);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchResults]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(EMPTY_RESULTS);
      setFocusedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      const item = flatResults[focusedIndex];
      if (item) {
        setOpen(false);
        window.location.href = item.url;
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const totalCount = flatResults.length;
  const hasResults = totalCount > 0;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        title="Global Search (Ctrl+K)"
        className="text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <Search className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[15%] translate-y-0 p-0 gap-0 max-w-2xl overflow-hidden"
        >
          <DialogTitle className="sr-only">Global Search</DialogTitle>
          {/* Search input row */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            {loading ? (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocusedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search tasks, projects, NCRs, RFIs, assembly marks…"
              className="border-0 shadow-none focus-visible:ring-0 text-sm px-0 h-auto py-0.5 bg-transparent"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults(EMPTY_RESULTS); inputRef.current?.focus(); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <span className="text-xs text-muted-foreground hidden sm:block shrink-0">ESC to close</span>
          </div>

          {/* Results */}
          <ScrollArea className="max-h-[480px]">
            {!hasResults && query.length >= 2 && !loading && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No results for &quot;{query}&quot;
              </div>
            )}

            {!hasResults && query.length < 2 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
                Type at least 2 characters to search
                <p className="mt-1 text-xs opacity-60">Ctrl+K to open anytime</p>
              </div>
            )}

            {hasResults && (
              <div className="p-2">
                {(Object.keys(CATEGORY_META) as (keyof SearchResults)[]).map((key) => {
                  const items = results[key];
                  if (!items.length) return null;
                  const meta = CATEGORY_META[key];
                  const Icon = meta.icon;

                  return (
                    <div key={key} className="mb-1">
                      <div className="flex items-center gap-1.5 px-2 py-1.5">
                        <Icon className={cn('h-3.5 w-3.5', meta.color)} />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {meta.label}
                        </span>
                      </div>
                      {items.map((item) => {
                        const globalIndex = flatResults.indexOf(item);
                        const isFocused = focusedIndex === globalIndex;
                        return (
                          <Link
                            key={item.id}
                            href={item.url}
                            onClick={() => setOpen(false)}
                            onMouseEnter={() => setFocusedIndex(globalIndex)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
                              isFocused ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                            )}
                          >
                            <Icon className={cn('h-4 w-4 shrink-0', meta.color)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.title}</p>
                              {item.subtitle && (
                                <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                              )}
                            </div>
                            {item.badge && (
                              <Badge
                                variant={statusBadgeVariant(item.badge)}
                                className="shrink-0 text-xs"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}

                <p className="text-xs text-muted-foreground text-center pt-2 pb-1">
                  {totalCount} result{totalCount !== 1 ? 's' : ''} — use ↑↓ to navigate, Enter to open
                </p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';

export interface InvItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: string;
  defaultWhType: string;
}

interface ItemComboboxProps {
  value: string;
  onSelect: (item: InvItem | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** If provided, filter locally — no API call */
  items?: InvItem[];
}

export function ItemCombobox({
  value,
  onSelect,
  disabled = false,
  placeholder = 'Search items...',
  className,
  items: preloadedItems,
}: ItemComboboxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InvItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Show label of currently selected item
  const selectedLabel = (() => {
    if (!value) return '';
    // Look in preloaded or results
    const all = preloadedItems ?? results;
    const found = all.find(i => i.id === value);
    return found ? `${found.code} — ${found.name}` : value;
  })();

  // Initialise display with selected value label
  useEffect(() => {
    if (!value) {
      setQuery('');
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = (input: string) => {
    setQuery(input);

    if (!input.trim() || input.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    // Local filter mode
    if (preloadedItems) {
      const q = input.toLowerCase();
      const filtered = preloadedItems.filter(
        i => i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q),
      );
      setResults(filtered.slice(0, 30));
      setOpen(true);
      return;
    }

    // API mode with debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/inv/items?activeOnly=true&search=${encodeURIComponent(input)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data.slice(0, 30) : []);
          setOpen(true);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (item: InvItem) => {
    setQuery(`${item.code} — ${item.name}`);
    onSelect(item);
    setOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    setQuery('');
    onSelect(null);
    setResults([]);
    setOpen(false);
  };

  const displayValue = query || (value ? selectedLabel : '');

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={displayValue}
          onChange={e => search(e.target.value)}
          onFocus={() => {
            if (preloadedItems && query.length >= 2 && results.length > 0) setOpen(true);
            if (!preloadedItems && query.length >= 2 && results.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-7 pr-6 h-8 text-sm"
        />
        {loading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
        {!loading && value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground hover:text-foreground leading-none"
          >
            ×
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map(item => (
            <button
              key={item.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
              onClick={() => handleSelect(item)}
            >
              <div className="font-mono font-medium text-xs text-blue-700 dark:text-blue-400">
                {item.code}
              </div>
              <div className="text-xs text-muted-foreground truncate">{item.name}</div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg px-3 py-2 text-sm text-muted-foreground">
          No items found
        </div>
      )}
    </div>
  );
}

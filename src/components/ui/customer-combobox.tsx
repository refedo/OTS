'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Loader2 } from 'lucide-react';

interface CustomerResult {
  dolibarr_id: number;
  name: string;
  code_client: string | null;
  email: string | null;
  phone: string | null;
}

interface CustomerComboboxProps {
  label?: string;
  required?: boolean;
  defaultValue?: string;
  disabled?: boolean;
  onSelect: (name: string) => void;
  placeholder?: string;
}

export function CustomerCombobox({
  label = 'Customer Name',
  required = false,
  defaultValue = '',
  disabled = false,
  onSelect,
  placeholder = 'Search customers...',
}: CustomerComboboxProps) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = (value: string) => {
    setQuery(value);
    onSelect(value);
    if (!value.trim() || value.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/financial/customers?search=${encodeURIComponent(value)}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.customers || []);
          setOpen(true);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (customer: CustomerResult) => {
    setQuery(customer.name);
    onSelect(customer.name);
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => search(e.target.value)}
          onFocus={() => query.length >= 2 && results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((c) => (
            <button
              key={c.dolibarr_id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
              onClick={() => handleSelect(c)}
            >
              <div className="font-medium">{c.name}</div>
              {(c.code_client || c.email) && (
                <div className="text-xs text-muted-foreground">
                  {[c.code_client, c.email].filter(Boolean).join(' · ')}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      {open && !loading && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg px-3 py-2 text-sm text-muted-foreground">
          No customers found
        </div>
      )}
    </div>
  );
}

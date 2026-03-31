'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const CACHE_KEY = 'ots_permissions';

interface PermissionsState {
  permissions: string[];
  role: string;
  isAdmin: boolean;
  isLoading: boolean;
}

const defaultState: PermissionsState = {
  permissions: [],
  role: '',
  isAdmin: false,
  isLoading: true,
};

const PermissionsContext = createContext<PermissionsState>(defaultState);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PermissionsState>(defaultState);

  useEffect(() => {
    // Try sessionStorage first — avoids network round-trip on repeat navigations
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setState({ ...parsed, isLoading: false });
        return;
      }
    } catch {
      // sessionStorage unavailable or corrupt — fall through to fetch
    }

    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          const next: PermissionsState = {
            permissions: data.permissions ?? [],
            role: data.role ?? '',
            isAdmin: data.isAdmin ?? false,
            isLoading: false,
          };
          setState(next);
          try {
            sessionStorage.setItem(
              CACHE_KEY,
              JSON.stringify({
                permissions: next.permissions,
                role: next.role,
                isAdmin: next.isAdmin,
              })
            );
          } catch {
            // sessionStorage write failed — non-critical
          }
        } else {
          setState((s) => ({ ...s, isLoading: false }));
        }
      })
      .catch(() => setState((s) => ({ ...s, isLoading: false })));
  }, []);

  return (
    <PermissionsContext.Provider value={state}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsState {
  return useContext(PermissionsContext);
}

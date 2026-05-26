'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface UserOption {
  id: string;
  name: string;
  position?: string;
  department?: { name: string };
}

interface EmployeeSelectProps {
  value: string;
  onValueChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function EmployeeSelect({
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Select employee...',
}: EmployeeSelectProps) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users?forAssignment=true')
      .then(r => r.json())
      .then(data => {
        const list: UserOption[] = Array.isArray(data) ? data : (data?.users ?? []);
        const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
        setUsers(sorted);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border rounded-md text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading employees…
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {users.map(u => (
          <SelectItem key={u.id} value={u.id}>
            <span className="font-medium">{u.name}</span>
            {(u.position || u.department?.name) && (
              <span className="text-xs text-muted-foreground ml-2">
                {[u.position, u.department?.name].filter(Boolean).join(' · ')}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

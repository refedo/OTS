'use client';

/**
 * Shared employee picker — cmdk popover combobox used by:
 *   - /hr/attendance/timesheet      (to pick which employee's timesheet to view)
 *   - /hr/attendance/mapping        (to link an unresolved candidate to an Employee)
 *   - Wherever else in HR we need "pick an employee from a list".
 *
 * Consumers pass the full employee list and an onChange callback. No
 * client-side data fetching — the caller decides which employees are
 * eligible (active only, unlinked only, etc.).
 *
 * Phase 2.5 of OTS-MSS-HR-PAYROLL-v1.
 */

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type EmployeePickerOption = {
  id: string;
  employmentId: string;
  fullNameEn: string;
  fullNameAr?: string | null;
  occupation?: string | null;
};

type Props = {
  employees: EmployeePickerOption[];
  value: string | null;
  onChange: (employeeId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Render width for the trigger. Default: w-[280px]. */
  triggerWidth?: string;
};

export function EmployeePicker({
  employees,
  value,
  onChange,
  placeholder = 'Select employee…',
  disabled = false,
  className,
  triggerWidth = 'w-[280px]',
}: Props) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(
    () => employees.find((e) => e.id === value) ?? null,
    [employees, value],
  );

  const triggerLabel = selected
    ? `${selected.employmentId} · ${selected.fullNameEn}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(triggerWidth, 'justify-between', className)}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn(triggerWidth, 'p-0')} align="start">
        <Command
          filter={(itemValue, search) => {
            // itemValue is a lowercased string built from
            // "id|employmentId|nameEn|nameAr|occupation"; substring match on any.
            const needle = search.trim().toLowerCase();
            if (!needle) return 1;
            return itemValue.includes(needle) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search by ID, name, or position title…" />
          <CommandList>
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup>
              {employees.map((e) => {
                const searchKey = [
                  e.id,
                  e.employmentId,
                  e.fullNameEn,
                  e.fullNameAr ?? '',
                  e.occupation ?? '',
                ]
                  .join('|')
                  .toLowerCase();
                return (
                  <CommandItem
                    key={e.id}
                    value={searchKey}
                    onSelect={() => {
                      onChange(e.id === value ? null : e.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === e.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm">
                        <span className="font-mono text-xs text-muted-foreground mr-2">
                          {e.employmentId}
                        </span>
                        {e.fullNameEn}
                      </span>
                      {e.occupation && (
                        <span className="text-[11px] text-muted-foreground">
                          {e.occupation}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

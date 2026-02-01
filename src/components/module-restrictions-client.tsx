'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ModuleRestrictionsManager } from './module-restrictions-manager';
import { Button } from './ui/button';
import { useAlert } from '@/hooks/useAlert';
import { Loader2 } from 'lucide-react';

type ModuleRestrictionsClientProps = {
  role: {
    id: string;
    name: string;
    restrictedModules: string[] | null;
  };
};

export function ModuleRestrictionsClient({ role }: ModuleRestrictionsClientProps) {
  const router = useRouter();
  const { showAlert, AlertDialog } = useAlert();
  const [restrictedModules, setRestrictedModules] = useState<string[]>(
    (role.restrictedModules as string[]) || []
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/roles/${role.id}/restrictions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restrictedModules }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update module restrictions');
      }

      showAlert('Module restrictions updated successfully', { type: 'success' });
      router.refresh();
    } catch (error) {
      showAlert(
        error instanceof Error ? error.message : 'Failed to update module restrictions',
        { type: 'error' }
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleRestrictionsManager
        restrictedModules={restrictedModules}
        onChange={setRestrictedModules}
        disabled={isSaving}
      />
      
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => router.push('/roles')}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Module Restrictions
        </Button>
      </div>
      
      <AlertDialog />
    </div>
  );
}

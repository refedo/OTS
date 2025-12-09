'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface WPSApproveButtonProps {
  wpsId: string;
  wpsNumber: string;
}

export function WPSApproveButton({ wpsId, wpsNumber }: WPSApproveButtonProps) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [open, setOpen] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const response = await fetch(`/api/wps/${wpsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved' }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve WPS');
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error approving WPS:', error);
      alert('Failed to approve WPS. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="default">
          <CheckCircle className="mr-2 h-4 w-4" />
          Approve
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve WPS</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to approve <strong>{wpsNumber}</strong>? 
            Once approved, this WPS can no longer be edited.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isApproving}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleApprove} disabled={isApproving}>
            {isApproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              'Approve'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

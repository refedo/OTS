'use client';

import { useState } from 'react';
import { SuccessDialog } from '@/components/ui/success-dialog';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertState {
  open: boolean;
  title: string;
  message: string;
  type: AlertType;
  onConfirm?: () => void;
}

export function useAlert() {
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = (message: string, options?: { 
    title?: string; 
    type?: AlertType;
    onConfirm?: () => void;
  }) => {
    const type = options?.type || 'info';
    const defaultTitles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information',
    };

    setAlertState({
      open: true,
      title: options?.title || defaultTitles[type],
      message,
      type,
      onConfirm: options?.onConfirm,
    });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, open: false }));
  };

  const AlertDialog = () => (
    <SuccessDialog
      open={alertState.open}
      onClose={closeAlert}
      title={alertState.title}
      message={alertState.message}
      type={alertState.type}
      onConfirm={alertState.onConfirm}
    />
  );

  return { showAlert, AlertDialog };
}

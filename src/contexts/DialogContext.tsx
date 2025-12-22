'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ModernDialog, DialogType } from '@/components/ui/modern-dialog';

interface DialogOptions {
  type: DialogType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextType {
  showAlert: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (title: string, message: string, confirmText?: string, cancelText?: string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: DialogOptions;
    resolver?: (value: boolean) => void;
  }>({
    isOpen: false,
    options: {
      type: 'info',
      title: '',
      message: '',
    },
  });

  const closeDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (dialogState.resolver) {
      dialogState.resolver(false);
    }
  }, [dialogState.resolver]);

  const showAlert = useCallback(
    (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      setDialogState({
        isOpen: true,
        options: {
          type,
          title,
          message,
        },
      });
    },
    []
  );

  const showConfirm = useCallback(
    (title: string, message: string, confirmText = 'Confirm', cancelText = 'Cancel'): Promise<boolean> => {
      return new Promise((resolve) => {
        setDialogState({
          isOpen: true,
          options: {
            type: 'confirm',
            title,
            message,
            confirmText,
            cancelText,
          },
          resolver: resolve,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    if (dialogState.resolver) {
      dialogState.resolver(true);
    }
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, [dialogState.resolver]);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <ModernDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        onConfirm={dialogState.options.type === 'confirm' ? handleConfirm : undefined}
        type={dialogState.options.type}
        title={dialogState.options.title}
        message={dialogState.options.message}
        confirmText={dialogState.options.confirmText}
        cancelText={dialogState.options.cancelText}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

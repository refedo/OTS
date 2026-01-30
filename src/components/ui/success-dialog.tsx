'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from './button';

interface SuccessDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  onConfirm?: () => void;
}

export function SuccessDialog({ 
  open, 
  onClose, 
  title = 'Success', 
  message,
  onConfirm 
}: SuccessDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
    }
  }, [open]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      if (onConfirm) onConfirm();
    }, 150);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Dialog */}
      <div 
        className={`relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 transform transition-all duration-150 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Content */}
        <div className="p-6 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {title}
          </h3>
          
          {/* Message */}
          <p className="text-gray-600 text-sm whitespace-pre-line">
            {message}
          </p>
        </div>
        
        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={handleClose}
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook for easy usage
export function useSuccessDialog() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    open: false,
    title: 'Success',
    message: '',
  });

  const showSuccess = (message: string, options?: { title?: string; onConfirm?: () => void }) => {
    setDialogState({
      open: true,
      title: options?.title || 'Success',
      message,
      onConfirm: options?.onConfirm,
    });
  };

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, open: false }));
  };

  const DialogComponent = () => (
    <SuccessDialog
      open={dialogState.open}
      onClose={closeDialog}
      title={dialogState.title}
      message={dialogState.message}
      onConfirm={dialogState.onConfirm}
    />
  );

  return { showSuccess, DialogComponent };
}

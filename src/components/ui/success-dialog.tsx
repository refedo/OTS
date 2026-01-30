'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, X, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from './button';

type DialogType = 'success' | 'error' | 'warning' | 'info';

interface SuccessDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: DialogType;
  onConfirm?: () => void;
}

const dialogConfig = {
  success: {
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    buttonColor: 'bg-green-600 hover:bg-green-700',
    defaultTitle: 'Success',
    icon: CheckCircle2,
  },
  error: {
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonColor: 'bg-red-600 hover:bg-red-700',
    defaultTitle: 'Error',
    icon: AlertCircle,
  },
  warning: {
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    defaultTitle: 'Warning',
    icon: AlertTriangle,
  },
  info: {
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    defaultTitle: 'Information',
    icon: Info,
  },
};

export function SuccessDialog({ 
  open, 
  onClose, 
  title, 
  message,
  type = 'success',
  onConfirm 
}: SuccessDialogProps) {
  const [isVisible, setIsVisible] = useState(false);
  const config = dialogConfig[type];
  const Icon = config.icon;

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
          {/* Icon */}
          <div className={`mx-auto w-16 h-16 rounded-full ${config.bgColor} flex items-center justify-center mb-4`}>
            <Icon className={`w-10 h-10 ${config.iconColor}`} />
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {title || config.defaultTitle}
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
            className={`flex-1 ${config.buttonColor}`}
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
    type: DialogType;
    onConfirm?: () => void;
  }>({
    open: false,
    title: 'Success',
    message: '',
    type: 'success',
  });

  const showSuccess = (message: string, options?: { 
    title?: string; 
    type?: DialogType;
    onConfirm?: () => void;
  }) => {
    setDialogState({
      open: true,
      title: options?.title || dialogConfig[options?.type || 'success'].defaultTitle,
      message,
      type: options?.type || 'success',
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
      type={dialogState.type}
      onConfirm={dialogState.onConfirm}
    />
  );

  return { showSuccess, closeDialog, DialogComponent };
}

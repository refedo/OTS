'use client';

import { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, AlertTriangle, CheckCircle, HelpCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ConfirmationType = 'danger' | 'warning' | 'success' | 'info' | 'question' | 'error';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  type?: ConfirmationType;
  icon?: ReactNode;
}

const typeConfig = {
  danger: {
    icon: XCircle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  error: {
    icon: XCircle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    buttonClass: 'bg-orange-600 hover:bg-orange-700 text-white',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    buttonClass: 'bg-green-600 hover:bg-green-700 text-white',
  },
  info: {
    icon: AlertCircle,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  question: {
    icon: HelpCircle,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger',
  icon,
}: ConfirmationDialogProps) {
  const config = typeConfig[type];
  const IconComponent = config.icon;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
          <div className={cn('rounded-full p-3', config.iconBg)}>
            {icon || <IconComponent className={cn('size-6', config.iconColor)} />}
          </div>
          <AlertDialogTitle className="text-xl font-semibold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={handleCancel}
            className="flex-1 m-0"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn('flex-1 m-0', config.buttonClass)}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Helper function for programmatic confirmation dialogs
interface ShowConfirmationOptions {
  type?: ConfirmationType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function showConfirmation({
  type = 'info',
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ShowConfirmationOptions) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  let isCleanedUp = false;

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    
    setTimeout(() => {
      root.unmount();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }, 0);
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    cleanup();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    cleanup();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) cleanup();
  };

  root.render(
    <ConfirmationDialog
      open={true}
      onOpenChange={handleOpenChange}
      title={title}
      description={message}
      confirmText={confirmText}
      cancelText={cancelText}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      type={type}
    />
  );
}

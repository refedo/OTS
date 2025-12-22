'use client';

import { X, AlertTriangle, CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type DialogType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface ModernDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  type: DialogType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export function ModernDialog({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: ModernDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const iconConfig = {
    success: {
      icon: CheckCircle2,
      bgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonColor: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      buttonColor: 'bg-amber-600 hover:bg-amber-700',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
    confirm: {
      icon: Info,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const config = iconConfig[type];
  const Icon = config.icon;
  const isConfirmDialog = type === 'confirm';

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center transition-all duration-200',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={cn(
          'relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-200',
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={cn('w-16 h-16 rounded-full flex items-center justify-center', config.bgColor)}>
              <Icon className={cn('w-8 h-8', config.iconColor)} />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            {title}
          </h3>

          {/* Message */}
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {message}
          </p>

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            {isConfirmDialog ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className={cn(
                    'flex-1 px-6 py-3 rounded-lg text-white font-medium transition-colors',
                    config.buttonColor
                  )}
                >
                  {confirmText}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className={cn(
                  'w-full px-6 py-3 rounded-lg text-white font-medium transition-colors',
                  config.buttonColor
                )}
              >
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

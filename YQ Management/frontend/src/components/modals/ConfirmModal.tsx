import React from 'react';
import { Dialog, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={handleOpenChange} 
      className="sm:max-w-[420px] w-[92vw] p-6 rounded-[24px] bg-surface dark:bg-zinc-900 border-border dark:border-zinc-800 shadow-2xl"
    >
      <button 
        type="button"
        onClick={onClose}
        disabled={isLoading}
        className="absolute right-4 top-4 p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none cursor-pointer"
        title="Close"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex flex-col items-center text-center pt-1">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3.5 border ${
          variant === 'danger'
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            : variant === 'warning'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
              : 'bg-primary/10 border-primary/20 text-primary'
        }`}>
          <AlertTriangle className="w-6 h-6" />
        </div>

        <DialogTitle className="text-lg md:text-xl font-bold text-on-surface dark:text-white">
          {title}
        </DialogTitle>
        <DialogDescription className="text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 mt-1.5 max-w-sm leading-relaxed">
          {description}
        </DialogDescription>

        <div className="flex items-center gap-3 w-full mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 h-10 rounded-xl font-semibold text-xs border-border dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-on-surface dark:text-zinc-300"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 h-10 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-1.5 ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
                : variant === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'
                  : 'bg-primary hover:bg-primary/90 shadow-primary/25'
            }`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

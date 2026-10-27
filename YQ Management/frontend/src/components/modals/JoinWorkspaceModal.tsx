import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Shield, Loader2, X, ArrowRight, AlertCircle } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

interface JoinWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (workspaceName?: string) => void;
  onCustomSubmit?: (cleanCode: string) => Promise<boolean>;
  title?: string;
  description?: string;
}

export function JoinWorkspaceModal({
  isOpen,
  onClose,
  onSuccess,
  onCustomSubmit,
  title = 'Join a Workspace',
  description = 'Enter the 8-character invite code from your team manager to join their workspace.',
}: JoinWorkspaceModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isLoading) return;
    setInviteCode('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inviteCode.trim().replace(/[-\s]/g, '').toUpperCase();
    
    if (!cleanCode) {
      setError('Please enter your invite code');
      return;
    }
    if (cleanCode.length < 6) {
      setError('Invite codes are typically 8 characters long');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (onCustomSubmit) {
        const success = await onCustomSubmit(cleanCode);
        if (success) {
          handleClose();
        }
        return;
      }

      const res = await fetchApi('/auth/join-with-invite', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: cleanCode }),
      });

      const workspaceName = res?.workspaceName || 'your new workspace';
      toast.success(`Successfully joined ${workspaceName}! Reloading...`, { duration: 4000 });
      
      if (onSuccess) {
        onSuccess(workspaceName);
      }
      
      handleClose();

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1200);
    } catch (err: any) {
      const message = err.message || 'Invalid or expired invite code. Please check with your administrator.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={handleClose} 
      className="sm:max-w-[440px] w-[94vw] p-6 md:p-7 rounded-[28px] bg-surface dark:bg-zinc-900 border-border dark:border-zinc-800 shadow-2xl relative overflow-hidden"
    >
      <button 
        type="button"
        onClick={handleClose}
        disabled={isLoading}
        className="absolute right-5 top-5 p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none z-20"
        title="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-sky-400" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-3.5 shadow-sm">
            <Shield className="w-7 h-7" />
          </div>

          <DialogTitle className="text-xl md:text-2xl font-extrabold text-on-surface dark:text-white tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 mt-1 max-w-sm">
            {description}
          </DialogDescription>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-medium animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5 mt-1">
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-400">
            Invite Code
          </label>
          <div className="relative">
            <input
              type="text"
              autoFocus
              maxLength={12}
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              placeholder="e.g. ABCD1234"
              className="w-full h-12 px-4 rounded-xl font-mono text-center text-lg font-bold tracking-[0.25em] bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:tracking-normal placeholder:font-sans placeholder:font-normal placeholder:text-zinc-400"
              disabled={isLoading}
            />
          </div>
          <p className="text-[11px] text-on-surface-variant dark:text-zinc-500 text-center">
            Case-insensitive &middot; 8 characters
          </p>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 h-11 rounded-xl font-semibold text-xs border-border dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-on-surface dark:text-zinc-300"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !inviteCode.trim()}
            className="flex-1 h-11 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

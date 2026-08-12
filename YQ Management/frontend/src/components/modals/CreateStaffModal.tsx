import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
}

export function CreateStaffModal({ isOpen, onClose, locationId }: CreateStaffModalProps) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      fetchApi('/staff', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      toast.success('Staff member created successfully');
      handleClose();
    },
    onError: () => toast.error('Error creating staff member'),
  });

  const handleClose = () => {
    setName('');
    setStatus('ACTIVE');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    createMutation.mutate({
      name,
      status,
      ...(locationId && { locationId })
    });
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Staff Member</h2>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Full Name <span className="text-red-500">*</span></label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="e.g., Dr. Jane Smith"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Status</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
            >
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-white/10">
            <button 
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={createMutation.isPending || !name}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {createMutation.isPending ? 'Creating...' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

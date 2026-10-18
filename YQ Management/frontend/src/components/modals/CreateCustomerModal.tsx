import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import PhoneInput from '../PhoneInput';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer: AnyFixMe) => void;
}

export function CreateCustomerModal({ isOpen, onClose, onSuccess }: CreateCustomerModalProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: { name: string; phone?: string; email?: string; notes?: string }) =>
      fetchApi('/customer', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully');
      if (onSuccess) onSuccess(data);
      handleClose();
    },
    onError: () => toast.error('Error creating customer'),
  });

  const handleClose = () => {
    setName('');
    setAge('');
    setGender('');
    setPhone('');
    setEmail('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Pack demographic notes if entered
    const noteParts: string[] = [];
    if (age) noteParts.push(`Age: ${age}`);
    if (gender) noteParts.push(`Gender: ${gender}`);
    const notesStr = noteParts.length > 0 ? noteParts.join(' | ') : undefined;

    createMutation.mutate({
      name: name.trim(),
      phone: phone || undefined,
      email: email || undefined,
      notes: notesStr,
    });
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Customer</h2>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                Age <span className="text-[10px] text-zinc-400 lowercase font-normal">(optional)</span>
              </label>
              <input 
                type="number" 
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="0"
                max="150"
                className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="e.g. 30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                Gender <span className="text-[10px] text-zinc-400 lowercase font-normal">(optional)</span>
              </label>
              <select 
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">Select gender...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
              Phone Number
            </label>
            <div className="h-[44px] bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-3 flex items-center focus-within:ring-2 focus-within:ring-indigo-500 transition-all overflow-hidden">
              <PhoneInput 
                value={phone}
                onChange={setPhone}
                className="w-full text-sm text-gray-900 dark:text-white"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="john@example.com"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-white/10">
            <button 
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl font-medium transition-colors text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50 text-sm"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {createMutation.isPending ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

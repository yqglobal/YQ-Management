import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: any; // If editing an existing user or invite
  onSuccess?: (res: any) => void;
}

export function UserPermissionsModal({ isOpen, onClose, userToEdit, onSuccess }: UserPermissionsModalProps) {
  const [email, setEmail] = useState(userToEdit?.email || '');
  const [role, setRole] = useState(userToEdit?.role || 'OPERATOR');
  const [allowedLocationIds, setAllowedLocationIds] = useState<string[]>(userToEdit?.allowedLocationIds || []);
  const [allowedServiceIds, setAllowedServiceIds] = useState<string[]>(userToEdit?.allowedServiceIds || []);
  const [allowedPages, setAllowedPages] = useState<string[]>(userToEdit?.allowedPages || []);
  const [step, setStep] = useState(1);
  
  const queryClient = useQueryClient();

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location'),
    enabled: isOpen,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
    enabled: isOpen,
  });

  const corePages = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'inbox', label: 'Inbox (WhatsApp)' },
    { id: 'service-desk', label: 'Service Desk' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'customers', label: 'Customers' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'queues', label: 'Queues' }
  ];

  const settingsPages = [
    { id: 'settings-workspace', label: 'Workspace & Identity' },
    { id: 'settings-team', label: 'Team & Security' },
    { id: 'settings-operations', label: 'Operations' },
    { id: 'settings-integrations', label: 'Integrations & Comms' },
    { id: 'settings-billing', label: 'Billing & Usage' }
  ];

  // Derived state to check if any settings page is enabled
  const [allowWorkspaceSettings, setAllowWorkspaceSettings] = useState(
    userToEdit?.allowedPages?.some((p: string) => p.startsWith('settings-')) || false
  );

  const handleClose = () => {
    if (!userToEdit) {
      setEmail('');
      setRole('OPERATOR');
      setAllowedLocationIds([]);
      setAllowedServiceIds([]);
      setAllowedPages([]);
    }
    setStep(1);
    onClose();
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => fetchApi('/users', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('User invited successfully');
      if (onSuccess) onSuccess(res);
      handleClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Error inviting user'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => fetchApi(`/users/${userToEdit.id}/permissions`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Permissions updated successfully');
      if (onSuccess) onSuccess(res);
      handleClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Error updating user'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !userToEdit) return;

    const payload = {
      email,
      role,
      allowedLocationIds,
      allowedServiceIds,
      allowedPages,
    };

    if (userToEdit && !userToEdit.isInvite) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleSelection = (setter: any, list: string[], id: string) => {
    if (list.includes(id)) {
      setter(list.filter(item => item !== id));
    } else {
      setter([...list, id]);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const isGlobalRole = role === 'SUPER_ADMIN' || role === 'TENANT_ADMIN';

  return createPortal(
    <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {userToEdit ? 'Edit User Permissions' : 'Invite New Staff'}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Email Address</label>
                <input 
                  type="email"
                  value={email}
                  disabled={!!userToEdit}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Role</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="OPERATOR">Operator</option>
                  <option value="TENANT_ADMIN">Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Admins have full access. Operators can be restricted to specific locations, services, and pages.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {isGlobalRole ? (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-xl">
                  {role}s have global access. Explicit permission mapping is not required.
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Allowed Locations</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {locations.map((loc: any) => (
                        <label key={loc.id} className="flex items-center gap-2 p-3 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
                          <input 
                            type="checkbox" 
                            checked={allowedLocationIds.includes(loc.id)}
                            onChange={() => toggleSelection(setAllowedLocationIds, allowedLocationIds, loc.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-zinc-300">{loc.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm mt-6">Allowed Services</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {services.map((svc: any) => (
                        <label key={svc.id} className="flex items-center gap-2 p-3 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
                          <input 
                            type="checkbox" 
                            checked={allowedServiceIds.includes(svc.id)}
                            onChange={() => toggleSelection(setAllowedServiceIds, allowedServiceIds, svc.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-zinc-300">{svc.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm mt-6">Core Pages</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {corePages.map((page) => (
                        <label key={page.id} className="flex items-center gap-2 p-3 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
                          <input 
                            type="checkbox" 
                            checked={allowedPages.includes(page.id)}
                            onChange={() => toggleSelection(setAllowedPages, allowedPages, page.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-zinc-300">{page.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3 mt-6">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Workspace Settings</h3>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={allowWorkspaceSettings}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setAllowWorkspaceSettings(isChecked);
                            if (!isChecked) {
                              setAllowedPages(allowedPages.filter(p => !p.startsWith('settings-')));
                            }
                          }}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                    {allowWorkspaceSettings && (
                      <div className="grid grid-cols-2 gap-3">
                        {settingsPages.map((page) => (
                          <label key={page.id} className="flex items-center gap-2 p-3 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
                            <input 
                              type="checkbox" 
                              checked={allowedPages.includes(page.id)}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                if (isChecked) {
                                  if (window.confirm(`Are you sure you want to allow this user to access and modify ${page.label}?`)) {
                                    toggleSelection(setAllowedPages, allowedPages, page.id);
                                  } else {
                                    e.preventDefault();
                                  }
                                } else {
                                  toggleSelection(setAllowedPages, allowedPages, page.id);
                                }
                              }}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-zinc-300">{page.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex justify-between shrink-0">
          {step === 2 ? (
            <button 
              type="button" 
              onClick={() => setStep(1)}
              className="px-5 py-2.5 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl font-medium transition-colors"
            >
              Back
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleClose}
              className="px-5 py-2.5 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
          )}

          {step === 1 ? (
            <button 
              type="button"
              onClick={() => setStep(2)}
              disabled={!email}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50"
            >
              Next: Permissions
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
              {userToEdit ? 'Save Changes' : 'Send Invite'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

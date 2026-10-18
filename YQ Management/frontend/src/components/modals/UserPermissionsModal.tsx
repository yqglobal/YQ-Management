import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Loader2, Shield, User as UserIcon, Users, AlertTriangle,
  Check, MapPin, LayoutDashboard, ShieldAlert
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import PhoneInput from '../PhoneInput';

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: AnyFixMe; // If editing an existing user or invite
  onSuccess?: (res: AnyFixMe) => void;
  initialStep?: 1 | 2 | 3;
  isCurrentUserOwner?: boolean;
  currentUserId?: string;
}

const ROLE_DEFINITIONS = [
  {
    id: 'STAFF',
    label: 'Staff',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    description: 'Frontline team member. Access strictly limited to assigned locations, services, and core pages.',
    icon: UserIcon,
  },
  {
    id: 'MANAGER',
    label: 'Manager',
    badgeClass: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20',
    description: 'Operational oversight. Can view queues, manage providers, schedules, and active visits.',
    icon: Users,
  },
  {
    id: 'ADMIN',
    label: 'Admin',
    badgeClass: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20',
    description: 'Full administrative access. Can invite members, manage billing, locations, services, and all settings.',
    icon: Shield,
  },
  {
    id: 'OWNER',
    label: 'Owner',
    badgeClass: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    description: 'Organization owner with supreme authority over account, subscriptions, billing, and ownership transfer.',
    icon: ShieldAlert,
  },
];

export function UserPermissionsModal({
  isOpen,
  onClose,
  userToEdit,
  onSuccess,
  initialStep,
  isCurrentUserOwner = false,
  currentUserId,
}: UserPermissionsModalProps) {
  const queryClient = useQueryClient();

  // Form states
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState<'STAFF' | 'MANAGER' | 'ADMIN' | 'OWNER'>('STAFF');
  const [allowedLocationIds, setAllowedLocationIds] = useState<string[]>([]);
  const [allowedServiceIds, setAllowedServiceIds] = useState<string[]>([]);
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [allowWorkspaceSettings, setAllowWorkspaceSettings] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(2);

  // Type-to-Confirm modal state for sensitive actions (Role Change / Ownership Transfer)
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    type: 'ROLE_CHANGE' | 'TRANSFER_OWNERSHIP';
    targetRole?: string;
    warningText: string;
  } | null>(null);
  const [confirmInputText, setConfirmInputText] = useState('');

  // Hydrate all state from userToEdit whenever userToEdit or isOpen changes
  useEffect(() => {
    if (userToEdit) {
      setEmail(userToEdit.email || '');
      setName(userToEdit.name || '');
      setPhone(userToEdit.phone || '');
      setDescription(userToEdit.description || '');
      setRole((userToEdit.role as 'STAFF' | 'MANAGER' | 'ADMIN' | 'OWNER') || 'STAFF');
      setAllowedLocationIds(userToEdit.allowedLocationIds || []);
      setAllowedServiceIds(userToEdit.allowedServiceIds || []);
      setAllowedPages(userToEdit.allowedPages || []);
      setAllowWorkspaceSettings(
        userToEdit.allowedPages?.some((p: string) => p.startsWith('settings-')) || false
      );
      if (initialStep) {
        setStep(initialStep);
      } else {
        setStep(2); // Default to permissions view when editing
      }
    } else {
      setEmail('');
      setName('');
      setPhone('');
      setDescription('');
      setRole('STAFF');
      setAllowedLocationIds([]);
      setAllowedServiceIds([]);
      setAllowedPages(['queues', 'service-desk', 'check-in']);
      setAllowWorkspaceSettings(false);
      setStep(1);
    }
  }, [userToEdit, isOpen, initialStep]);

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
    { id: 'check-in', label: 'Check-in / QR Scanner' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'customers', label: 'Customers' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'queues', label: 'Queues' },
    { id: 'service-flow', label: 'Service Flow Builder' },
  ];

  const flowOperations = [
    { id: 'flow:advance', label: 'Advance Steps', description: 'Mark a step as completed' },
    { id: 'flow:skip', label: 'Skip Optional Steps', description: 'Skip an optional step on behalf of the customer' },
    { id: 'flow:revert', label: 'Revert Skipped Steps', description: 'Undo a skip and return a step to active' },
    { id: 'flow:redeem', label: 'Redeem Entitlements', description: 'Scan and redeem collection/entitlement steps' },
  ];

  const settingsPages = [
    { id: 'settings-workspace', label: 'Workspace & Identity' },
    { id: 'settings-billing', label: 'Billing & Usage' },
    { id: 'settings-team', label: 'Team & Security' },
    { id: 'settings-operations', label: 'Operations' },
    { id: 'settings-integrations', label: 'Integrations & Comms' },
  ];

  const handleClose = () => {
    setConfirmModalData(null);
    setConfirmInputText('');
    onClose();
  };

  const createMutation = useMutation({
    mutationFn: (data: AnyFixMe) => fetchApi('/users', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('User invited successfully');
      if (onSuccess) onSuccess(res);
      handleClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Error inviting user'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: AnyFixMe) =>
      fetchApi(`/users/${userToEdit.id}/permissions`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Permissions updated successfully');
      if (onSuccess) onSuccess(res);
      handleClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Error updating user'),
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      fetchApi(`/users/${targetUserId}/transfer-ownership`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Ownership transferred successfully!');
      handleClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to transfer ownership'),
  });

  const handleSavePermissions = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email && !userToEdit) return;

    // Check if role was changed from userToEdit.role
    if (userToEdit && role !== userToEdit.role) {
      // Require type confirm modal for role changes!
      setConfirmModalData({
        isOpen: true,
        type: 'ROLE_CHANGE',
        targetRole: role,
        warningText: `You are changing ${userToEdit.email}'s role from ${userToEdit.role} to ${role}.`,
      });
      return;
    }

    const payload = {
      email,
      name,
      phone,
      description,
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

  const handleExecuteConfirmedAction = () => {
    if (!confirmModalData) return;

    if (confirmModalData.type === 'TRANSFER_OWNERSHIP') {
      transferOwnershipMutation.mutate(userToEdit.id);
    } else if (confirmModalData.type === 'ROLE_CHANGE') {
      const payload = {
        email,
        name,
        phone,
        description,
        role: confirmModalData.targetRole || role,
        allowedLocationIds,
        allowedServiceIds,
        allowedPages,
      };
      updateMutation.mutate(payload);
    }
  };

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<string[]>>, list: string[], id: string) => {
    if (list.includes(id)) {
      setter(list.filter(item => item !== id));
    } else {
      setter([...list, id]);
    }
  };

  const selectAll = (setter: React.Dispatch<React.SetStateAction<string[]>>, allIds: string[]) => {
    setter(allIds);
  };

  const deselectAll = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter([]);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const isGlobalRole = (role as string) === 'SUPER_ADMIN' || role === 'OWNER' || role === 'ADMIN';
  const isEditingExisting = !!userToEdit;
  const isTargetOwner = userToEdit?.role === 'OWNER';
  const canTransfer = isCurrentUserOwner && isEditingExisting && !isTargetOwner && userToEdit?.id !== currentUserId;

  return createPortal(
    <div className="fixed inset-0 bg-zinc-950/50 dark:bg-black/85 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-black/30 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isEditingExisting ? `Edit Permissions & Role` : 'Invite New Team Member'}
            </h2>
            {isEditingExisting && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {email || userToEdit.email} • Current Role: <span className="font-semibold text-primary">{userToEdit.role}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500 dark:text-zinc-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Navigation Bar */}
        <div className="flex border-b border-gray-200 dark:border-white/10 bg-gray-50/40 dark:bg-white/[0.02] px-6 py-2.5 gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              step === 1
                ? 'bg-primary text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span>1. Profile & Info</span>
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              step === 2
                ? 'bg-primary text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span>2. Permissions & Scope</span>
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              step === 3
                ? 'bg-primary text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span>3. Role & Access Level</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: Basic Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled={isEditingExisting}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <div className="h-[44px] bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-3 flex items-center focus-within:ring-2 focus-within:ring-primary text-sm transition-all overflow-hidden">
                    <PhoneInput
                      value={phone}
                      onChange={setPhone}
                      placeholder="+123456789"
                      className="w-full text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    Staff Designation / Title
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Senior Receptionist"
                    className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low dark:bg-zinc-800/40 border border-border dark:border-dark-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Current Assigned Role
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 flex items-center gap-2">
                    <span>{role}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  Manage Role in Step 3 →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Permissions & Scopes */}
          {step === 2 && (
            <div className="space-y-6">
              {isGlobalRole && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-2xl text-xs flex items-start gap-2.5">
                  <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{role} Role Active:</span> Admins and Owners possess global access across all locations, services, and core pages. Fine-grained restrictions take effect when the member is set to Staff or Manager in Step 3.
                  </div>
                </div>
              )}

              {/* Allowed Locations */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" /> Allowed Locations
                  </h3>
                  {locations.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => selectAll(setAllowedLocationIds, locations.map((l: AnyFixMe) => l.id))}
                        className="text-xs text-primary hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-xs text-zinc-400">•</span>
                      <button
                        type="button"
                        onClick={() => deselectAll(setAllowedLocationIds)}
                        className="text-xs text-zinc-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                {locations.length === 0 ? (
                  <p className="text-xs text-zinc-500">No locations configured yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {locations.map((loc: AnyFixMe) => (
                      <label
                        key={loc.id}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          allowedLocationIds.includes(loc.id)
                            ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                            : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={allowedLocationIds.includes(loc.id)}
                          onChange={() => toggleSelection(setAllowedLocationIds, allowedLocationIds, loc.id)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-zinc-200 truncate">{loc.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Allowed Services */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Allowed Services</h3>
                  {services.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => selectAll(setAllowedServiceIds, services.map((s: AnyFixMe) => s.id))}
                        className="text-xs text-primary hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-xs text-zinc-400">•</span>
                      <button
                        type="button"
                        onClick={() => deselectAll(setAllowedServiceIds)}
                        className="text-xs text-zinc-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                {services.length === 0 ? (
                  <p className="text-xs text-zinc-500">No services configured yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {services.map((svc: AnyFixMe) => (
                      <label
                        key={svc.id}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          allowedServiceIds.includes(svc.id)
                            ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                            : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={allowedServiceIds.includes(svc.id)}
                          onChange={() => toggleSelection(setAllowedServiceIds, allowedServiceIds, svc.id)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-zinc-200 truncate">{svc.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Core Pages */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                    <LayoutDashboard className="w-4 h-4 text-primary" /> Core Pages
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => selectAll(setAllowedPages, corePages.map(p => p.id))}
                      className="text-xs text-primary hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-xs text-zinc-400">•</span>
                    <button
                      type="button"
                      onClick={() => deselectAll(setAllowedPages)}
                      className="text-xs text-zinc-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {corePages.map((page) => (
                    <label
                      key={page.id}
                      className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                        allowedPages.includes(page.id)
                          ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                          : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={allowedPages.includes(page.id)}
                        onChange={() => toggleSelection(setAllowedPages, allowedPages, page.id)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-zinc-200">{page.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Service Flow Operations */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                  Service Flow Operations
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                  Control which step actions this staff member can perform on active visits.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {flowOperations.map((op) => (
                    <label
                      key={op.id}
                      className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                        allowedPages.includes(op.id)
                          ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                          : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={allowedPages.includes(op.id)}
                        onChange={() => toggleSelection(setAllowedPages, allowedPages, op.id)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary mt-0.5 shrink-0"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-zinc-200">{op.label}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{op.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Workspace Settings */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Workspace Settings Access</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Grant staff permission to view and edit system settings modules.
                    </p>
                  </div>
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
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/40 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                {allowWorkspaceSettings && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {settingsPages.map((page) => (
                      <label
                        key={page.id}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          allowedPages.includes(page.id)
                            ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                            : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={allowedPages.includes(page.id)}
                          onChange={() => toggleSelection(setAllowedPages, allowedPages, page.id)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-zinc-200">{page.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Role & Ownership Assignment (Protected Sensitive Stage) */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Role & Privilege Level</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Choose the organizational role for this team member. Changing roles affects their operational boundaries across the entire system.
                </p>
              </div>

              {/* Roles List */}
              <div className="space-y-3">
                {ROLE_DEFINITIONS.filter(r => r.id !== 'OWNER').map((r) => {
                  const isSelected = role === r.id;
                  const Icon = r.icon;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setRole(r.id as AnyFixMe)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-gray-200 dark:border-white/10 hover:border-primary/30 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900 dark:text-white">{r.label}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.badgeClass}`}>
                              {r.id}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-primary ml-auto" />}
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{r.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* If user is Owner */}
              {isTargetOwner && (
                <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-700 dark:text-amber-300">Organization Owner</h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                        This member is the primary owner of this organization. Ownership cannot be demoted directly. To change owner, another member must be designated via Transfer Ownership.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Transfer Ownership Card (Only for Owner viewing other active members) */}
              {canTransfer && (
                <div className="p-5 rounded-2xl border border-red-500/25 bg-red-500/5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-red-600 dark:text-red-400">
                        Transfer Organization Ownership
                      </h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                        Transferring ownership will grant full organizational authority and billing control to{' '}
                        <strong className="text-gray-900 dark:text-white">{userToEdit.email}</strong>. You will be demoted to an Admin. This action is irreversible.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModalData({
                        isOpen: true,
                        type: 'TRANSFER_OWNERSHIP',
                        warningText: `You are about to transfer complete organizational ownership to ${userToEdit.email}. You will surrender Owner status and become an Admin.`,
                      });
                    }}
                    className="w-full h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <AlertTriangle className="w-4 h-4" /> Transfer Ownership to {userToEdit.name || userToEdit.email}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-black/30 flex justify-between items-center shrink-0">
          <div>
            {step === 1 ? (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 hover:bg-gray-200/50 dark:hover:bg-white/5 rounded-xl font-medium text-xs transition-colors"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 hover:bg-gray-200/50 dark:hover:bg-white/5 rounded-xl font-medium text-xs transition-colors"
              >
                ← Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!email && !isEditingExisting}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                Next: Permissions →
              </button>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl font-semibold text-xs transition-colors"
                >
                  Configure Role in Step 3 →
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePermissions()}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {isEditingExisting ? 'Save Permissions' : 'Send Invite'}
                </button>
              </>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={() => handleSavePermissions()}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {isEditingExisting ? 'Save Changes' : 'Send Invite'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TYPE-TO-CONFIRM SENSITIVE ACTIONS MODAL */}
      {confirmModalData && confirmModalData.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {confirmModalData.type === 'TRANSFER_OWNERSHIP'
                    ? 'Transfer Organization Ownership'
                    : 'Confirm Role Change'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Security confirmation required</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <p className="font-semibold">{confirmModalData.warningText}</p>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                This modification will take effect immediately and alters organizational privileges.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Type <span className="font-bold text-gray-900 dark:text-white select-all">CONFIRM</span> to execute:
              </label>
              <input
                type="text"
                value={confirmInputText}
                onChange={(e) => setConfirmInputText(e.target.value)}
                placeholder="CONFIRM"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-mono tracking-wider"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmModalData(null);
                  setConfirmInputText('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  confirmInputText.trim().toUpperCase() !== 'CONFIRM' ||
                  updateMutation.isPending ||
                  transferOwnershipMutation.isPending
                }
                onClick={handleExecuteConfirmedAction}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-2 shadow-sm"
              >
                {(updateMutation.isPending || transferOwnershipMutation.isPending) && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Confirm & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

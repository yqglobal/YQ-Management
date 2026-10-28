import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import PhoneInput from '../PhoneInput';
import {
  X, Loader2, MapPin, Briefcase, Clock, User as UserIcon, Link2, Check,
  ExternalLink, Copy, Zap, Trash2,
} from 'lucide-react';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
  FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

const COLOR_PRESETS = [
  '#0284C7', '#7C3AED', '#DC2626', '#D97706', '#059669',
  '#DB2777', '#0891B2', '#4F46E5', '#65A30D', '#9333EA',
];

const DEFAULT_SCHEDULE = DAYS.map(day => ({
  day,
  startTime: '09:00',
  endTime: '17:00',
  enabled: day !== 'SATURDAY' && day !== 'SUNDAY',
}));

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider?: AnyFixMe; // If passed, we're editing
}

export function ProviderModal({ isOpen, onClose, provider }: ProviderModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!provider;

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [color, setColor] = useState('#0284C7');
  const [locationId, setLocationId] = useState('');
  const [linkedUserId, setLinkedUserId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [capacity, setCapacity] = useState(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [skills, setSkills] = useState('');
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [deskToken, setDeskToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [revokingToken, setRevokingToken] = useState(false);

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

  const { data: members = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => fetchApi('/users'),
    enabled: isOpen,
  });

  // Populate when editing
  useEffect(() => {
    if (provider) {
      setName(provider.name || '');
      setTitle(provider.title || '');
      setEmail(provider.email || '');
      setPhone(provider.phone || '');
      setBio(provider.bio || '');
      setColor(provider.color || '#0284C7');
      setLocationId(provider.locationId || '');
      setLinkedUserId(provider.userId || '');
      setStatus(provider.status || 'ACTIVE');
      setCapacity(provider.capacity ?? 1);
      setSelectedServiceIds(provider.services?.map((s: AnyFixMe) => s.id) || []);
      setSkills(provider.skills?.join(', ') || '');
      setDeskToken(provider.deskToken || null);
      if (provider.weeklySchedule && Array.isArray(provider.weeklySchedule)) {
        setSchedule(provider.weeklySchedule);
      }
    }
  }, [provider]);

  const mutation = useMutation({
    mutationFn: (data: AnyFixMe) =>
      isEditing
        ? fetchApi(`/staff/${provider.id}`, { method: 'PATCH', body: JSON.stringify(data) })
        : fetchApi('/staff', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      toast.success(isEditing ? 'Staff member updated!' : 'Staff member added!');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate({
      name, title, email, phone, bio, color, locationId: locationId || null,
      userId: linkedUserId || null, status, capacity,
      serviceIds: selectedServiceIds,
      weeklySchedule: schedule,
      skills: skills.split(',').map(s => s.trim()).filter(Boolean)
    });
  };

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const updateDay = (dayIndex: number, field: string, value: AnyFixMe) => {
    setSchedule(prev => prev.map((slot, i) =>
      i === dayIndex ? { ...slot, [field]: value } : slot
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-border dark:border-dark-border overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-dark-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
              style={{ backgroundColor: color }}
            >
              {name ? name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
            <h2 className="font-semibold text-on-surface dark:text-white">
              {isEditing ? 'Edit On-Ground Staff' : 'Add On-Ground Staff'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container-low dark:hover:bg-white/10 text-outline transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Basic info */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-400 flex items-center gap-2">
              <UserIcon className="w-3 h-3" /> Profile
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-on-surface-variant dark:text-zinc-400 mb-1">Name *</label>
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Dr. Sarah Johnson"
                  className="w-full px-3 py-2.5 rounded-xl border border-border dark:border-dark-border bg-white dark:bg-zinc-800 text-sm outline-none focus:border-[#0284C7] transition-colors text-on-surface dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant dark:text-zinc-400 mb-1">Job Title</label>
                <input
                  type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Senior Barber"
                  className="w-full px-3 py-2.5 rounded-xl border border-border dark:border-dark-border bg-white dark:bg-zinc-800 text-sm outline-none focus:border-[#0284C7] transition-colors text-on-surface dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant dark:text-zinc-400 mb-1">Status</label>
                <select
                  value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border dark:border-dark-border bg-white dark:bg-zinc-800 text-sm outline-none focus:border-[#0284C7] transition-colors text-on-surface dark:text-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ON_LEAVE">On Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant dark:text-zinc-400 mb-1">Contact Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="sarah@clinic.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-border dark:border-dark-border bg-white dark:bg-zinc-800 text-sm outline-none focus:border-[#0284C7] transition-colors text-on-surface dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant dark:text-zinc-400 mb-1">Phone</label>
                <div className="h-[42px] px-3 rounded-xl border border-border dark:border-dark-border bg-white dark:bg-zinc-800 text-sm flex items-center focus-within:border-[#0284C7] transition-colors overflow-hidden">
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    placeholder="+27 82 000 0000"
                    className="w-full text-sm text-on-surface dark:text-white"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-on-surface-variant dark:text-zinc-400 mb-1">Short Bio <span className="text-zinc-400 font-normal">(shown to customers)</span></label>
                <textarea
                  value={bio} onChange={e => setBio(e.target.value)}
                  placeholder="10+ years experience specialising in..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-border dark:border-dark-border bg-white dark:bg-zinc-800 text-sm outline-none focus:border-[#0284C7] transition-colors resize-none text-on-surface dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant dark:text-zinc-400 mb-1">Calendar Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setColor(c)}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: color === c ? '#000' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant dark:text-zinc-400 mb-1">Max Simultaneous Clients</label>
                <input
                  type="number" min={1} max={100} value={capacity} onChange={e => setCapacity(Number(e.target.value))}
                  className="w-24 px-3 py-2.5 rounded-xl border border-border dark:border-dark-border bg-white dark:bg-zinc-800 text-sm outline-none focus:border-[#0284C7] transition-colors text-on-surface dark:text-white"
                />
              </div>
            </div>
          </section>

          {/* Location & Member link */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-400 flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Location & Account
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant dark:text-zinc-400 mb-1">Location</label>
                <select
                  value={locationId} onChange={e => setLocationId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border dark:border-dark-border bg-white dark:bg-zinc-800 text-sm outline-none focus:border-[#0284C7] transition-colors text-on-surface dark:text-white"
                >
                  <option value="">All / Floating</option>
                  {(locations as AnyFixMe[]).map((loc: AnyFixMe) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant dark:text-zinc-400 mb-1">
                  <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /> Link to Member Account</span>
                </label>
                <select
                  value={linkedUserId} onChange={e => setLinkedUserId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border dark:border-dark-border bg-white dark:bg-zinc-800 text-sm outline-none focus:border-[#0284C7] transition-colors text-on-surface dark:text-white"
                >
                  <option value="">None (external provider)</option>
                  {(members as AnyFixMe[])
                    .filter((m: AnyFixMe) => !m.isInvite)
                    .map((m: AnyFixMe) => (
                      <option key={m.id} value={m.id}>{m.email}</option>
                    ))}
                </select>
              </div>
            </div>
          </section>

          {/* Services */}
          {(services as AnyFixMe[]).length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-400 flex items-center gap-2">
                <Briefcase className="w-3 h-3" /> Services They Provide
              </h3>
              <div className="flex flex-wrap gap-2">
                {(services as AnyFixMe[]).map((svc: AnyFixMe) => (
                  <button
                    key={svc.id} type="button"
                    onClick={() => toggleService(svc.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                      selectedServiceIds.includes(svc.id)
                        ? 'bg-[#0284C7] border-[#0284C7] text-white'
                        : 'border-border dark:border-dark-border text-on-surface-variant dark:text-zinc-400 hover:border-[#0284C7]/40'
                    }`}
                  >
                    {selectedServiceIds.includes(svc.id) && <Check className="w-3 h-3" />}
                    {svc.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-400 flex items-center gap-2">
              <Briefcase className="w-3 h-3" /> Skills & Intelligent Routing
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Provider Skills</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. Spanish, Pediatric, Advanced Certification (Comma separated)"
                className="w-full bg-surface-container-lowest dark:bg-black/30 border border-border dark:border-dark-border rounded-xl px-4 py-3 text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284C7] transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
              />
              <p className="text-xs text-on-surface-variant dark:text-zinc-500 mt-1">Providers with matching skills can be automatically assigned to services requiring these skills.</p>
            </div>
          </section>

          {/* Weekly availability */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-400 flex items-center gap-2">
              <Clock className="w-3 h-3" /> Weekly Availability
            </h3>
            <div className="space-y-2">
              {schedule.map((slot, i) => (
                <div key={slot.day} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  slot.enabled
                    ? 'border-border dark:border-dark-border bg-surface-container-lowest dark:bg-zinc-800'
                    : 'border-transparent bg-surface-container-low/50 dark:bg-zinc-900 opacity-50'
                }`}>
                  <button
                    type="button"
                    onClick={() => updateDay(i, 'enabled', !slot.enabled)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      slot.enabled ? 'bg-[#0284C7] border-[#0284C7]' : 'border-border dark:border-zinc-600'
                    }`}
                  >
                    {slot.enabled && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className="text-xs font-bold text-on-surface dark:text-white w-8">{DAY_LABELS[slot.day]}</span>
                  {slot.enabled ? (
                    <>
                      <input
                        type="time" value={slot.startTime}
                        onChange={e => updateDay(i, 'startTime', e.target.value)}
                        className="text-xs px-2 py-1.5 rounded-lg border border-border dark:border-dark-border bg-white dark:bg-zinc-900 text-on-surface dark:text-white outline-none focus:border-[#0284C7]"
                      />
                      <span className="text-xs text-on-surface-variant dark:text-zinc-500">to</span>
                      <input
                        type="time" value={slot.endTime}
                        onChange={e => updateDay(i, 'endTime', e.target.value)}
                        className="text-xs px-2 py-1.5 rounded-lg border border-border dark:border-dark-border bg-white dark:bg-zinc-900 text-on-surface dark:text-white outline-none focus:border-[#0284C7]"
                      />
                    </>
                  ) : (
                    <span className="text-xs text-on-surface-variant dark:text-zinc-500">Unavailable</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Desk Access Link — only shown when editing an existing staff member */}
          {isEditing && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-400 flex items-center gap-2">
                <Zap className="w-3 h-3" /> Desk Access Link
              </h3>
              <div className="p-4 rounded-xl border border-border dark:border-dark-border bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
                <p className="text-xs text-on-surface-variant dark:text-zinc-400">
                  Generate a unique link for this staff member to open their <strong className="text-on-surface dark:text-zinc-300">My Desk</strong> on any device — no Qmova login required. Share it as a bookmark, QR code, or pinned browser tab on their workstation.
                </p>
                {deskToken ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-zinc-800 border border-border dark:border-dark-border">
                      <ExternalLink className="w-4 h-4 text-indigo-500 shrink-0" />
                      <code className="text-xs text-zinc-600 dark:text-zinc-300 flex-1 truncate">
                        {typeof window !== 'undefined' ? `${window.location.origin}/staff-desk/${deskToken}` : `/staff-desk/${deskToken}`}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/staff-desk/${deskToken}`;
                          navigator.clipboard.writeText(url);
                          toast.success('Desk link copied!');
                        }}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-indigo-500 transition-colors"
                        title="Copy link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={revokingToken}
                      onClick={async () => {
                        if (!confirm('Revoke this desk link? The staff member will lose access until a new link is generated.')) return;
                        setRevokingToken(true);
                        try {
                          await fetchApi(`/staff/${provider.id}/desk-token`, { method: 'DELETE' });
                          setDeskToken(null);
                          queryClient.invalidateQueries({ queryKey: ['staffList'] });
                          toast.success('Desk link revoked.');
                        } catch { toast.error('Failed to revoke link.'); }
                        finally { setRevokingToken(false); }
                      }}
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {revokingToken ? 'Revoking…' : 'Revoke & regenerate'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={generatingToken}
                    onClick={async () => {
                      setGeneratingToken(true);
                      try {
                        const res = await fetchApi(`/staff/${provider.id}/desk-token`, { method: 'POST' });
                        setDeskToken(res.deskToken);
                        queryClient.invalidateQueries({ queryKey: ['staffList'] });
                        toast.success('Desk link generated!');
                      } catch { toast.error('Failed to generate desk link.'); }
                      finally { setGeneratingToken(false); }
                    }}
                    className="flex items-center gap-2 px-4 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                  >
                    {generatingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {generatingToken ? 'Generating…' : 'Generate Desk Link'}
                  </button>
                )}
              </div>
            </section>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border dark:border-dark-border flex-shrink-0">
          <button
            type="button" onClick={onClose}
            className="px-4 h-10 rounded-xl border border-border dark:border-dark-border text-sm font-semibold text-on-surface dark:text-white hover:bg-surface-container-low dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit" form="provider-form"
            disabled={mutation.isPending || !name}
            onClick={handleSubmit}
            className="px-5 h-10 bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Add Staff Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

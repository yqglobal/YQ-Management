import React from 'react';
import { Eye, EyeOff, LayoutGrid, AlignJustify, Maximize2, Coffee } from 'lucide-react';

interface ScheduleSidebarProps {
  services: any[];
  appointments: any[];
  visits: any[];
  showEmptySlots: boolean;
  showIdleGaps: boolean;
  showBufferZones: boolean;
  showWalkins: boolean;
  rowDensity: 'compact' | 'normal' | 'expanded';
  onToggleEmptySlots: () => void;
  onToggleIdleGaps: () => void;
  onToggleBufferZones: () => void;
  onToggleWalkins: () => void;
  onDensityChange: (d: 'compact' | 'normal' | 'expanded') => void;
}

function CapacityBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((used / total) * 100));
  const color = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-on-surface-variant dark:text-zinc-400 truncate max-w-[130px]">{label}</span>
        <span className="text-xs font-bold text-on-surface dark:text-white tabular-nums">{used}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-container dark:bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  active,
  onToggle,
  icon,
}: {
  label: string;
  description?: string;
  active: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${active ? 'bg-primary/10 text-primary dark:text-sky-400' : 'hover:bg-surface-container dark:hover:bg-white/5 text-on-surface-variant dark:text-zinc-400'}`}
    >
      <span className="shrink-0">{icon || (active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />)}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold leading-tight">{label}</p>
        {description && <p className="text-[10px] opacity-60 mt-0.5">{description}</p>}
      </div>
      <div className={`ml-auto w-8 h-4 rounded-full transition-colors shrink-0 ${active ? 'bg-primary dark:bg-sky-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
        <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform shadow ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

export function ScheduleSidebar({
  services,
  appointments,
  visits,
  showEmptySlots,
  showIdleGaps,
  showBufferZones,
  showWalkins,
  rowDensity,
  onToggleEmptySlots,
  onToggleIdleGaps,
  onToggleBufferZones,
  onToggleWalkins,
  onDensityChange,
}: ScheduleSidebarProps) {
  // Compute total slots per service (9am–6pm business window)
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  return (
    <div className="w-60 shrink-0 bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl overflow-hidden flex flex-col gap-0 shadow-sm">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border dark:border-dark-border">
        <h3 className="text-sm font-bold text-on-surface dark:text-white">Schedule Controls</h3>
        <p className="text-[11px] text-on-surface-variant mt-0.5">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">

        {/* Capacity overview */}
        {services.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">Capacity Today</p>
            {services.slice(0, 5).map((svc: any) => {
              const svcAppointments = appointments.filter((a: any) => a.serviceId === svc.id);
              // Estimate capacity: 9 hours ÷ duration
              const totalSlots = Math.floor((9 * 60) / (svc.expectedDuration || 30));
              return (
                <CapacityBar
                  key={svc.id}
                  label={svc.name}
                  used={svcAppointments.length}
                  total={totalSlots}
                />
              );
            })}
          </div>
        )}

        {/* Stats pills */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-sky-700 dark:text-sky-300">{appointments.length}</p>
            <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium uppercase tracking-wide">Booked</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{visits.filter((v: any) => !v.appointmentId).length}</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">Walk-ins</p>
          </div>
        </div>

        {/* View toggles */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">Layers</p>
          <ToggleRow label="Empty Slots" description="Ghost placeholders for open capacity" active={showEmptySlots} onToggle={onToggleEmptySlots} />
          <ToggleRow label="Idle Gaps" description="Detected gaps between bookings" active={showIdleGaps} onToggle={onToggleIdleGaps} />
          <ToggleRow label="Buffer Zones" description="Cleanup/prep time after appointments" active={showBufferZones} onToggle={onToggleBufferZones} />
          <ToggleRow label="Walk-ins" description="Walkin visit blocks" active={showWalkins} onToggle={onToggleWalkins} />
        </div>

        {/* Row density */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">Row Height</p>
          <div className="flex gap-1.5">
            {(['compact', 'normal', 'expanded'] as const).map((d) => (
              <button
                key={d}
                onClick={() => onDensityChange(d)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${rowDensity === d ? 'bg-primary text-white shadow-sm' : 'bg-surface-container dark:bg-white/10 text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-white/15'}`}
              >
                {d === 'compact' ? 'S' : d === 'normal' ? 'M' : 'L'}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">Legend</p>
          <div className="space-y-1.5">
            {[
              { color: 'bg-sky-200 border-sky-300 dark:bg-sky-900/50 dark:border-sky-700', label: 'Appointment' },
              { color: 'bg-emerald-200 border-emerald-300 dark:bg-emerald-900/50 dark:border-emerald-700', label: 'Walk-in' },
              { color: 'border-dashed border-zinc-300 dark:border-zinc-600', label: 'Empty slot', dashed: true },
              { color: 'bg-amber-100 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700', label: 'Buffer time' },
            ].map(({ color, label, dashed }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-5 h-3 rounded border ${color} shrink-0`} />
                <span className="text-[11px] text-on-surface-variant">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-5 h-3 rounded" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(113,113,122,0.3) 2px, rgba(113,113,122,0.3) 4px)' }} />
              <span className="text-[11px] text-on-surface-variant">Idle gap</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

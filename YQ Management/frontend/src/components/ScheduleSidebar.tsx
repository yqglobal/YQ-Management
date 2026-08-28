import React from 'react';

interface ScheduleSidebarProps {
  services: any[];
  appointments: any[];
  visits: any[];
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

export function ScheduleSidebar({
  services,
  appointments,
  visits,
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


      </div>
    </div>
  );
}

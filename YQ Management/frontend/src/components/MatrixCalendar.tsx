import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';

// ------- Constants -------
const HOUR_WIDTH = 240; // px per hour  (= 4px per minute)
const LEFT_SIDEBAR_WIDTH = 260; // px for the row label
const ROW_HEIGHT_NORMAL = 108; // px base row height
const HALF_HOUR_COLS = 48;

// Generate time labels: 12:00 AM → 11:30 PM (48 slots × 30 min)
const TIMES = Array.from({ length: HALF_HOUR_COLS }, (_, i) => {
  const hr = Math.floor(i / 2);
  const min = i % 2 === 0 ? '00' : '30';
  const ampm = hr < 12 ? 'AM' : 'PM';
  const displayHr = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return `${displayHr.toString().padStart(2, '0')}:${min} ${ampm}`;
});

// ------- Helpers -------
function minutesFromMidnight(isoStr: string): number {
  const d = new Date(isoStr);
  return d.getHours() * 60 + d.getMinutes();
}

function minutesToPx(mins: number): number {
  return (mins / 60) * HOUR_WIDTH;
}

function pxToMinutes(px: number): number {
  return (px / HOUR_WIDTH) * 60;
}

function snapToGranularity(mins: number, granularity = 15): number {
  return Math.round(mins / granularity) * granularity;
}

type StatusColors = Record<string, { bg: string; border: string; text: string; dot: string }>;

const STATUS_COLORS: StatusColors = {
  SCHEDULED:        { bg: 'bg-sky-50 dark:bg-sky-950/40',     border: 'border-sky-300 dark:border-sky-700',   text: 'text-sky-800 dark:text-sky-200', dot: 'bg-sky-500' },
  CONFIRMED:        { bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-300 dark:border-indigo-700', text: 'text-indigo-800 dark:text-indigo-200', dot: 'bg-indigo-500' },
  CHECKED_IN:       { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-400 dark:border-emerald-600', text: 'text-emerald-800 dark:text-emerald-200', dot: 'bg-emerald-500' },
  IN_PROGRESS:      { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-400 dark:border-amber-600', text: 'text-amber-800 dark:text-amber-200', dot: 'bg-amber-500' },
  COMPLETED:        { bg: 'bg-zinc-100 dark:bg-zinc-900/60',   border: 'border-zinc-300 dark:border-zinc-700',   text: 'text-zinc-500 dark:text-zinc-400', dot: 'bg-zinc-400' },
  PENDING_APPROVAL: { bg: 'bg-rose-50 dark:bg-rose-950/40',   border: 'border-rose-300 dark:border-rose-700',   text: 'text-rose-800 dark:text-rose-200',  dot: 'bg-rose-500' },
  CANCELLED:        { bg: 'bg-zinc-100 dark:bg-zinc-900/50',   border: 'border-dashed border-zinc-300 dark:border-zinc-700', text: 'text-zinc-400 dark:text-zinc-600', dot: 'bg-zinc-300' },
};

// ------- Types -------
interface ScheduleViewData {
  date: string;
  appointments: any[];
  visits: any[];
  services: any[];
  serviceStats: Array<{
    serviceId: string;
    effectiveDurationMins: number;
    gaps: Array<{ start: string; end: string; durationMins: number }>;
  }>;
}

interface RowConfig {
  id: string;
  name: string;
  type: string;
  initials: string;
  color: string;
  allowAppointments: boolean;
  expectedDuration: number;
  effectiveDurationMins: number;
  bufferDuration: number;
  appointments: any[];
  walkins: any[];
  gaps: Array<{ start: string; end: string; durationMins: number }>;
  slots: Array<{ time: string; available: boolean }>;
}

// ------- Sub-components -------

// Ghost slot placeholder (dotted rectangle)
function SlotPlaceholder({ leftPx, widthPx, onDrop }: { leftPx: number; widthPx: number; onDrop?: (isoTime: string) => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`absolute top-2 rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center cursor-default
        ${isDragOver
          ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-900/30 scale-[1.02]'
          : isHovered
            ? 'border-zinc-400 dark:border-zinc-500 bg-zinc-50/40 dark:bg-zinc-800/20'
            : 'border-zinc-300/60 dark:border-zinc-700/50 bg-transparent'
        }`}
      style={{
        left: `${leftPx}px`,
        width: `${Math.max(widthPx - 4, 20)}px`,
        height: '88px',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        setIsDragOver(false);
        if (onDrop) onDrop(e.dataTransfer.getData('slot-time'));
      }}
    >
      {isHovered || isDragOver ? (
        <div className="text-xs text-zinc-400 dark:text-zinc-500 font-medium flex items-center gap-1">
          <span className="text-lg leading-none">+</span>
          <span>Book</span>
        </div>
      ) : (
        <div className="w-6 h-6 rounded-full border-2 border-dashed border-zinc-300/50 dark:border-zinc-700/40" />
      )}
    </div>
  );
}

// Idle/gap block
function IdleBlock({ leftPx, widthPx, durationMins }: { leftPx: number; widthPx: number; durationMins: number }) {
  if (widthPx < 24) return null;
  return (
    <div
      className="absolute top-2 bottom-2 rounded-lg flex items-center justify-center overflow-hidden pointer-events-none"
      style={{
        left: `${leftPx}px`,
        width: `${Math.max(widthPx, 16)}px`,
        background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(113,113,122,0.05) 5px, rgba(113,113,122,0.05) 10px)',
        border: '1px dashed rgba(161,161,170,0.3)',
      }}
    >
      {widthPx > 60 && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 bg-white/80 dark:bg-zinc-900/80 px-1.5 py-0.5 rounded-full whitespace-nowrap">
          ⏸ {durationMins} min
        </span>
      )}
    </div>
  );
}

// Buffer zone after appointment
function BufferZone({ leftPx, widthPx }: { leftPx: number; widthPx: number }) {
  if (widthPx < 4) return null;
  return (
    <div
      className="absolute top-3 bottom-3 rounded-r-md pointer-events-none opacity-60"
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
        background: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(251,191,36,0.2) 3px, rgba(251,191,36,0.2) 6px)',
        border: '1px solid rgba(251,191,36,0.3)',
        borderLeft: 'none',
      }}
    />
  );
}

// Appointment card
function AppointmentCard({
  apt,
  leftPx,
  widthPx,
  topPx,
  isDraggable,
  onClick,
}: {
  apt: any;
  leftPx: number;
  widthPx: number;
  topPx: number;
  isDraggable: boolean;
  onClick?: () => void;
}) {
  const status = apt.status || apt.currentState || 'SCHEDULED';
  const colors = STATUS_COLORS[status] || STATUS_COLORS.SCHEDULED;
  const name = apt.customer?.name || apt.customerName || 'Walk-in';
  const isWalkin = apt._type === 'Visit' || apt._type?.includes('Walk-in') || apt.source === 'WALK_IN';

  return (
    <button
      className={`absolute rounded-xl p-2.5 flex flex-col justify-between items-start transition-all
        focus:outline-none focus:ring-2 focus:ring-indigo-400
        hover:shadow-lg hover:scale-[1.01] hover:z-30
        ${colors.bg} border ${colors.border}
        ${isDraggable ? 'cursor-move' : 'cursor-pointer'}
        ${status === 'COMPLETED' ? 'opacity-60' : ''}
      `}
      style={{
        left: `${leftPx}px`,
        width: `${Math.max(widthPx - 4, 40)}px`,
        top: `${topPx}px`,
        height: '88px',
        zIndex: 10,
      }}
      draggable={isDraggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify(apt));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onClick}
      title={`${name} — ${status}`}
    >
      <div className="flex items-center gap-1.5 w-full overflow-hidden">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
        <span className={`text-[10px] font-bold uppercase tracking-widest truncate ${colors.text} opacity-70`}>
          {isWalkin ? 'Walk-in' : 'Appt'} #{(apt.displayId || apt.id?.slice(0, 4) || '?').toUpperCase()}
        </span>
        {isDraggable && (
          <span className="ml-auto text-zinc-400 dark:text-zinc-600 text-[10px]">⠿</span>
        )}
      </div>
      <span className={`text-xs font-semibold truncate w-full text-left ${colors.text}`}>{name}</span>
      {apt.service?.name && (
        <span className={`text-[10px] truncate w-full text-left opacity-60 ${colors.text}`}>{apt.service.name}</span>
      )}
    </button>
  );
}

// ------- Main MatrixCalendar component -------
export function MatrixCalendar({
  scheduleData,
  appointments = [],
  services = [],
  currentDate = new Date(),
  onReschedule,
  showEmptySlots = true,
  showIdleGaps = true,
  showBufferZones = true,
  showWalkins = true,
  rowDensity = 'normal',
}: {
  scheduleData?: ScheduleViewData;
  appointments?: any[];
  services?: any[];
  currentDate?: Date;
  onReschedule?: (apt: any, newTime: Date, serviceId: string | null) => void;
  showEmptySlots?: boolean;
  showIdleGaps?: boolean;
  showBufferZones?: boolean;
  showWalkins?: boolean;
  rowDensity?: 'compact' | 'normal' | 'expanded';
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [dragOverRow, setDragOverRow] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const rowHeightPx = rowDensity === 'compact' ? 80 : rowDensity === 'expanded' ? 160 : ROW_HEIGHT_NORMAL;

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current time on today
  useEffect(() => {
    if (now && currentDate.toDateString() === now.toDateString() && scrollRef.current && !hasScrolledRef.current) {
      const nowPx = LEFT_SIDEBAR_WIDTH + minutesToPx(now.getHours() * 60 + now.getMinutes());
      scrollRef.current.scrollTo({ left: Math.max(0, nowPx - 400), behavior: 'smooth' });
      hasScrolledRef.current = true;
    }
  }, [now, currentDate]);

  // --- Build row data ---
  // Use scheduleData if provided (new endpoint), otherwise fall back to legacy props
  const effectiveAppointments = scheduleData?.appointments ?? appointments;
  const effectiveServices = scheduleData?.services ?? services;
  const effectiveVisits = scheduleData?.visits ?? [];
  const serviceStatsMap = new Map(
    (scheduleData?.serviceStats ?? []).map((s) => [s.serviceId, s])
  );

  // Group appointments by service
  const apptsByService = new Map<string, any[]>();
  effectiveAppointments.forEach((apt) => {
    const key = apt.serviceId || 'unassigned';
    if (!apptsByService.has(key)) apptsByService.set(key, []);
    apptsByService.get(key)!.push({ ...apt, _type: 'Appointment' });
  });

  // Group walk-in visits by service
  const walkinsByService = new Map<string, any[]>();
  effectiveVisits
    .filter((v: any) => !v.appointmentId)
    .forEach((v: any) => {
      const key = v.serviceId || 'unassigned';
      if (!walkinsByService.has(key)) walkinsByService.set(key, []);
      walkinsByService.get(key)!.push({ ...v, _type: 'Visit' });
    });

  const serviceColors = ['bg-indigo-100 text-indigo-700', 'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700'];

  const rows: RowConfig[] = effectiveServices.map((svc: any, idx: number) => {
    const stat = serviceStatsMap.get(svc.id);
    return {
      id: svc.id,
      name: svc.name,
      type: svc.allowAppointments ? 'Appointment Service' : 'Walk-in Only',
      initials: svc.name.substring(0, 2).toUpperCase(),
      color: serviceColors[idx % serviceColors.length],
      allowAppointments: svc.allowAppointments,
      expectedDuration: svc.expectedDuration || 30,
      effectiveDurationMins: stat?.effectiveDurationMins ?? svc.avgActualDurationMins ?? svc.expectedDuration ?? 30,
      bufferDuration: svc.bufferDuration || 0,
      appointments: apptsByService.get(svc.id) || [],
      walkins: walkinsByService.get(svc.id) || [],
      gaps: stat?.gaps ?? [],
      slots: [],
    };
  });

  // If no services, add unassigned row
  const unassignedApts = apptsByService.get('unassigned') || [];
  const unassignedWalkins = walkinsByService.get('unassigned') || [];
  if (unassignedApts.length > 0 || unassignedWalkins.length > 0 || rows.length === 0) {
    rows.push({
      id: 'unassigned',
      name: rows.length === 0 ? 'General Queue' : 'Unassigned',
      type: rows.length === 0 ? 'Default' : 'General',
      initials: 'GQ',
      color: 'bg-zinc-100 text-zinc-600',
      allowAppointments: false,
      expectedDuration: 30,
      effectiveDurationMins: 30,
      bufferDuration: 0,
      appointments: unassignedApts,
      walkins: unassignedWalkins,
      gaps: [],
      slots: [],
    });
  }

  // --- Overlap detection for vertical stacking ---
  function computeItemLanes(items: any[], getDuration: (item: any) => number) {
    // Returns an array of lane indices (0-based row within the timeline row)
    const lanes: number[] = new Array(items.length).fill(0);
    const laneEnds: number[] = [];

    items.forEach((item, i) => {
      const startMins = minutesFromMidnight(item.scheduledStart || item.scheduledTime || item.waitingStart || item.createdAt);
      const duration = getDuration(item);
      const endMins = startMins + duration;

      let placed = false;
      for (let lane = 0; lane < laneEnds.length; lane++) {
        if (laneEnds[lane] <= startMins) {
          lanes[i] = lane;
          laneEnds[lane] = endMins;
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes[i] = laneEnds.length;
        laneEnds.push(endMins);
      }
    });

    return { lanes, laneCount: Math.max(1, laneEnds.length) };
  }

  const handleDropOnRow = useCallback((e: React.DragEvent, row: RowConfig) => {
    if (!onReschedule) return;
    e.preventDefault();
    setDragOverRow(null);

    const aptData = e.dataTransfer.getData('application/json');
    if (!aptData) return;
    const apt = JSON.parse(aptData);

    const rowRect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rowRect.left;
    const mins = snapToGranularity(pxToMinutes(x));

    const newTime = new Date(currentDate);
    newTime.setHours(0, 0, 0, 0);
    newTime.setMinutes(mins);

    onReschedule(apt, newTime, row.id === 'unassigned' ? null : row.id);
  }, [currentDate, onReschedule]);

  return (
    <div className="bg-card dark:bg-dark-card rounded-[2rem] border border-border dark:border-dark-border shadow-sm overflow-hidden flex flex-col" style={{ minHeight: '520px' }}>
      <div ref={scrollRef} className="flex-1 overflow-auto relative custom-scrollbar">

        {/* Time header */}
        <div
          className="sticky top-0 z-20 bg-card/95 dark:bg-dark-card/95 backdrop-blur-sm border-b border-border dark:border-dark-border"
          style={{ display: 'grid', gridTemplateColumns: `${LEFT_SIDEBAR_WIDTH}px repeat(${HALF_HOUR_COLS}, ${HOUR_WIDTH / 2}px)` }}
        >
          <div className="sticky left-0 z-30 bg-card/95 dark:bg-dark-card/95 backdrop-blur-sm border-r border-border dark:border-dark-border p-4 flex items-end">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-[11px]">
              {format(currentDate, 'EEE, MMM d')}
            </span>
          </div>
          {TIMES.map((time, i) => (
            <div key={time} className={`p-3 border-r border-border dark:border-dark-border font-data-mono text-[11px] text-on-surface-variant flex flex-col justify-end ${i % 2 === 0 ? '' : 'border-dashed opacity-60'}`}>
              {i % 2 === 0 ? time : ''}
            </div>
          ))}
        </div>

        {/* Timeline body */}
        <div className="relative min-w-max">

          {/* Live time needle */}
          {now && currentDate.toDateString() === now.toDateString() && (() => {
            const nowMins = now.getHours() * 60 + now.getMinutes();
            const leftPx = LEFT_SIDEBAR_WIDTH + minutesToPx(nowMins);
            return (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: `${leftPx}px`, width: '2px', background: 'linear-gradient(to bottom, #f43f5e, #fb7185)' }}
              >
                <div className="w-3 h-3 bg-rose-500 rounded-full absolute -top-1.5 -left-[5px] shadow-[0_0_10px_rgba(244,63,94,0.7)]" />
              </div>
            );
          })()}

          {/* Service rows */}
          {rows.map((row) => {
            const allItems = [
              ...row.appointments.sort((a, b) =>
                new Date(a.scheduledStart || a.scheduledTime || a.createdAt).getTime() -
                new Date(b.scheduledStart || b.scheduledTime || b.createdAt).getTime()
              ),
              ...(showWalkins ? row.walkins.sort((a: any, b: any) =>
                new Date(a.waitingStart || a.createdAt).getTime() -
                new Date(b.waitingStart || b.createdAt).getTime()
              ) : []),
            ];

            const { lanes, laneCount } = computeItemLanes(allItems, (item) => {
              if (item._type === 'Appointment') {
                if (item.scheduledStart && item.scheduledEnd) {
                  return (new Date(item.scheduledEnd).getTime() - new Date(item.scheduledStart).getTime()) / 60000;
                }
                return row.expectedDuration;
              }
              // Walk-in: use effective duration
              return row.effectiveDurationMins;
            });

            const LANE_HEIGHT = 96; // px per lane
            const LANE_MARGIN = 6;
            const dynamicRowHeight = Math.max(rowHeightPx, laneCount * (LANE_HEIGHT + LANE_MARGIN) + 16);

            const isDragTarget = dragOverRow === row.id;

            return (
              <div
                key={row.id}
                className={`border-b border-border dark:border-dark-border group transition-colors ${isDragTarget ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `${LEFT_SIDEBAR_WIDTH}px 1fr`,
                  minHeight: `${dynamicRowHeight}px`,
                }}
              >
                {/* Row label */}
                <div className="sticky left-0 z-10 bg-card dark:bg-dark-card border-r border-border dark:border-dark-border p-4 flex flex-col justify-start gap-2 group-hover:bg-surface-container-low dark:group-hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${row.color}`}>
                      {row.initials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-on-surface dark:text-white truncate">{row.name}</h3>
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">{row.type}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[10px] bg-surface-container dark:bg-white/10 text-on-surface-variant rounded-full px-2 py-0.5">
                      {row.effectiveDurationMins}m avg
                    </span>
                    {row.appointments.length > 0 && (
                      <span className="text-[10px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 rounded-full px-2 py-0.5">
                        {row.appointments.length} booked
                      </span>
                    )}
                    {row.walkins.length > 0 && (
                      <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full px-2 py-0.5">
                        {row.walkins.length} walk-in
                      </span>
                    )}
                  </div>
                </div>

                {/* Timeline content area */}
                <div
                  className="relative"
                  style={{ width: `${HALF_HOUR_COLS * (HOUR_WIDTH / 2)}px` }}
                  onDragOver={(e) => {
                    if (onReschedule) { e.preventDefault(); setDragOverRow(row.id); }
                  }}
                  onDragLeave={() => setDragOverRow(null)}
                  onDrop={(e) => handleDropOnRow(e, row)}
                >
                  {/* Past-time shading */}
                  {now && currentDate.toDateString() === now.toDateString() && (
                    <div
                      className="absolute inset-y-0 left-0 bg-zinc-500/[0.03] dark:bg-zinc-800/20 pointer-events-none z-0"
                      style={{ width: `${minutesToPx(now.getHours() * 60 + now.getMinutes())}px` }}
                    />
                  )}

                  {/* Vertical hour lines */}
                  <div className="absolute inset-0 pointer-events-none z-0" style={{
                    backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 119px, rgba(var(--color-border), 0.4) 120px)',
                    backgroundSize: `${HOUR_WIDTH}px 100%`,
                  }} />

                  {/* Slot placeholders */}
                  {showEmptySlots && row.allowAppointments && (() => {
                    // Generate slot placeholders from business hours 9am-6pm
                    const placeholders: React.ReactNode[] = [];
                    const gran = 15; // minutes
                    const slotDuration = row.effectiveDurationMins;
                    const buffer = row.bufferDuration || 0;

                    // Get booked time ranges
                    const bookedRanges = row.appointments.map((apt: any) => {
                      const start = minutesFromMidnight(apt.scheduledStart || apt.scheduledTime || apt.createdAt);
                      const durMins = apt.scheduledStart && apt.scheduledEnd
                        ? (new Date(apt.scheduledEnd).getTime() - new Date(apt.scheduledStart).getTime()) / 60000
                        : slotDuration;
                      return { start, end: start + durMins + buffer };
                    });

                    const nowMins = now ? now.getHours() * 60 + now.getMinutes() : 0;
                    const isToday = now && currentDate.toDateString() === now.toDateString();

                    for (let mins = 9 * 60; mins + slotDuration <= 18 * 60; mins += gran) {
                      // Skip past slots (for today)
                      if (isToday && mins < nowMins) continue;

                      // Check if slot overlaps a booked range
                      const overlaps = bookedRanges.some(r => mins < r.end && (mins + slotDuration) > r.start);
                      if (!overlaps) {
                        const leftPx = minutesToPx(mins);
                        const widthPx = minutesToPx(slotDuration);
                        placeholders.push(
                          <SlotPlaceholder
                            key={`slot-${mins}`}
                            leftPx={leftPx}
                            widthPx={widthPx}
                          />
                        );
                      }
                    }
                    return placeholders;
                  })()}

                  {/* Idle gap blocks */}
                  {showIdleGaps && row.gaps.map((gap, gi) => {
                    const startMins = minutesFromMidnight(gap.start);
                    const endMins = minutesFromMidnight(gap.end);
                    return (
                      <IdleBlock
                        key={`gap-${gi}`}
                        leftPx={minutesToPx(startMins)}
                        widthPx={minutesToPx(endMins - startMins)}
                        durationMins={gap.durationMins}
                      />
                    );
                  })}

                  {/* Appointment + walk-in cards */}
                  {allItems.map((item, i) => {
                    const timeStr = item.scheduledStart || item.scheduledTime || item.waitingStart || item.createdAt;
                    const startMins = minutesFromMidnight(timeStr);
                    const leftPx = minutesToPx(startMins);

                    let durationMins = row.effectiveDurationMins;
                    if (item._type === 'Appointment' && item.scheduledStart && item.scheduledEnd) {
                      durationMins = (new Date(item.scheduledEnd).getTime() - new Date(item.scheduledStart).getTime()) / 60000;
                    }

                    const widthPx = minutesToPx(Math.max(durationMins, row.effectiveDurationMins));
                    const laneTopPx = 8 + lanes[i] * (LANE_HEIGHT + LANE_MARGIN);
                    const isDraggable = !!onReschedule && item._type === 'Appointment';

                    return (
                      <React.Fragment key={item.id || i}>
                        <AppointmentCard
                          apt={item}
                          leftPx={leftPx}
                          widthPx={widthPx}
                          topPx={laneTopPx}
                          isDraggable={isDraggable}
                        />
                        {/* Buffer zone */}
                        {showBufferZones && row.bufferDuration > 0 && item._type === 'Appointment' && (
                          <BufferZone
                            leftPx={leftPx + widthPx - 2}
                            widthPx={minutesToPx(row.bufferDuration)}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

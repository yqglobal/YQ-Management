import React, { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Clock, Coffee, Moon, Sun } from "lucide-react";

// ------- Constants -------
const START_HOUR = 0;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const QUARTER_HOUR_COLS = TOTAL_HOURS * 4;
const LEFT_SIDEBAR_WIDTH = 260; // px for the row label
const ROW_HEIGHT_NORMAL = 108; // px base row height
const HOUR_WIDTH = 120; // px

// Generate time labels: 8:00 AM → 7:45 PM
const TIMES = Array.from({ length: QUARTER_HOUR_COLS }, (_, i) => {
  const absoluteQuarter = START_HOUR * 4 + i;
  const hr = Math.floor(absoluteQuarter / 4);
  const min = (absoluteQuarter % 4) * 15;
  const ampm = hr < 12 ? "AM" : "PM";
  const displayHr = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  const minStr = min === 0 ? "00" : min.toString();
  return { time: `${displayHr}:${minStr} ${ampm}`, isHour: min === 0 };
});

// ------- Helpers -------
function minutesFromMidnight(isoStr: string): number {
  const d = new Date(isoStr);
  return d.getHours() * 60 + d.getMinutes();
}

function minutesToPercent(mins: number): number {
  const startMins = START_HOUR * 60;
  const totalMins = TOTAL_HOURS * 60;
  const pct = ((mins - startMins) / totalMins) * 100;
  return Math.max(0, Math.min(100, pct));
}

function durationToPercent(durationMins: number, startMins: number): number {
  const startDayMins = START_HOUR * 60;
  const totalMins = TOTAL_HOURS * 60;
  let effectiveStart = startMins;
  let effectiveDuration = durationMins;

  if (effectiveStart < startDayMins) {
    effectiveDuration -= startDayMins - effectiveStart;
    effectiveStart = startDayMins;
  }

  if (effectiveStart + effectiveDuration > startDayMins + totalMins) {
    effectiveDuration = startDayMins + totalMins - effectiveStart;
  }

  const pct = (effectiveDuration / totalMins) * 100;
  return Math.max(0, pct);
}

function pxToMinutes(px: number, containerWidth: number): number {
  const totalMins = TOTAL_HOURS * 60;
  const startMins = START_HOUR * 60;
  const pct = px / containerWidth;
  return startMins + pct * totalMins;
}

function snapToGranularity(mins: number, granularity = 15): number {
  return Math.round(mins / granularity) * granularity;
}

function timeStringToMinutes(str?: string): number {
  if (!str) return 0;
  const [h, m] = str.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutesToTime(mins: number): string {
  const hr = Math.floor(mins / 60) % 24;
  const min = mins % 60;
  const ampm = hr < 12 ? "AM" : "PM";
  const displayHr = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  const minStr = min < 10 ? `0${min}` : min.toString();
  return `${displayHr}:${minStr} ${ampm}`;
}

export interface ParsedBreak {
  startMins: number;
  endMins: number;
  startStr: string;
  endStr: string;
  reason?: string;
}

export interface ParsedOperatingHours {
  isClosed: boolean;
  startMins: number;
  endMins: number;
  startStr: string;
  endStr: string;
  breaks: ParsedBreak[];
}

function parseOperatingHours(
  bh: any,
  dayName: string,
  serviceBlockOffs: any[] = [],
  currentDate: Date = new Date(),
): ParsedOperatingHours {
  let isClosed = false;
  let startMins = 9 * 60; // 09:00 default
  let endMins = 17 * 60; // 17:00 default
  const breaks: ParsedBreak[] = [];

  const daySchedule = bh ? bh[dayName] : null;

  if (Array.isArray(daySchedule)) {
    // Array of TimeSlots from ScheduleEditor: e.g. [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }]
    if (daySchedule.length === 0) {
      isClosed = true;
    } else {
      const sorted = [...daySchedule]
        .filter((s: any) => s && s.start && s.end)
        .sort((a, b) => a.start.localeCompare(b.start));

      if (sorted.length === 0) {
        isClosed = true;
      } else {
        startMins = timeStringToMinutes(sorted[0].start);
        endMins = timeStringToMinutes(sorted[sorted.length - 1].end);

        // Gaps between intervals are scheduled breaks (e.g. Lunch)
        for (let i = 0; i < sorted.length - 1; i++) {
          const bStart = timeStringToMinutes(sorted[i].end);
          const bEnd = timeStringToMinutes(sorted[i + 1].start);
          if (bEnd > bStart) {
            breaks.push({
              startMins: bStart,
              endMins: bEnd,
              startStr: formatMinutesToTime(bStart),
              endStr: formatMinutesToTime(bEnd),
              reason: "Scheduled Break",
            });
          }
        }
      }
    }
  } else if (daySchedule && typeof daySchedule === "object") {
    // Legacy Object format: { start: "09:00", end: "17:00", isClosed: false, breaks: [...] }
    if (daySchedule.isClosed || daySchedule.closed) {
      isClosed = true;
    } else {
      if (daySchedule.start) startMins = timeStringToMinutes(daySchedule.start);
      if (daySchedule.end) endMins = timeStringToMinutes(daySchedule.end);

      if (Array.isArray(daySchedule.breaks)) {
        daySchedule.breaks.forEach((b: any) => {
          if (b && b.start && b.end) {
            const bStart = timeStringToMinutes(b.start);
            const bEnd = timeStringToMinutes(b.end);
            if (bEnd > bStart) {
              breaks.push({
                startMins: bStart,
                endMins: bEnd,
                startStr: formatMinutesToTime(bStart),
                endStr: formatMinutesToTime(bEnd),
                reason: b.reason || "Break",
              });
            }
          }
        });
      }
    }
  } else if (!bh) {
    // Default fallback if no business hours are configured
    if (dayName === "sunday" || dayName === "saturday") {
      isClosed = true;
    }
  }

  // Merge in any BlockOffs for this service/queue/location on this date
  if (Array.isArray(serviceBlockOffs) && !isClosed) {
    const curYear = currentDate.getFullYear();
    const curMonth = currentDate.getMonth();
    const curDate = currentDate.getDate();

    serviceBlockOffs.forEach((bo: any) => {
      const boStart = new Date(bo.startTime);
      const boEnd = new Date(bo.endTime);

      const dayStart = new Date(curYear, curMonth, curDate, 0, 0, 0);
      const dayEnd = new Date(curYear, curMonth, curDate, 23, 59, 59);

      if (boStart <= dayEnd && boEnd >= dayStart) {
        const effectiveStartMins =
          boStart < dayStart
            ? 0
            : boStart.getHours() * 60 + boStart.getMinutes();
        const effectiveEndMins =
          boEnd > dayEnd
            ? 1440
            : boEnd.getHours() * 60 + boEnd.getMinutes();

        if (effectiveEndMins > effectiveStartMins) {
          breaks.push({
            startMins: effectiveStartMins,
            endMins: effectiveEndMins,
            startStr: formatMinutesToTime(effectiveStartMins),
            endStr: formatMinutesToTime(effectiveEndMins),
            reason: bo.reason || "Break / Blocked",
          });
        }
      }
    });
  }

  return {
    isClosed,
    startMins,
    endMins,
    startStr: formatMinutesToTime(startMins),
    endStr: formatMinutesToTime(endMins),
    breaks,
  };
}

type StatusColors = Record<
  string,
  { bg: string; border: string; text: string; dot: string }
>;

const STATUS_COLORS: StatusColors = {
  SCHEDULED: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-300 dark:border-sky-700",
    text: "text-sky-800 dark:text-sky-200",
    dot: "bg-sky-500",
  },
  CONFIRMED: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-300 dark:border-indigo-700",
    text: "text-indigo-800 dark:text-indigo-200",
    dot: "bg-indigo-500",
  },
  CHECKED_IN: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-400 dark:border-emerald-600",
    text: "text-emerald-800 dark:text-emerald-200",
    dot: "bg-emerald-500",
  },
  IN_PROGRESS: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-400 dark:border-amber-600",
    text: "text-amber-800 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  COMPLETED: {
    bg: "bg-zinc-100 dark:bg-zinc-900/60",
    border: "border-zinc-300 dark:border-zinc-700",
    text: "text-zinc-500 dark:text-zinc-400",
    dot: "bg-zinc-400",
  },
  PENDING_APPROVAL: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-300 dark:border-rose-700",
    text: "text-rose-800 dark:text-rose-200",
    dot: "bg-rose-500",
  },
  CANCELLED: {
    bg: "bg-zinc-100 dark:bg-zinc-900/50",
    border: "border-dashed border-zinc-300 dark:border-zinc-700",
    text: "text-zinc-400 dark:text-zinc-600",
    dot: "bg-zinc-300",
  },
};

// ------- Types -------
interface ScheduleViewData {
  date: string;
  appointments: AnyFixMe[];
  visits: AnyFixMe[];
  services: AnyFixMe[];
  serviceStats: Array<{
    serviceId: string;
    effectiveDurationMins: number;
    gaps: Array<{ start: string; end: string; durationMins: number }>;
  }>;
  blockOffs?: AnyFixMe[];
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
  appointments: AnyFixMe[];
  walkins: AnyFixMe[];
  gaps: Array<{ start: string; end: string; durationMins: number }>;
  slots: Array<{ time: string; available: boolean }>;
  useLocationHours?: boolean;
  businessHoursOverride?: any;
  location?: any;
  queues?: any[];
  operatingHours?: ParsedOperatingHours;
}

// ------- Sub-components -------

// Ghost slot placeholder (dotted rectangle)
function SlotPlaceholder({
  leftPct,
  widthPct,
  onDrop,
}: {
  leftPct: number;
  widthPct: number;
  onDrop?: (isoTime: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`absolute top-2 rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center cursor-default
        ${
          isDragOver
            ? "border-indigo-400 bg-indigo-50/60 dark:bg-indigo-900/30 scale-[1.02]"
            : isHovered
              ? "border-zinc-400 dark:border-zinc-500 bg-zinc-50/40 dark:bg-zinc-800/20"
              : "border-zinc-300/60 dark:border-zinc-700/50 bg-transparent"
        }`}
      style={{
        left: `${leftPct}%`,
        width: `max(${widthPct}%, 20px)`,
        height: "88px",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        setIsDragOver(false);
        if (onDrop) onDrop(e.dataTransfer.getData("slot-time"));
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
function IdleBlock({
  leftPct,
  widthPct,
  durationMins,
}: {
  leftPct: number;
  widthPct: number;
  durationMins: number;
}) {
  if (widthPct < 1) return null;
  return (
    <div
      className="absolute top-2 bottom-2 rounded-lg flex items-center justify-center overflow-hidden pointer-events-none"
      style={{
        left: `${leftPct}%`,
        width: `max(${widthPct}%, 16px)`,
        background:
          "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(113,113,122,0.05) 5px, rgba(113,113,122,0.05) 10px)",
        border: "1px dashed rgba(161,161,170,0.3)",
      }}
    >
      {widthPct > 5 && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 bg-white/80 dark:bg-zinc-900/80 px-1.5 py-0.5 rounded-full whitespace-nowrap">
          ⏸ {durationMins} min
        </span>
      )}
    </div>
  );
}

// Buffer zone after appointment
function BufferZone({
  leftPct,
  widthPct,
}: {
  leftPct: number;
  widthPct: number;
}) {
  if (widthPct < 0.5) return null;
  return (
    <div
      className="absolute top-3 bottom-3 rounded-r-md pointer-events-none opacity-60"
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        background:
          "repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(251,191,36,0.2) 3px, rgba(251,191,36,0.2) 6px)",
        border: "1px solid rgba(251,191,36,0.3)",
        borderLeft: "none",
      }}
    />
  );
}

// Appointment card
function AppointmentCard({
  apt,
  leftPct,
  widthPct,
  topPx,
  isDraggable,
  onClick,
}: {
  apt: AnyFixMe;
  leftPct: number;
  widthPct: number;
  topPx: number;
  isDraggable: boolean;
  onClick?: () => void;
}) {
  const status = apt.status || apt.currentState || "SCHEDULED";
  const colors = STATUS_COLORS[status] || STATUS_COLORS.SCHEDULED;
  const name = apt.customer?.name || apt.customerName || "Walk-in";
  const isWalkin =
    apt._type === "Visit" ||
    apt._type?.includes("Walk-in") ||
    apt.source === "WALK_IN";

  // Calculate Start and End Time
  const startTime = new Date(
    apt.scheduledStart ||
      apt.scheduledTime ||
      apt.waitingStart ||
      apt.createdAt,
  );
  let durationMins = 30;
  if (apt.scheduledStart && apt.scheduledEnd) {
    durationMins =
      (new Date(apt.scheduledEnd).getTime() -
        new Date(apt.scheduledStart).getTime()) /
      60000;
  }
  const endTime = new Date(startTime.getTime() + durationMins * 60000);
  const timeStr = `${format(startTime, "h:mm a")} - ${format(endTime, "h:mm a")}`;

  // Highlight IN_PROGRESS differently or if we are currently inside its time bounds
  const now = new Date();
  const isCurrentlyOngoing =
    status === "IN_SERVICE" ||
    status === "IN_PROGRESS" ||
    (startTime <= now &&
      endTime >= now &&
      status !== "COMPLETED" &&
      status !== "CANCELLED" &&
      status !== "MISSED");
  const displayColors = isCurrentlyOngoing ? STATUS_COLORS.IN_PROGRESS : colors;

  return (
    <button
      className={`absolute rounded-xl p-2.5 flex flex-col justify-between items-start transition-all
        focus:outline-none focus:ring-2 focus:ring-indigo-400
        hover:shadow-lg hover:scale-[1.01] hover:z-30
        ${displayColors.bg} border ${displayColors.border}
        ${isDraggable ? "cursor-move" : "cursor-pointer"}
        ${status === "COMPLETED" ? "opacity-60 bg-zinc-100 dark:bg-zinc-900/60 grayscale" : ""}
      `}
      style={{
        left: `${leftPct}%`,
        width: `max(${widthPct}%, 20px)`,
        top: `${topPx}px`,
        height: "88px",
        zIndex: 10,
      }}
      draggable={isDraggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("application/json", JSON.stringify(apt));
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      title={`${name} — ${status}\n${timeStr}`}
    >
      <div className="flex items-center gap-1.5 w-full overflow-hidden">
        <div
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${displayColors.dot}`}
        />
        <span
          className={`text-[10px] font-bold uppercase tracking-widest truncate ${displayColors.text} opacity-70`}
        >
          {isWalkin ? "Walk-in" : "Appt"} #
          {(apt.displayId || apt.id?.slice(0, 4) || "?").toUpperCase()}
        </span>
        {isDraggable && (
          <span className="ml-auto text-zinc-400 dark:text-zinc-600 text-[10px]">
            ⠿
          </span>
        )}
      </div>
      <span
        className={`text-xs font-semibold truncate w-full text-left ${displayColors.text}`}
      >
        {name}
      </span>
      <div className="flex flex-col w-full text-left mt-0.5">
        <span
          className={`text-[9px] font-medium truncate w-full opacity-75 ${displayColors.text}`}
        >
          {timeStr}
        </span>
        {apt.service?.name && (
          <span
            className={`text-[9px] truncate w-full opacity-60 ${displayColors.text}`}
          >
            {apt.service.name}
          </span>
        )}
      </div>
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
  rowDensity = "normal",
  onSelectApt,
}: {
  scheduleData?: ScheduleViewData;
  appointments?: AnyFixMe[];
  services?: AnyFixMe[];
  currentDate?: Date;
  onReschedule?: (
    apt: AnyFixMe,
    newTime: Date,
    serviceId: string | null,
  ) => void;
  showEmptySlots?: boolean;
  showIdleGaps?: boolean;
  showBufferZones?: boolean;
  showWalkins?: boolean;
  rowDensity?: "compact" | "normal" | "expanded";
  onSelectApt?: (apt: AnyFixMe) => void;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [dragOverRow, setDragOverRow] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const rowHeightPx =
    rowDensity === "compact"
      ? 80
      : rowDensity === "expanded"
        ? 160
        : ROW_HEIGHT_NORMAL;

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current time on today
  useEffect(() => {
    if (
      now &&
      currentDate.toDateString() === now.toDateString() &&
      scrollRef.current &&
      !hasScrolledRef.current
    ) {
      const pct = minutesToPercent(now.getHours() * 60 + now.getMinutes());
      const nowPx =
        LEFT_SIDEBAR_WIDTH +
        (pct / 100) * (QUARTER_HOUR_COLS * (HOUR_WIDTH / 4));
      // scroll so the current time is slightly offset from the left to show more of the future
      scrollRef.current.scrollTo({
        left: Math.max(0, nowPx - (LEFT_SIDEBAR_WIDTH + 20)),
        behavior: "smooth",
      });
      hasScrolledRef.current = true;
    }
  }, [now, currentDate]);

  // --- Build row data ---
  // Use scheduleData if provided (new endpoint), otherwise fall back to legacy props
  const effectiveAppointments = scheduleData?.appointments ?? appointments;
  const effectiveServices = scheduleData?.services ?? services;
  const effectiveVisits = scheduleData?.visits ?? [];
  const serviceStatsMap = new Map(
    (scheduleData?.serviceStats ?? []).map((s) => [s.serviceId, s]),
  );

  // Group appointments by service
  const apptsByService = new Map<string, AnyFixMe[]>();
  effectiveAppointments.forEach((apt) => {
    const key = apt.serviceId || "unassigned";
    if (!apptsByService.has(key)) apptsByService.set(key, []);
    apptsByService.get(key)!.push({ ...apt, _type: "Appointment" });
  });

  // Group walk-in visits by service
  const walkinsByService = new Map<string, AnyFixMe[]>();
  effectiveVisits
    .filter((v: AnyFixMe) => !v.appointmentId)
    .forEach((v: AnyFixMe) => {
      const key = v.serviceId || "unassigned";
      if (!walkinsByService.has(key)) walkinsByService.set(key, []);
      walkinsByService.get(key)!.push({ ...v, _type: "Visit" });
    });

  const serviceColors = [
    "bg-indigo-100 text-indigo-700",
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700",
  ];

  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayName = days[currentDate.getDay()];
  const allBlockOffs = scheduleData?.blockOffs || [];

  const rows: RowConfig[] = effectiveServices.map(
    (svc: AnyFixMe, idx: number) => {
      const stat = serviceStatsMap.get(svc.id);

      let bh = null;
      if (svc.useLocationHours && svc.location?.businessHours) {
        bh = svc.location.businessHours;
      } else if (!svc.useLocationHours && svc.businessHoursOverride) {
        bh = svc.businessHoursOverride;
      } else if (svc.businessHoursOverride) {
        bh = svc.businessHoursOverride;
      } else if (svc.location?.businessHours) {
        bh = svc.location.businessHours;
      }

      const serviceBlockOffs = allBlockOffs.filter(
        (bo: AnyFixMe) =>
          bo.serviceId === svc.id ||
          (svc.locationId && bo.locationId === svc.locationId) ||
          (!bo.serviceId && !bo.locationId),
      );

      const operatingHours = parseOperatingHours(
        bh,
        dayName,
        serviceBlockOffs,
        currentDate,
      );

      return {
        id: svc.id,
        name: svc.name,
        type: svc.allowAppointments ? "Appointment Service" : "Walk-in Only",
        initials: svc.name.substring(0, 2).toUpperCase(),
        color: serviceColors[idx % serviceColors.length],
        allowAppointments: svc.allowAppointments,
        expectedDuration: svc.expectedDuration || 30,
        effectiveDurationMins:
          stat?.effectiveDurationMins ??
          svc.avgActualDurationMins ??
          svc.expectedDuration ??
          30,
        bufferDuration: svc.bufferDuration || 0,
        appointments: apptsByService.get(svc.id) || [],
        walkins: walkinsByService.get(svc.id) || [],
        gaps: stat?.gaps ?? [],
        slots: [],
        useLocationHours: svc.useLocationHours,
        businessHoursOverride: svc.businessHoursOverride,
        location: svc.location,
        queues: svc.queues,
        operatingHours,
      };
    },
  );

  // If no services, add unassigned row
  const unassignedApts = apptsByService.get("unassigned") || [];
  const unassignedWalkins = walkinsByService.get("unassigned") || [];
  if (unassignedApts.length > 0 || unassignedWalkins.length > 0) {
    rows.push({
      id: "unassigned",
      name: "Unassigned",
      type: "General",
      initials: "U",
      color: "bg-zinc-100 text-zinc-600",
      allowAppointments: false,
      expectedDuration: 30,
      effectiveDurationMins: 30,
      bufferDuration: 0,
      appointments: unassignedApts,
      walkins: unassignedWalkins,
      gaps: [],
      slots: [],
      operatingHours: parseOperatingHours(null, dayName, [], currentDate),
    });
  }

  // --- Overlap detection for vertical stacking ---
  function computeItemLanes(
    items: AnyFixMe[],
    getDuration: (item: AnyFixMe) => number,
  ) {
    // Returns an array of lane indices (0-based row within the timeline row)
    const lanes: number[] = new Array(items.length).fill(0);
    const laneEnds: number[] = [];

    items.forEach((item, i) => {
      const startMins = minutesFromMidnight(
        item.scheduledStart ||
          item.scheduledTime ||
          item.waitingStart ||
          item.createdAt,
      );
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

  const handleDropOnRow = useCallback(
    (e: React.DragEvent, row: RowConfig) => {
      if (!onReschedule) return;
      e.preventDefault();
      setDragOverRow(null);

      const aptData = e.dataTransfer.getData("application/json");
      if (!aptData) return;
      const apt = JSON.parse(aptData);

      const rowRect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rowRect.left;
      const mins = snapToGranularity(pxToMinutes(x, rowRect.width));

      const newTime = new Date(currentDate);
      newTime.setHours(0, 0, 0, 0);
      newTime.setMinutes(mins);

      onReschedule(apt, newTime, row.id === "unassigned" ? null : row.id);
    },
    [currentDate, onReschedule],
  );

  return (
    <div
      className="bg-card dark:bg-dark-card rounded-[2rem] border border-border dark:border-dark-border shadow-sm overflow-hidden flex flex-col"
      style={{ minHeight: "520px" }}
    >
      
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-24 text-center h-full min-h-[500px]">
          <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-full p-4 mb-4">
            <svg className="w-10 h-10 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 mb-1">No queues or services found</h3>
          <p className="text-sm text-zinc-500 max-w-sm">
            Add a service in settings and assign it to a location to start scheduling appointments.
          </p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto relative custom-scrollbar"
        >
        {/* Time header */}
        <div
          className="sticky top-0 z-20 bg-card/95 dark:bg-dark-card/95 backdrop-blur-sm border-b border-border dark:border-dark-border min-w-max"
          style={{
            display: "grid",
            gridTemplateColumns: `${LEFT_SIDEBAR_WIDTH}px 1fr`,
          }}
        >
          <div className="sticky left-0 z-30 bg-card/95 dark:bg-dark-card/95 backdrop-blur-sm border-r border-border dark:border-dark-border p-4 flex items-end flex-shrink-0">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-[11px]">
              {format(currentDate, "EEE, MMM d")}
            </span>
          </div>
          <div
            className="flex"
            style={{ width: `${QUARTER_HOUR_COLS * (HOUR_WIDTH / 4)}px` }}
          >
            {TIMES.map((t, i) => (
              <div
                key={t.time}
                style={{ flex: 1 }}
                className={`p-1 pl-1 sm:pl-2 border-r border-border dark:border-dark-border font-data-mono flex flex-col justify-end overflow-hidden ${
                  t.isHour
                    ? "font-semibold text-on-surface dark:text-white text-[11px]"
                    : "border-dashed text-on-surface-variant dark:text-zinc-500 opacity-60 text-[9px]"
                }`}
              >
                {t.isHour ? t.time.replace(":00 ", "") : ""}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline body */}
        <div className="relative min-w-max">
          {/* Live time needle */}
          {now &&
            currentDate.toDateString() === now.toDateString() &&
            (() => {
              const nowMins = now.getHours() * 60 + now.getMinutes();
              const leftPct = minutesToPercent(nowMins);
              return (
                <div
                  className="absolute top-0 bottom-0 z-20 pointer-events-none"
                  style={{
                    left: `${leftPct}%`,
                    width: "2px",
                    background: "linear-gradient(to bottom, #f43f5e, #fb7185)",
                  }}
                >
                  <div className="w-3 h-3 bg-rose-500 rounded-full absolute -top-1.5 -left-[5px] shadow-[0_0_10px_rgba(244,63,94,0.7)]" />
                </div>
              );
            })()}

          {/* Service rows */}
          {rows.map((row) => {
            const allItems = [
              ...row.appointments.sort(
                (a, b) =>
                  new Date(
                    a.scheduledStart || a.scheduledTime || a.createdAt,
                  ).getTime() -
                  new Date(
                    b.scheduledStart || b.scheduledTime || b.createdAt,
                  ).getTime(),
              ),
              ...(showWalkins
                ? row.walkins.sort(
                    (a: AnyFixMe, b: AnyFixMe) =>
                      new Date(a.waitingStart || a.createdAt).getTime() -
                      new Date(b.waitingStart || b.createdAt).getTime(),
                  )
                : []),
            ];

            const { lanes, laneCount } = computeItemLanes(allItems, (item) => {
              if (item._type === "Appointment") {
                if (item.scheduledStart && item.scheduledEnd) {
                  return (
                    (new Date(item.scheduledEnd).getTime() -
                      new Date(item.scheduledStart).getTime()) /
                    60000
                  );
                }
                return row.expectedDuration;
              }
              // Walk-in: use effective duration
              return row.effectiveDurationMins;
            });

            const LANE_HEIGHT = 96; // px per lane
            const LANE_MARGIN = 6;
            const dynamicRowHeight = Math.max(
              rowHeightPx,
              laneCount * (LANE_HEIGHT + LANE_MARGIN) + 16,
            );

            const isDragTarget = dragOverRow === row.id;

            const op: ParsedOperatingHours =
              row.operatingHours ||
              parseOperatingHours(null, dayName, [], currentDate);

            return (
              <div
                key={row.id}
                className={`border-b border-border dark:border-dark-border group transition-colors ${isDragTarget ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: `${LEFT_SIDEBAR_WIDTH}px 1fr`,
                  minHeight: `${dynamicRowHeight}px`,
                }}
              >
                {/* Row label */}
                <div
                  className="sticky left-0 z-10 bg-card dark:bg-dark-card border-r border-border dark:border-dark-border p-4 flex flex-col justify-start gap-2 group-hover:bg-surface-container-low dark:group-hover:bg-white/5 transition-colors flex-shrink-0"
                  style={{ width: `${LEFT_SIDEBAR_WIDTH}px` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${row.color}`}
                    >
                      {row.initials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-on-surface dark:text-white truncate">
                        {row.name}
                      </h3>
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                        {row.type}
                      </span>
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

                  {/* Operating Hours & Breaks Summary */}
                  <div className="mt-2 pt-2 border-t border-border/40 dark:border-dark-border/40 flex flex-col gap-1">
                    {op.isClosed ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                        <Moon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>Closed Today</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{op.startStr} – {op.endStr}</span>
                        </div>
                        {op.breaks.length > 0 && (
                          <div
                            className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400/90 font-medium truncate"
                            title={op.breaks.map((b) => `${b.reason || "Break"}: ${b.startStr} - ${b.endStr}`).join(", ")}
                          >
                            <Coffee className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate">
                              Break: {op.breaks.map((b) => `${b.startStr}–${b.endStr}`).join(", ")}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Timeline content area */}
                <div
                  className="relative"
                  style={{ width: `${QUARTER_HOUR_COLS * (HOUR_WIDTH / 4)}px` }}
                  onDragOver={(e) => {
                    if (onReschedule) {
                      e.preventDefault();
                      setDragOverRow(row.id);
                    }
                  }}
                  onDragLeave={() => setDragOverRow(null)}
                  onDrop={(e) => handleDropOnRow(e, row)}
                >
                  {/* Past-time shading */}
                  {now && currentDate.toDateString() === now.toDateString() && (
                    <div
                      className="absolute inset-y-0 left-0 bg-zinc-500/[0.03] dark:bg-zinc-800/20 pointer-events-none z-0"
                      style={{
                        width: `${minutesToPercent(now.getHours() * 60 + now.getMinutes())}%`,
                      }}
                    />
                  )}

                  {/* Vertical grid lines (clean 24-hour columns without messy cell gradients) */}
                  <div className="absolute inset-0 pointer-events-none z-0 flex">
                    {TIMES.map((t, i) => (
                      <div
                        key={t.time + i}
                        style={{ flex: 1 }}
                        className={`border-r ${
                          t.isHour
                            ? "border-border/60 dark:border-dark-border/40"
                            : "border-dashed border-border/25 dark:border-dark-border/15"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Off-Hours & Operating Bounds Overlays */}
                  {op.isClosed ? (
                    <div
                      className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center bg-zinc-950/25 dark:bg-zinc-950/45 backdrop-blur-[0.5px]"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(-45deg, transparent, transparent 12px, rgba(148, 163, 184, 0.04) 12px, rgba(148, 163, 184, 0.04) 24px)",
                      }}
                    >
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/90 dark:bg-zinc-800/95 border border-zinc-700/60 shadow-lg text-xs font-semibold text-zinc-300">
                        <Moon className="w-4 h-4 text-zinc-400" />
                        <span>Closed Today ({dayName.charAt(0).toUpperCase() + dayName.slice(1)})</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Pre-Opening Off-Hours Block (0:00 -> op.startMins) */}
                      {op.startMins > 0 && (() => {
                        const startPct = minutesToPercent(op.startMins);
                        return (
                          <div
                            className="absolute inset-y-0 left-0 z-[1] pointer-events-none bg-zinc-950/[0.12] dark:bg-zinc-950/40 border-r-2 border-emerald-500/70 dark:border-emerald-400/70 transition-all overflow-hidden"
                            style={{
                              width: `${startPct}%`,
                              backgroundImage:
                                "repeating-linear-gradient(-45deg, transparent, transparent 12px, rgba(148, 163, 184, 0.04) 12px, rgba(148, 163, 184, 0.04) 24px)",
                            }}
                          >
                            <div className="absolute right-2 top-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold tracking-wide backdrop-blur-md shadow-sm select-none">
                              <Sun className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Opens {op.startStr}</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Post-Closing Off-Hours Block (op.endMins -> 24:00) */}
                      {op.endMins < 1440 && (() => {
                        const endPct = minutesToPercent(op.endMins);
                        const endWidthPct = 100 - endPct;
                        return (
                          <div
                            className="absolute inset-y-0 right-0 z-[1] pointer-events-none bg-zinc-950/[0.12] dark:bg-zinc-950/40 border-l-2 border-rose-500/70 dark:border-rose-400/70 transition-all overflow-hidden"
                            style={{
                              left: `${endPct}%`,
                              width: `${endWidthPct}%`,
                              backgroundImage:
                                "repeating-linear-gradient(-45deg, transparent, transparent 12px, rgba(148, 163, 184, 0.04) 12px, rgba(148, 163, 184, 0.04) 24px)",
                            }}
                          >
                            <div className="absolute left-2 top-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 dark:bg-rose-500/20 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-bold tracking-wide backdrop-blur-md shadow-sm select-none">
                              <Moon className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                              <span>Closes {op.endStr}</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Scheduled Breaks & Downtime */}
                      {op.breaks.map((b, bi) => {
                        const bLeftPct = minutesToPercent(b.startMins);
                        const bWidthPct = durationToPercent(
                          b.endMins - b.startMins,
                          b.startMins,
                        );
                        if (bWidthPct <= 0) return null;
                        return (
                          <div
                            key={`break-${bi}-${b.startMins}`}
                            className="absolute top-1.5 bottom-1.5 z-[2] rounded-xl border border-dashed border-amber-500/40 dark:border-amber-400/35 bg-amber-500/10 dark:bg-amber-950/25 pointer-events-none flex flex-col items-center justify-center overflow-hidden backdrop-blur-[1px] shadow-sm transition-all"
                            style={{
                              left: `${bLeftPct}%`,
                              width: `${bWidthPct}%`,
                              backgroundImage:
                                "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(245, 158, 11, 0.08) 8px, rgba(245, 158, 11, 0.08) 16px)",
                            }}
                          >
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 dark:bg-amber-900/60 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold tracking-tight shadow-sm select-none max-w-[95%]">
                              <Coffee className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="truncate">
                                {b.reason || "Break"}: {b.startStr} – {b.endStr}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Slot placeholders */}
                  {showEmptySlots &&
                    row.allowAppointments &&
                    !op.isClosed &&
                    (() => {
                      const placeholders: React.ReactNode[] = [];
                      const gran = 15; // minutes
                      const slotDuration = row.effectiveDurationMins;
                      const buffer = row.bufferDuration || 0;

                      // Get booked time ranges
                      const bookedRanges = row.appointments.map(
                        (apt: AnyFixMe) => {
                          const start = minutesFromMidnight(
                            apt.scheduledStart ||
                              apt.scheduledTime ||
                              apt.createdAt,
                          );
                          const durMins =
                            apt.scheduledStart && apt.scheduledEnd
                              ? (new Date(apt.scheduledEnd).getTime() -
                                  new Date(apt.scheduledStart).getTime()) /
                                60000
                              : slotDuration;
                          return { start, end: start + durMins + buffer };
                        },
                      );

                      const nowMins = now
                        ? now.getHours() * 60 + now.getMinutes()
                        : 0;
                      const isToday =
                        now &&
                        currentDate.toDateString() === now.toDateString();

                      for (
                        let mins = op.startMins;
                        mins + slotDuration <= op.endMins;
                        mins += gran
                      ) {
                        // Skip past slots (for today)
                        if (isToday && mins < nowMins) continue;

                        // Check if slot overlaps a scheduled break
                        const overlapsBreak = op.breaks.some(
                          (b) =>
                            mins < b.endMins && mins + slotDuration > b.startMins,
                        );
                        if (overlapsBreak) continue;

                        // Check if slot overlaps a booked range
                        const overlaps = bookedRanges.some(
                          (r) => mins < r.end && mins + slotDuration > r.start,
                        );
                        if (!overlaps) {
                          const leftPct = minutesToPercent(mins);
                          const widthPct = durationToPercent(
                            slotDuration,
                            mins,
                          );
                          placeholders.push(
                            <SlotPlaceholder
                              key={`slot-${mins}`}
                              leftPct={leftPct}
                              widthPct={widthPct}
                            />,
                          );
                        }
                      }
                      return placeholders;
                    })()}

                  {/* Idle gap blocks */}
                  {showIdleGaps &&
                    row.gaps.map((gap, gi) => {
                      const startMins = minutesFromMidnight(gap.start);
                      const endMins = minutesFromMidnight(gap.end);
                      return (
                        <IdleBlock
                          key={`gap-${gi}`}
                          leftPct={minutesToPercent(startMins)}
                          widthPct={durationToPercent(
                            endMins - startMins,
                            startMins,
                          )}
                          durationMins={gap.durationMins}
                        />
                      );
                    })}

                  {/* Appointment + walk-in cards */}
                  {allItems.map((item, i) => {
                    let timeStr =
                      item.scheduledStart ||
                      item.scheduledTime ||
                      item.waitingStart ||
                      item.createdAt;
                    if (item._type === "Visit" && item.serviceStart) {
                      timeStr = item.serviceStart;
                    }
                    const startMins = minutesFromMidnight(timeStr);
                    const leftPct = minutesToPercent(startMins);

                    let durationMins = row.effectiveDurationMins;
                    if (
                      item._type === "Appointment" &&
                      item.scheduledStart &&
                      item.scheduledEnd
                    ) {
                      durationMins =
                        (new Date(item.scheduledEnd).getTime() -
                          new Date(item.scheduledStart).getTime()) /
                        60000;
                    } else if (item._type === "Visit" && item.serviceStart) {
                      const end =
                        item.serviceEnd ||
                        item.completedAt ||
                        new Date().toISOString();
                      durationMins = Math.max(
                        (new Date(end).getTime() -
                          new Date(item.serviceStart).getTime()) /
                          60000,
                        15,
                      ); // min 15m display
                    }

                    const widthPct = durationToPercent(
                      Math.max(durationMins, row.effectiveDurationMins),
                      startMins,
                    );
                    const laneTopPx =
                      8 + lanes[i] * (LANE_HEIGHT + LANE_MARGIN);
                    const isDraggable =
                      !!onReschedule && item._type === "Appointment";

                    return (
                      <React.Fragment key={item.id || i}>
                        <AppointmentCard
                          apt={item}
                          leftPct={leftPct}
                          widthPct={widthPct}
                          topPx={laneTopPx}
                          isDraggable={isDraggable}
                          onClick={() => onSelectApt?.(item)}
                        />
                        {/* Buffer zone */}
                        {showBufferZones &&
                          row.bufferDuration > 0 &&
                          item._type === "Appointment" && (
                            <BufferZone
                              leftPct={leftPct + widthPct - 2}
                              widthPct={durationToPercent(
                                row.bufferDuration,
                                startMins +
                                  Math.max(
                                    durationMins,
                                    row.effectiveDurationMins,
                                  ),
                              )}
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
    )}
    </div>
  );
}

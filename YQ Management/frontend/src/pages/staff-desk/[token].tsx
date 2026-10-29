import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchApi, AuthStorage } from '../../lib/api';
import { MyDeskProvider, useMyDesk } from '../../components/my-desk/MyDeskContext';
import { renderWidget } from '../../components/my-desk/WidgetRegistry';
import {
  LayoutDashboard, RefreshCw, MapPin, Briefcase,
  Clock, AlertCircle, Monitor,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Service { id: string; name: string }
interface Location { id: string; name: string }
interface Tenant {
  id: string; name: string; subdomain?: string;
  staffViewLayout?: {
    version?: number;
    templates?: Array<{ id: string; name: string; color?: string; layout: WidgetConfig[] }>;
    assignments?: Record<string, string>;
  };
}
interface StaffData {
  id: string; name: string; title?: string; color?: string;
  status: string; services: Service[]; location?: Location;
  tenant: Tenant;
  sessionToken?: string;
}
interface WidgetConfig {
  id: string; type: string;
  position?: { colSpan?: number; rowSpan?: number };
}

// ─── Layout resolver ──────────────────────────────────────────────────────────
function resolveLayout(staff: StaffData, selectedTemplateId?: string | null): WidgetConfig[] {
  const svl = staff.tenant?.staffViewLayout;
  if (svl && svl.version === 2) {
    if (selectedTemplateId) {
      const selected = svl.templates?.find(t => t.id === selectedTemplateId);
      if (selected?.layout?.length) return selected.layout;
    }
    // Check if this staff member has an assignment (by staff.id in assignments)
    const templateId = svl.assignments?.[staff.id];
    if (templateId) {
      const tpl = svl.templates?.find((t) => t.id === templateId);
      if (tpl?.layout?.length) return tpl.layout;
    }
    // Fall back to first template
    if (svl.templates && svl.templates.length > 0 && svl.templates[0].layout?.length) {
      return svl.templates[0].layout;
    }
  }
  // Default layout
  return [
    { id: 'ct-1', type: 'CurrentTicketWidget', position: { colSpan: 1, rowSpan: 2 } },
    { id: 'ch-1', type: 'CustomerHistoryWidget', position: { colSpan: 1, rowSpan: 1 } },
    { id: 'sc-1', type: 'ScheduleWidget', position: { colSpan: 1, rowSpan: 1 } },
    { id: 'qg-1', type: 'QueueGridWidget', position: { colSpan: 2, rowSpan: 1 } },
  ];
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function StaffAvatar({ name, color, size = 'md' }: { name: string; color?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-8 h-8 text-sm', md: 'w-12 h-12 text-lg', lg: 'w-16 h-16 text-2xl' };
  return (
    <div
      className={`${sizeMap[size]} rounded-2xl flex items-center justify-center font-black text-white shrink-0`}
      style={{ backgroundColor: color || '#6366f1' }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const isActive = status === 'ACTIVE';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
      isActive
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
      {isActive ? 'On Duty' : status.replace('_', ' ')}
    </span>
  );
}

// ─── Desk Canvas ──────────────────────────────────────────────────────────────
function DeskCanvas({ staff }: { staff: StaffData }) {
  const { refetchVisits } = useMyDesk();
  const svl = staff.tenant?.staffViewLayout;
  const templates = svl?.version === 2 ? svl.templates || [] : [];
  const assignedTemplateId = svl?.assignments?.[staff.id] || templates[0]?.id;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(assignedTemplateId || null);
  const layout = resolveLayout(staff, selectedTemplateId);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0f] flex flex-col">
      {/* Header bar */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-4">
        {/* Staff identity */}
        <div className="flex items-center gap-3 flex-1">
          <StaffAvatar name={staff.name} color={staff.color} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{staff.name}</p>
              {staff.title && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate hidden sm:block">{staff.title}</span>
              )}
              <StatusPill status={staff.status} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <LayoutDashboard className="w-3 h-3" />
                {staff.tenant.name}
              </span>
              {staff.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {staff.location.name}
                </span>
              )}
              {staff.services.length > 0 && (
                <span className="flex items-center gap-1 hidden sm:flex">
                  <Briefcase className="w-3 h-3" />
                  {staff.services.slice(0, 2).map(s => s.name).join(', ')}
                  {staff.services.length > 2 && ` +${staff.services.length - 2}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3 shrink-0">
          {templates.length > 1 && (
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-700">
              <Monitor className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden sm:inline">Station:</span>
              <select
                value={selectedTemplateId || ''}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id} className="dark:bg-zinc-900">{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Clock className="w-3.5 h-3.5" />
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button
            onClick={() => refetchVisits()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors border border-zinc-200 dark:border-zinc-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </header>

      {/* Widget grid */}
      <main className="flex-1 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 auto-rows-[minmax(300px,auto)]">
          {layout.map((wc: WidgetConfig) => {
            const colSpan = wc.position?.colSpan || 1;
            const rowSpan = wc.position?.rowSpan || 1;
            return (
              <div
                key={wc.id}
                className={`min-h-[300px] ${
                  colSpan === 2 ? 'lg:col-span-2' : colSpan === 3 ? 'lg:col-span-3' : 'col-span-1'
                } ${rowSpan === 2 ? 'lg:row-span-2' : 'row-span-1'}`}
              >
                {renderWidget(wc.type, { widgetId: wc.id, ...wc })}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

// ─── Loading / Error states ────────────────────────────────────────────────────
function KioskSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mx-auto animate-pulse">
          <LayoutDashboard className="w-8 h-8 text-indigo-500" />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading your desk…</p>
      </div>
    </div>
  );
}

function KioskError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-white">Desk Unavailable</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
        <p className="text-xs text-zinc-400">Contact your manager to get a new desk link.</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StaffDeskKiosk() {
  const router = useRouter();
  const { token } = router.query;
  const [staff, setStaff] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDesk = useCallback(async (t: string) => {
    try {
      const data = await fetchApi<StaffData>(`/staff/desk-token/${t}`);
      if (data?.sessionToken) {
        AuthStorage.set(data.sessionToken);
      }
      setStaff(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid or expired desk link.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (token && typeof token === 'string') {
      void loadDesk(token);
    }
  }, [token, loadDesk]);

  if (loading) return <KioskSkeleton />;
  if (error || !staff) return <KioskError message={error || 'Staff desk not found.'} />;

  return (
    <>
      <Head>
        <title>{staff.name} — Desk | {staff.tenant.name}</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <MyDeskProvider>
        <DeskCanvas staff={staff} />
      </MyDeskProvider>
    </>
  );
}

// No layout wrapper — this is a standalone kiosk page
StaffDeskKiosk.getLayout = (page: React.ReactElement) => page;

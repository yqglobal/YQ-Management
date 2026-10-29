import React, { useMemo } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../components/AuthContext';
import { MyDeskProvider, useMyDesk } from '../../components/my-desk/MyDeskContext';
import { renderWidget } from '../../components/my-desk/WidgetRegistry';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { RefreshCw, LayoutDashboard } from 'lucide-react';

interface DeskWidgetConfig {
  id: string;
  type: string;
  position?: { colSpan?: number; rowSpan?: number };
}

interface DeskTemplateItem {
  id: string;
  name: string;
  layout?: DeskWidgetConfig[];
}

interface DeskStaffViewLayout {
  version?: number;
  assignments?: Record<string, string>;
  templates?: DeskTemplateItem[];
}

interface DeskTenant {
  staffViewLayout?: DeskStaffViewLayout;
}

function MyDeskContent({ tenant }: { tenant: DeskTenant | null | undefined }) {
  const { user } = useAuth();
  const { refetchVisits } = useMyDesk();
  const svl = tenant?.staffViewLayout;
  const templates = svl?.version === 2 ? svl.templates || [] : [];
  
  const staffOrUserId = (user as any)?.staffId || user?.userId;
  const defaultTemplateId = (staffOrUserId && svl?.assignments?.[staffOrUserId]) || templates[0]?.id || null;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const currentTemplateId = selectedTemplateId || defaultTemplateId;

  // Resolve layout: v2 template system → per-user/staff assignment → global → default
  const layout = useMemo<DeskWidgetConfig[]>(() => {
    // v2 template system
    if (svl && svl.version === 2) {
      if (currentTemplateId) {
        const tpl = svl.templates?.find((t) => t.id === currentTemplateId);
        if (tpl?.layout?.length) return tpl.layout;
      }
      // fall back to first template
      if (svl.templates && svl.templates.length > 0 && svl.templates[0].layout?.length) {
        return svl.templates[0].layout;
      }
    }

    // v1 legacy flat array
    if (Array.isArray(svl) && svl.length > 0) return svl;

    // built-in default
    return [
      { id: 'current-task-1', type: 'CurrentTicketWidget', position: { colSpan: 1, rowSpan: 2 } },
      { id: 'history-1', type: 'CustomerHistoryWidget', position: { colSpan: 1, rowSpan: 1 } },
      { id: 'schedule-1', type: 'ScheduleWidget', position: { colSpan: 1, rowSpan: 1 } },
      { id: 'queue-grid-1', type: 'QueueGridWidget', position: { colSpan: 2, rowSpan: 1 } },
    ];
  }, [svl, currentTemplateId]);

  return (
    <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8 flex flex-col min-h-[calc(100vh-80px)]">
      {/* Staff Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-zinc-200 dark:border-zinc-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Staff Desk
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Station
              </span>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Assigned: <span className="font-medium text-zinc-700 dark:text-zinc-300">{user?.name || user?.email || 'Staff Member'}</span> 
              {user?.role && <span className="ml-1.5 uppercase font-mono text-[10px] text-zinc-400">({user.role})</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {templates.length > 1 && (
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-700">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden sm:inline">Station:</span>
              <select
                value={currentTemplateId || ''}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id} className="dark:bg-zinc-900">{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => refetchVisits()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors border border-zinc-200 dark:border-zinc-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Desk
          </button>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="flex-1 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-[minmax(320px,auto)]">
          {layout.map((widgetConfig: DeskWidgetConfig) => {
            const colSpan = widgetConfig.position?.colSpan || 1;
            const rowSpan = widgetConfig.position?.rowSpan || 1;

            return (
              <div
                key={widgetConfig.id}
                className={`min-h-[320px] ${
                  colSpan === 2
                    ? 'lg:col-span-2'
                    : colSpan === 3
                    ? 'lg:col-span-3'
                    : 'col-span-1'
                } ${
                  rowSpan === 2 ? 'lg:row-span-2' : 'row-span-1'
                }`}
              >
                {renderWidget(widgetConfig.type, {
                  widgetId: widgetConfig.id,
                  ...widgetConfig,
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MyDesk() {
  const { data: tenant } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => fetchApi('/tenant/me').catch(() => null),
  });

  return (
    <MyDeskProvider>
      <AdminLayout pageTitle="My Desk" pageSubtitle="Real-time staff service counter">
        <Head>
          <title>My Desk | {tenant?.name || 'Workspace'}</title>
        </Head>
        <MyDeskContent tenant={tenant} />
      </AdminLayout>
    </MyDeskProvider>
  );
}

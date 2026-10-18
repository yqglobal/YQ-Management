import React, { useMemo } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../components/AuthContext';
import { MyDeskProvider } from '../../components/my-desk/MyDeskContext';
import { renderWidget } from '../../components/my-desk/WidgetRegistry';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';

export default function MyDesk() {
  const { user } = useAuth();

  const { data: tenant } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => fetchApi('/tenant/me').catch(() => null),
  });

  // Default layout if none configured
  const layout = useMemo(() => {
    if (tenant?.staffViewLayout && Array.isArray(tenant.staffViewLayout)) {
      return tenant.staffViewLayout;
    }
    return [
      { id: "current-task-1", type: "CurrentTicketWidget", position: { col: 1, row: 1, colSpan: 1, rowSpan: 2 } },
      { id: "history-1", type: "CustomerHistoryWidget", position: { col: 2, row: 1, colSpan: 2, rowSpan: 1 } },
    ];
  }, [tenant]);

  return (
    <MyDeskProvider>
      <AdminLayout pageTitle="My Desk" pageSubtitle="Your personalized workspace">
        <Head>
          <title>My Desk | {tenant?.name || 'Workspace'}</title>
        </Head>

        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 h-[calc(100vh-64px)] flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* CSS Grid for the widgets */}
            <div 
              className="grid gap-6 auto-rows-[minmax(200px,auto)]"
              style={{
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
              }}
            >
              {layout.map((widgetConfig: any) => (
                <div 
                  key={widgetConfig.id}
                  style={{
                    gridColumn: `span ${widgetConfig.position?.colSpan || 1} / span ${widgetConfig.position?.colSpan || 1}`,
                    gridRow: `span ${widgetConfig.position?.rowSpan || 1} / span ${widgetConfig.position?.rowSpan || 1}`,
                  }}
                  className="min-h-0"
                >
                  {renderWidget(widgetConfig.type, { widgetId: widgetConfig.id, ...widgetConfig })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    </MyDeskProvider>
  );
}

import { toast } from 'sonner';
import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import dynamic from 'next/dynamic';
const VisitsAreaChart = dynamic(() => import('../../components/charts/VisitsAreaChart').then(mod => mod.VisitsAreaChart), { ssr: false });
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { fetchApi, getBackendUrl, AuthStorage } from '../../lib/api';
import { FeatureGuard } from '../../components/guards/FeatureGuard';
import { Search, Users, Phone, Mail, Clock, BarChart2 } from 'lucide-react';
import { useLocation } from '../../components/LocationContext';
import { useAuth } from '../../components/AuthContext';
import type { AnalyticsResponse, Visit, Service } from '@yq/shared';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Download, Medal, Star, Calendar as CalendarIcon } from 'lucide-react';
import { CustomerDrawer } from '../../components/CustomerDrawer';

// ── Inline Heatmap Component ──────────────────────────────────────────────────
function PeakHourHeatmap({ data }: { data: { matrix: number[][]; maxValue: number } }) {
  if (!data || !data.matrix) return null;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i); // Full 24 Hours (0:00 to 23:00)

  return (
    <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
      <div className="min-w-[780px]">
        {/* Hour Header Row */}
        <div className="flex mb-1.5 items-center">
          <div className="w-10 shrink-0 text-[10px] text-outline font-semibold uppercase">Day</div>
          {hours.map(h => (
            <div key={h} className="flex-1 text-center text-[9px] text-outline font-mono">
              {h < 10 ? `0${h}` : h}
            </div>
          ))}
        </div>
        {/* Day Rows */}
        {days.map((day, dIdx) => (
          <div key={day} className="flex items-center mb-1">
            <div className="w-10 shrink-0 text-xs text-on-surface-variant font-medium">{day}</div>
            {hours.map(h => {
              const val = data.matrix[dIdx]?.[h] || 0;
              const intensity = data.maxValue > 0 ? val / data.maxValue : 0;
              
              let bg = 'bg-surface-container-low dark:bg-white/5';
              let text = 'text-transparent hover:text-emerald-900';
              if (intensity > 0) {
                if (intensity > 0.7) {
                  bg = 'bg-emerald-600 dark:bg-emerald-500';
                  text = 'text-white';
                } else if (intensity > 0.4) {
                  bg = 'bg-emerald-400 dark:bg-emerald-400/80';
                  text = 'text-emerald-950 font-bold';
                } else if (intensity > 0.1) {
                  bg = 'bg-emerald-200 dark:bg-emerald-300/40';
                  text = 'text-emerald-900 dark:text-emerald-200 font-bold';
                } else {
                  bg = 'bg-emerald-100 dark:bg-emerald-200/20';
                  text = 'text-emerald-800 dark:text-emerald-300';
                }
              }
              
              return (
                <div key={h} className="flex-1 px-0.5">
                  <div 
                    className={`h-6 rounded flex items-center justify-center text-[9px] font-mono font-bold ${bg} ${text} transition-colors cursor-default border border-transparent hover:border-emerald-400/50`}
                    title={`${val} visit${val === 1 ? '' : 's'} on ${day} at ${h}:00`}
                  >
                    {val > 0 ? val : ''}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {/* Heatmap Legend */}
        <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-outline">
          <span>Less</span>
          <div className="w-3 h-3 rounded bg-surface-container-low dark:bg-white/5" />
          <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-200/20" />
          <div className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-300/40" />
          <div className="w-3 h-3 rounded bg-emerald-400 dark:bg-emerald-400/80" />
          <div className="w-3 h-3 rounded bg-emerald-600 dark:bg-emerald-500" />
          <span>More (24h Window)</span>
        </div>
      </div>
    </div>
  );
}
// ──────────────────────────────────────────────────────────────────────────────

// ─── Helpers ────────────────────────────────────────────────────────────────

const SLA_THRESHOLD_MINS = 15;

export default function Analytics() {
  const { activeLocationId } = useLocation();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'Today' | 'Week' | 'Month' | 'Year' | 'All' | 'Custom'>('Week');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (router.isReady) {
      if (router.query.customerId) {
        setSelectedCustomerId(router.query.customerId as string);
      }
    }
  }, [router.isReady, router.query.customerId]);

  const handleTimeRangeChange = (r: 'Today' | 'Week' | 'Month' | 'Year' | 'All' | 'Custom') => {
    setTimeRange(r);
    if (r === 'Custom' && !startDate) {
      const now = new Date();
      const past = new Date();
      past.setDate(now.getDate() - 6);
      setDateRange([past, now]);
    }
  };

  const timeParam =
    timeRange === 'Today'
      ? 'today'
      : timeRange === 'Week'
      ? '7d'
      : timeRange === 'Month'
      ? '30d'
      : timeRange === 'Year'
      ? 'year'
      : timeRange === 'All'
      ? 'all'
      : 'custom';
  const locParam = activeLocationId && activeLocationId !== 'all' ? `&locationId=${activeLocationId}` : '';
  
  const effectiveEndDate = endDate || startDate;
  const customRangeParam =
    timeRange === 'Custom' && startDate && effectiveEndDate
      ? `&startDate=${startDate.toISOString()}&endDate=${effectiveEndDate.toISOString()}`
      : '';

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data: analytics = null, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['analytics', timeParam, customRangeParam, activeLocationId, tz],
    queryFn: (): Promise<AnalyticsResponse | null> =>
      fetchApi<AnalyticsResponse>(`/analytics?timeframe=${timeParam}${locParam}${customRangeParam}&tz=${encodeURIComponent(tz)}`)
        .catch(() => null),
    enabled: timeRange !== 'Custom' || !!startDate,
  });

  const { kpis, chartData: rawChartData, servicePerformance, heatmapData, staffPerformance, customerReviews = [] } = (analytics as any) || {
    kpis: { totalVisits: 0, averageWaitTimeMins: 0, slaViolations: 0, dropOffRate: 0, csatScore: 0, totalCancelled: 0, totalNoShow: 0 },
    chartData: [],
    servicePerformance: [],
    heatmapData: null,
    staffPerformance: [],
    customerReviews: [],
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const baseUrl = getBackendUrl();
      const url = `${baseUrl}/analytics/export?timeframe=${timeParam}${locParam}${customRangeParam}&tz=${encodeURIComponent(tz)}`;
      const token = AuthStorage.get();

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        let errorMsg = 'Failed to export CSV';
        try {
          const errJson = await res.json();
          if (errJson?.message) errorMsg = errJson.message;
        } catch {
          // not json
        }
        throw new Error(errorMsg);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `qmova-analytics-${timeParam}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Analytics CSV exported successfully.');
    } catch (e: any) {
      console.error('Export error:', e);
      toast.error(e?.message || 'Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const timeframeLabel =
    timeRange === 'Today'
      ? 'Today'
      : timeRange === 'Week'
      ? 'Past 7 days'
      : timeRange === 'Month'
      ? 'Past 30 days'
      : timeRange === 'Year'
      ? 'Past 12 months'
      : timeRange === 'Custom'
      ? startDate && effectiveEndDate && startDate.toDateString() === effectiveEndDate.toDateString()
        ? startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : startDate && effectiveEndDate
        ? `${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${effectiveEndDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
        : 'Selected range'
      : 'Since account creation';

  const chartData = useMemo(() => {
    return (rawChartData || []).map((d: any) => ({ time: d.timeLabel, visits: d.volume }));
  }, [rawChartData]);

  const kpiVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <AdminLayout pageTitle="Analytics">
      <Head>
        <title>Analytics | Qmova</title>
      </Head>

      <FeatureGuard
        featureKey="advancedAnalytics"
        featureName="Advanced Analytics"
      >
        <div className="w-full mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Top Control Bar: Title & Global Date Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-border dark:border-dark-border">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-on-surface dark:text-white">Analytics</h1>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5">
                Overview of queue throughput, service velocity, customer drop-off, and staff performance
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={handleExportCSV}
                disabled={isExporting}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-low dark:bg-zinc-800 text-on-surface dark:text-zinc-200 hover:bg-surface-container-high border border-border dark:border-dark-border flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-spin' : ''}`} /> {isExporting ? 'Exporting...' : 'Export CSV'}
              </button>

              {/* Timeframe Presets */}
              <div className="flex items-center bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-xl p-1 gap-1 shadow-sm">
                {(['Today', 'Week', 'Month', 'Year', 'All', 'Custom'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleTimeRangeChange(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      timeRange === r
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface dark:hover:text-white'
                    }`}
                  >
                    {r === 'All' ? 'All Time' : r}
                  </button>
                ))}
              </div>

              {/* Custom Date Range Picker */}
              {timeRange === 'Custom' && (
                <div className="flex items-center bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-xl px-2.5 py-1 gap-2 shadow-sm">
                  <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                  <DatePicker
                    selectsRange={true}
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(update: [Date | null, Date | null]) => setDateRange(update)}
                    placeholderText="Select date range"
                    className="bg-transparent text-xs text-on-surface dark:text-white outline-none w-[190px] font-medium"
                    isClearable={true}
                    maxDate={new Date()}
                    popperPlacement="bottom-end"
                  />
                </div>
              )}
            </div>
          </div>

          {/* KPI Ribbon */}
          <motion.div
            initial="hidden" animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <motion.div variants={kpiVariants} className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-5 shadow-sm">
              <p className="text-on-surface-variant text-xs mb-1 uppercase tracking-wider font-semibold">Total Visits</p>
              <p className="font-mono text-3xl font-bold text-on-surface dark:text-white">{kpis.totalVisits}</p>
              <p className="text-xs text-outline mt-1">{timeframeLabel}</p>
            </motion.div>

            <motion.div variants={kpiVariants} className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-5 shadow-sm">
              <p className="text-on-surface-variant text-xs mb-1 uppercase tracking-wider font-semibold">Avg Wait Time</p>
              <p className="font-mono text-3xl font-bold text-on-surface dark:text-white">
                {kpis.averageWaitTimeMins > 0 ? `${kpis.averageWaitTimeMins}m` : '—'}
              </p>
              <p className="text-xs text-outline mt-1">Served customers</p>
            </motion.div>

            <motion.div variants={kpiVariants} className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-5 shadow-sm relative overflow-hidden">
              <p className="text-on-surface-variant text-xs mb-1 uppercase tracking-wider font-semibold">Avg CSAT Score</p>
              <p className="font-mono text-3xl font-bold text-primary flex items-center gap-2">
                {kpis.csatScore > 0 ? kpis.csatScore : '—'} 
                {kpis.csatScore > 0 && <Star className="w-5 h-5 fill-primary" />}
              </p>
              <p className="text-xs text-outline mt-1">Customer satisfaction</p>
            </motion.div>
            <motion.div variants={kpiVariants} className="bg-card dark:bg-dark-card border border-alert/30 dark:border-alert/20 rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-alert rounded-l-xl" />
              <p className="text-on-surface-variant text-xs mb-1 uppercase tracking-wider font-semibold">SLA Violations</p>
              <p className="font-mono text-3xl font-bold text-alert">
                {kpis.slaViolations}
              </p>
              <p className="text-xs text-outline mt-1">{`> ${SLA_THRESHOLD_MINS}m wait`}</p>
            </motion.div>

            <motion.div variants={kpiVariants} className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-5 shadow-sm">
              <p className="text-on-surface-variant text-xs mb-1 uppercase tracking-wider font-semibold">Walkaway Rate</p>
              <p className="font-mono text-3xl font-bold text-on-surface dark:text-white">{kpis.dropOffRate}%</p>
              <p className="text-xs text-outline mt-1">
                {(kpis.totalCancelled !== undefined || kpis.totalNoShow !== undefined)
                  ? `${kpis.totalCancelled || 0} cancelled · ${kpis.totalNoShow || 0} no-shows`
                  : 'No-shows & cancels'}
              </p>
            </motion.div>
          </motion.div>

          {/* Visit Volume Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-6 shadow-sm"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold text-on-surface dark:text-white">Visit Volume</h3>
                <p className="text-xs text-outline mt-0.5">
                  {timeRange === 'Today' 
                    ? 'Hourly visits today' 
                    : timeRange === 'Week' 
                    ? 'Daily visits over past 7 days' 
                    : timeRange === 'Month' 
                    ? 'Daily visits over past 30 days' 
                    : timeRange === 'Year'
                    ? 'Monthly visits over past 12 months'
                    : timeRange === 'Custom' 
                    ? 'Visits across selected date range' 
                    : 'Visits since account creation'}
                </p>
              </div>
              {isAnalyticsLoading && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  Updating data...
                </div>
              )}
            </div>
            <div className="w-full h-[280px]">
              <VisitsAreaChart data={chartData} />
            </div>
          </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Heatmap */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-6 shadow-sm overflow-hidden"
                >
                  <div className="mb-6">
                    <h3 className="font-semibold text-on-surface dark:text-white">Peak Hours Heatmap</h3>
                    <p className="text-xs text-outline">Busiest times by volume</p>
                  </div>
                  <PeakHourHeatmap data={heatmapData} />
                </motion.div>

                {/* Operator Leaderboard */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-6 shadow-sm flex flex-col"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <Medal className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-on-surface dark:text-white">Operator Leaderboard</h3>
                  </div>
                  {staffPerformance && staffPerformance.length > 0 ? (
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[300px]">
                      {staffPerformance.map((op: any, i: number) => (
                        <div key={op.email} className="flex items-center gap-3 p-3 bg-surface-container-low dark:bg-zinc-800/50 border border-border/50 rounded-xl relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                            i === 0 ? 'bg-amber-100 text-amber-600' :
                            i === 1 ? 'bg-slate-200 text-slate-700' :
                            i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-surface-container-high text-on-surface-variant'
                          }`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-on-surface truncate">{op.name}</p>
                            <div className="flex gap-2 text-xs text-outline mt-0.5">
                              <span>{op.served} served</span> • <span>{op.avgServiceTimeMins}m avg</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-sm flex items-center justify-end gap-1 text-on-surface">
                              {op.csat > 0 ? op.csat : '—'} <Star className={`w-3.5 h-3.5 ${op.csat > 0 ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                            </p>
                            <p className="text-[10px] text-rose-500">{op.noShows > 0 ? `${op.noShows} walkaways` : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-sm text-outline">
                      No operator data found.
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Customer Reviews & Feedback Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-6 shadow-sm"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                    <div>
                      <h3 className="font-semibold text-on-surface dark:text-white">Customer Reviews & Feedback</h3>
                      <p className="text-xs text-outline mt-0.5">Direct customer ratings and submitted review comments</p>
                    </div>
                  </div>
                  <span className="text-xs text-on-surface-variant font-medium bg-surface-container-low dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-border dark:border-dark-border">
                    {customerReviews.length} {customerReviews.length === 1 ? 'review' : 'reviews'}
                  </span>
                </div>

                {customerReviews && customerReviews.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {customerReviews.map((rev: any) => (
                      <div
                        key={rev.id}
                        className="p-3.5 rounded-xl bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border flex flex-col justify-between space-y-2 hover:border-primary/40 transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= rev.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-zinc-300 dark:text-zinc-700'
                                  }`}
                                />
                              ))}
                              <span className="text-xs font-bold text-on-surface dark:text-white ml-1">
                                {rev.rating}/5
                              </span>
                            </div>
                            {rev.displayId && (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                {rev.displayId}
                              </span>
                            )}
                          </div>

                          {rev.feedbackText ? (
                            <p className="text-xs text-on-surface dark:text-zinc-200 italic line-clamp-3 pl-2 border-l-2 border-amber-400">
                              &ldquo;{rev.feedbackText}&rdquo;
                            </p>
                          ) : (
                            <p className="text-xs text-outline italic">No written comment provided.</p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border/50 dark:border-dark-border/50 flex items-center justify-between text-[11px] text-outline">
                          <span className="truncate max-w-[130px] font-medium text-on-surface-variant">
                            {rev.customerName}
                          </span>
                          <span>
                            {new Date(rev.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-xl bg-surface-container-low dark:bg-zinc-900/50 border border-dashed border-border dark:border-dark-border">
                    <Star className="w-8 h-8 text-outline/40 mx-auto mb-2" />
                    <p className="text-sm font-medium text-on-surface-variant">No reviews recorded for this timeframe.</p>
                    <p className="text-xs text-outline mt-0.5">Customer ratings and comments submitted on their ticket status page will appear here.</p>
                  </div>
                )}
              </motion.div>

              {/* Service & Queue Performance */}

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              >
                <h3 className="font-semibold text-on-surface dark:text-white mb-4">Service Performance</h3>
                {servicePerformance.length === 0 ? (
                  <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-10 text-center">
                    <p className="text-on-surface-variant text-sm">No services found.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {servicePerformance.map((svc: any, i: number) => (
                      <div key={svc.id} className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-4 border-b border-border dark:border-dark-border pb-4">
                          <div>
                            <h4 className="font-bold text-lg text-on-surface dark:text-white">{svc.name}</h4>
                            <p className="text-sm text-outline mt-1">{svc.count} total visits · {svc.walkaways} walkaways · {svc.violations} SLA violations</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">Avg Wait</span>
                            <p className="font-mono text-2xl font-bold text-primary">{svc.avgMins !== null ? `${svc.avgMins}m` : '—'}</p>
                          </div>
                        </div>

                        <h5 className="font-semibold text-sm text-on-surface dark:text-white mb-3">Queue Breakdown</h5>
                        {svc.queues.length === 0 ? (
                          <p className="text-sm text-on-surface-variant">No queue data for this service yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {svc.queues.map((q: any, j: number) => {
                              const isViolating = q.avgMins !== null && q.avgMins > SLA_THRESHOLD_MINS;
                              const hasData = q.avgMins !== null;
                              return (
                                <div key={j} className={`rounded-xl p-4 border flex flex-col justify-between ${!hasData ? 'bg-surface-container-low dark:bg-zinc-900 border-border dark:border-dark-border'
                                    : isViolating ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                                      : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                                  }`}>
                                  <p className={`font-semibold text-sm truncate ${!hasData ? 'text-on-surface-variant'
                                      : isViolating ? 'text-rose-900 dark:text-rose-300'
                                        : 'text-emerald-900 dark:text-emerald-300'
                                    }`}>{q.name}</p>
                                  <div className="flex items-end justify-between mt-3">
                                    <span className={`font-mono text-xl font-bold ${!hasData ? 'text-on-surface-variant'
                                        : isViolating ? 'text-rose-600 dark:text-rose-400'
                                          : 'text-emerald-600 dark:text-emerald-400'
                                      }`}>
                                      {hasData ? `${q.avgMins}m` : '—'}
                                    </span>
                                  </div>
                                  {q.count > 0 && (
                                    <p className="text-[10px] text-outline mt-1">{q.count} served · {q.violations} violations · {q.walkaways} walkaways</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

        </div>
      </FeatureGuard>
      <CustomerDrawer isOpen={!!selectedCustomerId} onClose={() => setSelectedCustomerId(null)} customerId={selectedCustomerId} />
    </AdminLayout>
  );
}

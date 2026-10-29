import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import AdminLayout from '../../../components/AdminLayout';
import {
  Search,
  Users,
  Phone,
  Mail,
  Clock,
  BarChart2,
  Plus,
  MessageSquare,
  Star,
  ShieldAlert,
  Calendar as CalendarIcon,
  MapPin,
  Layers,
  ArrowRight,
  User,
  Timer,
  ChevronRight,
  Quote,
  ThumbsUp,
  Sparkles,
  X,
  MessageCircle,
} from 'lucide-react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { CreateVisitModal } from '../../../components/modals/CreateVisitModal';
import { CustomerDrawer } from '../../../components/CustomerDrawer';
import { VisitDrawer } from '../../../components/VisitDrawer';
import { useLocation } from '../../../components/LocationContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'sonner';

export default function RecordsPage() {
  const { allowedLocations: locations } = useLocation();
  const queryClient = useQueryClient();

  // ── View Mode: Timeline vs Reviews & Ratings vs Unique Visitors ──────────
  const [viewMode, setViewMode] = useState<'timeline' | 'reviews' | 'unique_visitors'>('timeline');

  // ── Filters State ─────────────────────────────────────────────────────────
  const [timeRange, setTimeRange] = useState<'Today' | 'Week' | 'Month' | 'Year' | 'All' | 'Custom'>('All');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');
  
  // Star / Rating Filter: 'all' | 'reviewed' | '5' | '4' | '3' | '2' | '1' | 'has_comment'
  const [starFilter, setStarFilter] = useState<string>('all');

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'rating_desc' | 'rating_asc' | 'visits' | 'oldest' | 'duration' | 'name'>('recent');

  // Modal & Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);

  // Timeframe change handler
  const handleTimeRangeChange = (r: 'Today' | 'Week' | 'Month' | 'Year' | 'All' | 'Custom') => {
    setTimeRange(r);
    if (r === 'Custom' && !startDate) {
      const now = new Date();
      const past = new Date();
      past.setDate(now.getDate() - 6);
      setDateRange([past, now]);
    }
  };

  // ── Query Services for dropdown ───────────────────────────────────────────
  const { data: services = [] } = useQuery({
    queryKey: ['services', selectedLocationId],
    queryFn: () =>
      fetchApi<any[]>(
        `/service${selectedLocationId && selectedLocationId !== 'all' ? `?locationId=${selectedLocationId}` : ''}`,
      ).catch(() => []),
  });

  // ── Query Visits (Filtered Scope: records) ────────────────────────────────
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

  const effectiveEndDate = endDate || startDate;
  const customRangeParam =
    timeRange === 'Custom' && startDate && effectiveEndDate
      ? `&startDate=${startDate.toISOString()}&endDate=${effectiveEndDate.toISOString()}`
      : '';

  const locParam = selectedLocationId && selectedLocationId !== 'all' ? `&locationId=${selectedLocationId}` : '';
  const svcParam = selectedServiceId && selectedServiceId !== 'all' ? `&serviceId=${selectedServiceId}` : '';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Pass rating filter to server when in reviews view or when explicit star filter is set
  const ratingQueryParam =
    starFilter !== 'all'
      ? `&rating=${starFilter}`
      : viewMode === 'reviews'
      ? '&rating=reviewed'
      : '';

  const { data: visitsResponse, isLoading: isVisitsLoading } = useQuery({
    queryKey: ['visits', 'records', timeParam, customRangeParam, selectedLocationId, selectedServiceId, ratingQueryParam, tz],
    queryFn: () =>
      fetchApi<{ data: any[]; meta: any }>(
        `/visits?scope=records&timeframe=${timeParam}&limit=1000${locParam}${svcParam}${customRangeParam}${ratingQueryParam}&tz=${encodeURIComponent(tz)}`,
      ).catch(() => ({ data: [], meta: { total: 0 } })),
  });
  const visitsRaw: any[] = visitsResponse?.data || [];

  // Also query count of reviews across the tenant/filter for tab badges
  const { data: allReviewsResponse } = useQuery({
    queryKey: ['visits', 'records', 'reviews-count', timeParam, customRangeParam, selectedLocationId, selectedServiceId, tz],
    queryFn: () =>
      fetchApi<{ data: any[]; meta: any }>(
        `/visits?scope=records&timeframe=${timeParam}&limit=1000${locParam}${svcParam}${customRangeParam}&rating=reviewed&tz=${encodeURIComponent(tz)}`,
      ).catch(() => ({ data: [], meta: { total: 0 } })),
  });
  const allReviewedVisits: any[] = allReviewsResponse?.data || [];
  const totalReviewsCount = allReviewedVisits.length;

  // ── Query All Customers (for complete profile details & all-time merge) ───
  const {
    data: customersData,
    isLoading: isCustomersLoading,
  } = useInfiniteQuery({
    queryKey: ['customers'],
    queryFn: async ({ pageParam }) => {
      const url = pageParam ? `/customer?cursor=${pageParam}&limit=100` : '/customer?limit=100';
      return fetchApi(url);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) => lastPage?.nextCursor,
  });
  const allCustomers: any[] = customersData?.pages.flatMap((page) => page?.items || []) || [];

  // ── Customer Block / Unblock Mutation ─────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi(`/customer/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success('Customer profile updated');
    },
    onError: () => toast.error('Failed to update customer'),
  });

  // ── Review Analytics Computations ─────────────────────────────────────────
  const reviewAnalytics = useMemo(() => {
    const list = allReviewedVisits;
    const total = list.length;
    if (total === 0) {
      return {
        totalReviews: 0,
        avgRating: '—',
        avgRatingNum: 0,
        csatPercentage: 0,
        commentsCount: 0,
        starCounts: [
          { star: 5, count: 0, pct: 0 },
          { star: 4, count: 0, pct: 0 },
          { star: 3, count: 0, pct: 0 },
          { star: 2, count: 0, pct: 0 },
          { star: 1, count: 0, pct: 0 },
        ],
        serviceBreakdown: [],
        locationBreakdown: [],
        topService: null,
      };
    }

    const totalSum = list.reduce((sum, v) => sum + (Number(v.rating) || 0), 0);
    const avgRatingNum = totalSum / total;
    const avgRating = avgRatingNum.toFixed(1);

    const positiveReviews = list.filter((v) => Number(v.rating) >= 4).length;
    const csatPercentage = Math.round((positiveReviews / total) * 100);

    const commentsCount = list.filter((v) => Boolean(v.feedbackText && v.feedbackText.trim())).length;

    // Star distribution
    const starCounts = [5, 4, 3, 2, 1].map((star) => {
      const count = list.filter((v) => Math.round(Number(v.rating)) === star).length;
      const pct = Math.round((count / total) * 100);
      return { star, count, pct };
    });

    // Service Breakdown
    const serviceMap = new Map<string, { id: string; name: string; totalRating: number; count: number; feedbackCount: number }>();
    list.forEach((v) => {
      const sid = v.serviceId || v.service?.id || 'unknown';
      const sname = v.service?.name || 'Unassigned Service';
      if (!serviceMap.has(sid)) {
        serviceMap.set(sid, { id: sid, name: sname, totalRating: 0, count: 0, feedbackCount: 0 });
      }
      const item = serviceMap.get(sid)!;
      item.totalRating += Number(v.rating) || 0;
      item.count += 1;
      if (v.feedbackText && v.feedbackText.trim()) item.feedbackCount += 1;
    });

    const serviceBreakdown = Array.from(serviceMap.values())
      .map((item) => ({
        ...item,
        avgRating: (item.totalRating / item.count).toFixed(1),
        avgRatingNum: item.totalRating / item.count,
      }))
      .sort((a, b) => {
        if (b.avgRatingNum !== a.avgRatingNum) return b.avgRatingNum - a.avgRatingNum;
        return b.count - a.count;
      });

    // Location Breakdown
    const locationMap = new Map<string, { id: string; name: string; totalRating: number; count: number; feedbackCount: number }>();
    list.forEach((v) => {
      const lid = v.locationId || v.location?.id || 'unknown';
      const lname = v.location?.name || 'Main Branch';
      if (!locationMap.has(lid)) {
        locationMap.set(lid, { id: lid, name: lname, totalRating: 0, count: 0, feedbackCount: 0 });
      }
      const item = locationMap.get(lid)!;
      item.totalRating += Number(v.rating) || 0;
      item.count += 1;
      if (v.feedbackText && v.feedbackText.trim()) item.feedbackCount += 1;
    });

    const locationBreakdown = Array.from(locationMap.values())
      .map((item) => ({
        ...item,
        avgRating: (item.totalRating / item.count).toFixed(1),
        avgRatingNum: item.totalRating / item.count,
      }))
      .sort((a, b) => {
        if (b.avgRatingNum !== a.avgRatingNum) return b.avgRatingNum - a.avgRatingNum;
        return b.count - a.count;
      });

    return {
      totalReviews: total,
      avgRating,
      avgRatingNum,
      csatPercentage,
      commentsCount,
      starCounts,
      serviceBreakdown,
      locationBreakdown,
      topService: serviceBreakdown.length > 0 ? serviceBreakdown[0] : null,
    };
  }, [allReviewedVisits]);

  // ── Filtered Visits with Search & Sort ────────────────────────────────────
  const filteredVisits = useMemo(() => {
    let list = [...visitsRaw];

    // Client-side Star / Review filter safeguard
    if (starFilter === 'reviewed') {
      list = list.filter((v: any) => v.rating !== null && v.rating !== undefined);
    } else if (starFilter === 'has_comment') {
      list = list.filter((v: any) => Boolean(v.feedbackText && v.feedbackText.trim()));
    } else if (['1', '2', '3', '4', '5'].includes(starFilter)) {
      const starNum = Number(starFilter);
      list = list.filter((v: any) => Math.round(Number(v.rating)) === starNum);
    } else if (viewMode === 'reviews') {
      list = list.filter((v: any) => v.rating !== null && v.rating !== undefined);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((v: any) =>
        v.displayId?.toLowerCase().includes(q) ||
        v.customer?.name?.toLowerCase().includes(q) ||
        v.customer?.phone?.includes(q) ||
        v.customer?.email?.toLowerCase().includes(q) ||
        v.service?.name?.toLowerCase().includes(q) ||
        v.queue?.name?.toLowerCase().includes(q) ||
        v.location?.name?.toLowerCase().includes(q) ||
        v.feedbackText?.toLowerCase().includes(q),
      );
    }

    if (sortBy === 'rating_desc') {
      list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sortBy === 'rating_asc') {
      list.sort((a, b) => (Number(a.rating) || 0) - (Number(b.rating) || 0));
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'duration') {
      list.sort((a, b) => {
        const durA = a.completedAt && a.serviceStart ? new Date(a.completedAt).getTime() - new Date(a.serviceStart).getTime() : 0;
        const durB = b.completedAt && b.serviceStart ? new Date(b.completedAt).getTime() - new Date(b.serviceStart).getTime() : 0;
        return durB - durA;
      });
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.customer?.name || '').localeCompare(b.customer?.name || ''));
    } else {
      // Default: 'recent'
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [visitsRaw, starFilter, viewMode, search, sortBy]);

  // ── Date-wise Grouping for the Timeline View ──────────────────────────────
  const groupedVisitsByDate = useMemo(() => {
    const map = new Map<string, { dateObj: Date; visits: any[] }>();

    filteredVisits.forEach((v: any) => {
      const dateVal = v.createdAt || v.scheduledTime || v.checkInTime;
      const d = new Date(dateVal);
      const dateKey = d.toDateString();

      if (!map.has(dateKey)) {
        map.set(dateKey, { dateObj: d, visits: [] });
      }
      map.get(dateKey)!.visits.push(v);
    });

    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const groups: { dateKey: string; label: string; dateObj: Date; visits: any[] }[] = [];

    map.forEach(({ dateObj, visits }, dateKey) => {
      let label = dateObj.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      if (dateKey === todayStr) label = `Today · ${label}`;
      else if (dateKey === yesterdayStr) label = `Yesterday · ${label}`;

      groups.push({ dateKey, label, dateObj, visits });
    });

    // Sort groups chronological according to current sort
    groups.sort((a, b) => {
      if (sortBy === 'oldest') return a.dateObj.getTime() - b.dateObj.getTime();
      return b.dateObj.getTime() - a.dateObj.getTime();
    });

    return groups;
  }, [filteredVisits, sortBy]);

  // ── Unique Visitors Aggregation (When Unique Visitors is chosen) ──────────
  const uniqueVisitorsList = useMemo(() => {
    const customerMap = new Map<string, { customer: any; visits: any[] }>();

    filteredVisits.forEach((v: any) => {
      const c = v.customer;
      if (!c) return;
      if (!customerMap.has(c.id)) {
        customerMap.set(c.id, { customer: c, visits: [] });
      }
      customerMap.get(c.id)!.visits.push(v);
    });

    // If 'All Time' and no active filters/search, include existing customers with 0 visits
    if (timeRange === 'All' && selectedLocationId === 'all' && selectedServiceId === 'all' && !search.trim()) {
      allCustomers.forEach((c: any) => {
        if (!customerMap.has(c.id)) {
          customerMap.set(c.id, { customer: c, visits: [] });
        }
      });
    }

    const list = Array.from(customerMap.values()).map(({ customer, visits }) => {
      let totalWaitMs = 0;
      let completedCount = 0;
      let maxVisitMs = 0;

      visits.forEach((v: any) => {
        const createdMs = new Date(v.createdAt).getTime();
        if (createdMs > maxVisitMs) maxVisitMs = createdMs;
        if (v.completedAt) {
          const startMs = v.serviceStart ? new Date(v.serviceStart).getTime() : createdMs;
          totalWaitMs += new Date(v.completedAt).getTime() - startMs;
          completedCount++;
        }
      });

      let avgWaitMinutesStr = '—';
      if (completedCount > 0) {
        const mins = Math.round(totalWaitMs / completedCount / 60000);
        avgWaitMinutesStr = mins < 1 ? '<1 min' : `${mins} min`;
      }

      let lastVisitLabelStr = '—';
      if (visits.length > 0 && maxVisitMs > 0) {
        const diffDays = Math.floor((Date.now() - maxVisitMs) / 86400000);
        if (diffDays === 0) lastVisitLabelStr = 'Today';
        else if (diffDays === 1) lastVisitLabelStr = 'Yesterday';
        else if (diffDays < 30) lastVisitLabelStr = `${diffDays}d ago`;
        else
          lastVisitLabelStr = new Date(maxVisitMs).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
      }

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        isVip: customer.isVip,
        isBlocked: customer.isBlocked,
        notes: customer.notes,
        totalVisits: visits.length,
        avgWaitMinutes: avgWaitMinutesStr,
        lastVisitLabel: lastVisitLabelStr,
        lastVisitMs: maxVisitMs,
      };
    });

    if (sortBy === 'recent') {
      list.sort((a, b) => (b.lastVisitMs || 0) - (a.lastVisitMs || 0));
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      list.sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0));
    }

    return list;
  }, [filteredVisits, allCustomers, timeRange, selectedLocationId, selectedServiceId, search, sortBy]);

  // ── Standard Filtered Summary Stats ───────────────────────────────────────
  const stats = useMemo(() => {
    const totalVisitsCount = filteredVisits.length;
    const uniqueCustomerIds = new Set(
      filteredVisits.map((v: any) => v.customerId || v.customer?.id).filter(Boolean),
    );
    const uniqueCount =
      uniqueCustomerIds.size > 0
        ? uniqueCustomerIds.size
        : timeRange === 'All' && selectedLocationId === 'all' && selectedServiceId === 'all'
        ? allCustomers.length
        : 0;

    const avgVisitsPerCustomer = uniqueCount > 0 ? (totalVisitsCount / uniqueCount).toFixed(1) : '0';

    const completedVisits = filteredVisits.filter(
      (v: any) => v.completedAt && (v.serviceStart || v.createdAt),
    );
    let avgDurationStr = '—';
    if (completedVisits.length > 0) {
      const totalMs = completedVisits.reduce((acc: number, v: any) => {
        const start = v.serviceStart ? new Date(v.serviceStart).getTime() : new Date(v.createdAt).getTime();
        return acc + (new Date(v.completedAt).getTime() - start);
      }, 0);
      const mins = Math.round(totalMs / completedVisits.length / 60000);
      avgDurationStr = mins < 1 ? '<1 min' : `${mins} min`;
    }

    return {
      uniqueCount,
      totalVisitsCount,
      avgVisitsPerCustomer,
      avgDurationStr,
    };
  }, [filteredVisits, allCustomers, timeRange, selectedLocationId, selectedServiceId]);

  const isLoading = isVisitsLoading || isCustomersLoading;

  return (
    <AdminLayout pageTitle="Records">
      <Head>
        <title>Records | Qmova</title>
      </Head>

      <div className="w-full mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-on-surface dark:text-white tracking-tight">Customer Records</h1>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-0.5">
              Visit history, customer reviews & ratings breakdown, date-wise timeline tracking, and customer profiles.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container text-white rounded-xl font-semibold transition-all shadow-sm border border-primary/20 hover:-translate-y-0.5 w-fit cursor-pointer"
          >
            <Plus className="w-5 h-5" strokeWidth={1.5} />
            Add Customer
          </button>
        </div>

        {/* ── View Mode Navigation Tabs ───────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 dark:border-dark-border/60 pb-3">
          <div className="flex items-center bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-xl p-1 gap-1 shadow-sm">
            <button
              onClick={() => {
                setViewMode('timeline');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Timeline
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  viewMode === 'timeline' ? 'bg-white/20 text-white' : 'bg-surface-container-high dark:bg-zinc-800 text-on-surface-variant'
                }`}
              >
                {stats.totalVisitsCount}
              </span>
            </button>

            <button
              onClick={() => {
                setViewMode('reviews');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'reviews'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface dark:hover:text-white'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              Reviews & Ratings
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  viewMode === 'reviews' ? 'bg-white/20 text-white' : 'bg-surface-container-high dark:bg-zinc-800 text-amber-600 dark:text-amber-400 font-bold'
                }`}
              >
                {totalReviewsCount}
              </span>
            </button>

            <button
              onClick={() => {
                setViewMode('unique_visitors');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'unique_visitors'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Unique Visitors
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  viewMode === 'unique_visitors' ? 'bg-white/20 text-white' : 'bg-surface-container-high dark:bg-zinc-800 text-on-surface-variant'
                }`}
              >
                {stats.uniqueCount}
              </span>
            </button>
          </div>

          {/* Quick Active Filter Pill Notification */}
          {(starFilter !== 'all' || selectedServiceId !== 'all' || selectedLocationId !== 'all') && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant font-medium">Active Filters:</span>
              {starFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  {starFilter === 'reviewed' ? 'All Reviewed' : starFilter === 'has_comment' ? 'Has Feedback' : `${starFilter} Stars`}
                  <button onClick={() => setStarFilter('all')} className="hover:text-red-500 cursor-pointer ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedServiceId !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                  Service Filter
                  <button onClick={() => setSelectedServiceId('all')} className="hover:text-red-500 cursor-pointer ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedLocationId !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                  Location Filter
                  <button onClick={() => setSelectedLocationId('all')} className="hover:text-red-500 cursor-pointer ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setStarFilter('all');
                  setSelectedServiceId('all');
                  setSelectedLocationId('all');
                }}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* ── KPI Summary Cards ───────────────────────────────────────────────── */}
        {viewMode === 'reviews' ? (
          /* Reviews Mode KPI Cards */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Overall Rating</p>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold font-mono text-on-surface dark:text-white">
                  {reviewAnalytics.avgRating}
                  {reviewAnalytics.avgRating !== '—' && <span className="text-sm font-sans text-outline font-normal"> / 5.0</span>}
                </p>
                {reviewAnalytics.totalReviews > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                    {reviewAnalytics.csatPercentage}% CSAT
                  </span>
                )}
              </div>
            </div>

            <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 strokeWidth={1.5} className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Reviews</p>
              </div>
              <p className="text-2xl font-bold font-mono text-on-surface dark:text-white">{reviewAnalytics.totalReviews}</p>
            </div>

            <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle strokeWidth={1.5} className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Written Comments</p>
              </div>
              <p className="text-2xl font-bold font-mono text-on-surface dark:text-white">{reviewAnalytics.commentsCount}</p>
            </div>

            <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles strokeWidth={1.5} className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Top Rated Service</p>
              </div>
              <p className="text-base font-bold text-on-surface dark:text-white truncate">
                {reviewAnalytics.topService ? `${reviewAnalytics.topService.name} (${reviewAnalytics.topService.avgRating} ★)` : '—'}
              </p>
            </div>
          </div>
        ) : (
          /* Standard Timeline / Visitors KPI Cards */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Users strokeWidth={1.5} className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  {viewMode === 'unique_visitors' ? 'Unique Visitors' : 'Total Customers'}
                </p>
              </div>
              <p className="text-2xl font-bold font-mono text-on-surface dark:text-white">{stats.uniqueCount}</p>
            </div>

            <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 strokeWidth={1.5} className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Visits</p>
              </div>
              <p className="text-2xl font-bold font-mono text-on-surface dark:text-white">{stats.totalVisitsCount}</p>
            </div>

            <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Clock strokeWidth={1.5} className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Avg. Visits / Customer</p>
              </div>
              <p className="text-2xl font-bold font-mono text-on-surface dark:text-white">{stats.avgVisitsPerCustomer}</p>
            </div>

            <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Timer strokeWidth={1.5} className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Avg. Service Time</p>
              </div>
              <p className="text-2xl font-bold font-mono text-on-surface dark:text-white">{stats.avgDurationStr}</p>
            </div>
          </div>
        )}

        {/* ── Reviews Analytics Dashboard Section (Visible in Reviews Mode) ─── */}
        {viewMode === 'reviews' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 1. Star Distribution Card */}
            <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  Star Distribution
                </h3>
                {starFilter !== 'all' && (
                  <button
                    onClick={() => setStarFilter('all')}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div className="space-y-2 pt-1">
                {reviewAnalytics.starCounts.map(({ star, count, pct }) => {
                  const isSelected = starFilter === String(star);
                  return (
                    <button
                      key={star}
                      onClick={() => setStarFilter(isSelected ? 'all' : String(star))}
                      className={`w-full flex items-center gap-3 p-1.5 rounded-xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 ring-2 ring-amber-500/50'
                          : 'hover:bg-surface-container-low dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <span className="text-xs font-bold text-on-surface dark:text-zinc-200 w-9 text-left flex items-center gap-1 shrink-0">
                        {star} <Star className="w-3 h-3 fill-amber-400 text-amber-500 inline" />
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-surface-container-high dark:bg-zinc-800 overflow-hidden relative">
                        <div
                          className="h-full bg-amber-400 dark:bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-semibold text-on-surface-variant w-14 text-right shrink-0">
                        {count} ({pct}%)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Overall Service Rating Breakdown Card */}
            <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Service Rating Breakdown
                </h3>
                <span className="text-xs text-on-surface-variant">{reviewAnalytics.serviceBreakdown.length} Services</span>
              </div>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {reviewAnalytics.serviceBreakdown.length > 0 ? (
                  reviewAnalytics.serviceBreakdown.map((svc) => {
                    const isSelected = selectedServiceId === svc.id;
                    return (
                      <div
                        key={svc.id}
                        onClick={() => setSelectedServiceId(isSelected ? 'all' : svc.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/10 border-primary/40'
                            : 'bg-surface-container-low dark:bg-zinc-900 border-border dark:border-dark-border hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-on-surface dark:text-white truncate max-w-[170px]">
                            {svc.name}
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            {svc.avgRating} / 5
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                          <span>{svc.count} {svc.count === 1 ? 'review' : 'reviews'}</span>
                          {svc.feedbackCount > 0 && (
                            <span className="text-primary font-medium">{svc.feedbackCount} with comments</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-on-surface-variant text-center py-8 italic">
                    No service reviews recorded yet.
                  </p>
                )}
              </div>
            </div>

            {/* 3. Overall Location Rating Breakdown Card */}
            <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Location Rating Breakdown
                </h3>
                <span className="text-xs text-on-surface-variant">{reviewAnalytics.locationBreakdown.length} Locations</span>
              </div>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {reviewAnalytics.locationBreakdown.length > 0 ? (
                  reviewAnalytics.locationBreakdown.map((loc) => {
                    const isSelected = selectedLocationId === loc.id;
                    return (
                      <div
                        key={loc.id}
                        onClick={() => setSelectedLocationId(isSelected ? 'all' : loc.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/10 border-primary/40'
                            : 'bg-surface-container-low dark:bg-zinc-900 border-border dark:border-dark-border hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-on-surface dark:text-white truncate max-w-[170px]">
                            {loc.name}
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            {loc.avgRating} / 5
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                          <span>{loc.count} {loc.count === 1 ? 'review' : 'reviews'}</span>
                          {loc.feedbackCount > 0 && (
                            <span className="text-primary font-medium">{loc.feedbackCount} with comments</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-on-surface-variant text-center py-8 italic">
                    No location reviews recorded yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Filters & Controls Toolbar ──────────────────────────────────────── */}
        <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl p-4 shadow-sm space-y-3">
          {/* Row 1: Timeframe Presets, Date Picker, Location & Service Selects, Star Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Timeframe Presets */}
              <div className="flex items-center bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-xl p-1 gap-1 shadow-sm">
                {(['Today', 'Week', 'Month', 'Year', 'All', 'Custom'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleTimeRangeChange(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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

              {/* Location Select Dropdown */}
              <div className="flex items-center bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-xl px-2.5 py-1 gap-1.5 shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-on-surface dark:text-zinc-200 outline-none cursor-pointer pr-1"
                >
                  <option value="all" className="dark:bg-zinc-900">All Locations</option>
                  {(locations || []).map((loc: any) => (
                    <option key={loc.id} value={loc.id} className="dark:bg-zinc-900">
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Select Dropdown */}
              <div className="flex items-center bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-xl px-2.5 py-1 gap-1.5 shadow-sm">
                <Layers className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-on-surface dark:text-zinc-200 outline-none cursor-pointer pr-1 max-w-[170px] truncate"
                >
                  <option value="all" className="dark:bg-zinc-900">All Services</option>
                  {(services || []).map((svc: any) => (
                    <option key={svc.id} value={svc.id} className="dark:bg-zinc-900">
                      {svc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Stars Dropdown */}
              <div className="flex items-center bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-xl px-2.5 py-1 gap-1.5 shadow-sm">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                <select
                  value={starFilter}
                  onChange={(e) => setStarFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-on-surface dark:text-zinc-200 outline-none cursor-pointer pr-1"
                >
                  <option value="all" className="dark:bg-zinc-900">All Ratings</option>
                  <option value="reviewed" className="dark:bg-zinc-900">★ All Reviewed</option>
                  <option value="5" className="dark:bg-zinc-900">★ 5 Stars Only</option>
                  <option value="4" className="dark:bg-zinc-900">★ 4 Stars Only</option>
                  <option value="3" className="dark:bg-zinc-900">★ 3 Stars Only</option>
                  <option value="2" className="dark:bg-zinc-900">★ 2 Stars Only</option>
                  <option value="1" className="dark:bg-zinc-900">★ 1 Star Only</option>
                  <option value="has_comment" className="dark:bg-zinc-900">💬 With Comments Only</option>
                </select>
              </div>
            </div>

            {/* Quick Toggle for Reviews Filter (Alternative to dropdown) */}
            <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-xl hover:border-amber-500/40 transition-colors shadow-sm">
              <input
                type="checkbox"
                checked={starFilter !== 'all' || viewMode === 'reviews'}
                onChange={(e) => {
                  if (e.target.checked) {
                    setStarFilter('reviewed');
                  } else {
                    setStarFilter('all');
                    if (viewMode === 'reviews') setViewMode('timeline');
                  }
                }}
                className="w-4 h-4 text-amber-500 rounded accent-amber-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-on-surface dark:text-white flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                Reviewed Visits Only
              </span>
            </label>
          </div>

          {/* Row 2: Search Input and Sort Options */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pt-2 border-t border-border/50 dark:border-dark-border/50">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" strokeWidth={1.5} />
              <input
                type="text"
                placeholder={
                  viewMode === 'unique_visitors'
                    ? 'Search customer name, phone, or email...'
                    : viewMode === 'reviews'
                    ? 'Search review comment, customer, service, ticket #...'
                    : 'Search ticket #, customer, service, phone, comments...'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none transition-all text-on-surface dark:text-white placeholder:text-on-surface-variant w-full font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-on-surface-variant font-medium mr-1">Sort:</span>
              {viewMode === 'unique_visitors' ? (
                (['visits', 'recent', 'name'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all capitalize cursor-pointer ${
                      sortBy === s
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border text-on-surface-variant hover:text-on-surface dark:hover:text-white'
                    }`}
                  >
                    {s === 'visits' ? 'Total Visits' : s}
                  </button>
                ))
              ) : viewMode === 'reviews' ? (
                (['recent', 'rating_desc', 'rating_asc', 'name'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all capitalize cursor-pointer ${
                      sortBy === s
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border text-on-surface-variant hover:text-on-surface dark:hover:text-white'
                    }`}
                  >
                    {s === 'rating_desc' ? 'Highest Rating' : s === 'rating_asc' ? 'Lowest Rating' : s}
                  </button>
                ))
              ) : (
                (['recent', 'oldest', 'duration', 'name'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all capitalize cursor-pointer ${
                      sortBy === s
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border text-on-surface-variant hover:text-on-surface dark:hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Content View ────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl p-8 space-y-4 shadow-sm">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-surface-container-low dark:bg-white/5 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : viewMode === 'unique_visitors' ? (
          /* ── 1. UNIQUE VISITORS VIEW ─────────────────────────────────────── */
          <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl shadow-sm overflow-hidden">
            {uniqueVisitorsList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-white/[0.02] text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                      <th className="p-4">Customer</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4 text-center">Visits in Period</th>
                      <th className="p-4 text-center">Avg. Time</th>
                      <th className="p-4">Last Visit</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-dark-border">
                    {uniqueVisitorsList.map((person: any) => (
                      <tr
                        key={person.id}
                        onClick={() => setSelectedCustomer(person.id)}
                        className="hover:bg-surface-container-low dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                              {(person.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p
                                className={`font-semibold text-sm ${
                                  person.isBlocked ? 'text-red-500 line-through' : 'text-on-surface dark:text-white'
                                }`}
                              >
                                {person.name || 'Anonymous Customer'}
                              </p>
                              {person.isVip && (
                                <span className="inline-block text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                                  VIP
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-0.5">
                            {person.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />
                                {person.phone}
                              </div>
                            )}
                            {person.email && (
                              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
                                {person.email}
                              </div>
                            )}
                            {!person.phone && !person.email && (
                              <span className="text-xs text-on-surface-variant">—</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold bg-primary/10 dark:bg-primary/20 text-primary rounded-full">
                            {person.totalVisits || 0}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-sm text-on-surface-variant font-medium">
                            {person.avgWaitMinutes || '—'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-on-surface-variant">{person.lastVisitLabel || '—'}</span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {person.phone && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`https://wa.me/${person.phone.replace(/[^0-9]/g, '')}`);
                                }}
                                className="p-2 text-[#25D366] hover:bg-[#25D366]/10 rounded-lg transition-colors cursor-pointer"
                                title="Message on WhatsApp"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMutation.mutate({
                                  id: person.id,
                                  data: { isBlocked: !person.isBlocked },
                                });
                              }}
                              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                person.isBlocked
                                  ? 'bg-red-500/20 text-red-600'
                                  : 'text-red-500 hover:bg-red-500/10'
                              }`}
                              title={person.isBlocked ? 'Unblock' : 'Block'}
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-surface-container-low dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-on-surface-variant opacity-40" strokeWidth={1.5} />
                </div>
                <p className="text-lg font-semibold text-on-surface dark:text-white mb-1">No customers found</p>
                <p className="text-sm text-on-surface-variant max-w-sm mb-6">
                  {search
                    ? 'No customers match your search criteria.'
                    : 'No visitors recorded for the selected date range and filters.'}
                </p>
                {!search && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium transition-colors hover:bg-primary-container cursor-pointer"
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.5} /> Add Customer Manually
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── 2. DATE-WISE TIMELINE / REVIEWS VIEW ─────────────────────────── */
          <div className="space-y-6">
            {groupedVisitsByDate.length > 0 ? (
              groupedVisitsByDate.map((group) => (
                <div key={group.dateKey} className="space-y-3">
                  {/* Date Header Ribbon */}
                  <div className="flex items-center gap-2.5 px-1 py-1">
                    <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
                    <h2 className="text-sm font-bold text-on-surface dark:text-white uppercase tracking-wider">
                      {group.label}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-low dark:bg-zinc-800 text-on-surface-variant font-semibold border border-border dark:border-dark-border">
                      {group.visits.length} {viewMode === 'reviews' ? (group.visits.length === 1 ? 'review' : 'reviews') : (group.visits.length === 1 ? 'visit' : 'visits')}
                    </span>
                    <div className="flex-1 h-px bg-border/60 dark:bg-dark-border/60 ml-2" />
                  </div>

                  {/* Visit Cards in this Date Group */}
                  <div className="space-y-3">
                    {group.visits.map((visit: any) => {
                      // Determine true service start: prefer earliest activated step in SEF flow, or visit.serviceStart
                      let actualServiceStart = visit.serviceStart;
                      if (Array.isArray(visit.visitSteps) && visit.visitSteps.length > 0) {
                        const activatedSteps = visit.visitSteps
                          .filter((s: any) => s.activatedAt)
                          .sort((a: any, b: any) => new Date(a.activatedAt).getTime() - new Date(b.activatedAt).getTime());
                        if (activatedSteps.length > 0) {
                          actualServiceStart = activatedSteps[0].activatedAt;
                        }
                      }

                      const waitStart = visit.waitingStart || visit.checkInTime || visit.createdAt;
                      let waitMins = 0;
                      if (actualServiceStart && waitStart) {
                        waitMins = Math.max(0, Math.round((new Date(actualServiceStart).getTime() - new Date(waitStart).getTime()) / 60000));
                      } else if (visit.completedAt && waitStart && !actualServiceStart) {
                        waitMins = Math.max(0, Math.round((new Date(visit.completedAt).getTime() - new Date(waitStart).getTime()) / 60000));
                      }

                      const endTime = visit.completedAt;
                      let durationMins = 0;
                      if (endTime && actualServiceStart) {
                        const diffMs = new Date(endTime).getTime() - new Date(actualServiceStart).getTime();
                        durationMins = Math.max(0, Math.round(diffMs / 60000));
                      } else if (endTime && visit.serviceStart) {
                        const diffMs = new Date(endTime).getTime() - new Date(visit.serviceStart).getTime();
                        durationMins = Math.max(0, Math.round(diffMs / 60000));
                      }

                      const opName =
                        visit.operatorUser?.personalSettings?.name ||
                        visit.operatorUser?.email?.split('@')[0] ||
                        null;

                      const hasRating = visit.rating !== null && visit.rating !== undefined;

                      return (
                        <div
                          key={visit.id}
                          onClick={() => setSelectedVisit(visit)}
                          className={`bg-card dark:bg-dark-card border rounded-2xl p-4 sm:p-5 shadow-sm transition-all hover:shadow-md cursor-pointer group relative overflow-hidden ${
                            hasRating
                              ? 'border-border dark:border-dark-border hover:border-amber-500/50 dark:hover:border-amber-500/50'
                              : 'border-border dark:border-dark-border hover:border-primary/50 dark:hover:border-primary/50'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Left: Ticket ID, Customer Details, Service & Queue */}
                            <div className="flex items-start gap-3.5 min-w-0">
                              <div
                                className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-mono font-bold shrink-0 border ${
                                  hasRating
                                    ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/25'
                                    : 'bg-primary/10 dark:bg-primary/20 text-primary border-primary/20'
                                }`}
                              >
                                <span className="text-xs leading-none">
                                  {visit.displayId || '—'}
                                </span>
                              </div>

                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3
                                    onClick={(e) => {
                                      if (visit.customer?.id) {
                                        e.stopPropagation();
                                        setSelectedCustomer(visit.customer.id);
                                      }
                                    }}
                                    className="font-bold text-sm text-on-surface dark:text-white hover:text-primary transition-colors hover:underline truncate"
                                  >
                                    {visit.customer?.name || 'Walk-in Guest'}
                                  </h3>

                                  {/* Status Badge */}
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                                      visit.currentState === 'COMPLETED'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                        : visit.currentState === 'IN_SERVICE' || visit.currentState === 'SERVING'
                                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 animate-pulse'
                                        : visit.currentState === 'WAITING' || visit.currentState === 'CHECKED_IN'
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                        : visit.currentState === 'CANCELLED'
                                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                        : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
                                    }`}
                                  >
                                    {visit.currentState.replace(/_/g, ' ')}
                                  </span>

                                  {visit.service?.name && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-container-low dark:bg-zinc-800 text-on-surface-variant border border-border dark:border-dark-border">
                                      {visit.service.name}
                                    </span>
                                  )}

                                  {visit.queue?.name && (
                                    <span className="text-[10px] font-medium text-outline">
                                      · {visit.queue.name}
                                    </span>
                                  )}

                                  {visit.location?.name && (
                                    <span className="text-[10px] font-medium text-outline flex items-center gap-0.5">
                                      <MapPin className="w-2.5 h-2.5" />
                                      {visit.location.name}
                                    </span>
                                  )}
                                </div>

                                {/* Contact snippet */}
                                <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
                                  {visit.customer?.phone && (
                                    <span className="flex items-center gap-1 font-mono text-[11px]">
                                      <Phone className="w-3 h-3 text-outline" />
                                      {visit.customer.phone}
                                    </span>
                                  )}
                                  {visit.customer?.email && (
                                    <span className="flex items-center gap-1 text-[11px] truncate max-w-[200px]">
                                      <Mail className="w-3 h-3 text-outline" />
                                      {visit.customer.email}
                                    </span>
                                  )}
                                  {opName && (
                                    <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                                      <User className="w-3 h-3" />
                                      Served by: {opName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Center/Right: Milestones, Star Rating Badge, & Quick Action */}
                            <div className="flex flex-wrap items-center gap-3 lg:gap-4 self-end lg:self-center">
                              {/* Timeline Milestones */}
                              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border text-[11px] font-mono">
                                <div className="text-center px-1.5">
                                  <p className="text-[9px] text-outline uppercase font-sans font-bold">Created</p>
                                  <p className="font-semibold text-on-surface dark:text-zinc-200">
                                    {new Date(visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>

                                <ArrowRight className="w-3 h-3 text-outline" />

                                <div className="text-center px-1.5">
                                  <p className="text-[9px] text-outline uppercase font-sans font-bold">Wait</p>
                                  <p className="font-semibold text-amber-600 dark:text-amber-400">
                                    {waitMins > 0 ? `${waitMins}m` : '0m'}
                                  </p>
                                </div>

                                <ArrowRight className="w-3 h-3 text-outline" />

                                <div className="text-center px-1.5">
                                  <p className="text-[9px] text-outline uppercase font-sans font-bold">Service</p>
                                  <p className="font-semibold text-blue-600 dark:text-blue-400">
                                    {actualServiceStart
                                      ? new Date(actualServiceStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                      : '—'}
                                  </p>
                                </div>

                                <ArrowRight className="w-3 h-3 text-outline" />

                                <div className="text-center px-1.5">
                                  <p className="text-[9px] text-outline uppercase font-sans font-bold">Done</p>
                                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    {visit.completedAt
                                      ? new Date(visit.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                      : visit.currentState === 'IN_SERVICE'
                                      ? (durationMins > 0 ? `${durationMins}m` : 'Active')
                                      : '—'}
                                  </p>
                                </div>
                              </div>

                              {/* Customer Rating if available */}
                              {hasRating && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs font-bold text-amber-700 dark:text-amber-300 shadow-sm">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                  <span>{visit.rating} / 5</span>
                                </div>
                              )}

                              {/* Quick Action Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVisit(visit);
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-high dark:bg-zinc-800 text-on-surface dark:text-white hover:bg-primary hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                              >
                                Details <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Customer written review feedback snippet with quote styling */}
                          {visit.feedbackText && (
                            <div className="mt-3 pt-2.5 border-t border-border/50 dark:border-dark-border/50 flex items-start gap-2.5 text-xs bg-amber-500/[0.04] dark:bg-amber-500/[0.07] -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3 rounded-b-2xl">
                              <Quote className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 opacity-80" />
                              <div className="flex-1">
                                <p className="italic text-zinc-700 dark:text-zinc-200 font-medium">
                                  &ldquo;{visit.feedbackText}&rdquo;
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-16 h-16 bg-surface-container-low dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                  {viewMode === 'reviews' ? (
                    <Star className="w-8 h-8 text-amber-500/50" />
                  ) : (
                    <CalendarIcon className="w-8 h-8 text-on-surface-variant opacity-40" strokeWidth={1.5} />
                  )}
                </div>
                <p className="text-lg font-semibold text-on-surface dark:text-white mb-1">
                  {viewMode === 'reviews' ? 'No reviews found' : 'No visit records found'}
                </p>
                <p className="text-sm text-on-surface-variant max-w-sm mb-6">
                  {search
                    ? 'No records match your search query.'
                    : viewMode === 'reviews'
                    ? 'No customer reviews recorded for the selected date range and filters.'
                    : 'No visits match the selected date range, location, and service filters.'}
                </p>
                {!search && viewMode !== 'reviews' && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium transition-colors hover:bg-primary-container cursor-pointer"
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.5} /> Create Visit
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <CreateVisitModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <CustomerDrawer
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        customerId={selectedCustomer}
      />
      <VisitDrawer
        isOpen={!!selectedVisit}
        onClose={() => setSelectedVisit(null)}
        visit={selectedVisit}
      />
    </AdminLayout>
  );
}

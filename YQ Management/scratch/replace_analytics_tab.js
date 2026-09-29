const fs = require('fs');
const path = require('path');

const analyticsPath = path.join(__dirname, '../frontend/src/pages/dashboard/analytics.tsx');
let content = fs.readFileSync(analyticsPath, 'utf-8');

// 1. We need to add selectedServiceId state if not present.
if (!content.includes('const [selectedServiceId, setSelectedServiceId]')) {
  const stateInsertPoint = '  const [activeTab, setActiveTab] = useState<\'insights\' | \'customers\'>(\'insights\');';
  content = content.replace(stateInsertPoint, stateInsertPoint + '\n  const [selectedServiceId, setSelectedServiceId] = useState<string>(\'\');');
}

// 2. We need to fetch visits for the table instead of customers
const oldQuery = `  const { data: customersRaw, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['customers', 'with-visits'],
    queryFn: (): Promise<Customer[] | null> => fetchApi<Customer[]>('/customer').catch(() => null),
  });
  const customers: Customer[] = customersRaw ?? [];`;

const newQuery = `  const { data: visitsRaw, isLoading: isVisitsLoading } = useQuery({
    queryKey: ['visits', 'analytics', timeParam, customRangeParam, activeLocationId, selectedServiceId, tz],
    queryFn: (): Promise<Visit[] | null> => 
      fetchApi<Visit[]>(\`/visits?scope=analytics&timeframe=\${timeParam}\${locParam}\${customRangeParam}\${selectedServiceId ? \`&serviceId=\${selectedServiceId}\` : ''}&tz=\${encodeURIComponent(tz)}\`).catch(() => null),
    enabled: timeRange !== 'Custom' || (!!startDate && !!endDate),
  });
  const visits: Visit[] = visitsRaw ?? [];`;

content = content.replace(oldQuery, newQuery);

// 3. We need to fetch services for the filter dropdown.
if (!content.includes('const { data: services } = useQuery')) {
  const serviceFetchInsert = `  const { data: services } = useQuery({
    queryKey: ['services', activeLocationId],
    queryFn: (): Promise<Service[]> => fetchApi<Service[]>(\`/service\${locParam ? \`?locationId=\${activeLocationId}\` : ''}\`).catch(() => []),
  });`;
  content = content.replace('  const chartData = useMemo(() => {', serviceFetchInsert + '\n\n  const chartData = useMemo(() => {');
}

// 4. Update the Customers map to Visits map
const oldMap = `  // ── Customer map ──────────────────────────────
  const { people, totalVisits } = useMemo(() => {
    let list = [...customers];

    const totalVisitsCount = list.reduce((sum, p) => sum + (p.totalVisits || 0), 0);

    if (customerSearch) {
      const q = customerSearch.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.phone?.includes(customerSearch) ||
        p.email?.toLowerCase().includes(q)
      );
    }
    if (customerSort === 'visits') list.sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0));
    else if (customerSort === 'recent') list.sort((a, b) => (b.lastVisitMs || 0) - (a.lastVisitMs || 0));
    else list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return { people: list, totalVisits: totalVisitsCount };
  }, [customers, customerSearch, customerSort]);`;

const newMap = `  // ── Visits list ──────────────────────────────
  const computeWaitMins = (record: any) => {
    if (!record.serviceStart) return 0;
    const start = new Date(record.waitingStart || record.createdAt).getTime();
    const end = new Date(record.serviceStart).getTime();
    const diff = end - start;
    return diff > 0 ? Math.round(diff / 60000) : 0;
  };
  const computeServiceMins = (record: any) => {
    if (!record.serviceStart || !record.completedAt) return 0;
    const start = new Date(record.serviceStart).getTime();
    const end = new Date(record.completedAt).getTime();
    const diff = end - start;
    return diff > 0 ? Math.round(diff / 60000) : 0;
  };

  const { filteredVisits, uniqueCustomersCount, totalVisitsCount, avgWaitTime } = useMemo(() => {
    let list = [...visits];
    
    if (customerSearch) {
      const q = customerSearch.toLowerCase();
      list = list.filter(v =>
        v.customer?.name?.toLowerCase().includes(q) ||
        v.customer?.phone?.includes(q) ||
        v.customer?.email?.toLowerCase().includes(q)
      );
    }

    if (customerSort === 'visits') {
      // sort by wait time desc
      list.sort((a, b) => computeWaitMins(b) - computeWaitMins(a));
    } else if (customerSort === 'recent') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      list.sort((a, b) => (a.customer?.name || '').localeCompare(b.customer?.name || ''));
    }

    const uniqueSet = new Set(list.map(v => v.customerId).filter(Boolean));
    const totalWaitMins = list.reduce((sum, v) => sum + computeWaitMins(v), 0);
    const avgWait = list.length ? (totalWaitMins / list.length).toFixed(1) : '0';

    return { filteredVisits: list, uniqueCustomersCount: uniqueSet.size, totalVisitsCount: list.length, avgWaitTime: avgWait };
  }, [visits, customerSearch, customerSort]);`;

content = content.replace(oldMap, newMap);

fs.writeFileSync(analyticsPath, content, 'utf-8');
console.log('Script completed phase 1');

import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { getIndustryConfig, type IndustryConfig } from '../lib/industryConfig';

/**
 * useIndustry()
 *
 * Returns the resolved IndustryConfig for the current tenant.
 * Reads `tenant.businessType` from the cached `/tenant/me` query.
 * Falls back to 'general' if not set or still loading.
 *
 * Usage:
 *   const industry = useIndustry();
 *   <h1>{industry.serviceDesk.pageTitle}</h1>  // "Patient Flow" | "Chair Board" | etc.
 */
export function useIndustry(): IndustryConfig {
  const { data: tenant } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => fetchApi('/tenant/me').catch(() => null),
    staleTime: 5 * 60 * 1000, // cache for 5 mins
  });

  return getIndustryConfig(tenant?.businessType);
}

export default useIndustry;

/**
 * Subdomain TV Display Route
 *
 * The Next.js middleware rewrites all custom-subdomain requests:
 *   e-city.qmova.yqbuddy.com/tv/[tenantId]  →  /_tenant/e-city/tv/[tenantId]
 *
 * This file exists solely to satisfy that rewrite so the TV display page
 * renders correctly on tenant subdomains. It is a thin re-export of the
 * root-level /tv/[tenantId] page — all data fetching and rendering happens there.
 */
export { default } from '../../../tv/[tenantId]';

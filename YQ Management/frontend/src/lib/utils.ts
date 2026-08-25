import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTenantUrl(subdomain: string, path: string = '') {
  if (!subdomain) return '';
  if (typeof window === 'undefined') return '';
  
  const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
  
  if (isLocal) {
    return `${window.location.protocol}//${subdomain}.localhost:${window.location.port}${path}`;
  }
  
  let baseDomain = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseDomain) {
      // Fallback if NEXT_PUBLIC_APP_URL is not provided
      const hostname = window.location.hostname;
      
      // If we are already on a tenant subdomain, strip it to get the base domain
      // e.g., demo.qmova.yqbuddy.com -> qmova.yqbuddy.com
      const parts = hostname.split('.');
      if (parts.length > 2 && !hostname.includes('vercel.app')) {
        // We assume the base domain is the main app domain (e.g., qmova.yqbuddy.com)
        // If they are on the main domain (e.g. qmova.yqbuddy.com), it will stay as is.
        // But if they are somehow on a subdomain, we should use the main app domain.
        // Actually, since this runs in the browser on the *main dashboard* to generate links,
        // window.location.hostname IS the base domain!
        baseDomain = `${window.location.protocol}//${hostname}`;
      } else if (hostname.includes('vercel.app')) {
        const isVercel = true;
        let baseHost = hostname;
        if (parts.length > 3) {
            baseHost = parts.slice(-3).join('.');
        }
        return `${window.location.protocol}//${baseHost}/t/${subdomain}${path}`;
      } else {
        baseDomain = `${window.location.protocol}//${hostname}`;
      }
  }
  
  try {
    const url = new URL(baseDomain);
    url.hostname = `${subdomain}.${url.hostname}`;
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}${path}`;
  } catch (e) {
    return '';
  }
}

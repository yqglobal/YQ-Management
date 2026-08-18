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
      const hostParts = window.location.hostname.split('.');
      const isVercel = window.location.hostname.includes('vercel.app');
      
      let baseHost = window.location.hostname;
      if (isVercel) {
          if (hostParts.length > 3) {
             baseHost = hostParts.slice(-3).join('.');
          }
          return `${window.location.protocol}//${baseHost}/t/${subdomain}${path}`;
      } else {
          // If it's something like hq.qmova.app (3 parts), base is qmova.app (2 parts)
          // If it's qmova.app (2 parts), base is qmova.app
          if (hostParts.length > 2) {
             baseHost = hostParts.slice(1).join('.');
          }
      }
      baseDomain = `${window.location.protocol}//${baseHost}`;
  }
  
  try {
    const url = new URL(baseDomain);
    url.hostname = `${subdomain}.${url.hostname}`;
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}${path}`;
  } catch (e) {
    return '';
  }
}

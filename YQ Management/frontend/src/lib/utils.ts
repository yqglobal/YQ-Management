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
      baseDomain = `${window.location.protocol}//${hostname}`;
  }
  
  try {
    const url = new URL(baseDomain);
    url.hostname = `${subdomain}.${url.hostname}`;
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}${path}`;
  } catch (e) {
    return '';
  }
}

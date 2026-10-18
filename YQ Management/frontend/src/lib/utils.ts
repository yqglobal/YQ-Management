import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTenantUrl(subdomain: string, path: string = '') {
  if (!subdomain) return '';
  if (typeof window === 'undefined') return '';
  
  const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
  const portPart = window.location.port ? `:${window.location.port}` : '';
  const formattedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';

  if (isLocal) {
    return `${window.location.protocol}//${subdomain}.localhost${portPart}${formattedPath}`;
  }
  
  let baseDomain = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseDomain && process.env.NEXT_PUBLIC_DOMAIN_BASE) {
    baseDomain = `${window.location.protocol}//${process.env.NEXT_PUBLIC_DOMAIN_BASE}`;
  }
  if (!baseDomain) {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2) {
      const baseHostname = (parts[0] === 'app' || parts[0] === 'www' || parts[0] === subdomain)
        ? parts.slice(1).join('.')
        : hostname;
      baseDomain = `${window.location.protocol}//${baseHostname}`;
    } else {
      baseDomain = `${window.location.protocol}//${hostname}`;
    }
  }
  
  try {
    const url = new URL(baseDomain);
    
    // Only prepend the subdomain if the hostname doesn't already start with it
    if (!url.hostname.startsWith(`${subdomain}.`)) {
      url.hostname = `${subdomain}.${url.hostname}`;
    }
    
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}${formattedPath}`;
  } catch (e) {
    return '';
  }
}

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

import type { NextRouter } from 'next/router';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public path?: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let router: NextRouter | null = null;
let redirecting = false;

export function setApiRouter(r: NextRouter) {
  router = r;
}

export const AuthStorage = {
  set: (token: string) => {
    if (typeof window !== 'undefined' && token) {
      localStorage.setItem('qmover_auth_token', token);
      // also write legacy key for older onboarding flows
      try { localStorage.setItem('token', token); } catch (e) {}
      document.cookie = `token=${token}; path=/; max-age=2592000; SameSite=Lax`;
    }
  },
  get: (): string | null => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('qmover_auth_token') ||
        localStorage.getItem('token') ||
        null
      );
    }
    return null;
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('qmover_auth_token');
      // clear legacy key too
      try { localStorage.removeItem('token'); } catch (e) {}
      sessionStorage.removeItem('qmover_auth_token');
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  },
};

function getCookieToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(/(?:^|; )token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function fetchWithRetry(
  endpoint: string,
  options: RequestInit,
  attempt: number = 0,
): Promise<Response> {
  try {
    const response = await fetch(`${endpoint}`, {
      ...options,
      signal: options.signal,
    });
    return response;
  } catch (error) {
    if (
      attempt < MAX_RETRIES &&
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt)),
      );
      return fetchWithRetry(endpoint, options, attempt + 1);
    }
    throw error;
  }
}

export function getBackendUrl() {
  let baseUrl = 'https://qmova-backend.onrender.com';
  try {
    if (typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'))) {
      baseUrl = `${window.location.protocol}//localhost:3000`;
    } else if (process.env.NEXT_PUBLIC_API_URL) {
      baseUrl = process.env.NEXT_PUBLIC_API_URL;
    }
  } catch (e) {
    // fallback to default
  }
  return baseUrl;
}

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = getBackendUrl();

  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (
    !headers.has('Content-Type') &&
    options.body instanceof URLSearchParams === false &&
    !(options.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json');
  }
  const token = AuthStorage.get() || getCookieToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  if (!headers.has('x-request-id')) {
    headers.set('x-request-id', requestId);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetchWithRetry(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      let errorDetails = null;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        errorDetails = errorData;
      } catch (e) {
        errorMessage = response.statusText;
      }
      if (response.status === 401) {
        console.warn(`[API Auth Error] [${requestId}] ${options.method || 'GET'} ${endpoint} → 401 Unauthorized`);
        if (router && !redirecting) {
          redirecting = true;
          router.push('/login');
        }
      } else {
        console.error(`[API Error] [${requestId}] ${options.method || 'GET'} ${endpoint} → ${response.status}: ${errorMessage}`, errorDetails);
      }
      throw new ApiError(response.status, errorMessage, endpoint, errorDetails);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.warn(`[API Timeout] [${requestId}] ${options.method || 'GET'} ${endpoint} → Request timed out after 30s`);
      throw new ApiError(408, 'Request timed out. Please try again.', endpoint);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    if (!navigator.onLine) {
      console.warn(`[API Offline] [${requestId}] ${options.method || 'GET'} ${endpoint} → Device is offline`);
      throw new ApiError(0, 'You are offline. Please check your internet connection.', endpoint);
    }
    console.warn(`[API Network Error] [${requestId}] ${options.method || 'GET'} ${endpoint} → ${error.message}`);
    throw new ApiError(0, error.message || 'Network error', endpoint);
  }
};
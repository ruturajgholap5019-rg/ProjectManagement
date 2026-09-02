import { useAuthStore } from '../store/authStore';

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const BASE_URL = import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:3001/api/v1' : 'https://project-tracker-backend-303t.onrender.com/api/v1');

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  skipCache?: boolean;
}

interface CacheItem {
  data: any;
  timestamp: number;
}

// In-Memory Client Response Cache (30s TTL for instant page switching)
const apiResponseCache = new Map<string, CacheItem>();
const inFlightRequests = new Map<string, Promise<any>>();

export function invalidateApiCache(pattern?: string) {
  if (!pattern) {
    apiResponseCache.clear();
    return;
  }
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));
  for (const key of apiResponseCache.keys()) {
    if (regex.test(key)) {
      apiResponseCache.delete(key);
    }
  }
}

/**
 * Non-blocking prefetch helper that pre-warms endpoints
 */
export function prefetchEndpoint(endpoint: string) {
  if (!inFlightRequests.has(`GET:${endpoint}`) && !apiResponseCache.has(`GET:${endpoint}`)) {
    apiFetch(endpoint).catch(() => {
      // Silently ignore background prefetch errors
    });
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, skipCache = false, headers: customHeaders, ...restOptions } = options;
  const method = (restOptions.method || 'GET').toUpperCase();
  const cacheKey = `${method}:${endpoint}`;

  // If a mutation happens (POST, PUT, DELETE, PATCH), invalidate related caches immediately
  if (method !== 'GET') {
    invalidateApiCache();
  }

  // 1. Instant Cache Hit for GET requests (0ms response time!)
  if (method === 'GET' && !skipCache) {
    const cached = apiResponseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data as T;
    }
  }

  // 2. Request deduplication for identical concurrent in-flight GET requests
  if (method === 'GET' && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)! as Promise<T>;
  }

  const fetchPromise = (async () => {
    const authStore = useAuthStore.getState();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders as Record<string, string>),
    };

    if (requiresAuth) {
      if (authStore.accessToken) {
        headers['Authorization'] = `Bearer ${authStore.accessToken}`;
      } else if (!localStorage.getItem('has_logged_in')) {
        throw new Error('Unauthorized - Please log in');
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      let response = await fetch(`${BASE_URL}${endpoint}`, {
        headers,
        credentials: 'include',
        signal: options.signal || controller.signal,
        ...restOptions,
      });

      // Handle Token Refresh on 401 Unauthorized
      if (response.status === 401 && requiresAuth && !endpoint.includes('/auth/refresh')) {
        const refreshed = await authStore.refreshSession();
        if (refreshed) {
          const newAccessToken = useAuthStore.getState().accessToken;
          if (newAccessToken) {
            headers['Authorization'] = `Bearer ${newAccessToken}`;
            response = await fetch(`${BASE_URL}${endpoint}`, {
              headers,
              credentials: 'include',
              signal: options.signal || controller.signal,
              ...restOptions,
            });
          }
        } else {
          authStore.logout();
          throw new Error('Session expired. Please log in again.');
        }
      }

      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`Server error (${response.status}): ${text || response.statusText}`);
        }
        data = { data: text };
      }

      if (!response.ok) {
        throw new Error(data.message || 'An unexpected error occurred');
      }

      // Save to client cache on GET success
      if (method === 'GET') {
        apiResponseCache.set(cacheKey, { data: data.data, timestamp: Date.now() });
      }

      return data.data;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet connection.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  if (method === 'GET') {
    inFlightRequests.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => inFlightRequests.delete(cacheKey));
  }

  return fetchPromise;
}

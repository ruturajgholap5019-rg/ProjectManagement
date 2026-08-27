import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://project-tracker-backend-303t.onrender.com/api/v1';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const clientCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();
const CACHE_FRESH_MS = 10 * 60 * 1000; // 10 minutes fresh
const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes max cache life

export function invalidateApiCache(pattern?: string) {
  if (!pattern) {
    clientCache.clear();
    return;
  }
  for (const key of clientCache.keys()) {
    if (key.includes(pattern)) {
      clientCache.delete(key);
    }
  }
}

function autoInvalidateOnMutation(endpoint: string) {
  if (endpoint.includes('/tasks') || endpoint.includes('/deliverables')) {
    invalidateApiCache('/tasks');
    invalidateApiCache('/dashboard');
    invalidateApiCache('/projects');
  } else if (endpoint.includes('/projects')) {
    invalidateApiCache('/projects');
    invalidateApiCache('/dashboard');
  } else if (endpoint.includes('/activities')) {
    invalidateApiCache('/activities');
    invalidateApiCache('/dashboard');
  } else if (endpoint.includes('/users')) {
    invalidateApiCache('/users');
    invalidateApiCache('/dashboard');
  } else if (endpoint.includes('/categories')) {
    invalidateApiCache('/categories');
    invalidateApiCache('/dashboard');
    invalidateApiCache('/projects');
  } else {
    // Default fallback: clear dashboard and projects
    invalidateApiCache('/dashboard');
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, headers: customHeaders, ...restOptions } = options;
  const method = (restOptions.method || 'GET').toUpperCase();
  const cacheKey = `${endpoint}`;

  // For GET requests, serve instantly from client cache if available
  if (method === 'GET' && clientCache.has(cacheKey)) {
    const entry = clientCache.get(cacheKey)!;
    const isFresh = Date.now() - entry.timestamp < CACHE_FRESH_MS;
    const isUsable = Date.now() - entry.timestamp < CACHE_MAX_AGE_MS;

    if (isFresh) {
      return entry.data as T;
    }

    if (isUsable) {
      // Return stale immediately & trigger background refresh
      (async () => {
        try {
          const authStore = useAuthStore.getState();
          const bgHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(customHeaders as Record<string, string>),
          };
          if (requiresAuth && authStore.accessToken) {
            bgHeaders['Authorization'] = `Bearer ${authStore.accessToken}`;
          }
          const bgRes = await fetch(`${BASE_URL}${endpoint}`, {
            headers: bgHeaders,
            credentials: 'include',
            ...restOptions,
          });
          if (bgRes.ok) {
            const bgData = await bgRes.json();
            if (bgData.data) {
              clientCache.set(cacheKey, { data: bgData.data, timestamp: Date.now() });
            }
          }
        } catch {
          // Ignore background refresh errors
        }
      })();

      return entry.data as T;
    }
  }

  // Mutating requests trigger smart targeted cache invalidation
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    autoInvalidateOnMutation(endpoint);
  }

  // Request deduplication for parallel GET requests
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

    let response = await fetch(`${BASE_URL}${endpoint}`, {
      headers,
      credentials: 'include',
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

    // Save successful GET response to client cache
    if (method === 'GET') {
      clientCache.set(cacheKey, { data: data.data, timestamp: Date.now() });
    }

    return data.data;
  })();

  if (method === 'GET') {
    inFlightRequests.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => inFlightRequests.delete(cacheKey));
  }

  return fetchPromise;
}


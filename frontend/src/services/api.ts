import { useAuthStore } from '../store/authStore';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

const inFlightRequests = new Map<string, Promise<any>>();

export function invalidateApiCache(_pattern?: string) {
  // No-op - all requests are direct live
}

/**
 * Non-blocking prefetch helper that pre-warms endpoints
 */
export function prefetchEndpoint(endpoint: string) {
  if (!inFlightRequests.has(endpoint)) {
    apiFetch(endpoint).catch(() => {
      // Silently ignore background prefetch errors
    });
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, headers: customHeaders, ...restOptions } = options;
  const method = (restOptions.method || 'GET').toUpperCase();

  // Guard: Block delete and update operations (View-Only Mode)
  if (['DELETE', 'PUT', 'PATCH'].includes(method)) {
    throw new Error(`Operation disabled: Update and delete operations are restricted. The application is running in view-only mode.`);
  }

  const cacheKey = `${method}:${endpoint}`;

  // Request deduplication for identical concurrent in-flight GET requests
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

    return data.data;
  })();

  if (method === 'GET') {
    inFlightRequests.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => inFlightRequests.delete(cacheKey));
  }

  return fetchPromise;
}


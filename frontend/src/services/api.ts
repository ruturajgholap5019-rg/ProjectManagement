import { useAuthStore } from '../store/authStore';

const BASE_URL = '/api/v1';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, headers: customHeaders, ...restOptions } = options;

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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'An unexpected error occurred');
  }

  return data.data;
}

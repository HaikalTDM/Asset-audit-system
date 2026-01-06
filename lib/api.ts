import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'asset_audit_token';
const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:4000';

export type ApiUser = {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'staff';
  isActive: boolean;
  photoUrl?: string;
  created_at: number;
  updated_at: number;
};

type RequestOptions = {
  method?: string;
  body?: any;
  auth?: boolean;
  isForm?: boolean;
};

let tokenCache: string | null = null;

export async function setToken(token: string | null) {
  tokenCache = token;
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

async function getToken() {
  if (tokenCache) return tokenCache;
  const stored = await AsyncStorage.getItem(TOKEN_KEY);
  tokenCache = stored;
  return stored;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, isForm = false } = options;
  const headers: Record<string, string> = {};

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  if (!isForm && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      message = data?.error || data?.message || message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  register: (email: string, password: string, displayName: string, role: 'admin' | 'staff') =>
    request<{ token: string; user: ApiUser }>('/auth/register', {
      method: 'POST',
      body: { email, password, displayName, role },
      auth: false,
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),
  me: () => request<{ user: ApiUser }>('/me'),
  updateMe: (data: { displayName?: string }) =>
    request<{ user: ApiUser }>('/me', { method: 'PATCH', body: data }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>('/me/password', { method: 'POST', body: { currentPassword, newPassword } }),
  uploadProfilePhoto: (photo: { uri: string; name: string; type: string }) => {
    const form = new FormData();
    form.append('photo', photo as any);
    return request<{ photoUrl: string }>('/me/photo', { method: 'POST', body: form, isForm: true });
  },

  // Users (admin)
  listUsers: () => request<{ users: ApiUser[] }>('/admin/users'),
  adminCreateUser: (email: string, password: string, displayName: string, role: 'admin' | 'staff') =>
    request<{ user: ApiUser }>('/admin/users', { method: 'POST', body: { email, password, displayName, role } }),
  adminUpdateUser: (id: string, data: { role?: 'admin' | 'staff'; isActive?: boolean; displayName?: string }) =>
    request<{ user: ApiUser }>(`/admin/users/${id}`, { method: 'PATCH', body: data }),
  adminDeleteUser: (id: string) => request<{ ok: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),
  adminResetPassword: (id: string) =>
    request<{ tempPassword: string }>(`/admin/users/${id}/reset-password`, { method: 'POST' }),

  // Assessments
  listAssessments: (userId?: string) => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return request<{ assessments: any[] }>(`/assessments${query}`);
  },
  getAssessment: (id: string) => request<{ assessment: any }>(`/assessments/${id}`),
  createAssessment: (form: FormData) =>
    request<{ assessment: any }>('/assessments', { method: 'POST', body: form, isForm: true }),
  updateAssessment: (id: string, data: { notes?: string }) =>
    request<{ assessment: any }>(`/assessments/${id}`, { method: 'PATCH', body: data }),
  deleteAssessment: (id: string) => request<{ ok: boolean }>(`/assessments/${id}`, { method: 'DELETE' }),

  // Metrics
  getMetrics: (userId?: string) => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return request<{ assessmentCount: number; imageCount: number; storageBytes: number; lastCalculated: number }>(
      `/metrics${query}`
    );
  },
  getSystemMetrics: () =>
    request<{ assessmentCount: number; imageCount: number; storageBytes: number; lastCalculated: number }>(
      '/metrics/system'
    ),
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:4000';
const TOKEN_KEY = 'auth_token';

export type ApiUser = {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'staff';
  isActive: boolean;
  photoUrl?: string;
  created_at?: number;
  updated_at?: number;
};

async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

async function request(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error || 'Request failed';
    throw new Error(message);
  }
  return data;
}

export async function upload(path: string, body: FormData) {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error || 'Upload failed';
    throw new Error(message);
  }
  return data;
}

export const api = {
  apiUrl: API_URL,
  async login(email: string, password: string) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  async register(email: string, password: string, displayName: string, role?: 'admin' | 'staff') {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, role }),
    });
  },
  async me() {
    return request('/me');
  },
  async updateMe(data: Record<string, any>) {
    return request('/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async changePassword(currentPassword: string, newPassword: string) {
    return request('/me/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
  async uploadProfilePhoto(photo: { uri: string; name: string; type: string }) {
    const form = new FormData();
    form.append('photo', photo as any);
    return upload('/me/photo', form);
  },
  async listAssessments(userId?: string) {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return request(`/assessments${qs}`);
  },
  async getAssessment(id: string) {
    return request(`/assessments/${id}`);
  },
  async createAssessment(form: FormData) {
    return upload('/assessments', form);
  },
  async updateAssessment(id: string, data: Record<string, any>) {
    return request(`/assessments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteAssessment(id: string) {
    return request(`/assessments/${id}`, { method: 'DELETE' });
  },
  async listUsers() {
    return request('/admin/users');
  },
  async adminCreateUser(email: string, password: string, displayName: string, role: 'admin' | 'staff') {
    return request('/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, role }),
    });
  },
  async adminUpdateUser(id: string, data: Record<string, any>) {
    return request(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async adminDeleteUser(id: string) {
    return request(`/admin/users/${id}`, { method: 'DELETE' });
  },
  async adminResetPassword(id: string) {
    return request(`/admin/users/${id}/reset-password`, { method: 'POST' });
  },
  async getMetrics(userId?: string) {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return request(`/metrics${qs}`);
  },
  async getSystemMetrics() {
    return request('/metrics/system');
  },
};

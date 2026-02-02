import axios from 'axios';
import type { Dashboard, ActivityList, Activity, ActivityDetail, DailyHealth, UserSettings } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  paramsSerializer: {
    indexes: null,
  },
});

export const dashboardApi = {
  get: (version?: 'v1' | 'v2') => api.get<Dashboard>('/dashboard', { params: { version } }).then(r => r.data),
};

export const activitiesApi = {
  list: (params?: { 
    start_date?: string; 
    end_date?: string; 
    discipline?: string;
    disciplines?: string[];
    sort_by?: string;
    sort_order?: string;
    limit?: number; 
    offset?: number 
  }) =>
    api.get<ActivityList>('/activities', { params }).then(r => r.data),
  get: (id: number) => api.get<ActivityDetail>(`/activities/${id}`).then(r => r.data),
  update: (id: number, data: Partial<Activity>) =>
    api.patch<Activity>(`/activities/${id}`, data).then(r => r.data),
};

export const healthApi = {
  getDaily: (startDate: string, endDate: string) =>
    api.get<{ metrics: DailyHealth[] }>('/health/daily', { params: { start_date: startDate, end_date: endDate } }).then(r => r.data),
};

export const syncApi = {
  trigger: (days: number = 28, fullSync: boolean = false) =>
    api.post('/sync/trigger', { days, full_sync: fullSync }).then(r => r.data),
  getStatus: () => api.get('/sync/status').then(r => r.data),
  getGarminProfile: () => api.get('/garmin/profile').then(r => r.data),
};

export const settingsApi = {
  get: () => api.get<UserSettings>('/settings').then(r => r.data),
  update: (data: Partial<UserSettings>) =>
    api.patch<UserSettings>('/settings', data).then(r => r.data),
};

export default api;

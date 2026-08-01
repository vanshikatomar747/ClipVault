import { api } from './client';
import type { AuthResponse } from '@clipvault/shared';

export const requestOTP = async (email: string) => {
  const { data } = await api.post('/auth/request-otp', { email });
  return data;
};

export const register = async (name: string, email: string, password: string, otp: string): Promise<AuthResponse> => {
  const { data } = await api.post('/auth/register', { name, email, password, otp });
  return data;
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
};

export const updatePreferences = async (preferences: { clipboardTogglePreference?: boolean; themePreference?: 'light' | 'dark' }) => {
  const { data } = await api.put('/auth/preferences', preferences);
  return data;
};

export const deleteAccount = async () => {
  const { data } = await api.delete('/auth/delete-account');
  return data;
};

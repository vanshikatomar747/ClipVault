import { api } from './client';

export interface DashboardStats {
  totalClips: number;
  totalNotebooks: number;
  favoriteClips: number;
  clipsToday: number;
  chartData: { name: string; date: string; clips: number }[];
  recentClips: any[];
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get('/dashboard/stats');
  return data;
};

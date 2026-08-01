import { api } from './client';
import type { Notebook } from '@clipvault/shared';

export const getNotebooks = async (): Promise<Notebook[]> => {
  const { data } = await api.get('/notebooks');
  return data;
};

export const createNotebook = async (notebook: Partial<Notebook>): Promise<Notebook> => {
  const { data } = await api.post('/notebooks', notebook);
  return data;
};

export const updateNotebook = async (id: string, updates: Partial<Notebook>): Promise<Notebook> => {
  const { data } = await api.put(`/notebooks/${id}`, updates);
  return data;
};

export const deleteNotebook = async (id: string): Promise<void> => {
  await api.delete(`/notebooks/${id}`);
};

import { api } from './client';
import type { ClipboardItem } from '@clipvault/shared';

export const getClipboardItems = async (
  params?: {
    notebookId?: string;
    limit?: number;
    skip?: number;
    searchQuery?: string;
    isFavorite?: boolean;
    isPinned?: boolean;
  }
): Promise<ClipboardItem[]> => {
  const { data } = await api.get('/clipboard-items', {
    params: {
      notebookId: params?.notebookId,
      limit: params?.limit || 50,
      skip: params?.skip || 0,
      searchQuery: params?.searchQuery,
      isFavorite: params?.isFavorite,
      isPinned: params?.isPinned,
    }
  });
  return data;
};

export const createClipboardItem = async (item: Partial<ClipboardItem>): Promise<ClipboardItem> => {
  const { data } = await api.post('/clipboard-items', item);
  return data;
};

export const updateClipboardItem = async (id: string, updates: Partial<ClipboardItem>): Promise<ClipboardItem> => {
  const { data } = await api.put(`/clipboard-items/${id}`, updates);
  return data;
};

export const deleteClipboardItem = async (id: string): Promise<void> => {
  await api.delete(`/clipboard-items/${id}`);
};

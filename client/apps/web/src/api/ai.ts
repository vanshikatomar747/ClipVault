import { api } from './client';

export interface AISummary {
  _id: string;
  userId: string;
  notebookId: string;
  title: string;
  summaryType: 'quick' | 'detailed' | 'bullet' | 'action' | 'selection';
  dateRange: {
    type: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom' | 'all' | 'selection';
    start?: string;
    end?: string;
  };
  originalCharCount: number;
  originalWordCount: number;
  summary: string;
  aiModel: string;
  createdAt: string;
  updatedAt: string;
}

export const checkOllamaStatus = async (): Promise<{ available: boolean }> => {
  const { data } = await api.get('/ai/status');
  return data;
};

export interface GenerateSummaryParams {
  notebookId: string;
  type: string;
  dateRangeType: string;
  startDate?: string;
  endDate?: string;
  title?: string;
}

export const generateSummary = async (params: GenerateSummaryParams, signal?: AbortSignal): Promise<AISummary> => {
  const { data } = await api.post('/ai/summarize', params, { signal });
  return data;
};

export interface GenerateSelectionSummaryParams {
  notebookId: string;
  text: string;
  type: string;
}

export const generateSelectionSummary = async (params: GenerateSelectionSummaryParams, signal?: AbortSignal): Promise<AISummary> => {
  const { data } = await api.post('/ai/summarize-selection', params, { signal });
  return data;
};

export const getSummaries = async (notebookId?: string): Promise<AISummary[]> => {
  const { data } = await api.get('/ai/summaries', { params: { notebookId } });
  return data;
};

export const deleteSummary = async (id: string): Promise<void> => {
  await api.delete(`/ai/summaries/${id}`);
};

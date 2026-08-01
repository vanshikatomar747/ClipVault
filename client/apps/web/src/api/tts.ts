import { api } from './client';

export const generateNotebookTTS = async (
  notebookId: string,
  dateRange: any,
  voice: string,
  accent: string,
  isClone: boolean,
  signal?: AbortSignal
): Promise<any> => {
  const { data } = await api.post(`/tts/generate`, {
    notebookId,
    dateRange,
    voice,
    accent,
    isClone
  }, { signal });
  return data;
};

export const generateSelectionTTS = async (
  text: string,
  voice: string,
  accent: string,
  isClone: boolean,
  signal?: AbortSignal
): Promise<{ audioPath: string }> => {
  const { data } = await api.post(`/tts/selection`, {
    text,
    voice,
    accent,
    isClone
  }, { signal });
  return data;
};

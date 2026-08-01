import { api } from './client';

export interface AudioHistory {
  _id: string;
  title: string;
  voiceUsed: string;
  audioPath: string;
  duration: number;
  createdAt: string;
  notebookId: any;
}

export const getAudioHistory = async (): Promise<AudioHistory[]> => {
  const { data } = await api.get(`/audio`);
  return data;
};

export const deleteAudioHistory = async (id: string): Promise<void> => {
  await api.delete(`/audio/${id}`);
};

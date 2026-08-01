import { api } from './client';

export interface VoiceProfile {
  _id: string;
  name: string;
  modelName: string;
  createdAt: string;
}

export const getVoiceProfile = async (): Promise<VoiceProfile | null> => {
  const { data } = await api.get('/voice');
  return data;
};

export const createVoiceProfile = async (file: Blob, name: string): Promise<VoiceProfile> => {
  const formData = new FormData();
  formData.append('audio', file, 'recording.wav');
  formData.append('name', name);

  const { data } = await api.post('/voice', formData);
  return data;
};

export const deleteVoiceProfile = async (): Promise<void> => {
  await api.delete('/voice');
};

import { useState, useRef } from 'react';
import { Mic, Square, RefreshCw, Save, Trash2, Volume2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVoiceProfile, createVoiceProfile, deleteVoiceProfile } from '../../api/voice';
import { format } from 'date-fns';

export default function AIVoices({ isDarkMode }: { isDarkMode: boolean }) {
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['voiceProfile'],
    queryFn: getVoiceProfile
  });

  const createMutation = useMutation({
    mutationFn: (blob: Blob) => createVoiceProfile(blob, 'My Cloned Voice'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voiceProfile'] });
      setAudioBlob(null);
      setAudioUrl(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Error saving voice profile');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVoiceProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voiceProfile'] });
    }
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSave = () => {
    if (audioBlob) {
      createMutation.mutate(audioBlob);
    }
  };

  if (isLoading) return <div className="p-4">Loading voices...</div>;

  return (
    <section className="space-y-6">
      <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
        <Volume2 className="w-5 h-5 text-cv-sage" />
        AI Voice Cloning
      </h2>

      {profile ? (
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}>
          <h3 className={`font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-zinc-800'}`}>Current Voice Profile</h3>
          <div className={`text-sm space-y-2 mb-6 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
            <p><span className="font-medium">Name:</span> {profile.name}</p>
            <p><span className="font-medium">Model Used:</span> {profile.modelName}</p>
            <p><span className="font-medium">Created:</span> {format(new Date(profile.createdAt), 'PPP')}</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => deleteMutation.mutate()}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete Voice
            </button>
          </div>
        </div>
      ) : (
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}>
          <h3 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-zinc-800'}`}>Create Your AI Voice</h3>
          <p className={`text-sm mb-6 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Record 30–60 seconds of speech in a quiet room. Speak naturally at a normal speed.
            Your voice clone remains local on your device.
          </p>

          {!audioUrl ? (
            <div className="flex items-center gap-4">
              {!isRecording ? (
                <button 
                  onClick={startRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-cv-sage text-white rounded-xl shadow-sm hover:bg-cv-olive transition-all"
                >
                  <Mic className="w-5 h-5" /> Start Recording
                </button>
              ) : (
                <button 
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl shadow-sm hover:bg-red-600 transition-all animate-pulse"
                >
                  <Square className="w-5 h-5" /> Stop Recording
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <audio src={audioUrl} controls className="w-full" />
              <div className="flex gap-3">
                <button 
                  onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
                >
                  <RefreshCw className="w-4 h-4" /> Record Again
                </button>
                <button 
                  onClick={handleSave}
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-cv-sage text-white rounded-lg shadow-sm hover:bg-cv-olive transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Voice
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

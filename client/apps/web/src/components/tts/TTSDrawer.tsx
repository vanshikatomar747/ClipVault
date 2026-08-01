import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Music, Mic, Loader } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVoiceProfile } from '../../api/voice';
import { generateNotebookTTS, generateSelectionTTS } from '../../api/tts';
import AudioPlayer from './AudioPlayer';
import { getServerUrls } from '../../api/client';

interface TTSDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notebookId: string;
  selectedText?: string | null;
  selectedDate?: Date;
  isDarkMode: boolean;
}

export default function TTSDrawer({ isOpen, onClose, notebookId, selectedText, selectedDate, isDarkMode }: TTSDrawerProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'standard' | 'clone'>('standard');
  const [voice, setVoice] = useState('female');
  const [accent, setAccent] = useState('american');
  const [dateRange, setDateRange] = useState('all');
  const [audioUrl, setAudioUrl] = useState<string | null>(() => {
    const saved = localStorage.getItem('last_generated_audio_url');
    return saved && saved !== '' ? saved : null;
  });

  useEffect(() => {
    if (audioUrl) {
      localStorage.setItem('last_generated_audio_url', audioUrl);
    } else if (audioUrl === null) {
      localStorage.removeItem('last_generated_audio_url');
    }
  }, [audioUrl]);

  useEffect(() => {
    if (isOpen) {
      setDateRange(selectedDate ? 'selectedDate' : 'all');
    }
  }, [isOpen, selectedDate]);

  const { data: profile } = useQuery({
    queryKey: ['voiceProfile'],
    queryFn: getVoiceProfile
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const generateMutation = useMutation({
    mutationFn: () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (selectedText) {
        return generateSelectionTTS(selectedText, voice, accent, mode === 'clone', controller.signal);
      }
      
      let datePayload: any = { type: dateRange };
      if (dateRange === 'selectedDate' && selectedDate) {
        const start = new Date(selectedDate);
        start.setHours(0,0,0,0);
        const end = new Date(selectedDate);
        end.setHours(23,59,59,999);
        datePayload = { type: 'custom', start: start.toISOString(), end: end.toISOString() };
      }
      
      return generateNotebookTTS(notebookId, datePayload, voice, accent, mode === 'clone', controller.signal);
    },
    onSuccess: (data) => {
      abortControllerRef.current = null;
      const backendHost = getServerUrls().socket_url;
      setAudioUrl(`${backendHost}${data.audioPath}`);
      queryClient.invalidateQueries({ queryKey: ['audioHistory'] });
    },
    onError: (err: any) => {
      abortControllerRef.current = null;
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        return;
      }
      alert(err.response?.data?.message || 'Error generating TTS');
    }
  });

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    onClose();
  };

  const handleGenerate = () => {
    setAudioUrl(null);
    generateMutation.mutate();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-transparent z-40"
            onClick={handleClose}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 h-full w-full sm:w-[450px] shadow-2xl z-50 flex flex-col border-l transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'}`}
          >
            <div className={`p-6 border-b flex items-center justify-between transition-colors ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-cv-cream border-zinc-100'}`}>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-zinc-100' : 'text-cv-brown'}`}>
                <Music className="w-5 h-5 text-cv-sage" /> Text to Speech
              </h2>
              <button onClick={handleClose} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-black/5 text-zinc-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {audioUrl ? (
                <div className="space-y-4">
                  <h3 className={`font-bold ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>Generated Audio</h3>
                  <AudioPlayer src={audioUrl} />
                  <button 
                    onClick={() => setAudioUrl(null)}
                    className="text-sm text-cv-sage hover:underline"
                  >
                    Generate another
                  </button>
                </div>
              ) : (
                <>
                  <div className={`flex p-1 rounded-xl transition-colors ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                    <button 
                      onClick={() => setMode('standard')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'standard' ? isDarkMode ? 'bg-zinc-700 shadow-sm text-cv-sage' : 'bg-white shadow-sm text-cv-sage' : 'text-zinc-500 hover:text-zinc-400'}`}
                    >
                      Standard Voices
                    </button>
                    <button 
                      onClick={() => setMode('clone')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'clone' ? isDarkMode ? 'bg-zinc-700 shadow-sm text-cv-sage' : 'bg-white shadow-sm text-cv-sage' : 'text-zinc-500 hover:text-zinc-400'}`}
                    >
                      Voice Cloning
                    </button>
                  </div>

                  {selectedText ? (
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-cv-sage/10 border-cv-sage/30 text-cv-sage' : 'bg-cv-sage/10 text-cv-olive border-cv-sage/20'}`}>
                      Generating speech for selected text: <span className="italic">"{selectedText.substring(0, 100)}{selectedText.length > 100 ? '...' : ''}"</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className={`text-sm font-bold block transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>Content Date Range</label>
                      <select 
                        value={dateRange} 
                        onChange={(e) => setDateRange(e.target.value)}
                        className={`w-full p-3 rounded-xl border transition-colors focus:outline-none focus:border-cv-sage ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'}`}
                      >
                        {selectedDate && <option value="selectedDate">Currently Opened Date</option>}
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="last7days">Last 7 Days</option>
                        <option value="last30days">Last 30 Days</option>
                        <option value="all">Entire Notebook</option>
                      </select>
                    </div>
                  )}

                  {mode === 'standard' ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className={`text-sm font-bold block transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>Voice</label>
                        <select value={voice} onChange={e => setVoice(e.target.value)} className={`w-full p-3 rounded-xl border transition-colors focus:outline-none focus:border-cv-sage ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'}`}>
                          <option value="female">Female Voice</option>
                          <option value="male">Male Voice</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className={`text-sm font-bold block transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>Accent</label>
                        <select value={accent} onChange={e => setAccent(e.target.value)} className={`w-full p-3 rounded-xl border transition-colors focus:outline-none focus:border-cv-sage ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'}`}>
                          <option value="american">American English</option>
                          <option value="british">British English</option>
                          <option value="indian">Indian English</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-cv-sage/10 border-cv-sage/30 text-cv-sage' : 'bg-cv-sage/5 border-cv-sage'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <Mic className="w-5 h-5 text-cv-sage" />
                        <h4 className="font-bold text-cv-sage">My Cloned Voice</h4>
                      </div>
                      {profile ? (
                        <p className={`text-sm transition-colors ${isDarkMode ? 'text-zinc-300' : 'text-zinc-650'}`}>Ready to use: <strong>{profile.name}</strong></p>
                      ) : (
                        <p className="text-sm text-red-500">No voice profile found. Please set it up in Settings first.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {!audioUrl && (
              <div className={`p-6 border-t transition-colors ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-100'}`}>
                <button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || (mode === 'clone' && !profile)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-cv-sage hover:bg-cv-olive text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {generateMutation.isPending ? (
                    <><Loader className="w-5 h-5 animate-spin" /> Generating...</>
                  ) : (
                    <><Play className="w-5 h-5" /> Generate Speech</>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, AlertCircle, RefreshCw, FileText, CheckCircle, Target } from 'lucide-react';
import { generateSummary, generateSelectionSummary, getSummaries, checkOllamaStatus } from '../../api/ai';
import type { AISummary } from '../../api/ai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AISummaryCard from './AISummaryCard';

interface AISummaryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notebookId: string;
  selectedText?: string | null;
  isDarkMode: boolean;
}

const SUMMARY_TYPES = [
  { id: 'quick', label: 'Quick Summary', icon: Sparkles, desc: '5-10 concise sentences' },
  { id: 'detailed', label: 'Detailed', icon: FileText, desc: 'Comprehensive context' },
  { id: 'bullet', label: 'Bullet Points', icon: CheckCircle, desc: 'Clean, easy to scan' },
  { id: 'action', label: 'Action Items', icon: Target, desc: 'Extract tasks & deadlines' }
];

const DATE_RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7days', label: 'Last 7 Days' },
  { id: 'last30days', label: 'Last 30 Days' },
  { id: 'all', label: 'Entire Notebook' },
  { id: 'custom', label: 'Custom Date' }
];

export default function AISummaryDrawer({ isOpen, onClose, notebookId, selectedText, isDarkMode }: AISummaryDrawerProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'saved'>('generate');
  const [selectedType, setSelectedType] = useState('quick');
  const [selectedRange, setSelectedRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const queryClient = useQueryClient();

  const abortControllerRef = useRef<AbortController | null>(null);

  // If there's selected text, default to generation tab
  useEffect(() => {
    if (isOpen) {
      setActiveTab('generate');
    }
  }, [isOpen, selectedText]);

  const { data: status } = useQuery({
    queryKey: ['ollamaStatus'],
    queryFn: checkOllamaStatus,
    refetchInterval: 30000,
  });

  const { data: savedSummaries, isLoading: isLoadingSaved } = useQuery({
    queryKey: ['aiSummaries', notebookId],
    queryFn: () => getSummaries(notebookId),
    enabled: isOpen,
  });

  const generateMutation = useMutation({
    mutationFn: (params: any) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      return selectedText 
        ? generateSelectionSummary({ notebookId, text: selectedText, type: params.type }, controller.signal)
        : generateSummary(params, controller.signal);
    },
    onSuccess: () => {
      abortControllerRef.current = null;
      queryClient.invalidateQueries({ queryKey: ['aiSummaries', notebookId] });
      setActiveTab('saved');
    },
    onError: (err: any) => {
      abortControllerRef.current = null;
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        return;
      }
      alert(err.response?.data?.message || 'Error generating summary');
    }
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      notebookId,
      type: selectedType,
      dateRangeType: selectedRange,
      ...(selectedRange === 'custom' ? { startDate, endDate } : {})
    });
  };

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 h-full w-full sm:w-[550px] shadow-2xl z-50 flex flex-col border-l transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-cv-cream border-zinc-200 text-zinc-800'}`}
          >
            <div className={`flex items-center justify-between p-6 border-b transition-colors ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-zinc-100' : 'text-cv-brown'}`}>
                <Sparkles className="w-5 h-5 text-cv-sage" />
                AI Summaries
              </h2>
              <button onClick={handleClose} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'text-zinc-400 hover:bg-zinc-700 hover:text-white' : 'text-zinc-400 hover:bg-zinc-100 hover:text-cv-brown'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`flex border-b transition-colors px-6 ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
              <button 
                onClick={() => setActiveTab('generate')}
                className={`py-3 px-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'generate' ? 'border-cv-sage text-cv-sage' : `border-transparent ${isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-cv-brown'}`}`}
              >
                Generate New
              </button>
              <button 
                onClick={() => setActiveTab('saved')}
                className={`py-3 px-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'saved' ? 'border-cv-sage text-cv-sage' : `border-transparent ${isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-cv-brown'}`}`}
              >
                Saved Summaries ({savedSummaries?.length || 0})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'generate' ? (
                <div className="space-y-8">
                  {status && !status.available && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 border border-red-100">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-bold">Ollama not detected or Llama 3.2 3B is missing.</p>
                        <p className="mt-1 opacity-90">Please ensure Ollama is running locally with the `llama3.2:3b` model installed to use offline AI features.</p>
                      </div>
                    </div>
                  )}

                  {selectedText ? (
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-cv-sage/10 border-cv-sage/30 text-cv-sage' : 'bg-cv-sage/10 text-cv-olive border-cv-sage/20'}`}>
                      <p className="text-sm font-bold flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4" /> Selected Text Mode
                      </p>
                      <p className="text-xs italic truncate">"{selectedText.substring(0, 100)}{selectedText.length > 100 ? '...' : ''}"</p>
                    </div>
                  ) : (
                    <div>
                      <label className={`text-sm font-bold uppercase tracking-wider mb-3 block ${isDarkMode ? 'text-zinc-400' : 'text-cv-brown'}`}>Date Range</label>
                      <div className="flex flex-wrap gap-2">
                        {DATE_RANGES.map(r => (
                          <button
                            key={r.id}
                            onClick={() => setSelectedRange(r.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                              selectedRange === r.id 
                                ? 'bg-cv-sage/20 border-cv-sage text-cv-olive' 
                                : isDarkMode 
                                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600' 
                                  : 'bg-white border-zinc-200 text-zinc-600 hover:border-cv-sage/50'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                      {selectedRange === 'custom' && (
                        <div className="flex gap-4 mt-3">
                          <div className="flex-1">
                            <label className="text-xs text-zinc-500 mb-1 block">Start Date</label>
                            <input 
                              type="date" 
                              value={startDate}
                              onChange={e => setStartDate(e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-cv-sage transition-colors ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'}`}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-zinc-500 mb-1 block">End Date</label>
                            <input 
                              type="date" 
                              value={endDate}
                              onChange={e => setEndDate(e.target.value)}
                              className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-cv-sage transition-colors ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-800'}`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className={`text-sm font-bold uppercase tracking-wider mb-3 block ${isDarkMode ? 'text-zinc-400' : 'text-cv-brown'}`}>Summary Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {SUMMARY_TYPES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedType(t.id)}
                          className={`p-4 rounded-2xl border text-left transition-all ${
                            selectedType === t.id
                              ? 'bg-cv-sage/10 border-cv-sage shadow-sm text-cv-olive'
                              : isDarkMode
                                ? 'bg-zinc-800 border-zinc-700 hover:border-zinc-600 hover:shadow-sm text-zinc-300'
                                : 'bg-white border-zinc-200 hover:border-cv-sage/50 hover:shadow-sm text-zinc-700'
                          }`}
                        >
                          <t.icon className={`w-6 h-6 mb-2 ${selectedType === t.id ? 'text-cv-olive' : 'text-zinc-400'}`} />
                          <h4 className="font-bold">{t.label}</h4>
                          <p className="text-xs text-zinc-500 mt-1">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleGenerate}
                      disabled={generateMutation.isPending || (status && !status.available)}
                      className="w-full bg-cv-brown hover:bg-[#8A715C] disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                      {generateMutation.isPending ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Analyzing Notes...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Generate Summary
                        </>
                      )}
                    </button>
                    {generateMutation.isError && (
                      <p className="text-red-500 text-sm mt-3 text-center">
                        {(generateMutation.error as any).response?.data?.error || 'Failed to generate summary.'}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {isLoadingSaved ? (
                    <div className="animate-pulse space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`h-40 rounded-2xl border ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-100'}`} />
                      ))}
                    </div>
                  ) : savedSummaries?.length === 0 ? (
                    <div className="text-center py-20 text-zinc-400">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No saved summaries yet.</p>
                      <button 
                        onClick={() => setActiveTab('generate')}
                        className="mt-4 text-cv-sage font-medium hover:underline"
                      >
                        Generate your first summary
                      </button>
                    </div>
                  ) : (
                    savedSummaries?.map((summary: AISummary) => (
                      <AISummaryCard key={summary._id} summary={summary} isDarkMode={isDarkMode} />
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search as SearchIcon, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getClipboardItems } from '../api/clipboard';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  // Simple debounce logic could go here, but React Query can handle rapid refetches well enough for a demo
  
  const { data: results, isLoading } = useQuery({
    queryKey: ['clipboardItems', { searchQuery: query }],
    queryFn: () => getClipboardItems({ searchQuery: query }),
    enabled: query.trim().length > 0 && isOpen,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/20 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="relative border-b border-zinc-100 flex items-center px-4">
            <SearchIcon className="w-5 h-5 text-zinc-400" />
            <input 
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across all notebooks..."
              className="w-full py-4 pl-3 pr-10 text-lg outline-none bg-transparent"
            />
            <button onClick={onClose} className="absolute right-4 p-1 rounded-md hover:bg-zinc-100">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {query.trim().length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                Type something to search...
              </div>
            ) : isLoading ? (
              <div className="p-8 text-center text-zinc-400">Searching...</div>
            ) : results && results.length > 0 ? (
              <div className="space-y-1">
                {results.map((item) => (
                  <div 
                    key={item._id} 
                    className="p-3 hover:bg-zinc-50 rounded-xl cursor-pointer transition-colors group"
                    onClick={() => {
                      const notebookId = typeof item.notebookId === 'object' && item.notebookId !== null ? (item.notebookId as any)._id : item.notebookId;
                      if (notebookId) {
                        navigate(`/notebooks/${notebookId}?date=${item.createdAt}`);
                        onClose();
                      }
                    }}
                  >
                    <p className="text-sm text-zinc-700 line-clamp-2 font-mono group-hover:text-cv-olive">
                      {item.text
                        .replace(/<[^>]*>?/gm, '')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{item.source || 'Unknown'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-400">No results found for "{query}"</div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

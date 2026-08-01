import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Archive, Star } from 'lucide-react';
import { getNotebooks } from '../../api/notebooks';
import EditNotebookModal from '../../components/EditNotebookModal';
import type { Notebook } from '@clipvault/shared';

export default function NotebooksList() {
  const navigate = useNavigate();
  const { openNewNotebook, isDarkMode } = useOutletContext<{ openNewNotebook: () => void, isDarkMode: boolean }>();
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);

  const { data: notebooks, isLoading } = useQuery({
    queryKey: ['notebooks'],
    queryFn: getNotebooks,
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pt-6 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-cv-brown">Notebooks</h1>
        <button
          onClick={openNewNotebook}
          className="flex items-center gap-2 px-4 py-2 bg-cv-sage text-white rounded-xl shadow-sm hover:bg-cv-olive transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">New Notebook</span>
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-zinc-500 py-10">Loading notebooks...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {notebooks?.map((notebook, i) => (
            <motion.div
              key={notebook._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/notebooks/${notebook._id}`)}
              className={`relative rounded-r-2xl rounded-l-md shadow-md hover:shadow-xl cursor-pointer hover:-translate-y-1.5 transition-all duration-300 overflow-hidden group h-[220px] flex flex-col border ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-100'}`}
            >
              {/* Notebook Spine */}
              <div 
                className={`absolute left-0 top-0 bottom-0 w-8 z-10 flex flex-col justify-evenly items-center py-4 ${isDarkMode ? 'shadow-[inset_-3px_0_6px_rgba(0,0,0,0.4)]' : 'shadow-[inset_-3px_0_6px_rgba(0,0,0,0.1)]'}`}
                style={{ backgroundColor: notebook.color || '#A8C3A0' }}
              >
                {/* Spiral binding rings */}
                {[...Array(6)].map((_, idx) => (
                  <div key={idx} className={`w-5 h-1.5 rounded-full shadow-sm border ${isDarkMode ? 'bg-white/50 border-black/20' : 'bg-white/70 border-black/5'}`} />
                ))}
              </div>

              {/* Right Side Subtle Color Tint */}
              <div 
                className={`absolute inset-0 pointer-events-none rounded-r-2xl z-0 transition-opacity duration-500 ${isDarkMode ? 'opacity-[0.35] group-hover:opacity-[0.5]' : 'opacity-25 group-hover:opacity-40'}`}
                style={{
                  background: `linear-gradient(to right, transparent 20%, ${notebook.color || '#A8C3A0'})`
                }}
              />

              {/* Premium Matte Texture Overlay */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.4] mix-blend-overlay z-0"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
              />
              
              {/* Subtle Top Inner Shadow for depth */}
              <div className="absolute inset-0 pointer-events-none rounded-r-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] z-0" />

              {/* Card Content */}
              <div className="relative z-10 pl-12 pr-5 py-5 flex-1 flex flex-col h-full">
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm border group-hover:scale-110 transition-transform duration-300 ${isDarkMode ? 'bg-zinc-700 border-zinc-600' : 'bg-zinc-50 border-zinc-100'}`}
                  >
                    {notebook.icon}
                  </div>
                  {!notebook.isDefault && (
                    <button 
                      className={`p-1.5 rounded-lg transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 ${isDarkMode ? 'hover:bg-white/10 text-zinc-500 hover:text-zinc-300' : 'hover:bg-black/5 text-zinc-400 hover:text-zinc-600'}`} 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingNotebook(notebook);
                      }}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <h3 className={`text-lg font-bold mb-4 flex-1 flex items-start gap-2 transition-colors ${isDarkMode ? 'text-white group-hover:text-cv-sage' : 'text-zinc-800 group-hover:text-cv-brown'}`}>
                  {notebook.name}
                  {notebook.isDefault && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${isDarkMode ? 'bg-cv-sage/20 text-cv-sage' : 'bg-cv-brown/10 text-cv-brown'}`}>PRIMARY</span>
                  )}
                </h3>

                <div className={`flex items-center justify-end text-xs font-semibold pt-3 border-t ${isDarkMode ? 'text-zinc-400 border-zinc-700' : 'text-zinc-400 border-zinc-100'}`}>
                  <div className="flex gap-2">
                    {notebook.isFavorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-sm" />}
                    {notebook.isArchived && <Archive className="w-4 h-4 text-zinc-300" />}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <EditNotebookModal
        isOpen={!!editingNotebook}
        onClose={() => setEditingNotebook(null)}
        notebook={editingNotebook}
      />
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { createNotebook } from '../api/notebooks';
import { useQueryClient } from '@tanstack/react-query';

interface NewNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLORS = [
  // Greens & Teals
  '#A8C3A0', // cv-sage
  '#A3B18A', // muted matcha
  '#7E9D76', // cv-olive
  '#B7B7A4', // pale olive
  '#8FB5B1', // teal
  '#E2F0CB', // soft mint

  // Blues & Purples
  '#E0F4FF', // lightest blue
  '#CDE8E5', // light aqua
  '#C1D3FE', // baby blue
  '#A3C4F3', // pastel blue
  '#B5E2FA', // soft cyan
  '#9BADC8', // soft blue
  '#798795', // slate blue
  '#B8A2C8', // soft purple
  '#D8B4E2', // light lilac
  '#6D6875', // muted plum

  // Pinks & Reds
  '#FFDFDF', // lightest red
  '#FFCAD4', // light rose
  '#F3C6D1', // soft blush
  '#FFCBD1', // powder pink
  '#EAC2C2', // rose
  '#EBD4CB', // soft mauve
  '#E5989B', // soft coral
  '#B5838D', // dusty rose
  '#C98A8A', // muted red
  
  // Peaches, Browns & Yellows
  '#FFD3B6', // light peach
  '#E6B8A2', // soft pink/orange
  '#A88B73', // cv-brown
  '#E8CDA6', // mustard yellow
  '#F4E285', // pale lemon

  // Neutrals
  '#5D5D5D', // charcoal
];

const ICONS = [
  '📓', '📚', '📝', '💭', '💡', '🚀', '⭐', '🔥', '📌', '🎯',
  '✨', '🎨', '🎵', '🎬', '🎮', '💻', '🧠', '⚡', '🌿', '💎',
  '💼', '🛠️', '📅', '📊', '📈', '💰', '✈️', '🌍', '🏡', '🔐'
];

export default function NewNotebookModal({ isOpen, onClose }: NewNotebookModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#A8C3A0');
  const [icon, setIcon] = useState('📓');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    setIsSubmitting(true);
    try {
      await createNotebook({ name, description, color, icon });
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      onClose();
      setName('');
      setDescription('');
      setColor('#A8C3A0');
      setIcon('📓');
    } catch (err) {
      console.error('Failed to create notebook', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-cv-brown">New Notebook</h2>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-zinc-100">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
              <input 
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-zinc-200 rounded-lg outline-none focus:border-cv-sage focus:ring-1 focus:ring-cv-sage"
                placeholder="e.g. Code Snippets"
                required
              />
            </div>
            

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full shadow-sm transition-transform ${color === c ? 'scale-110 ring-2 ring-offset-2 ring-cv-sage' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Icon</label>
              <div className="flex flex-wrap gap-2 h-32 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
                {ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={`w-10 h-10 flex items-center justify-center text-xl rounded-xl transition-colors ${icon === i ? 'bg-cv-sage/20 border-cv-sage' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'} border`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-zinc-500 font-medium hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSubmitting || !name}
                className="px-4 py-2 bg-cv-sage text-white font-medium rounded-lg hover:bg-cv-olive transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Notebook'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

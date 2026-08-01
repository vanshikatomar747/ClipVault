import { useState, useRef, useEffect } from 'react';
import type { ClipboardItem } from '@clipvault/shared';
import { Clock, MoreHorizontal, Check, Copy, Trash2, Edit3, Star, Pin } from 'lucide-react';
import { updateClipboardItem, deleteClipboardItem } from '../api/clipboard';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

interface ClipCardProps {
  item: ClipboardItem;
}

export default function ClipCard({ item }: ClipCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const [showMenu, setShowMenu] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveEdit = async () => {
    if (text !== item.text) {
      await updateClipboardItem(item._id, { text });
      queryClient.invalidateQueries({ queryKey: ['clipboardItems'] });
    }
    setIsEditing(false);
  };

  const handleToggleState = async (field: 'isFavorite' | 'isPinned') => {
    await updateClipboardItem(item._id, { [field]: !item[field] });
    queryClient.invalidateQueries({ queryKey: ['clipboardItems'] });
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this clip?')) {
      await deleteClipboardItem(item._id);
      queryClient.invalidateQueries({ queryKey: ['clipboardItems'] });
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group relative">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-cv-olive">
          <Clock className="w-3.5 h-3.5" />
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          <span className="mx-1">•</span>
          <span className="bg-zinc-100 px-2 py-0.5 rounded text-zinc-600">{item.source || 'Unknown'}</span>
          <div className="flex gap-1 ml-2">
            {item.isFavorite && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
            {item.isPinned && <Pin className="w-3.5 h-3.5 text-cv-sage fill-cv-sage" />}
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className={`p-1.5 rounded-lg transition-colors ${showMenu ? 'bg-cv-sage/10 text-cv-sage' : 'text-zinc-400 hover:text-cv-sage hover:bg-cv-sage/10 opacity-0 group-hover:opacity-100'}`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-zinc-100 py-2 z-10"
              >
                <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-zinc-400" /> Edit Text
                </button>
                <button onClick={handleCopy} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2">
                  {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-zinc-400" />} 
                  {isCopied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
                <button onClick={() => { handleToggleState('isFavorite'); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2">
                  <Star className={`w-4 h-4 ${item.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-400'}`} /> 
                  {item.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
                </button>
                <button onClick={() => { handleToggleState('isPinned'); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2">
                  <Pin className={`w-4 h-4 ${item.isPinned ? 'text-cv-sage fill-cv-sage' : 'text-zinc-400'}`} /> 
                  {item.isPinned ? 'Unpin' : 'Pin to Top'}
                </button>
                <hr className="my-1 border-zinc-100" />
                <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-mono outline-none focus:border-cv-sage focus:ring-1 focus:ring-cv-sage resize-none min-h-[100px]"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => { setIsEditing(false); setText(item.text); }}
              className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveEdit}
              className="px-3 py-1.5 text-xs font-medium text-white bg-cv-sage hover:bg-cv-olive rounded-lg"
            >
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        <p className="text-zinc-700 whitespace-pre-wrap font-mono text-sm break-words">
          {item.text}
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-4 text-xs text-zinc-400">
        <span>{item.characterCount} chars</span>
        <span>{item.wordCount} words</span>
      </div>
    </div>
  );
}

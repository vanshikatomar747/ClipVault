import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderOpen } from 'lucide-react';
import { getNotebooks } from '../api/notebooks';
import { updateClipboardItem } from '../api/clipboard';

interface MoveNotebookDropdownProps {
  itemIds: string[];
  currentNotebookId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export default function MoveNotebookDropdown({ itemIds, currentNotebookId, onSuccess, trigger }: MoveNotebookDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const queryClient = useQueryClient();

  const { data: notebooks } = useQuery({
    queryKey: ['notebooks'],
    queryFn: getNotebooks,
  });

  const handleMove = async (notebookId: string) => {
    try {
      for (const id of itemIds) {
        await updateClipboardItem(id, { notebookId });
      }
      queryClient.invalidateQueries({ queryKey: ['clipboardItems'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      if (onSuccess) onSuccess();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      
      if (spaceBelow < 250) {
        setPosition({
          bottom: windowHeight - rect.top + 8,
          left: rect.right - 192, // w-48 = 192px
        });
      } else {
        setPosition({
          top: rect.bottom + window.scrollY + 8, // 8px spacing
          left: rect.right - 192,
        });
      }
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => setIsOpen(false);
      window.addEventListener('scroll', handleScroll, true);
      const handleResize = () => setIsOpen(false);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  return (
    <>
      <button 
        ref={buttonRef}
        onClick={toggleOpen}
        className={trigger ? "" : `p-1.5 rounded-xl transition-all focus:outline-none ${
          isOpen 
            ? 'bg-cv-sage/15 text-cv-olive dark:bg-zinc-800 dark:text-cv-sage' 
            : 'text-zinc-400 hover:bg-cv-sage/10 hover:text-cv-olive dark:hover:bg-zinc-800 dark:hover:text-cv-sage'
        }`}
        title="Move to another notebook"
      >
        {trigger || <FolderOpen className="w-3.5 h-3.5" />}
      </button>

      {isOpen && createPortal(
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          />
          <div 
            className="absolute w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700 z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={position.bottom !== undefined 
              ? { bottom: position.bottom, left: position.left } 
              : { top: position.top, left: position.left }
            }
          >
            <div className="px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-900/50">
              Move to...
            </div>
            <div className="max-h-48 overflow-y-auto">
              {notebooks?.map((notebook: any) => (
                <button
                  key={notebook._id}
                  onClick={(e) => { e.stopPropagation(); handleMove(notebook._id); }}
                  disabled={notebook._id === currentNotebookId}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300 transition-colors
                    ${notebook._id === currentNotebookId ? 'opacity-40 cursor-not-allowed font-medium text-zinc-400 dark:text-zinc-500' : ''}
                  `}
                >
                  <span className="text-lg">{notebook.icon}</span>
                  <span className="truncate">{notebook.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

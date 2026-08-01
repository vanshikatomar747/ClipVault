import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation, useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getClipboardItems, updateClipboardItem, deleteClipboardItem, createClipboardItem } from '../../api/clipboard';
import { Bold, Italic, Strikethrough, Highlighter, ArrowLeft, Sparkles, Music, CalendarDays, Plus, Trash2, FolderOpen } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import MoveNotebookDropdown from '../../components/MoveNotebookDropdown';
import AISummaryDrawer from '../../components/ai/AISummaryDrawer';
import TTSDrawer from '../../components/tts/TTSDrawer';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Extension } from '@tiptap/core';
const CustomUndoRedo = Extension.create({
  name: 'customUndoRedo',
  addKeyboardShortcuts() {
    return {
      'Ctrl-z': () => this.editor.commands.undo(),
      'Ctrl-y': () => this.editor.commands.redo(),
      'Ctrl-Shift-z': () => this.editor.commands.redo(),
    };
  },
});

function ClipEditor({ 
  item, 
  isSelected,
  onToggleSelect,
  onSelectionChange 
}: { 
  item: any; 
  isSelected: boolean;
  onToggleSelect: () => void;
  onSelectionChange: (text: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef({ html: item.text, plainText: item.text });

  // Save content on unmount if there is a pending timeout
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        const { html, plainText } = latestContentRef.current;
        if (plainText.trim() === '') {
          deleteClipboardItem(item._id).catch(console.error);
        } else if (html !== item.text) {
          updateClipboardItem(item._id, { text: html }).catch(console.error);
        }
      }
    };
  }, [item._id, item.text]);

  const saveContent = async (html: string, plainText: string) => {
    // If the text was completely cleared, delete the item
    if (plainText.trim() === '') {
      try {
        await deleteClipboardItem(item._id);
        queryClient.invalidateQueries({ queryKey: ['clipboardItems'] });
      } catch (e) {
        console.error(e);
      }
      return;
    }

    if (html !== item.text) {
      try {
        await updateClipboardItem(item._id, { text: html });
        queryClient.invalidateQueries({ queryKey: ['clipboardItems'] });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      CustomUndoRedo,
    ],
    content: item.text,
    onUpdate: ({ editor }) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      const html = editor.getHTML();
      const plainText = editor.getText().trim();
      latestContentRef.current = { html, plainText };
      saveTimeoutRef.current = setTimeout(() => {
        saveContent(html, plainText);
      }, 1000);
    },
    onBlur: ({ editor }) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      const html = editor.getHTML();
      const plainText = editor.getText().trim();
      latestContentRef.current = { html, plainText };
      saveContent(html, plainText);
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, ' ').trim();
      onSelectionChange(text || null);
    },
    editorProps: {
      attributes: {
        class: 'w-full resize-none bg-transparent outline-none font-medium text-inherit focus:outline-none min-h-[2rem] pr-10',
      },
    },
  });

  // Watch for external content updates (e.g. if updated via sync/socket)
  useEffect(() => {
    if (editor && !editor.isFocused && item.text !== editor.getHTML()) {
      editor.commands.setContent(item.text);
      latestContentRef.current = { html: item.text, plainText: item.text };
    }
  }, [item.text, editor]);

  const handleDelete = async () => {
    try {
      await deleteClipboardItem(item._id);
      queryClient.invalidateQueries({ queryKey: ['clipboardItems'] });
    } catch (e) {
      console.error(e);
    }
  };



  return (
    <div className={`relative group/clip py-0 flex transition-all -mx-4 px-4 rounded-xl
      ${isSelected ? 'bg-cv-sage/5 dark:bg-cv-sage/10' : ''}
    `}>
      {/* Selection checkbox column */}
      <div className="absolute -left-16 top-2 select-none z-10">
        <button
          onClick={onToggleSelect}
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all focus:outline-none
            ${isSelected 
              ? 'border-cv-sage bg-cv-sage text-white' 
              : 'border-zinc-300 dark:border-zinc-700 hover:border-cv-sage'
            }
          `}
        >
          {isSelected && (
            <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
              <path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Main Content column */}
      <div className="flex-1 min-w-0 relative">
        <div className="relative pr-12">
          {editor && (
            <>
              <BubbleMenu editor={editor} className="bg-white dark:bg-zinc-800 shadow-lg border border-zinc-100 dark:border-zinc-700 rounded-lg p-1 flex gap-1 items-center z-50 animate-in fade-in-50 duration-200">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${editor.isActive('bold') ? 'bg-zinc-100 dark:bg-zinc-700 text-cv-brown dark:text-cv-sage' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${editor.isActive('italic') ? 'bg-zinc-100 dark:bg-zinc-700 text-cv-brown dark:text-cv-sage' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${editor.isActive('strike') ? 'bg-zinc-100 dark:bg-zinc-700 text-cv-brown dark:text-cv-sage' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                  <Strikethrough className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHighlight().run()}
                  className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${editor.isActive('highlight') ? 'bg-zinc-100 dark:bg-zinc-700 text-cv-olive dark:text-cv-sage' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                  <Highlighter className="w-4 h-4" />
                </button>


              </BubbleMenu>
              <EditorContent editor={editor} />
            </>
          )}
        </div>

        {/* Floating Actions on Hover/Focus (Right Side) */}
        <div className="absolute right-0 top-0 opacity-0 group-hover/clip:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1.5 select-none z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-xl pl-1 py-0.5">
          <MoveNotebookDropdown itemIds={[item._id]} currentNotebookId={item.notebookId} />
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all text-zinc-400 focus:outline-none"
            title="Delete Clip"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
      </div>
    </div>
  </div>
  );
}

function UnifiedDailyNote({ 
  items, 
  notebookId,
  date,
  onSelectionChange
}: { 
  items: any[], 
  notebookId: string,
  date: Date,
  onSelectionChange: (text: string | null) => void
}) {
  const queryClient = useQueryClient();
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const sortedItems = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Reset selection on date/notebook change
  useEffect(() => {
    setSelectedClipIds([]);
  }, [notebookId, date]);

  const handleAddClip = async () => {
    try {
      const now = new Date();
      let createdAtDate = date;
      if (isSameDay(now, date)) {
        createdAtDate = now;
      }
      
      await createClipboardItem({
        text: '<p></p>',
        notebookId: notebookId,
        source: 'Manual Entry',
        createdAt: createdAtDate.toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['clipboardItems'] });
    } catch (e) {
      console.error('Failed to create new clipboard item', e);
    }
  };

  const handleToggleSelect = (clipId: string) => {
    setSelectedClipIds(prev => 
      prev.includes(clipId) 
        ? prev.filter(id => id !== clipId) 
        : [...prev, clipId]
    );
  };



  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedClipIds.length} clips?`)) return;
    try {
      for (const id of selectedClipIds) {
        await deleteClipboardItem(id);
      }
      setSelectedClipIds([]);
      queryClient.invalidateQueries({ queryKey: ['clipboardItems', notebookId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkMoveSuccess = () => {
    setSelectedClipIds([]);
  };

  return (
    <div className="flex flex-col min-h-full">
      {sortedItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center select-none">
          <p className="text-zinc-400 dark:text-zinc-500 font-medium mb-4">No clips saved for this day.</p>
          <button
            onClick={handleAddClip}
            className="px-4 py-2 bg-cv-sage hover:bg-cv-olive text-white rounded-xl shadow transition-colors font-bold text-sm flex items-center gap-1.5 focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            Create First Clip
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          {sortedItems.map(item => (
            <ClipEditor 
              key={item._id}
              item={item}
              isSelected={selectedClipIds.includes(item._id)}
              onToggleSelect={() => handleToggleSelect(item._id)}
              onSelectionChange={onSelectionChange}
            />
          ))}
        </div>
      )}

      {/* Floating bulk actions toolbar */}
      {selectedClipIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 sm:gap-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-xs sm:text-sm font-bold text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
            {selectedClipIds.length} selected
          </span>
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800"></div>
          <div className="flex items-center gap-1 sm:gap-2">

            <MoveNotebookDropdown 
              itemIds={selectedClipIds} 
              currentNotebookId={notebookId}
              onSuccess={handleBulkMoveSuccess}
              trigger={
                <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-cv-olive font-bold text-xs sm:text-sm transition-colors cursor-pointer select-none">
                  <FolderOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Move</span>
                </span>
              }
            />

            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-red-500/10 text-red-500 font-bold text-xs sm:text-sm transition-colors focus:outline-none"
              title="Delete selected clips"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800"></div>
          <button
            onClick={() => setSelectedClipIds([])}
            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 text-xs font-bold transition-colors focus:outline-none whitespace-nowrap"
          >
            Deselect
          </button>
        </div>
      )}
    </div>
  );
}

export default function NotebookDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { isDarkMode, setActiveNotebookId, socket } = useOutletContext<{ 
    isDarkMode: boolean; 
    setActiveNotebookId: (id: string) => void; 
    socket: any; 
  }>();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSummaryDrawerOpen, setIsSummaryDrawerOpen] = useState(false);
  const [isTTSDrawerOpen, setIsTTSDrawerOpen] = useState(false);
  const [selectedSummaryText, setSelectedSummaryText] = useState<string | null>(null);
  const [selectedListenText, setSelectedListenText] = useState<string | null>(null);
  const [editorSelectedText, setEditorSelectedText] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (id) {
      setActiveNotebookId(id);
    }
  }, [id, setActiveNotebookId]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!isNaN(parsedDate.getTime())) {
        setSelectedDate(parsedDate);
      }
    }
  }, [location.search]);

  const handleOpenSummaryDrawer = (text?: string) => {
    setSelectedSummaryText(text || null);
    setIsSummaryDrawerOpen(true);
  };

  const handleListenText = (text: string) => {
    setSelectedListenText(text);
    setIsTTSDrawerOpen(true);
  };

  useEffect(() => {
    if (!socket) return;

    const handleNewClip = (data: any) => {
      // If the new clip belongs to the currently viewed notebook, jump to today
      if (data.notebookId === id) {
        setSelectedDate(new Date());
        queryClient.invalidateQueries({ queryKey: ['clipboardItems', id] });
      }
    };

    socket.on('new_clipboard_item', handleNewClip);

    return () => {
      socket.off('new_clipboard_item', handleNewClip);
    };
  }, [socket, id, queryClient]);

  const { data: items, isLoading } = useQuery({
    queryKey: ['clipboardItems', id],
    queryFn: () => getClipboardItems({ notebookId: id }),
  });

  // Filter items by selected date
  const filteredItems = items?.filter(item => 
    isSameDay(new Date(item.createdAt), selectedDate)
  ) || [];

  const tileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view === 'month') {
      const hasNotes = items?.some(item => isSameDay(new Date(item.createdAt), date));
      if (hasNotes) {
        return <div className="w-1.5 h-1.5 bg-cv-olive rounded-full mx-auto mt-1" />;
      }
    }
    return null;
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 h-full min-h-0 px-4 sm:px-6 lg:px-8 pt-6 pb-6">
      {/* Main Content: Clips for selected date */}
      <div className={`flex-1 flex flex-col h-full min-h-0 rounded-2xl shadow-soft overflow-hidden border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-100 text-zinc-800'}`}>
        <div className={`border-b p-4 sm:p-6 pb-3 sm:pb-4 flex items-center justify-between gap-2 sm:gap-4 transition-colors ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-cv-cream border-zinc-200'}`}>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/notebooks" className="p-2 -ml-2 rounded-xl text-zinc-400 hover:text-cv-brown hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-cv-sage focus:ring-offset-1">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h2 className={`text-xl sm:text-2xl font-bold mb-0 flex items-center gap-2 sm:gap-3 transition-colors ${isDarkMode ? 'text-zinc-100' : 'text-cv-brown'}`}>
              <img src="/favicon.svg" alt="ClipVault Logo" className="w-8 h-8 hidden sm:block" />
              <span>{format(selectedDate, 'dd MMM yyyy')}</span>
            </h2>
          </div>
          
          {/* Quick Actions in Header for Mobile */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setIsCalendarOpen(true)}
              className={`p-2.5 rounded-xl transition-colors focus:outline-none ${isDarkMode ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-cv-sage/10 text-cv-olive hover:bg-cv-sage/20'}`}
              title="Select Date"
            >
              <CalendarDays className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleOpenSummaryDrawer(editorSelectedText || undefined)}
              className={`p-2.5 rounded-xl transition-colors focus:outline-none ${isDarkMode ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-cv-sage/10 text-cv-olive hover:bg-cv-sage/20'}`}
              title="AI Summarize"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                if (editorSelectedText) {
                  handleListenText(editorSelectedText);
                } else {
                  setIsTTSDrawerOpen(true);
                }
              }}
              className={`p-2.5 rounded-xl transition-colors focus:outline-none ${isDarkMode ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-cv-sage/10 text-cv-olive hover:bg-cv-sage/20'}`}
              title="Text to Speech"
            >
              <Music className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar transition-colors ${isDarkMode ? 'notebook-paper-dark' : 'notebook-paper'}`}>
          {isLoading ? (
            <p className="text-zinc-500 py-10">Loading notes...</p>
          ) : (
            <div className="flex flex-col min-h-full pb-10 lg:pb-32">
              <UnifiedDailyNote 
                key={selectedDate.toISOString()} 
                items={filteredItems} 
                notebookId={id!} 
                date={selectedDate}
                onSelectionChange={setEditorSelectedText}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sidebar: Calendar & Stats (Desktop Only) */}
      <div className="hidden lg:flex w-full lg:w-80 flex-col gap-6 shrink-0 pb-10 lg:pb-0">
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleOpenSummaryDrawer(editorSelectedText || undefined)}
            className="w-full bg-gradient-to-r from-cv-sage to-cv-olive text-white shadow-md hover:shadow-lg transition-all rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-bold text-base"
          >
            <Sparkles className="w-5 h-5" />
            AI Summarize
          </button>
          
          <button
            onClick={() => {
              if (editorSelectedText) {
                handleListenText(editorSelectedText);
              } else {
                setIsTTSDrawerOpen(true);
              }
            }}
            className="w-full bg-gradient-to-r from-cv-sage to-cv-olive text-white shadow-md hover:shadow-lg transition-all rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-bold text-base"
          >
            <Music className="w-5 h-5" />
            Text to Speech
          </button>
        </div>

        <div className={`rounded-2xl shadow-soft p-6 transition-colors ${isDarkMode ? 'bg-zinc-800 text-zinc-100' : 'bg-cv-cream text-cv-brown'}`}>
          <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-zinc-100' : 'text-cv-brown'}`}>Calendar</h3>
          {/* Calendar styles are overridden in global CSS to match theme if needed, for now defaults work */}
          <div className="react-calendar-wrapper">
            <Calendar 
              onChange={(value) => setSelectedDate(value as Date)} 
              value={selectedDate} 
              tileContent={tileContent}
              className="border-none w-full rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Floating Calendar Modal for Mobile */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl shadow-soft p-6 relative border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-cv-cream border-zinc-200 text-cv-brown'}`}>
            <button 
              onClick={() => setIsCalendarOpen(false)}
              className={`absolute top-4 right-4 text-xl font-bold focus:outline-none transition-colors ${isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-cv-brown'}`}
            >
              ✕
            </button>
            <h3 className={`text-lg font-bold mb-4 transition-colors ${isDarkMode ? 'text-zinc-100' : 'text-cv-brown'}`}>Select Date</h3>
            <div className="react-calendar-wrapper">
              <Calendar 
                onChange={(value) => {
                  setSelectedDate(value as Date);
                  setIsCalendarOpen(false);
                }} 
                value={selectedDate} 
                tileContent={tileContent}
                className="border-none w-full rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      <AISummaryDrawer 
        isOpen={isSummaryDrawerOpen} 
        onClose={() => setIsSummaryDrawerOpen(false)} 
        notebookId={id!} 
        selectedText={selectedSummaryText}
        isDarkMode={isDarkMode}
      />
      
      <TTSDrawer 
        isOpen={isTTSDrawerOpen} 
        onClose={() => { setIsTTSDrawerOpen(false); setSelectedListenText(null); }} 
        notebookId={id!}
        selectedText={selectedListenText}
        selectedDate={selectedDate}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

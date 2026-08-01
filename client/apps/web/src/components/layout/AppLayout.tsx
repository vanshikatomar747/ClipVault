import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';
import { App } from '@capacitor/app';

import {
  LayoutDashboard,
  Book,
  Settings,
  LogOut,
  Search,
  Moon,
  Sun,
  CalendarDays,
  ChevronDown,
  Menu,
  X,
  ClipboardCheck
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotebooks } from '../../api/notebooks';
import { createClipboardItem } from '../../api/clipboard';
import { updatePreferences } from '../../api/auth';
import { useSocket } from '../../hooks/useSocket';
import SearchModal from '../SearchModal';
import NewNotebookModal from '../NewNotebookModal';
import PullToRefresh from './PullToRefresh';

const stripHtml = (html: string) => {
  if (typeof window === 'undefined') return html;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  } catch (e) {
    return html;
  }
};

const getSnippet = (text: string) => {
  const plain = stripHtml(text).trim();
  if (plain.length > 40) {
    return plain.slice(0, 40) + '...';
  }
  return plain;
};

export default function AppLayout() {
  const { user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const isDarkMode = user?.themePreference === 'dark';
  const clipboardActive = user?.clipboardTogglePreference ?? true;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewNotebookOpen, setIsNewNotebookOpen] = useState(false);
  const [isNbDropdownOpen, setIsNbDropdownOpen] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSavedClip, setLastSavedClip] = useState<string | null>(null);
  const nbDropdownRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const { data: notebooks } = useQuery({
    queryKey: ['notebooks'],
    queryFn: getNotebooks,
  });

  const queryClient = useQueryClient();
  
  const [activeNotebookId, setActiveNotebookIdState] = useState(() => {
    return localStorage.getItem('clipvault_active_notebook') || user?.defaultNotebookId || '';
  });

  const lastCopiedTextRef = useRef('');
  const isProcessingRef = useRef(false);

  const setClipboardActive = useCallback(async (val: boolean) => {
    if (val) {
      // Do nothing extra, just start monitoring
    } else if (notebooks) {
      // Revert to default notebook when monitoring is stopped
      const defaultNb = notebooks.find(n => n.isDefault) || notebooks[0];
      if (defaultNb) {
        setActiveNotebookIdState(defaultNb._id);
        localStorage.removeItem('clipvault_active_notebook');
      }
    }
    
    updateUser({ clipboardTogglePreference: val });
    
    try {
      await updatePreferences({ clipboardTogglePreference: val });
    } catch (e) {
      console.error('Failed to sync preferences', e);
    }
    
    // Sync state to Electron app if running in Electron
    // @ts-ignore - electronAPI is injected via preload script
    if (window.electronAPI?.setMonitoringState) {
      // @ts-ignore
      window.electronAPI.setMonitoringState(val);
    }
  }, [notebooks, updateUser]);

  const setActiveNotebookId = useCallback((val: string) => {
    setActiveNotebookIdState(val);
    localStorage.setItem('clipvault_active_notebook', val);
  }, []);

  useEffect(() => {
    if (!activeNotebookId && notebooks && notebooks.length > 0) {
      const defaultNb = notebooks.find(n => n.isDefault) || notebooks[0];
      setActiveNotebookIdState(defaultNb._id);
    }
  }, [notebooks, activeNotebookId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let appStateListener: any = null;
    let isFirstCheck = true; // Baseline initialization check

    const checkClipboard = async () => {
      if (!clipboardActive || !activeNotebookId) return;
      if (isProcessingRef.current) return;
      
      isProcessingRef.current = true;
      try {
        let text = '';
        if (Capacitor.isNativePlatform()) {
          try {
            const nativeResult = await Clipboard.read();
            text = nativeResult.value || '';
          } catch (e: any) {
            // Log as a warning since an empty clipboard or temporary focus loss throws an exception on native platforms
            console.warn('Failed to read native clipboard:', e.message || e);
          }
        } else {
          // Web platform requires active document focus to read clipboard
          if (document.hasFocus()) {
            try {
              text = await navigator.clipboard.readText();
              // Clear any browser permission errors on successful read
              setSyncError(null);
            } catch (e: any) {
              // Log as a warning since browsers restrict background clipboard read access without user gesture
              console.warn('Failed to read web clipboard:', e.message || e);
              if (e.name === 'NotAllowedError') {
                setSyncError('Browser clipboard permission denied. Please allow clipboard access in your browser settings.');
              }
            }
          } else {
            // If the document does not have focus, exit early and wait for focus/next tick
            return;
          }
        }

        // Initialize the baseline on first successful read after starting/resuming monitoring
        if (isFirstCheck) {
          isFirstCheck = false;
          lastCopiedTextRef.current = text;
          return;
        }

        if (text && text !== lastCopiedTextRef.current) {
          let contentToSave = text;
          if (!Capacitor.isNativePlatform()) {
            try {
              const items = await navigator.clipboard.read();
              for (const clipboardItem of items) {
                if (clipboardItem.types.includes('text/html')) {
                  const blob = await clipboardItem.getType('text/html');
                  const html = await blob.text();
                  if (html) {
                    contentToSave = html;
                  }
                }
              }
            } catch (e) {
              // Silently fallback to plain text if read() fails or is unsupported
            }
          }

          await createClipboardItem({
            text: contentToSave,
            notebookId: activeNotebookId,
          });
          
          // Only update lastCopiedTextRef after a successful save to the backend.
          // This allows recovery/retries if a transient network error happens.
          lastCopiedTextRef.current = text;
          
          setLastSavedClip(contentToSave);
          setSyncError(null); // Clear any errors
          setTimeout(() => setLastSavedClip(null), 3000);
          queryClient.invalidateQueries({ queryKey: ['clipboardItems'] });
        }
      } catch (err: any) {
        console.error('Failed to read or sync clipboard:', err.message || err);
        setSyncError(`API Sync Error: ${err.message || 'Unknown network error'}`);
      } finally {
        isProcessingRef.current = false;
      }
    };

    const triggerBurstCheck = () => {
      checkClipboard();
      setTimeout(checkClipboard, 50);
      setTimeout(checkClipboard, 150);
      setTimeout(checkClipboard, 300);
      setTimeout(checkClipboard, 500);
      setTimeout(checkClipboard, 1000);
    };

    if (clipboardActive) {
      triggerBurstCheck();
      interval = setInterval(checkClipboard, 500);
      window.addEventListener('focus', triggerBurstCheck);
      document.addEventListener('visibilitychange', triggerBurstCheck);

      if (Capacitor.isNativePlatform()) {
        appStateListener = App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            triggerBurstCheck();
          }
        });
      }
    }

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('focus', triggerBurstCheck);
      document.removeEventListener('visibilitychange', triggerBurstCheck);
      if (appStateListener) {
        if (typeof appStateListener.then === 'function') {
          appStateListener.then((l: any) => l.remove()).catch(() => {});
        } else {
          appStateListener.remove();
        }
      }
    };
  }, [clipboardActive, activeNotebookId, queryClient]);

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F for search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // Ctrl+N or Cmd+N for new notebook
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNewNotebookOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (nbDropdownRef.current && !nbDropdownRef.current.contains(e.target as Node)) {
        setIsNbDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for monitoring state changes from Electron Tray menu
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    // @ts-ignore
    if (window.electronAPI?.onMonitoringStateChanged) {
      // @ts-ignore
      unsubscribe = window.electronAPI.onMonitoringStateChanged((newState: boolean) => {
        updateUser({ clipboardTogglePreference: newState });
        updatePreferences({ clipboardTogglePreference: newState }).catch(console.error);
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [updateUser]);

  useEffect(() => {
    if (!socket) return;
    
    const handlePreferencesUpdated = (newPrefs: any) => {
      updateUser(newPrefs);
      // @ts-ignore
      if (window.electronAPI?.setMonitoringState) {
        // @ts-ignore
        window.electronAPI.setMonitoringState(newPrefs.clipboardTogglePreference);
      }
    };

    const handleAccountDeleted = () => {
      logout();
      navigate('/login');
    };

    socket.on('preferences_updated', handlePreferencesUpdated);
    socket.on('account_deleted', handleAccountDeleted);
    return () => {
      socket.off('preferences_updated', handlePreferencesUpdated);
      socket.off('account_deleted', handleAccountDeleted);
    };
  }, [socket, updateUser, logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Notebooks', path: '/notebooks', icon: Book },
    { name: 'To-Dos', path: '/todos', icon: CalendarDays },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${isDarkMode ? 'bg-zinc-900 text-white' : 'bg-cv-beige text-zinc-800'}`}>
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 w-64 flex flex-col transition-transform duration-300 ${isDarkMode ? 'bg-zinc-800' : 'bg-cv-cream'} border-r ${isDarkMode ? 'border-zinc-700' : 'border-zinc-200'} p-4`}>
        <div className="flex items-center justify-between px-3 py-1 mb-8 mt-2 border-b border-zinc-200/10 dark:border-zinc-700/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cv-sage/15 dark:bg-cv-sage/20 border border-cv-sage/30 shadow-sm">
              <img src="/favicon.svg" alt="ClipVault Logo" className="w-5.5 h-5.5 object-contain" />
            </div>
            <span className="text-2xl font-bold tracking-tight flex items-center">
              <span className={isDarkMode ? 'text-white' : 'text-cv-brown'}>Clip</span>
              <span className="text-cv-sage font-serif italic font-semibold ml-0.5">Vault</span>
            </span>
          </div>
          <button 
            className="lg:hidden p-1.5 rounded-xl text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-zinc-700/50 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isActive 
                    ? 'bg-cv-sage text-white shadow-sm' 
                    : `text-cv-olive hover:bg-white/50 ${isDarkMode ? 'hover:bg-white/10' : ''}`
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className={`mt-auto pt-4 border-t ${isDarkMode ? 'border-zinc-700' : 'border-zinc-200'}`}>
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-cv-brown text-white flex items-center justify-center font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-cv-olive truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Topnav */}
        <header className={`h-16 flex items-center justify-between px-4 lg:px-8 transition-colors duration-300 ${isDarkMode ? 'bg-zinc-900' : 'bg-cv-beige'}`}>
          <div className="flex-1 flex items-center gap-3 max-w-xl">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden p-2 -ml-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-white text-zinc-600'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Search Icon Button for Mobile */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className={`lg:hidden p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-white text-zinc-600'}`}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wide Search Bar for Desktop */}
            <div 
              className="hidden lg:block relative cursor-text group flex-1"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-hover:text-cv-sage transition-colors" />
              <div 
                className={`w-full pl-10 pr-4 py-2 rounded-xl border border-transparent flex items-center justify-between shadow-sm cursor-text transition-colors duration-300 ${
                  isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white text-zinc-400 hover:shadow'
                }`}
              >
                <span className="truncate">Search everywhere...</span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded transition-colors duration-300 ${isDarkMode ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>Ctrl F</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 ml-2 lg:ml-4">
            {/* Notebook Selector */}
            {notebooks && notebooks.length > 0 && (
              <div className="relative" ref={nbDropdownRef}>
                <button 
                  onClick={() => setIsNbDropdownOpen(!isNbDropdownOpen)}
                  className={`flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1.5 rounded-xl text-sm font-medium border outline-none transition-all duration-300 shadow-sm hover:shadow-md ${
                    isDarkMode 
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:border-zinc-500' 
                      : 'bg-white text-zinc-700 border-zinc-200 hover:border-cv-sage/50 hover:text-cv-sage'
                  }`}
                >
                  <span className="text-base">{notebooks.find(n => n._id === activeNotebookId)?.icon || notebooks[0].icon}</span>
                  <span className="hidden sm:inline-block truncate max-w-[100px] lg:max-w-[120px]">{notebooks.find(n => n._id === activeNotebookId)?.name || notebooks[0].name}</span>
                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isNbDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isNbDropdownOpen && (
                  <div className={`absolute top-full right-0 mt-2 w-56 rounded-xl shadow-xl border overflow-hidden z-50 transform origin-top-right transition-all duration-200 ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-100'}`}>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5">
                      <div className={`px-2 py-1.5 text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Save copied text to:</div>
                      {notebooks.map(nb => (
                        <button
                          key={nb._id}
                          onClick={() => {
                            setActiveNotebookId(nb._id);
                            setIsNbDropdownOpen(false);
                          }}
                          className={`w-full text-left flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                            activeNotebookId === nb._id
                              ? (isDarkMode ? 'bg-zinc-700 text-white font-medium shadow-inner' : 'bg-cv-sage/15 text-cv-sage font-bold shadow-inner')
                              : (isDarkMode ? 'text-zinc-300 hover:bg-zinc-700/50' : 'text-zinc-600 hover:bg-zinc-50')
                          }`}
                        >
                          <span className="text-lg">{nb.icon}</span>
                          <span className="truncate">{nb.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={() => setClipboardActive(!clipboardActive)}
              className={`px-2 lg:px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5 lg:gap-2 transition-colors ${
                clipboardActive 
                  ? 'bg-cv-sage/20 text-cv-sage' 
                  : isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-500'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${clipboardActive ? 'bg-cv-sage' : (isDarkMode ? 'bg-zinc-500' : 'bg-zinc-400')}`} />
              <span className="hidden sm:inline-block">{clipboardActive ? 'Monitoring' : 'Paused'}</span>
            </button>
            <button 
              onClick={() => updateUser({ themePreference: isDarkMode ? 'light' : 'dark' })}
              className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-white text-zinc-600'}`}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {syncError && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-6 py-3 text-sm border-b border-red-200 dark:border-red-900/50 flex items-center justify-between">
            <span className="truncate font-medium">⚠️ {syncError}</span>
            <button onClick={() => setSyncError(null)} className="ml-2 font-bold hover:underline">Dismiss</button>
          </div>
        )}

        <AnimatePresence>
          {lastSavedClip && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border backdrop-blur-md max-w-xs sm:max-w-sm transition-colors bg-white/80 border-zinc-200 text-zinc-800 dark:bg-zinc-800/80 dark:border-zinc-700 dark:text-white"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-cv-sage/20 text-cv-sage dark:bg-cv-sage/30 dark:text-cv-sage flex-shrink-0">
                <ClipboardCheck className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-cv-olive dark:text-cv-sage">Saved to Clipboard History</p>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 truncate mt-0.5">
                  "{getSnippet(lastSavedClip)}"
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Content */}
        {Capacitor.isNativePlatform() ? (
          <PullToRefresh isDarkMode={isDarkMode}>
            <Outlet context={{ openNewNotebook: () => setIsNewNotebookOpen(true), isDarkMode, setClipboardActive, activeNotebookId, setActiveNotebookId, socket }} />
          </PullToRefresh>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0 w-full custom-scrollbar">
            <Outlet context={{ openNewNotebook: () => setIsNewNotebookOpen(true), isDarkMode, setClipboardActive, activeNotebookId, setActiveNotebookId, socket }} />
          </div>
        )}
      </main>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <NewNotebookModal isOpen={isNewNotebookOpen} onClose={() => setIsNewNotebookOpen(false)} />
    </div>
  );
}

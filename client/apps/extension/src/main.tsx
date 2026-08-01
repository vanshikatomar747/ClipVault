import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ClipboardList, Power } from 'lucide-react';
import './index.css'; // Will create this next

function Popup() {
  const [token, setToken] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(true);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['token', 'isMonitoring'], (result) => {
        setToken(result.token || null);
        if (result.isMonitoring !== undefined) {
          setIsMonitoring(result.isMonitoring);
        }
        
        // Sync with backend to get latest true state
        chrome.runtime.sendMessage({ type: 'SYNC_PREFERENCES' }, (response) => {
          if (response && response.isMonitoring !== undefined) {
            setIsMonitoring(response.isMonitoring);
          }
        });
      });
    }
  }, []);

  const toggleMonitoring = () => {
    const newState = !isMonitoring;
    setIsMonitoring(newState);
    // Notify background to pause/resume and sync with backend
    chrome.runtime.sendMessage({ type: 'TOGGLE_MONITORING', payload: newState });
  };

  return (
    <div className="w-80 h-96 bg-cv-cream flex flex-col font-sans">
      <header className="p-4 bg-cv-beige border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-cv-sage w-8 h-8 rounded-lg flex items-center justify-center">
            <ClipboardList className="text-white w-4 h-4" />
          </div>
          <span className="font-bold text-cv-brown">ClipVault</span>
        </div>
        <button 
          onClick={toggleMonitoring}
          className={`p-2 rounded-lg transition-colors ${isMonitoring ? 'bg-cv-sage/20 text-cv-sage' : 'bg-gray-200 text-gray-500'}`}
          title={isMonitoring ? "Monitoring Active" : "Monitoring Paused"}
        >
          <Power className="w-4 h-4" />
        </button>
      </header>

      <main className="flex-1 p-4 overflow-auto">
        {!token ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <p className="text-cv-olive text-sm mb-4">Please log in to the web app to start syncing.</p>
            <button 
              className="px-4 py-2 bg-cv-sage text-white rounded-xl shadow-sm hover:bg-cv-olive transition-colors text-sm font-medium"
              onClick={() => chrome.tabs.create({ url: 'http://localhost:5173/login' })} // Assuming default Vite port for web
            >
              Open Web App
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-cv-olive uppercase tracking-wider">Recent Clips</h3>
            {/* We would fetch and display recent clips here via background script */}
            <div className="p-3 bg-white rounded-xl shadow-sm text-sm text-slate-700">
              <p className="line-clamp-2 font-mono">Example copied text waiting to be synced...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);

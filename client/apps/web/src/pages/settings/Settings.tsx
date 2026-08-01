import { useState } from 'react';
import { Moon, Sun, Shield, Trash2, Keyboard } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { deleteAccount } from '../../api/auth';
import AIVoices from '../../components/settings/AIVoices';

const ShortcutItem = ({ label, keys, isDarkMode }: { label: string; keys: string[]; isDarkMode: boolean }) => (
  <div className={`flex items-center justify-between p-4 rounded-xl shadow-sm transition-colors ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
    <span className={`font-medium ${isDarkMode ? 'text-zinc-200' : 'text-zinc-700'}`}>{label}</span>
    <div className="flex items-center gap-1.5">
      {keys.map((k, i) => (
        <span key={i} className={`px-2 py-1 text-xs font-mono font-bold rounded-md border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-600 shadow-sm'}`}>
          {k}
        </span>
      ))}
    </div>
  </div>
);

export default function Settings() {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you absolutely sure you want to delete your account? This action is permanent, and ALL your notebooks, clipboard history, todos, and custom voice models will be deleted forever."
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteAccount();
      logout();
      navigate('/login');
    } catch (err) {
      console.error("Failed to delete account", err);
      alert("Failed to delete your account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };
  
  const isDarkMode = user?.themePreference === 'dark';
  const clipboardActive = user?.clipboardTogglePreference ?? true;

  const toggleTheme = () => {
    updateUser({ themePreference: isDarkMode ? 'light' : 'dark' });
    // In a real app, we would also call an API to save this preference
  };

  const { setClipboardActive } = useOutletContext<{ setClipboardActive: (val: boolean) => void }>();

  const toggleClipboard = () => {
    setClipboardActive(!clipboardActive);
    // In a real app, we would also call an API to save this preference
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pt-6 pb-10">
      <h1 className={`text-3xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-cv-brown'}`}>Settings</h1>

      <div className={`rounded-2xl shadow-soft p-8 space-y-8 transition-colors ${isDarkMode ? 'bg-zinc-800' : 'bg-cv-cream'}`}>
        
        {/* Profile Section */}
        <section className="space-y-4">
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
            <Shield className="w-5 h-5 text-cv-sage" />
            Account Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cv-olive mb-1">Name</label>
              <input type="text" disabled value={user?.name || ''} className={`w-full px-3 py-2 border-none rounded-xl cursor-not-allowed transition-colors ${isDarkMode ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-cv-olive mb-1">Email</label>
              <input type="email" disabled value={user?.email || ''} className={`w-full px-3 py-2 border-none rounded-xl cursor-not-allowed transition-colors ${isDarkMode ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`} />
            </div>
          </div>
        </section>

        <hr className={`border transition-colors ${isDarkMode ? 'border-zinc-700' : 'border-zinc-200'}`} />

        {/* Preferences Section */}
        <section className="space-y-6">
          <h2 className={`text-lg font-bold ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>Preferences</h2>
          
          <div className={`flex items-center justify-between p-4 rounded-xl shadow-sm transition-colors ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>Appearance</h3>
              <p className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Choose between light and dark mode</p>
            </div>
            <button 
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}
            >
              {isDarkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
              <span className={`font-medium capitalize ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>{isDarkMode ? 'dark' : 'light'}</span>
            </button>
          </div>

          <div className={`flex items-center justify-between p-4 rounded-xl shadow-sm transition-colors ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>Clipboard Monitoring</h3>
              <p className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Automatically save copied text</p>
            </div>
            <button 
              onClick={toggleClipboard}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                clipboardActive ? 'bg-cv-sage' : (isDarkMode ? 'bg-zinc-600' : 'bg-zinc-300')
              }`}
            >
              <span className="sr-only">Toggle Clipboard</span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  clipboardActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        <hr className={`border transition-colors ${isDarkMode ? 'border-zinc-700' : 'border-zinc-200'}`} />

        {/* Keyboard Shortcuts Section */}
        <section className="space-y-6">
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
            <Keyboard className="w-5 h-5 text-cv-sage" />
            Keyboard Shortcuts
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ShortcutItem label="Search Everywhere" keys={['Ctrl/Cmd', 'F']} isDarkMode={isDarkMode} />
            <ShortcutItem label="New Notebook" keys={['Ctrl/Cmd', 'N']} isDarkMode={isDarkMode} />
            <ShortcutItem label="Undo Notebook Edit" keys={['Ctrl/Cmd', 'Z']} isDarkMode={isDarkMode} />
            <ShortcutItem label="Redo Notebook Edit" keys={['Ctrl/Cmd', 'Y']} isDarkMode={isDarkMode} />
          </div>
        </section>

        <hr className={`border transition-colors ${isDarkMode ? 'border-zinc-700' : 'border-zinc-200'}`} />

        {/* AI Voices Section */}
        <AIVoices isDarkMode={isDarkMode} />

        <hr className={`border transition-colors ${isDarkMode ? 'border-zinc-700' : 'border-zinc-200'}`} />

        {/* Data & Privacy */}
        <section className="space-y-4">
          <h2 className={`text-lg font-bold ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>Data & Privacy</h2>
          <div className="flex gap-4">
            <button 
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-650 hover:bg-red-100'} ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Account'}</span>
            </button>
          </div>
        </section>

      </div>
    </div>

  );
}

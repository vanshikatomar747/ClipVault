import { app, BrowserWindow, Tray, Menu, globalShortcut, clipboard, ipcMain } from 'electron';
import * as path from 'path';
import axios from 'axios';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let lastCopiedText = '';
let authToken: string | null = null;
let isQuitting = false;
let isMonitoring = true;

const API_URL = 'http://localhost:4000/api';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // For dev, load the web app's Vite dev server
  mainWindow.loadURL('http://localhost:5173');

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function updateTrayMenu() {
  if (!tray) return;
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow?.show() },
    { label: 'Pause Monitoring', type: 'checkbox', id: 'pause-monitoring', checked: !isMonitoring, click: (i) => {
      isMonitoring = !i.checked;
      if (mainWindow) {
        mainWindow.webContents.send('monitoring-state-changed', isMonitoring);
      }
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => {
      isQuitting = true;
      app.quit();
    }}
  ]);
  tray.setContextMenu(contextMenu);
}

function createTray() {
  // In a real app, provide an actual icon file. 
  // For now, an empty native image works on some OS, or just standard path.
  tray = new Tray(path.join(__dirname, '..', 'icon.png')); // Ensure you add a dummy icon later
  tray.setToolTip('ClipVault');
  updateTrayMenu();
}

function startClipboardPolling() {
  setInterval(() => {
    if (!isMonitoring || !authToken) return;

    const text = clipboard.readText();
    if (text && text !== lastCopiedText && text.trim().length > 0) {
      lastCopiedText = text;
      
      // Sync to server
      axios.post(`${API_URL}/clipboard-items`, 
        { text, source: 'Desktop' }, 
        { headers: { Authorization: `Bearer ${authToken}` } }
      ).then(res => {
        console.log('Successfully synced desktop clipboard:', res.data);
      }).catch(err => {
        console.error('Failed to sync desktop clipboard:', err.message);
      });
    }
  }, 500); // Poll every 500ms
}

app.whenReady().then(() => {
  createWindow();
  
  // Need a dummy icon file to not crash `Tray`, let's just bypass tray if file missing in production,
  // but for now let's wrap it in try/catch just in case.
  try {
    createTray();
  } catch (e) {
    console.warn('Tray icon missing, skipping tray creation');
  }

  // Register Global Shortcut
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  startClipboardPolling();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// IPC Communication with Web App
ipcMain.on('set-auth-token', (event, token) => {
  authToken = token;
});

ipcMain.on('set-monitoring-state', (event, state: boolean) => {
  isMonitoring = state;
  updateTrayMenu();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});



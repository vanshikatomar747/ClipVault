// Background service worker
let isMonitoring = true;
let authToken: string | null = null;
const API_URL = 'http://localhost:4000/api';

// Initialize
chrome.storage.local.get(['token', 'isMonitoring'], (result) => {
  authToken = result.token || null;
  if (result.isMonitoring !== undefined) {
    isMonitoring = result.isMonitoring;
  }
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TOGGLE_MONITORING') {
    isMonitoring = message.payload;
    chrome.storage.local.set({ isMonitoring });
    
    // Sync with backend
    if (authToken) {
      fetch(`${API_URL}/auth/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ clipboardTogglePreference: isMonitoring })
      }).catch(console.error);
    }
    
    sendResponse({ success: true });
  } 
  else if (message.type === 'SYNC_PREFERENCES') {
    if (!authToken) {
      sendResponse({ success: false, isMonitoring });
      return true;
    }
    
    fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data && typeof data.clipboardTogglePreference === 'boolean') {
        isMonitoring = data.clipboardTogglePreference;
        chrome.storage.local.set({ isMonitoring });
      }
      sendResponse({ success: true, isMonitoring });
    })
    .catch(err => {
      console.error('Failed to sync preferences:', err);
      sendResponse({ success: false, isMonitoring });
    });
    
    return true; // Keep message channel open for async response
  } 
  
  else if (message.type === 'NEW_CLIPBOARD_TEXT') {
    if (!isMonitoring || !authToken) {
      sendResponse({ success: false, reason: 'Monitoring paused or not authenticated' });
      return true;
    }

    // Send to backend
    fetch(`${API_URL}/clipboard-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        text: message.payload.text,
        source: message.payload.source
      })
    })
    .then(res => res.json())
    .then(data => {
      console.log('Successfully synced:', data);
      sendResponse({ success: true, data });
    })
    .catch(err => {
      console.error('Failed to sync:', err);
      sendResponse({ success: false, error: err.toString() });
    });

    return true; // Keep message channel open for async response
  }
  
  else if (message.type === 'SET_AUTH_TOKEN') {
    authToken = message.payload;
    chrome.storage.local.set({ token: authToken });
    sendResponse({ success: true });
  }
});

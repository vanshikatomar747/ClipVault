// Content script injected into all pages

let lastCopiedText = '';

document.addEventListener('copy', () => {
  // Give the browser a tiny delay to update the clipboard
  setTimeout(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text !== lastCopiedText) {
        lastCopiedText = text;
        
        // Send to background script
        chrome.runtime.sendMessage({
          type: 'NEW_CLIPBOARD_TEXT',
          payload: {
            text,
            source: window.location.hostname
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
             console.log("Error communicating with ClipVault background script", chrome.runtime.lastError);
          } else {
             console.log("ClipVault sync response:", response);
          }
        });
      }
    } catch (err) {
      // In some contexts, navigator.clipboard.readText() might be blocked without active permission
      // Fallback: get selection
      const selection = window.getSelection()?.toString();
      if (selection && selection !== lastCopiedText) {
        lastCopiedText = selection;
        chrome.runtime.sendMessage({
          type: 'NEW_CLIPBOARD_TEXT',
          payload: {
            text: selection,
            source: window.location.hostname
          }
        });
      }
    }
  }, 100);
});

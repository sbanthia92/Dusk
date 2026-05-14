chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message?.action === 'getState') {
        const domain: string = message.domain;
        const result = await chrome.storage.sync.get([domain]);
        sendResponse({ enabled: result[domain] ?? false });
      } else if (message?.action === 'setState') {
        const domain: string = message.domain;
        const enabled: boolean = message.enabled;

        await chrome.storage.sync.set({ [domain]: enabled });

        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const tab = tabs[0];
          if (tab?.id != null) {
            try {
              await chrome.tabs.sendMessage(tab.id, { action: 'toggle', enabled });
            } catch {
              // content script may not be ready — fail silently
            }
          }
        } catch (err) {
          console.warn('[Dusk Background] tabs.query error:', err);
        }

        sendResponse({ success: true });
      }
    } catch (err) {
      console.warn('[Dusk Background] message handler error:', err);
      sendResponse({ success: false });
    }
  })();

  return true; // keep channel open for async
});

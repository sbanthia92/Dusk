document.addEventListener('DOMContentLoaded', () => {
  const domainLabel = document.getElementById('domain-label') as HTMLDivElement;
  const unsupportedMsg = document.getElementById('unsupported-message') as HTMLDivElement;
  const toggleWrapper = document.getElementById('toggle-wrapper') as HTMLLabelElement;
  const checkbox = document.getElementById('dark-toggle') as HTMLInputElement;

  const showError = () => {
    domainLabel.textContent = 'Error loading state';
    toggleWrapper.hidden = true;
  };

  (async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) {
        showError();
        return;
      }

      const hostname = new URL(tab.url).hostname.replace(/^www\./, '');

      if (!hostname.endsWith('amazon.com')) {
        toggleWrapper.hidden = true;
        unsupportedMsg.hidden = false;
        return;
      }

      domainLabel.textContent = hostname;

      try {
        const response = await chrome.runtime.sendMessage({ action: 'getState', domain: hostname });
        checkbox.checked = response?.enabled ?? false;
      } catch (err) {
        console.warn('[Dusk Popup] getState error:', err);
        showError();
        return;
      }

      checkbox.addEventListener('change', async () => {
        checkbox.disabled = true;
        try {
          await chrome.runtime.sendMessage({
            action: 'setState',
            domain: hostname,
            enabled: checkbox.checked,
          });
        } catch (err) {
          console.warn('[Dusk Popup] setState error:', err);
          checkbox.checked = !checkbox.checked;
        } finally {
          checkbox.disabled = false;
        }
      });
    } catch (err) {
      console.warn('[Dusk Popup] init error:', err);
      showError();
    }
  })();
});

const DARK_CSS = `
  html {
    filter: invert(1) hue-rotate(180deg) !important;
  }
  img,
  video,
  iframe,
  canvas,
  [style*="background-image"],
  .s-image,
  #landingImage,
  #imgTagWrapperId img {
    filter: invert(1) hue-rotate(180deg) !important;
  }
`;
const STYLE_ID = 'dusk-styles';

let isDarkMode = false;
let observer: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = DARK_CSS;
  const target = document.head ?? document.documentElement;
  target.appendChild(style);
}

function removeStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
}

function connectObserver(): void {
  if (observer) return;
  observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (isDarkMode) injectStyles();
    }, 150);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function disconnectObserver(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  observer?.disconnect();
  observer = null;
}

function init(): void {
  const hostname = window.location.hostname.replace(/^www\./, '');
  try {
    chrome.storage.sync.get([hostname], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('[Dusk Content] storage.get error:', chrome.runtime.lastError.message);
        return;
      }
      if (result[hostname] === true) {
        isDarkMode = true;
        injectStyles();
        connectObserver();
      }
    });
  } catch (err) {
    console.warn('[Dusk Content] init error:', err);
  }
}

if (document.readyState === 'interactive' || document.readyState === 'complete') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  try {
    if (message?.action === 'toggle') {
      if (message.enabled) {
        isDarkMode = true;
        injectStyles();
        connectObserver();
      } else {
        isDarkMode = false;
        removeStyles();
        disconnectObserver();
      }
    }
  } catch (err) {
    console.warn('[Dusk Content] message error:', err);
  }
  sendResponse({});
  return true;
});

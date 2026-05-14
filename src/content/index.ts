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
  #imgTagWrapperId img,
  [data-dusk-preserve] {
    filter: invert(1) hue-rotate(180deg) !important;
  }
`;
const STYLE_ID = 'dusk-styles';
const PRESERVE_ATTR = 'data-dusk-preserve';
// Elements with luminance below this threshold are already dark — counter-invert them so they stay dark
const DARK_THRESHOLD = 0.1;

let isDarkMode = false;
let observer: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function parseRgb(color: string): [number, number, number, number] | null {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), m[4] !== undefined ? parseFloat(m[4]) : 1];
}

function markDarkElements(root: Element = document.documentElement): void {
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const bg = getComputedStyle(el).backgroundColor;
    const parsed = parseRgb(bg);
    if (!parsed) return;
    const [r, g, b, a] = parsed;
    if (a < 0.1) return; // transparent — nothing to preserve
    if (getLuminance(r, g, b) < DARK_THRESHOLD) {
      el.setAttribute(PRESERVE_ATTR, '');
    }
  });
}

function clearDarkMarks(): void {
  document.querySelectorAll(`[${PRESERVE_ATTR}]`).forEach((el) => el.removeAttribute(PRESERVE_ATTR));
}

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
  observer = new MutationObserver((mutations) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!isDarkMode) return;
      injectStyles();
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) markDarkElements(node);
        });
      }
    }, 150);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function disconnectObserver(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  observer?.disconnect();
  observer = null;
}

function enableDarkMode(): void {
  isDarkMode = true;
  injectStyles();
  markDarkElements();
  connectObserver();
}

function disableDarkMode(): void {
  isDarkMode = false;
  removeStyles();
  clearDarkMarks();
  disconnectObserver();
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
        enableDarkMode();
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
        enableDarkMode();
      } else {
        disableDarkMode();
      }
    }
  } catch (err) {
    console.warn('[Dusk Content] message error:', err);
  }
  sendResponse({});
  return true;
});

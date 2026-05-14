const DARK_CSS = `
  /* ── 1. Invert the whole page ── */
  html {
    filter: invert(1) hue-rotate(180deg) !important;
  }

  /* ── 2. Restore media to original colors (double-inversion = identity) ── */
  img,
  video,
  iframe,
  canvas,
  picture,
  [style*="background-image"],
  .s-image,
  #landingImage,
  #imgTagWrapperId img {
    filter: invert(1) hue-rotate(180deg) !important;
  }

  /* ── 3. Amazon's dark nav chrome — counter-invert so it stays dark ── */
  #navbar,
  #nav-belt,
  #nav-main,
  #nav-subnav,
  #leftNav,
  #navFooter,
  .nav-fill,
  .nav-progressive-attribute {
    filter: invert(1) hue-rotate(180deg) !important;
  }

  /*
   * Media inside the dark nav: nav already counter-inverts, so we clear
   * the img rule here. Net path: html(invert) + nav(invert) = original.
   */
  #navbar img,     #navbar video,    #navbar canvas,   #navbar picture,
  #nav-belt img,   #nav-belt video,
  #nav-main img,   #nav-main video,
  #nav-subnav img, #nav-subnav video,
  #leftNav img,    #leftNav video,
  #navFooter img,  #navFooter video,
  .nav-fill img,   .nav-fill video {
    filter: none !important;
  }

  /* ── 4. JS-detected dark sections — counter-invert so they stay dark ── */
  [data-dusk-preserve] {
    filter: invert(1) hue-rotate(180deg) !important;
  }

  /*
   * Media inside a JS-preserved dark section: the section already
   * counter-inverts, so clear the img rule. Net: html(invert) + section(invert) = original.
   */
  [data-dusk-preserve] img,
  [data-dusk-preserve] video,
  [data-dusk-preserve] canvas,
  [data-dusk-preserve] iframe,
  [data-dusk-preserve] picture,
  [data-dusk-preserve] [style*="background-image"] {
    filter: none !important;
  }

  /* ── 5. Flyout dropdowns — add a subtle ring so they stand out from the dark page ── */
  .nav-flyout,
  #nav-flyout-anchor,
  #nav-cart-flyout,
  [id*="nav-flyout"],
  [class*="nav-flyout"] {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12) !important;
  }
`;

const STYLE_ID = 'dusk-styles';
const PRESERVE_ATTR = 'data-dusk-preserve';
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
  // Only scan block-level containers — skip html/body (would cancel all dark mode)
  // and inline/text elements that can't meaningfully have background colors.
  const candidates = root.querySelectorAll<HTMLElement>(
    'div, section, article, aside, header, footer, nav, main, ul, ol, li, form'
  );

  candidates.forEach((el) => {
    if (el === document.documentElement || el === document.body) return;

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
  (document.head ?? document.documentElement).appendChild(style);
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
  // Second pass after 600 ms — catches elements styled by JS after DOMContentLoaded
  setTimeout(() => { if (isDarkMode) markDarkElements(); }, 600);
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

const DARK_CSS = `
  /*
   * Invert the whole page. Using html (not body) is more universal;
   * body-filter can break fixed-position stacking in some Chrome builds.
   */
  html {
    filter: invert(1) hue-rotate(180deg) !important;
  }

  /*
   * Restore media to original colours: two inversions (html + this) cancel out.
   * background-image elements use a class-level selector so also covered by [class].
   */
  img,
  video,
  iframe,
  canvas,
  picture,
  .s-image,
  #landingImage,
  #imgTagWrapperId img {
    filter: invert(1) hue-rotate(180deg) !important;
  }

  /* Inline background-image elements */
  [style*="background-image"] {
    filter: invert(1) hue-rotate(180deg) !important;
  }

  /*
   * Amazon dark nav chrome — counter-invert so it keeps its original dark look.
   * Covers the sticky header, secondary belt, left nav, and footer nav.
   */
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
   * Images/media inside the dark nav get filter:none so they only go through
   * the nav counter-inversion + html inversion = two inversions = original.
   * (Without this they'd be triple-inverted and appear wrong.)
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

  /*
   * Flyout dropdowns sit outside #navbar in the DOM so only get html-inverted
   * to dark; add a subtle ring so they're distinguishable from the dark page.
   */
  .nav-flyout,
  #nav-flyout-anchor,
  #nav-cart-flyout,
  [id*="nav-flyout"],
  [class*="nav-flyout"] {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12) !important;
  }
`;

const STYLE_ID = 'dusk-styles';

let isDarkMode = false;
let observer: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Chrome compositing bug: when html has filter:invert, certain carousel images
// render as opaque black. Force-reloading them from cache fixes the compositor.
function recompositeImages(): void {
  document.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.src) {
      const src = img.src;
      img.src = '';
      img.src = src;
    }
  });
}

function triggerRecomposite(): void {
  // Two passes: immediately for already-rendered images, then again after
  // lazy-loaded images have had time to enter the viewport and fetch.
  recompositeImages();
  setTimeout(recompositeImages, 800);
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
  observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (isDarkMode) injectStyles();
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
  triggerRecomposite();
  connectObserver();
}

function disableDarkMode(): void {
  isDarkMode = false;
  removeStyles();
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

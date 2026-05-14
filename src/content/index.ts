// Dark CSS: invert the page, restore media, preserve Amazon's dark chrome
const DARK_CSS = `
  html {
    filter: invert(1) hue-rotate(180deg) !important;
  }

  /*
   * Media — counter-invert so they render in original colors.
   * Two inversions (html + this rule) = identity.
   */
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

  /*
   * Amazon's dark navigation chrome (#131921 / #232f3e backgrounds).
   * Counter-invert the nav containers so they stay dark.
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
   * Images and media inside the dark nav: the nav already counter-inverts,
   * so drop the img rule here — html + nav = double invert = original colors.
   */
  #navbar img,          #navbar video,   #navbar canvas,   #navbar picture,
  #nav-belt img,        #nav-belt video,
  #nav-main img,        #nav-main video,
  #nav-subnav img,      #nav-subnav video,
  #leftNav img,         #leftNav video,
  #navFooter img,       #navFooter video,
  .nav-fill img,        .nav-fill video {
    filter: none !important;
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

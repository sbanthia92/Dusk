# Dusk – Dark Mode for Amazon

![Build & Lint](https://github.com/sbanthia92/Dusk/actions/workflows/build.yml/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-coming%20soon-lightgrey)

> Elegant dark mode for Amazon. Per-site toggle, zero data collection.

---

## Screenshot

```
[Screenshot coming soon]
```

---

## Features

- **Per-site toggle** — Amazon controlled independently via the popup
- **Persists across sessions** via `chrome.storage.sync`
- **Zero data collection** — nothing leaves your browser
- **Lightweight** — pure CSS injection, no polling, no frameworks
- **Product images preserved** in natural color (double-inversion applied to media elements)

---

## How It Works

Dusk injects a single CSS rule that applies `filter: invert(1) hue-rotate(180deg)` to the entire page, flipping all colors into a dark palette. A second inversion is applied to images, videos, and canvases so they render in their original colors rather than appearing inverted.

A `MutationObserver` watches for dynamically injected content — common on Amazon's infinite-scroll pages — and re-appends the style tag if the page removes it, ensuring dark mode stays on through navigation and lazy-loaded sections.

---

## Dev Setup

1. Clone the repo: `git clone https://github.com/sbanthia92/Dusk.git`
2. Install dependencies: `npm ci`
3. Start the dev build watcher: `npm run dev`
4. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, select the `dist/` folder
5. Navigate to `amazon.com` and click the Dusk icon to toggle

---

## Build for Production

```bash
npm run build
```

Zip the `dist/` folder and upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## Adding a New Site

1. Add the host permission to `manifest.json` under `host_permissions`
2. Add a matching pattern to `content_scripts[].matches` in `manifest.json`
3. No code changes needed — the content script reads the hostname dynamically
4. Test on the new site with the extension loaded unpacked
5. Open a PR with the manifest changes and a brief description

---

## Supported Sites

| Site | Status |
|------|--------|
| amazon.com | ✓ Supported |
| walmart.com | Planned v2 |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b my-feature`
3. Open a pull request against `main`

---

## Privacy

Dusk collects no personal data. The only information stored is your on/off preference per domain, saved locally in `chrome.storage.sync` and never transmitted to any server. See [privacy.html](privacy.html) for the full policy.

---

## License

[MIT](LICENSE)

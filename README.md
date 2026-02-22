# Office Tools

A free, lightweight desktop PDF viewer and editor built with Tauri 2.0. View, fill, sign, and save PDF documents — fully offline, no subscriptions.

## Features

- **View PDFs** — Fast rendering via pdf.js with zoom and page navigation
- **Fill Forms** — Click anywhere to add text on non-fillable PDFs
- **Sign Documents** — Create script-font signatures, save multiple styles
- **Flatten & Save** — Bake annotations into standards-compliant PDF 1.7
- **File Association** — Registers as `.pdf` handler in Windows Explorer
- **Recent Files** — Quick access sidebar with recently opened documents
- **Onboarding** — First-launch wizard to set up signatures and preferences

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Tauri 2.0 (Rust + OS WebView) |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| PDF Viewing | pdfjs-dist |
| PDF Editing | pdf-lib |
| Database | SQLite (via Tauri SQL plugin) |
| Installer | NSIS (Windows .exe) |

## Why Tauri?

- **2-10 MB** installer (vs 80-120 MB for Electron)
- **30-40 MB** RAM usage (vs 200-300 MB)
- **< 0.5s** startup time
- Built-in file associations and native menus

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.77+
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Setup

```bash
git clone https://github.com/opensaas-skeletons/skeleton-office-tools.git
cd skeleton-office-tools
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

The installer will be at `src-tauri/target/release/bundle/nsis/`.

## Signature Fonts

Bundled fonts (Google Fonts, OFL license):
- Dancing Script
- Great Vibes
- Sacramento

Place `.ttf` files in `resources/fonts/` — they're loaded at runtime for signature rendering.

## Roadmap

- [ ] Word document viewer (.docx)
- [ ] Excel spreadsheet viewer (.xlsx)
- [ ] macOS / Linux builds
- [ ] Form field detection
- [ ] Stamp annotations

## License

MIT — see [LICENSE](LICENSE)

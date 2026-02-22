# Architecture

## Overview

Office Tools is a Tauri 2.0 desktop app with a React frontend and minimal Rust backend.

```
┌─────────────────────────────────────┐
│          Windows / macOS            │
│  ┌───────────────────────────────┐  │
│  │        Tauri Shell            │  │
│  │  ┌─────────┐  ┌───────────┐  │  │
│  │  │  Rust   │  │  WebView  │  │  │
│  │  │ Backend │◄─┤  (React)  │  │  │
│  │  │         │  │           │  │  │
│  │  │ • File  │  │ • pdf.js  │  │  │
│  │  │   I/O   │  │ • pdf-lib │  │  │
│  │  │ • SQLite│  │ • UI      │  │  │
│  │  └─────────┘  └───────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Layers

### Rust Backend (`src-tauri/`)
Minimal — only handles operations that require native access:
- **File I/O**: Open/save dialogs, read/write binary files
- **Settings**: App data directory path
- **CLI args**: Detect files passed via "Open With"

SQLite is managed by `tauri-plugin-sql` and accessed directly from the frontend.

### Frontend (`src/`)
All business logic runs in the WebView:
- **pdf.js** renders PDF pages to `<canvas>` elements
- **pdf-lib** flattens annotations into the PDF binary
- **SQLite** (via Tauri SQL plugin) stores recent docs, signatures, annotations
- **React hooks** manage state for document, viewer, signatures, overlays

### Data Flow

```
User clicks "Open" → Tauri dialog → File path
  → invoke("read_file_bytes") → Uint8Array
  → pdf.js loads document → renders pages to canvas
  → User adds text/signature overlays (React state)
  → "Flatten & Save" → pdf-lib embeds overlays into PDF bytes
  → invoke("write_file_bytes") → saved to disk
```

## Database Schema

SQLite database at `{app_data}/officetools.db`:

- `documents` — Recent file history
- `signatures` — Saved signature styles
- `annotations` — Text/signature overlays per document
- `app_settings` — Key-value preferences

## File Association

Configured in `tauri.conf.json` under `bundle.fileAssociations`. The NSIS installer registers `.pdf` files to open with Office Tools. The app reads `std::env::args()` on startup to detect files opened this way.

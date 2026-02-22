# Adding New Tools

Office Tools is designed to support multiple document types. Here's how to add a new viewer/editor (e.g., Word, Excel).

## Steps

### 1. Register the Tool

Add an entry to `src/types/tool.ts`:

```typescript
{
  id: "word",
  name: "Word Viewer",
  description: "View and edit Word documents",
  icon: "📝",
  extensions: ["docx", "doc"],
  available: true, // flip to true when ready
}
```

### 2. Add File Association

In `src-tauri/tauri.conf.json`, add to `bundle.fileAssociations`:

```json
{
  "ext": ["docx", "doc"],
  "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "description": "Word Document",
  "role": "Viewer"
}
```

### 3. Create Components

Create a new directory `src/components/word/` with:
- `WordViewer.tsx` — Main viewer component
- `WordToolbar.tsx` — Tool-specific toolbar

### 4. Add Routing in App.tsx

Update the content area to detect file type and render the appropriate viewer:

```typescript
function getToolForFile(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['docx', 'doc'].includes(ext)) return 'word';
  return 'unknown';
}
```

### 5. Update File Dialog Filter

In `src-tauri/src/commands/documents.rs`, add the new extensions to the file dialog filter.

## Libraries for New Tools

| Tool | Recommended Library |
|------|-------------------|
| Word (.docx) | mammoth.js (view), docx (create) |
| Excel (.xlsx) | SheetJS / xlsx |
| PowerPoint | pptx-parser |

All libraries should run in the WebView (JavaScript) to keep the Rust backend minimal.

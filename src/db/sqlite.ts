import Database from "@tauri-apps/plugin-sql";
import {
  initialize,
  runMigrations,
  TauriSqlAdapter,
  getAdapter,
} from "@skeleton-database/embedded";
import { DB_NAME } from "../constants";

let initPromise: Promise<void> | null = null;

/**
 * Initialize the database: set up the embedded library adapter,
 * run skeleton-database migrations, then create app-specific tables.
 * Uses a shared promise so concurrent callers wait on the same init.
 */
export function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = doInit();
  }
  return initPromise;
}

async function doInit(): Promise<void> {
  const db = await Database.load(DB_NAME);

  initialize(new TauriSqlAdapter(db));
  await runMigrations();
  await runAppMigrations();
}

/**
 * App-specific tables that coexist alongside the skeleton-database schema.
 */
async function runAppMigrations(): Promise<void> {
  const adapter = getAdapter();

  await adapter.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL UNIQUE,
      file_name TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      page_count INTEGER DEFAULT 0,
      last_opened TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await adapter.execute(`
    CREATE TABLE IF NOT EXISTS signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      font_family TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#000000',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await adapter.execute(`
    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      document_path TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text', 'signature')),
      x REAL NOT NULL,
      y REAL NOT NULL,
      width REAL NOT NULL DEFAULT 200,
      height REAL NOT NULL DEFAULT 30,
      text_content TEXT,
      font_size INTEGER,
      color TEXT,
      signature_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (signature_id) REFERENCES signatures(id)
    )
  `);

  await adapter.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

// Helper to ensure DB is initialized before any query
async function db() {
  await initDatabase();
  return getAdapter();
}

// --- Documents ---

export async function addRecentDocument(
  filePath: string,
  fileName: string,
  fileSize: number,
  pageCount: number
): Promise<void> {
  const adapter = await db();
  await adapter.execute(
    `INSERT INTO documents (file_path, file_name, file_size, page_count, last_opened)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(file_path) DO UPDATE SET
       last_opened = datetime('now'),
       file_size = excluded.file_size,
       page_count = excluded.page_count`,
    [filePath, fileName, fileSize, pageCount]
  );
}

export async function getRecentDocuments(limit = 20): Promise<Array<{
  id: number;
  file_path: string;
  file_name: string;
  file_size: number;
  page_count: number;
  last_opened: string;
}>> {
  const adapter = await db();
  return adapter.select(
    "SELECT * FROM documents ORDER BY last_opened DESC LIMIT ?",
    [limit]
  );
}

export async function removeRecentDocument(filePath: string): Promise<void> {
  const adapter = await db();
  await adapter.execute("DELETE FROM documents WHERE file_path = ?", [filePath]);
}

export async function clearRecentDocuments(): Promise<void> {
  const adapter = await db();
  await adapter.execute("DELETE FROM documents");
}

// --- Signatures ---

export async function saveSignature(
  name: string,
  fontFamily: string,
  color: string
): Promise<number> {
  const adapter = await db();
  const result = await adapter.execute(
    "INSERT INTO signatures (name, font_family, color) VALUES (?, ?, ?)",
    [name, fontFamily, color]
  );
  return result.lastInsertId ?? 0;
}

export async function getSignatures(): Promise<Array<{
  id: number;
  name: string;
  font_family: string;
  color: string;
  created_at: string;
}>> {
  const adapter = await db();
  return adapter.select("SELECT * FROM signatures ORDER BY created_at DESC");
}

export async function deleteSignature(id: number): Promise<void> {
  const adapter = await db();
  await adapter.execute("DELETE FROM signatures WHERE id = ?", [id]);
}

// --- Annotations ---

export async function saveAnnotation(annotation: {
  id: string;
  documentPath: string;
  pageNumber: number;
  type: "text" | "signature";
  x: number;
  y: number;
  width: number;
  height: number;
  textContent?: string;
  fontSize?: number;
  color?: string;
  signatureId?: number;
}): Promise<void> {
  const adapter = await db();
  await adapter.execute(
    `INSERT OR REPLACE INTO annotations
     (id, document_path, page_number, type, x, y, width, height, text_content, font_size, color, signature_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      annotation.id,
      annotation.documentPath,
      annotation.pageNumber,
      annotation.type,
      annotation.x,
      annotation.y,
      annotation.width,
      annotation.height,
      annotation.textContent ?? null,
      annotation.fontSize ?? null,
      annotation.color ?? null,
      annotation.signatureId ?? null,
    ]
  );
}

export async function getAnnotationsForDocument(documentPath: string): Promise<Array<{
  id: string;
  document_path: string;
  page_number: number;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text_content: string | null;
  font_size: number | null;
  color: string | null;
  signature_id: number | null;
}>> {
  const adapter = await db();
  return adapter.select(
    "SELECT * FROM annotations WHERE document_path = ? ORDER BY page_number, created_at",
    [documentPath]
  );
}

export async function deleteAnnotation(id: string): Promise<void> {
  const adapter = await db();
  await adapter.execute("DELETE FROM annotations WHERE id = ?", [id]);
}

export async function deleteAnnotationsForDocument(documentPath: string): Promise<void> {
  const adapter = await db();
  await adapter.execute("DELETE FROM annotations WHERE document_path = ?", [documentPath]);
}

// --- Settings ---

export async function getSetting(key: string): Promise<string | null> {
  const adapter = await db();
  const rows: Array<{ value: string }> = await adapter.select(
    "SELECT value FROM app_settings WHERE key = ?",
    [key]
  );
  return rows.length > 0 ? rows[0].value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const adapter = await db();
  await adapter.execute(
    "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
    [key, value]
  );
}

import Database from "@tauri-apps/plugin-sql";
import { DB_NAME } from "../constants";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load(DB_NAME);
    await runMigrations(db);
  }
  return db;
}

async function runMigrations(database: Database): Promise<void> {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL UNIQUE,
      file_name TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      page_count INTEGER DEFAULT 0,
      last_opened TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      font_family TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#000000',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await database.execute(`
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

  await database.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

// --- Documents ---

export async function addRecentDocument(
  filePath: string,
  fileName: string,
  fileSize: number,
  pageCount: number
): Promise<void> {
  const database = await getDb();
  await database.execute(
    `INSERT INTO documents (file_path, file_name, file_size, page_count, last_opened)
     VALUES ($1, $2, $3, $4, datetime('now'))
     ON CONFLICT(file_path) DO UPDATE SET
       last_opened = datetime('now'),
       file_size = $3,
       page_count = $4`,
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
  const database = await getDb();
  return database.select(
    "SELECT * FROM documents ORDER BY last_opened DESC LIMIT $1",
    [limit]
  );
}

export async function removeRecentDocument(filePath: string): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM documents WHERE file_path = $1", [filePath]);
}

// --- Signatures ---

export async function saveSignature(
  name: string,
  fontFamily: string,
  color: string
): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    "INSERT INTO signatures (name, font_family, color) VALUES ($1, $2, $3)",
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
  const database = await getDb();
  return database.select("SELECT * FROM signatures ORDER BY created_at DESC");
}

export async function deleteSignature(id: number): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM signatures WHERE id = $1", [id]);
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
  const database = await getDb();
  await database.execute(
    `INSERT OR REPLACE INTO annotations
     (id, document_path, page_number, type, x, y, width, height, text_content, font_size, color, signature_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
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
  const database = await getDb();
  return database.select(
    "SELECT * FROM annotations WHERE document_path = $1 ORDER BY page_number, created_at",
    [documentPath]
  );
}

export async function deleteAnnotation(id: string): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM annotations WHERE id = $1", [id]);
}

export async function deleteAnnotationsForDocument(documentPath: string): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM annotations WHERE document_path = $1", [documentPath]);
}

// --- Settings ---

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDb();
  const rows: Array<{ value: string }> = await database.select(
    "SELECT value FROM app_settings WHERE key = $1",
    [key]
  );
  return rows.length > 0 ? rows[0].value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    "INSERT OR REPLACE INTO app_settings (key, value) VALUES ($1, $2)",
    [key, value]
  );
}

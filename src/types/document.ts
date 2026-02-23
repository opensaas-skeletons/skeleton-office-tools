export type FileType = "pdf" | "word" | "excel" | "powerpoint" | "unknown";

export interface RecentDocument {
  id: number;
  filePath: string;
  fileName: string;
  fileSize: number;
  lastOpened: string;
  pageCount: number;
}

const EXT_MAP: Record<string, FileType> = {
  ".pdf": "pdf",
  ".docx": "word",
  ".doc": "word",
  ".xlsx": "excel",
  ".xls": "excel",
  ".csv": "excel",
  ".pptx": "powerpoint",
  ".ppt": "powerpoint",
};

export function detectFileType(fileName: string): FileType {
  const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
  return EXT_MAP[ext] ?? "unknown";
}

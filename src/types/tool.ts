export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  extensions: string[];
  available: boolean;
}

export const TOOLS: Tool[] = [
  {
    id: "pdf",
    name: "PDF Viewer",
    description: "View, fill, sign, and edit PDF documents",
    icon: "📄",
    extensions: ["pdf"],
    available: true,
  },
  {
    id: "word",
    name: "Word Viewer",
    description: "View Word documents with full formatting",
    icon: "📝",
    extensions: ["docx", "doc"],
    available: true,
  },
  {
    id: "excel",
    name: "Excel Viewer",
    description: "View and edit spreadsheets",
    icon: "📊",
    extensions: ["xlsx", "xls", "csv"],
    available: false,
  },
  {
    id: "powerpoint",
    name: "PowerPoint Viewer",
    description: "View presentations and slide decks",
    icon: "📽️",
    extensions: ["pptx", "ppt"],
    available: false,
  },
];

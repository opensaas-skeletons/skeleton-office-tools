import type { PdfMode } from "../../types/pdf";
import {
  PDF_MIN_SCALE,
  PDF_MAX_SCALE,
  PDF_SCALE_STEP,
} from "../../constants";

interface PdfToolbarProps {
  currentPage: number;
  pageCount: number;
  scale: number;
  mode: PdfMode;
  onPageChange: (page: number) => void;
  onScaleChange: (scale: number) => void;
  onModeChange: (mode: PdfMode) => void;
  onFlattenClick: () => void;
  annotationCount: number;
}

export default function PdfToolbar({
  currentPage,
  pageCount,
  scale,
  mode,
  onPageChange,
  onScaleChange,
  onModeChange,
  onFlattenClick,
  annotationCount,
}: PdfToolbarProps) {
  const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (!isNaN(val) && val >= 1 && val <= pageCount) {
        onPageChange(val);
      }
    }
  };

  return (
    <div className="flex items-center gap-1 h-10 px-3 bg-white border-b border-slate-200 select-none">
      {/* Page Navigation */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          title="Previous page"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </ToolbarButton>
        <div className="flex items-center gap-1 text-sm text-slate-600">
          <input
            type="text"
            defaultValue={currentPage}
            key={currentPage}
            onKeyDown={handlePageInput}
            className="w-10 h-6 text-center text-sm border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-400"
          />
          <span className="text-slate-400">/</span>
          <span>{pageCount}</span>
        </div>
        <ToolbarButton
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          disabled={currentPage >= pageCount}
          title="Next page"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </ToolbarButton>
      </div>

      <Divider />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => onScaleChange(Math.max(PDF_MIN_SCALE, scale - PDF_SCALE_STEP))}
          disabled={scale <= PDF_MIN_SCALE}
          title="Zoom out"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </ToolbarButton>
        <span className="text-xs text-slate-500 w-12 text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <ToolbarButton
          onClick={() => onScaleChange(Math.min(PDF_MAX_SCALE, scale + PDF_SCALE_STEP))}
          disabled={scale >= PDF_MAX_SCALE}
          title="Zoom in"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </ToolbarButton>
      </div>

      <Divider />

      {/* Mode Buttons */}
      <div className="flex items-center gap-0.5">
        <ModeButton
          active={mode === "view"}
          onClick={() => onModeChange("view")}
          title="View mode"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          </svg>
        </ModeButton>
        <ModeButton
          active={mode === "text"}
          onClick={() => onModeChange("text")}
          title="Add text"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        </ModeButton>
        <ModeButton
          active={mode === "sign"}
          onClick={() => onModeChange("sign")}
          title="Add signature"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </ModeButton>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Flatten & Save */}
      <button
        onClick={onFlattenClick}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40"
        disabled={annotationCount === 0}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        Flatten & Save
        {annotationCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 rounded-full">
            {annotationCount}
          </span>
        )}
      </button>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled = false,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-default transition-colors"
    >
      {children}
    </button>
  );
}

function ModeButton({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? "bg-blue-100 text-blue-600"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-slate-200 mx-1.5" />;
}

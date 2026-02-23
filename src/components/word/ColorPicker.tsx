import { useState, useRef, useEffect } from "react";

interface ColorPickerProps {
  label: string;
  currentColor: string | undefined;
  colors: string[];
  onSelect: (color: string | null) => void;
  icon: React.ReactNode;
  disabled?: boolean;
}

export default function ColorPicker({
  label,
  currentColor,
  colors,
  onSelect,
  icon,
  disabled = false,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        title={label}
        className="flex items-center gap-0.5 p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-default transition-colors"
      >
        <span className="relative">
          {icon}
          {currentColor && (
            <span
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded"
              style={{ backgroundColor: currentColor }}
            />
          )}
        </span>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 w-[168px]">
          <div className="grid grid-cols-8 gap-1 mb-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => {
                  onSelect(color);
                  setOpen(false);
                }}
                title={color}
                className={`w-4 h-4 rounded-sm border transition-transform hover:scale-125 ${
                  currentColor === color ? "border-blue-500 ring-1 ring-blue-300" : "border-slate-300"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <button
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            className="w-full text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded px-2 py-1 transition-colors"
          >
            Remove color
          </button>
        </div>
      )}
    </div>
  );
}

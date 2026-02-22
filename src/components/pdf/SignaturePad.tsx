import { useState } from "react";
import { SIGNATURE_FONTS, SIGNATURE_COLORS } from "../../types/signature";
import Modal from "../common/Modal";

interface SignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, fontFamily: string, color: string) => Promise<void>;
}

export default function SignaturePad({ isOpen, onClose, onSave }: SignaturePadProps) {
  const [name, setName] = useState("");
  const [selectedFont, setSelectedFont] = useState<string>(SIGNATURE_FONTS[0].family);
  const [selectedColor, setSelectedColor] = useState<string>(SIGNATURE_COLORS[0].value);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave(name.trim(), selectedFont, selectedColor);
      setName("");
      setSelectedFont(SIGNATURE_FONTS[0].family);
      setSelectedColor(SIGNATURE_COLORS[0].value);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const fontDef = SIGNATURE_FONTS.find((f) => f.family === selectedFont);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Signature">
      <div className="space-y-5">
        {/* Name input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Smith"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Font selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Style
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SIGNATURE_FONTS.map((font) => (
              <button
                key={font.family}
                onClick={() => setSelectedFont(font.family)}
                className={`p-3 rounded-lg border-2 transition-colors text-center ${
                  selectedFont === font.family
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span
                  className={`${font.className} text-lg block`}
                  style={{ color: selectedColor }}
                >
                  {name || "Preview"}
                </span>
                <span className="text-xs text-slate-500 mt-1 block">
                  {font.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Color
          </label>
          <div className="flex gap-3">
            {SIGNATURE_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedColor === color.value
                    ? "border-blue-500 scale-110"
                    : "border-slate-300 hover:border-slate-400"
                }`}
                style={{ backgroundColor: color.value }}
                aria-label={color.label}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Preview
          </label>
          <div className="bg-white border border-slate-200 rounded-lg p-6 text-center min-h-[80px] flex items-center justify-center">
            {name ? (
              <span
                className={`${fontDef?.className || "font-signature-1"} text-4xl`}
                style={{ color: selectedColor }}
              >
                {name}
              </span>
            ) : (
              <span className="text-slate-300 text-sm">
                Type your name above to preview
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : "Save Signature"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

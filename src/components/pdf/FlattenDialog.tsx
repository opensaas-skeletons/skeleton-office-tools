import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Modal from "../common/Modal";
import type { Annotation } from "../../types/pdf";
import type { Signature } from "../../types/signature";
import { flattenPdf } from "../../services/pdf.service";

/**
 * Write binary data to a file using raw IPC, bypassing JSON serialization.
 * This passes the Uint8Array as a raw request body with the file path in a
 * header, avoiding the ~4x memory overhead of Array.from() + JSON encoding.
 * Prevents OOM crashes for large PDFs (10+ MB).
 */
async function writeFileRaw(path: string, data: Uint8Array): Promise<void> {
  await invoke("write_file_bytes_raw", data, {
    headers: { "X-File-Path": path },
  });
}

interface FlattenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBytes: Uint8Array | null;
  annotations: Annotation[];
  signatures: Signature[];
  currentFilePath: string | null;
  onSaveComplete: () => void;
}

export default function FlattenDialog({
  isOpen,
  onClose,
  pdfBytes,
  annotations,
  signatures,
  currentFilePath,
  onSaveComplete,
}: FlattenDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [flatten, setFlatten] = useState(true);

  const handleSave = async () => {
    if (!pdfBytes) return;

    setIsSaving(true);
    try {
      let saveBytes: Uint8Array;

      if (flatten && annotations.length > 0) {
        setProgress("Flattening annotations...");
        saveBytes = await flattenPdf(pdfBytes, annotations, signatures);
      } else {
        saveBytes = pdfBytes;
      }

      setProgress("Choosing save location...");
      const defaultName = currentFilePath?.split(/[\\/]/).pop()?.replace(/\.pdf$/i, "") ?? "document";
      const savePath: string | null = await invoke("save_file_dialog", {
        defaultName: defaultName + "_edited.pdf",
      });
      if (!savePath) {
        setIsSaving(false);
        setProgress("");
        return;
      }

      const targetPath = savePath.endsWith(".pdf") ? savePath : savePath + ".pdf";

      setProgress("Saving file...");
      // Use raw IPC to pass Uint8Array directly, avoiding JSON serialization
      // of the entire byte array which causes ~4x memory overhead and OOM on
      // large files. See write_file_bytes_raw in documents.rs.
      await writeFileRaw(targetPath, saveBytes);

      setProgress("Done!");
      setTimeout(() => {
        onSaveComplete();
        onClose();
        setProgress("");
        setIsSaving(false);
      }, 500);
    } catch (err) {
      console.error("Save failed:", err);
      setProgress("Error: " + String(err));
      setIsSaving(false);
    }
  };

  const annotationCount = annotations.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save PDF">
      <div className="space-y-4">
        {/* Summary */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                {currentFilePath?.split(/[\\/]/).pop() || "document.pdf"}
              </p>
              <p className="text-xs text-slate-500">
                {annotationCount} annotation{annotationCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Flatten option */}
        {annotationCount > 0 && (
          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={flatten}
              onChange={(e) => setFlatten(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-700">
                Flatten annotations into PDF
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Embeds text and signatures directly into the PDF. The file will
                look the same in Adobe, Edge, Chrome, and all standard viewers.
              </p>
            </div>
          </label>
        )}

        {/* Progress */}
        {progress && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            {isSaving && !progress.startsWith("Done") && !progress.startsWith("Error") && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            <span className={progress.startsWith("Error") ? "text-red-500" : ""}>
              {progress}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !pdfBytes}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : "Save As..."}
          </button>
        </div>
      </div>
    </Modal>
  );
}

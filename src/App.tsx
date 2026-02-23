import { useState, useEffect, useCallback } from "react";
import { getSetting } from "./db/sqlite";
import { useDocument } from "./hooks/useDocument";
import { usePdfViewer } from "./hooks/usePdfViewer";
import { useWordEditor } from "./hooks/useWordEditor";
import { useSignatures } from "./hooks/useSignatures";
import { useUpdater } from "./hooks/useUpdater";
import { useOverlays } from "./hooks/useOverlays";
import { ToastProvider, useToast } from "./components/common/Toast";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import ToolSelector from "./components/layout/ToolSelector";
import PdfToolbar from "./components/pdf/PdfToolbar";
import PdfViewer from "./components/pdf/PdfViewer";
import FlattenDialog from "./components/pdf/FlattenDialog";
import SignaturePad from "./components/pdf/SignaturePad";
import WordEditorToolbar from "./components/word/WordEditorToolbar";
import WordEditor from "./components/word/WordEditor";
import PlaceholderViewer from "./components/common/PlaceholderViewer";
import UpdateBanner from "./components/common/UpdateBanner";
import FileDropZone from "./components/common/FileDropZone";
import Walkthrough from "./components/onboarding/Walkthrough";
import { createBlankWordDocument } from "./utils/newDocument";
import { docxToHtml } from "./utils/docxImport";
import { htmlToDocx } from "./utils/docxExport";
import { invoke } from "@tauri-apps/api/core";
import "./styles/docx.css";

function AppContent() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showFlattenDialog, setShowFlattenDialog] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [pageDimensions, setPageDimensions] = useState<
    Array<{ width: number; height: number }>
  >([]);

  const { showToast } = useToast();
  const updater = useUpdater();
  const {
    document: currentDoc,
    recentDocuments,
    openFile,
    openFilePath,
    openNew,
    updateDocumentPath,
    closeFile,
    clearRecents,
    fileSizeWarning,
  } = useDocument();
  const {
    pdfDoc,
    pageCount,
    currentPage,
    scale,
    renderPage,
    goToPage,
    setScale,
    loadDocument: loadPdf,
  } = usePdfViewer();
  const {
    editor: wordEditor,
    isReady: wordEditorReady,
    loadHtmlContent: loadWordHtml,
  } = useWordEditor();
  const { signatures, addSignature } = useSignatures();
  const {
    annotations,
    mode,
    setMode,
    addTextAnnotation,
    addSignatureAnnotation,
    updateAnnotation,
    removeAnnotation,
    selectedId,
    setSelectedId,
    newAnnotationId,
    clearNewAnnotationId,
    loadAnnotations,
    saveAllAnnotations,
  } = useOverlays();

  // Check onboarding status
  useEffect(() => {
    getSetting("onboarding_complete").then((val) => {
      setOnboardingComplete(val === "true");
    });
  }, []);

  // Show file size warning
  useEffect(() => {
    if (fileSizeWarning) {
      showToast("info", fileSizeWarning);
    }
  }, [fileSizeWarning, showToast]);

  // Load document when file bytes change — route by file type
  useEffect(() => {
    if (!currentDoc.fileBytes) return;

    if (currentDoc.fileType === "pdf") {
      loadPdf(currentDoc.fileBytes)
        .then(async (numPages) => {
          const dims: Array<{ width: number; height: number }> = [];
          for (let i = 0; i < numPages; i++) {
            dims.push({ width: 612, height: 792 });
          }
          setPageDimensions(dims);

          if (currentDoc.filePath) {
            await loadAnnotations(currentDoc.filePath);
          }
        })
        .catch((err: unknown) => {
          console.error("Failed to load PDF document:", err);

          if (err instanceof Error && err.name === "PasswordException") {
            showToast("error", "This PDF is password-protected and cannot be opened");
            closeFile();
            return;
          }

          if (err instanceof Error && err.name === "InvalidPDFException") {
            showToast("error", "This file is not a valid PDF or is corrupted");
            closeFile();
            return;
          }

          showToast("error", "Failed to load PDF document");
          closeFile();
        });
    } else if (currentDoc.fileType === "word") {
      docxToHtml(currentDoc.fileBytes)
        .then((html) => {
          loadWordHtml(html);
        })
        .catch((err: unknown) => {
          console.error("Failed to load Word document:", err);
          showToast("error", "Failed to load Word document");
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable callbacks; re-run on file change
  }, [currentDoc.fileBytes, currentDoc.fileType]);

  // Get actual page dimensions from pdf.js
  useEffect(() => {
    if (!pdfDoc || pageCount === 0) return;

    const getDims = async () => {
      const dims: Array<{ width: number; height: number }> = [];
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        dims.push({ width: viewport.width, height: viewport.height });
      }
      setPageDimensions(dims);
    };
    getDims();
  }, [pdfDoc, pageCount]);

  const handlePageClick = useCallback(
    (pageNumber: number, x: number, y: number) => {
      if (mode === "text") {
        addTextAnnotation(pageNumber, x, y);
      } else if (mode === "sign") {
        if (signatures.length === 0) {
          setShowSignaturePad(true);
          showToast("info", "Create a signature first");
          return;
        }
        addSignatureAnnotation(pageNumber, x, y, signatures[0].id);
      }
    },
    [mode, signatures, addTextAnnotation, addSignatureAnnotation, showToast]
  );

  const handleSaveComplete = useCallback(() => {
    showToast("success", "PDF saved successfully");
  }, [showToast]);

  const handleAddSignature = useCallback(
    async (name: string, fontFamily: string, color: string) => {
      await addSignature(name, fontFamily, color);
      showToast("success", "Signature saved");
    },
    [addSignature, showToast]
  );

  const handleCloseFile = useCallback(() => {
    closeFile();
    setPageDimensions([]);
    setMode("view");
    setSelectedId(null);
  }, [closeFile, setMode, setSelectedId]);

  const handleSaveFile = useCallback(async () => {
    if (currentDoc.fileType === "pdf" && currentDoc.fileBytes && currentDoc.filePath) {
      await saveAllAnnotations(currentDoc.filePath);
      showToast("success", "Annotations saved");
    } else if (currentDoc.fileType === "word" && wordEditor) {
      try {
        const html = wordEditor.getHTML();
        const docxBytes = await htmlToDocx(html);
        let savePath = currentDoc.filePath;
        if (!savePath) {
          const selected: string | null = await invoke("save_file_dialog", {
            defaultName: currentDoc.fileName || "Untitled.docx",
          });
          if (!selected) return;
          savePath = selected;
        }
        await invoke("write_file_bytes", { path: savePath, data: Array.from(docxBytes) });
        // Update document state so the header title reflects the saved name
        // and subsequent Ctrl+S saves silently to the same path.
        if (savePath !== currentDoc.filePath) {
          const savedFileName = savePath.split(/[\\/]/).pop() || "Untitled.docx";
          updateDocumentPath(savePath, savedFileName);
        }
        showToast("success", "Word document saved");
      } catch (err) {
        console.error("Failed to save Word document:", err);
        showToast("error", "Failed to save Word document");
      }
    }
  }, [currentDoc.fileType, currentDoc.fileBytes, currentDoc.filePath, currentDoc.fileName, wordEditor, saveAllAnnotations, updateDocumentPath, showToast]);

  const handleNewWordDocument = useCallback(async () => {
    try {
      const bytes = await createBlankWordDocument();
      openNew(bytes, "Untitled.docx", "word");
    } catch (err) {
      console.error("Failed to create Word document:", err);
      showToast("error", "Failed to create Word document");
    }
  }, [openNew, showToast]);

  const handleInsertImage = useCallback(async () => {
    if (!wordEditor) return;
    try {
      const selected: string | null = await invoke("open_file_dialog");
      if (!selected) return;
      const bytes: number[] = await invoke("read_file_bytes", { path: selected });
      const uint8 = new Uint8Array(bytes);
      const ext = selected.split(".").pop()?.toLowerCase() || "png";
      const mimeMap: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", bmp: "image/bmp", webp: "image/webp" };
      const mime = mimeMap[ext] || "image/png";
      let binary = "";
      for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
      const base64 = btoa(binary);
      wordEditor.chain().focus().setImage({ src: `data:${mime};base64,${base64}` }).run();
    } catch (err) {
      console.error("Failed to insert image:", err);
      showToast("error", "Failed to insert image");
    }
  }, [wordEditor, showToast]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "o":
            e.preventDefault();
            openFile();
            break;
          case "s":
            e.preventDefault();
            handleSaveFile();
            break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openFile, handleSaveFile]);

  // Loading state
  if (onboardingComplete === null) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  // Onboarding
  if (!onboardingComplete) {
    return (
      <Walkthrough
        onComplete={() => setOnboardingComplete(true)}
        onSaveSignature={handleAddSignature}
      />
    );
  }

  const hasDocument = currentDoc.fileBytes !== null;

  const renderDocumentViewer = () => {
    switch (currentDoc.fileType) {
      case "pdf":
        return (
          <>
            <PdfToolbar
              currentPage={currentPage}
              pageCount={pageCount}
              scale={scale}
              mode={mode}
              onPageChange={goToPage}
              onScaleChange={setScale}
              onModeChange={setMode}
              onFlattenClick={() => setShowFlattenDialog(true)}
              onCreateSignature={() => setShowSignaturePad(true)}
              annotationCount={annotations.length}
              signatureCount={signatures.length}
            />
            <PdfViewer
              pageCount={pageCount}
              currentPage={currentPage}
              scale={scale}
              mode={mode}
              annotations={annotations}
              signatures={signatures}
              selectedAnnotationId={selectedId}
              newAnnotationId={newAnnotationId}
              pageDimensions={pageDimensions}
              renderPage={renderPage}
              onSelectAnnotation={(id) => setSelectedId(id)}
              onUpdateAnnotation={updateAnnotation}
              onDeleteAnnotation={removeAnnotation}
              onPageClick={handlePageClick}
              onNewAnnotationHandled={clearNewAnnotationId}
            />
          </>
        );
      case "word":
        return (
          <>
            <WordEditorToolbar
              editor={wordEditor}
              fileName={currentDoc.fileName}
              onInsertImage={handleInsertImage}
              onPrint={handlePrint}
            />
            <WordEditor
              editor={wordEditor}
              isReady={wordEditorReady}
            />
          </>
        );
      case "excel":
        return (
          <PlaceholderViewer
            icon="📊"
            title="Excel Viewer"
            description="Spreadsheet viewing and editing is coming in a future update."
            fileName={currentDoc.fileName}
          />
        );
      case "powerpoint":
        return (
          <PlaceholderViewer
            icon="📽️"
            title="PowerPoint Viewer"
            description="Presentation viewing is coming in a future update."
            fileName={currentDoc.fileName}
          />
        );
      default:
        return (
          <PlaceholderViewer
            icon="📄"
            title="Unsupported Format"
            description="This file type is not yet supported."
            fileName={currentDoc.fileName}
          />
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Header
        fileName={currentDoc.fileName}
        onOpenFile={openFile}
        onNewWordDocument={handleNewWordDocument}
        onSaveFile={handleSaveFile}
        onCloseFile={handleCloseFile}
        hasDocument={hasDocument}
        onCheckForUpdates={updater.checkForUpdate}
      />

      <UpdateBanner
        status={updater.status}
        progress={updater.progress}
        version={updater.version}
        error={updater.error}
        onDownload={updater.downloadAndInstall}
        onRestart={updater.restartApp}
        onDismiss={updater.dismiss}
        onRetry={updater.checkForUpdate}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          recentDocuments={recentDocuments}
          onOpenRecent={openFilePath}
          onClearRecents={clearRecents}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {hasDocument ? renderDocumentViewer() : (
            <ToolSelector
              recentDocuments={recentDocuments}
              onOpenFile={openFile}
              onOpenRecent={openFilePath}
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <FlattenDialog
        isOpen={showFlattenDialog}
        onClose={() => setShowFlattenDialog(false)}
        pdfBytes={currentDoc.fileBytes}
        annotations={annotations}
        signatures={signatures}
        currentFilePath={currentDoc.filePath}
        onSaveComplete={handleSaveComplete}
      />

      <SignaturePad
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleAddSignature}
      />

      {/* Drag & drop */}
      <FileDropZone onFileDrop={openFilePath} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

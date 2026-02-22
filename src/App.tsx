import { useState, useEffect, useCallback } from "react";
import { getSetting } from "./db/sqlite";
import { useDocument } from "./hooks/useDocument";
import { usePdfViewer } from "./hooks/usePdfViewer";
import { useSignatures } from "./hooks/useSignatures";
import { useOverlays } from "./hooks/useOverlays";
import { ToastProvider, useToast } from "./components/common/Toast";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import ToolSelector from "./components/layout/ToolSelector";
import PdfToolbar from "./components/pdf/PdfToolbar";
import PdfViewer from "./components/pdf/PdfViewer";
import FlattenDialog from "./components/pdf/FlattenDialog";
import SignaturePad from "./components/pdf/SignaturePad";
import FileDropZone from "./components/common/FileDropZone";
import Walkthrough from "./components/onboarding/Walkthrough";

function AppContent() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showFlattenDialog, setShowFlattenDialog] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [pageDimensions, setPageDimensions] = useState<
    Array<{ width: number; height: number }>
  >([]);

  const { showToast } = useToast();
  const {
    document: currentDoc,
    recentDocuments,
    openFile,
    openFilePath,
    closeFile,
    clearRecents,
  } = useDocument();
  const {
    pdfDoc,
    pageCount,
    currentPage,
    scale,
    renderPage,
    goToPage,
    setScale,
    loadDocument,
  } = usePdfViewer();
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
    loadAnnotations,
    saveAllAnnotations,
  } = useOverlays();

  // Check onboarding status
  useEffect(() => {
    getSetting("onboarding_complete").then((val) => {
      setOnboardingComplete(val === "true");
    });
  }, []);

  // Load PDF when file bytes change
  useEffect(() => {
    if (currentDoc.fileBytes) {
      loadDocument(currentDoc.fileBytes)
        .then(async (numPages) => {
          // Get page dimensions
          const dims: Array<{ width: number; height: number }> = [];
          // We get dimensions from the first render pass
          // For now use standard letter size, the actual size is set by the canvas
          for (let i = 0; i < numPages; i++) {
            dims.push({ width: 612, height: 792 });
          }
          setPageDimensions(dims);

          // Load saved annotations for this document
          if (currentDoc.filePath) {
            await loadAnnotations(currentDoc.filePath);
          }
        })
        .catch((err) => {
          console.error("Failed to load PDF document:", err);
          showToast("error", "Failed to load PDF document");
        });
    }
  }, [currentDoc.fileBytes]);

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
    if (currentDoc.fileBytes && currentDoc.filePath) {
      // Save annotations to SQLite
      await saveAllAnnotations(currentDoc.filePath);
      showToast("success", "Annotations saved");
    }
  }, [currentDoc.fileBytes, currentDoc.filePath, saveAllAnnotations, showToast]);

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

  return (
    <div className="h-full flex flex-col">
      <Header
        fileName={currentDoc.fileName}
        onOpenFile={openFile}
        onSaveFile={handleSaveFile}
        onCloseFile={handleCloseFile}
        hasDocument={hasDocument}
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
          {hasDocument ? (
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
                annotationCount={annotations.length}
              />
              <PdfViewer
                pageCount={pageCount}
                currentPage={currentPage}
                scale={scale}
                mode={mode}
                annotations={annotations}
                signatures={signatures}
                selectedAnnotationId={selectedId}
                pageDimensions={pageDimensions}
                renderPage={renderPage}
                onSelectAnnotation={(id) => setSelectedId(id)}
                onUpdateAnnotation={updateAnnotation}
                onDeleteAnnotation={removeAnnotation}
                onPageClick={handlePageClick}
              />
            </>
          ) : (
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

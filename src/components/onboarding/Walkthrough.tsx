import { useState } from "react";
import { setSetting } from "../../db/sqlite";
import SignaturePad from "../pdf/SignaturePad";

interface WalkthroughProps {
  onComplete: () => void;
  onSaveSignature: (name: string, fontFamily: string, color: string) => Promise<void>;
}

const STEPS = [
  { id: "welcome", title: "Welcome" },
  { id: "signature", title: "Signature" },
  { id: "defaults", title: "Preferences" },
  { id: "done", title: "Ready" },
];

export default function Walkthrough({ onComplete, onSaveSignature }: WalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureCreated, setSignatureCreated] = useState(false);

  const next = () => setCurrentStep((p) => Math.min(p + 1, STEPS.length - 1));
  const prev = () => setCurrentStep((p) => Math.max(p - 1, 0));

  const finish = async () => {
    await setSetting("onboarding_complete", "true");
    onComplete();
  };

  const handleSaveSignature = async (name: string, fontFamily: string, color: string) => {
    await onSaveSignature(name, fontFamily, color);
    setSignatureCreated(true);
  };

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-lg mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step content */}
          <div className="min-h-[300px] flex flex-col">
            {currentStep === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center text-4xl">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-600">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Welcome to Office Tools
                </h2>
                <p className="text-slate-500 max-w-sm">
                  A free, lightweight PDF viewer and editor. View documents,
                  fill forms, add signatures, and save — all offline.
                </p>
                <div className="flex gap-3 text-xs text-slate-400 mt-2">
                  <span className="px-2 py-1 bg-slate-100 rounded">View PDFs</span>
                  <span className="px-2 py-1 bg-slate-100 rounded">Fill Forms</span>
                  <span className="px-2 py-1 bg-slate-100 rounded">Sign Docs</span>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-600">
                    <path d="M12 19l7-7 3 3-7 7-3-3z" />
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                    <path d="M2 2l7.586 7.586" />
                    <circle cx="11" cy="11" r="2" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Create Your Signature
                </h2>
                <p className="text-slate-500 max-w-sm">
                  Set up a digital signature to quickly sign documents.
                  Choose from elegant script fonts.
                </p>
                {signatureCreated ? (
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-sm font-medium">Signature created!</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSignaturePad(true)}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                  >
                    Create Signature
                  </button>
                )}
                <p className="text-xs text-slate-400">
                  You can skip this and create signatures later
                </p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-purple-600">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Preferences
                </h2>
                <p className="text-slate-500 max-w-sm">
                  You can set Office Tools as your default PDF viewer from
                  Windows Settings at any time.
                </p>
                <div className="bg-slate-50 rounded-lg p-4 text-left w-full max-w-sm text-sm text-slate-600">
                  <p className="font-medium mb-2">To set as default:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Open Windows Settings</li>
                    <li>Apps &gt; Default Apps</li>
                    <li>Search for ".pdf"</li>
                    <li>Select Office Tools</li>
                  </ol>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-600">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">
                  You're All Set!
                </h2>
                <p className="text-slate-500 max-w-sm">
                  Open a PDF to get started. Drag and drop a file, use
                  File &gt; Open, or right-click a PDF in Explorer.
                </p>
              </div>
            )}
          </div>

          {/* Progress dots + navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            {currentStep === 0 ? (
              <button
                onClick={finish}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip
              </button>
            ) : (
              <button
                onClick={prev}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Back
              </button>
            )}

            {/* Dots */}
            <div className="flex gap-2">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStep ? "bg-blue-600" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={next}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={finish}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>

      <SignaturePad
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleSaveSignature}
      />
    </div>
  );
}

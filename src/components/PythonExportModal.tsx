import React, { useState, useEffect } from 'react';
import { Bot, X, Copy, Check, Download, RefreshCw, AlertCircle } from 'lucide-react';

interface PythonExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pineCode: string;
}

export const PythonExportModal: React.FC<PythonExportModalProps> = ({
  isOpen,
  onClose,
  pineCode,
}) => {
  const [pythonCode, setPythonCode] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && pineCode) {
      convertCode();
    }
  }, [isOpen, pineCode]);

  const convertCode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/convert-python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pineCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Python translation failed');
      }

      const data = await response.json();
      setPythonCode(data.pythonCode || '# Translation failed');
      setExplanation(data.explanation || '');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to convert Pine Script to Python.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div id="python-export-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Python Backtrader Exporter</h2>
              <p className="text-xs text-slate-400">Convert Pine Script strategy to executable Python code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs font-semibold text-slate-300">Translating Pine Script v5 to Python Backtrader...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-950/60 border border-rose-800 p-4 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {explanation && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <span className="font-bold text-cyan-400 block mb-1">Translation Notes:</span>
                  <p>{explanation}</p>
                </div>
              )}

              {/* Code Box */}
              <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[400px]">
                <pre>{pythonCode}</pre>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={handleCopy}
            disabled={!pythonCode || isLoading}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Python Code!' : 'Copy Code'}</span>
          </button>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-5 py-2 rounded-lg transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

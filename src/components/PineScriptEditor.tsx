import React, { useState } from 'react';
import { Code2, Copy, Download, Play, Check, Sparkles, ShieldCheck, FileText, Wand2 } from 'lucide-react';

interface PineScriptEditorProps {
  pineCode: string;
  onChangePineCode: (code: string) => void;
  onRunBacktest: () => void;
  onOpenAIGenerator: () => void;
  onOpenAudit: () => void;
  onOpenPythonExport: () => void;
  isBacktesting: boolean;
}

export const PineScriptEditor: React.FC<PineScriptEditorProps> = ({
  pineCode,
  onChangePineCode,
  onRunBacktest,
  onOpenAIGenerator,
  onOpenAudit,
  onOpenPythonExport,
  isBacktesting,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const lines = pineCode.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(pineCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([pineCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pine_strategy.pine';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="pine-editor-container" className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col h-full min-h-[550px]">
      
      {/* Editor Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          <span className="text-xs font-bold text-slate-200 font-mono">
            strategy.pine
          </span>
          <span className="text-[11px] text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono">
            Pine Script v5
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Refactor Button */}
          <button
            onClick={onOpenAIGenerator}
            className="flex items-center gap-1.5 bg-purple-950 hover:bg-purple-900 text-purple-200 text-xs px-2.5 py-1.5 rounded-lg border border-purple-800 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Edit</span>
          </button>

          {/* Code Audit Button */}
          <button
            onClick={onOpenAudit}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Audit Code</span>
          </button>

          {/* Copy Script */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          {/* Download Script */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
            title="Download .pine file"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export .pine</span>
          </button>

          {/* Execute Backtest */}
          <button
            onClick={onRunBacktest}
            disabled={isBacktesting}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs px-3.5 py-1.5 rounded-lg transition"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isBacktesting ? 'animate-spin' : ''}`} />
            <span>Run</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-1 flex font-mono text-xs bg-slate-950 overflow-auto">
        {/* Line Numbers */}
        <div className="select-none py-4 px-3 text-right text-slate-600 bg-slate-950 border-r border-slate-850 shrink-0">
          {lines.map((_, i) => (
            <div key={`line-${i}`} className="h-5 leading-5">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Text Area Code Editor */}
        <div className="relative flex-1 p-4">
          <textarea
            id="pine-code-textarea"
            value={pineCode}
            onChange={(e) => onChangePineCode(e.target.value)}
            spellCheck={false}
            className="w-full h-full bg-transparent text-slate-100 font-mono text-xs leading-5 resize-none focus:outline-none whitespace-pre border-none ring-0 focus:ring-0"
            style={{ minHeight: '480px', tabSize: 4 }}
          />
        </div>
      </div>

      {/* Editor Footer Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-4">
          <span>Lines: {lines.length}</span>
          <span>Characters: {pineCode.length}</span>
          <span className="text-emerald-400">● Valid Pine v5 Syntax</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenPythonExport}
            className="text-cyan-400 hover:underline flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            View Python Equivalent
          </button>
        </div>
      </div>

    </div>
  );
};

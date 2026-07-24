import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, AlertTriangle, CheckCircle, Info, Sparkles, RefreshCw } from 'lucide-react';
import { AuditResult } from '../types';

interface AIAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  pineCode: string;
}

export const AIAuditModal: React.FC<AIAuditModalProps> = ({
  isOpen,
  onClose,
  pineCode,
}) => {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && pineCode) {
      runAudit();
    }
  }, [isOpen, pineCode]);

  const runAudit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/audit-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pineCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Audit request failed');
      }

      const data = await response.json();
      setAuditResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete code audit.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="ai-audit-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Pine Script Strategy Code Audit</h2>
              <p className="text-xs text-slate-400">Repainting Detection, Lookahead Bias & Risk Score</p>
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
        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs font-semibold text-slate-300">Auditing Pine Script logic with Gemini AI...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-950/60 border border-rose-800 p-4 rounded-xl text-rose-300 text-xs">
              <AlertTriangle className="w-5 h-5 mb-2 text-rose-400" />
              <p>{error}</p>
            </div>
          ) : auditResult ? (
            <>
              {/* Score & Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Quality Score</span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                    {auditResult.score} / 10
                  </span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Repainting Risk</span>
                  <span className="text-sm font-bold text-amber-400 font-mono mt-1">
                    {auditResult.repaintingRisk || 'LOW'}
                  </span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Lookahead Bias</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono mt-1">
                    {auditResult.lookaheadBias || 'NONE'}
                  </span>
                </div>
              </div>

              {/* Assessment Summary */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
                <h4 className="font-bold text-slate-200 mb-1">Executive Summary</h4>
                <p className="leading-relaxed">{auditResult.summary}</p>
              </div>

              {/* Warnings List */}
              {auditResult.warnings && auditResult.warnings.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Warnings & Flaws Found ({auditResult.warnings.length})
                  </h4>
                  <div className="flex flex-col gap-2">
                    {auditResult.warnings.map((w, i) => (
                      <div key={i} className="bg-amber-950/40 border border-amber-800/60 p-3 rounded-lg text-xs flex flex-col gap-1">
                        <div className="font-bold text-amber-300 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{w.type}</span>
                        </div>
                        <p className="text-slate-300">{w.message}</p>
                        {w.fix && (
                          <p className="text-emerald-400 font-mono text-[11px] bg-slate-950 p-1.5 rounded mt-1">
                            Suggested Fix: {w.fix}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Recommendations */}
              {auditResult.recommendations && auditResult.recommendations.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Optimization Recommendations
                  </h4>
                  <ul className="flex flex-col gap-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                    {auditResult.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={runAudit}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-Run Audit</span>
          </button>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-5 py-2 rounded-lg transition"
          >
            Close Audit
          </button>
        </div>

      </div>
    </div>
  );
};

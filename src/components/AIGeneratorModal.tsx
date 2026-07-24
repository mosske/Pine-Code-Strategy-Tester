import React, { useState } from 'react';
import { Sparkles, X, Bot, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { AssetSymbol, Timeframe } from '../types';

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyGeneratedStrategy: (strategyData: {
    title: string;
    description: string;
    pineCode: string;
    inputs?: any[];
  }) => void;
  selectedAsset: AssetSymbol;
  selectedTimeframe: Timeframe;
}

const EXAMPLE_PROMPTS = [
  "Build a 15m EMA 9/21 Crossover strategy for BTC with 2.5% Stop Loss and 5% Take Profit",
  "Create a Mean Reversion strategy using RSI (14) oversold < 30 and Bollinger Bands squeeze",
  "SuperTrend trend-following strategy with Volume filter and ATR trailing stop",
  "MACD Histogram momentum divergence strategy for SPY swing trading on 1D timeframe"
];

export const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({
  isOpen,
  onClose,
  onApplyGeneratedStrategy,
  selectedAsset,
  selectedTimeframe,
}) => {
  const [promptText, setPromptText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/gemini/generate-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          timeframe: selectedTimeframe,
          assetType: selectedAsset,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate strategy');
      }

      const data = await response.json();
      if (data.pineCode) {
        onApplyGeneratedStrategy({
          title: data.title || 'AI Generated Pine Strategy',
          description: data.description || 'Generated via Gemini AI Quant Strategist',
          pineCode: data.pineCode,
          inputs: data.parameters,
        });
        onClose();
      } else {
        throw new Error('Invalid Pine Script payload returned');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error generating Pine Script strategy.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="ai-generator-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">AI Pine Script Strategy Generator</h2>
              <p className="text-xs text-slate-400">Powered by Gemini Server-side Quant Engine</p>
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
        <div className="p-6 flex flex-col gap-5">
          {/* Target Asset & Timeframe Badge */}
          <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400">Context:</span>
            <span className="font-mono text-emerald-400 font-bold">{selectedAsset}</span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-purple-300 font-bold">{selectedTimeframe} Timeframe</span>
          </div>

          {/* Prompt Textarea */}
          <div className="flex flex-col gap-2">
            <label htmlFor="ai-prompt-input" className="text-xs font-semibold text-slate-300">
              Describe your trading strategy idea:
            </label>
            <textarea
              id="ai-prompt-input"
              rows={4}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g., Create a 15m Trend-following strategy using EMA 20/50 cross, ATR stop loss, and RSI filter..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-sans focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none placeholder-slate-600"
            />
          </div>

          {/* Example Prompts */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Example Quant Ideas
            </span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setPromptText(prompt)}
                  className="text-left text-[11px] bg-slate-950 hover:bg-purple-950/60 border border-slate-800 hover:border-purple-800/80 text-slate-300 hover:text-purple-200 px-3 py-2 rounded-lg transition"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-800 p-3 rounded-lg text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 px-4 py-2 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !promptText.trim()}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-lg transition disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating Strategy...' : 'Generate Pine Script'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

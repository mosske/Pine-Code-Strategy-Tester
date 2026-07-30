import React from 'react';
import { Layers, X, ArrowRight, TrendingUp } from 'lucide-react';
import { PRESET_STRATEGIES } from '../data/presetStrategies';
import { PinePresetStrategy } from '../types';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: PinePresetStrategy) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div id="presets-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Pine Script Strategy Presets Library</h2>
              <p className="text-xs text-slate-400">Select a pre-configured strategy template to load into the studio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESET_STRATEGIES.map((preset) => (
            <div
              key={preset.id}
              onClick={() => {
                onSelectPreset(preset);
                onClose();
              }}
              className="bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/60 p-4 rounded-xl cursor-pointer transition flex flex-col justify-between group shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded">
                    {preset.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {preset.defaultAsset === 'SPY' ? 'SPY (SPDR S&P 500 ETF TRUST)' : preset.defaultAsset} · {preset.defaultTimeframe}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition">
                  {preset.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {preset.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-850 text-xs text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform">
                <span>Load Strategy Template</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-5 py-2 rounded-lg transition"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};

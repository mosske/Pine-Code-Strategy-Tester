import React from 'react';
import { StrategyInput, AssetSymbol, Timeframe } from '../types';
import { Sliders, DollarSign, Percent, RefreshCw, Zap } from 'lucide-react';

interface StrategyInputsPanelProps {
  inputs: StrategyInput[];
  onInputChange: (id: string, value: any) => void;
  initialCapital: number;
  onCapitalChange: (cap: number) => void;
  commissionPct: number;
  onCommissionChange: (comm: number) => void;
  slippagePct: number;
  onSlippageChange: (slip: number) => void;
  selectedAsset: AssetSymbol;
  onAssetChange: (asset: AssetSymbol) => void;
  selectedTimeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onRunBacktest: () => void;
  isBacktesting: boolean;
}

export const StrategyInputsPanel: React.FC<StrategyInputsPanelProps> = ({
  inputs,
  onInputChange,
  initialCapital,
  onCapitalChange,
  commissionPct,
  onCommissionChange,
  slippagePct,
  onSlippageChange,
  selectedAsset,
  onAssetChange,
  selectedTimeframe,
  onTimeframeChange,
  onRunBacktest,
  isBacktesting,
}) => {
  return (
    <div id="strategy-inputs-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-5">
      
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          Strategy Inputs & Risk Rules
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">
          Pine `input()` Controls
        </span>
      </div>

      {/* Pine Script Dynamic Parameters */}
      <div className="flex flex-col gap-4">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Indicator Parameters
        </span>

        {inputs.map((inp) => (
          <div key={inp.id} className="flex flex-col gap-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor={`input-${inp.id}`} className="font-medium text-slate-300">
                {inp.name}
              </label>
              <span className="font-mono text-emerald-400 font-bold">
                {inp.value}
              </span>
            </div>

            {inp.type === 'int' || inp.type === 'float' ? (
              <div className="flex items-center gap-2">
                <input
                  id={`input-${inp.id}`}
                  type="range"
                  min={inp.min ?? 1}
                  max={inp.max ?? 100}
                  step={inp.step ?? (inp.type === 'float' ? 0.1 : 1)}
                  value={inp.value}
                  onChange={(e) => onInputChange(inp.id, parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            ) : inp.type === 'bool' ? (
              <input
                id={`input-${inp.id}`}
                type="checkbox"
                checked={!!inp.value}
                onChange={(e) => onInputChange(inp.id, e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded bg-slate-800 border-slate-700"
              />
            ) : (
              <input
                id={`input-${inp.id}`}
                type="text"
                value={inp.value}
                onChange={(e) => onInputChange(inp.id, e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 font-mono"
              />
            )}
          </div>
        ))}
      </div>

      {/* Account & Trading Cost Inputs */}
      <div className="flex flex-col gap-3 pt-3 border-t border-slate-800">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Account & Trading Costs
        </span>

        {/* Capital */}
        <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <label htmlFor="input-capital" className="text-slate-300 font-medium">
            Initial Capital ($)
          </label>
          <input
            id="input-capital"
            type="number"
            value={initialCapital}
            onChange={(e) => onCapitalChange(parseFloat(e.target.value) || 1000)}
            className="w-24 bg-slate-900 border border-slate-700 text-emerald-400 font-bold font-mono text-right text-xs rounded px-2 py-1"
          />
        </div>

        {/* Commission */}
        <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <label htmlFor="input-commission" className="text-slate-300 font-medium">
            Commission (%)
          </label>
          <input
            id="input-commission"
            type="number"
            step="0.01"
            value={commissionPct}
            onChange={(e) => onCommissionChange(parseFloat(e.target.value) || 0)}
            className="w-20 bg-slate-900 border border-slate-700 text-slate-200 font-mono text-right text-xs rounded px-2 py-1"
          />
        </div>

        {/* Slippage */}
        <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <label htmlFor="input-slippage" className="text-slate-300 font-medium">
            Slippage (%)
          </label>
          <input
            id="input-slippage"
            type="number"
            step="0.01"
            value={slippagePct}
            onChange={(e) => onSlippageChange(parseFloat(e.target.value) || 0)}
            className="w-20 bg-slate-900 border border-slate-700 text-slate-200 font-mono text-right text-xs rounded px-2 py-1"
          />
        </div>
      </div>

      {/* Recalculate CTA */}
      <button
        id="btn-recalculate"
        onClick={onRunBacktest}
        disabled={isBacktesting}
        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-lg transition shadow disabled:opacity-50 mt-2"
      >
        <Zap className="w-4 h-4 fill-current" />
        <span>Update & Re-Backtest</span>
      </button>

    </div>
  );
};

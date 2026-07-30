import React from 'react';
import { StrategyInput, AssetSymbol, Timeframe, BacktestPeriod } from '../types';
import { Sliders, DollarSign, Percent, RotateCcw, Zap, Calendar, Award } from 'lucide-react';

interface StrategyInputsPanelProps {
  inputs: StrategyInput[];
  onInputChange: (id: string, value: any) => void;
  onResetToRecommended: () => void;
  initialCapital: number;
  onCapitalChange: (cap: number) => void;
  tradeSizePct: number;
  onTradeSizeChange: (size: number) => void;
  commissionPct: number;
  onCommissionChange: (comm: number) => void;
  slippagePct: number;
  onSlippageChange: (slip: number) => void;
  isCompounding: boolean;
  onCompoundingChange: (comp: boolean) => void;
  withdrawPct: number;
  onWithdrawPctChange: (withdraw: number) => void;
  selectedAsset: AssetSymbol;
  onAssetChange: (asset: AssetSymbol) => void;
  selectedTimeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  selectedPeriod: BacktestPeriod;
  onPeriodChange: (period: BacktestPeriod) => void;
  onRunBacktest: () => void;
  isBacktesting: boolean;
}

export const StrategyInputsPanel: React.FC<StrategyInputsPanelProps> = ({
  inputs,
  onInputChange,
  onResetToRecommended,
  initialCapital,
  onCapitalChange,
  tradeSizePct,
  onTradeSizeChange,
  commissionPct,
  onCommissionChange,
  slippagePct,
  onSlippageChange,
  isCompounding,
  onCompoundingChange,
  withdrawPct,
  onWithdrawPctChange,
  selectedAsset,
  onAssetChange,
  selectedTimeframe,
  onTimeframeChange,
  selectedPeriod,
  onPeriodChange,
  onRunBacktest,
  isBacktesting,
}) => {
  // Helper to format capital with comma separators and cents if present
  const formatCapitalDisplay = (num: number): string => {
    if (isNaN(num) || num === null || num === undefined) return '';
    const str = num.toString();
    const parts = str.split('.');
    const intPart = parseInt(parts[0] || '0', 10).toLocaleString('en-US');
    return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
  };

  const [capitalText, setCapitalText] = React.useState<string>(() => formatCapitalDisplay(initialCapital));

  React.useEffect(() => {
    const cleanCurrent = capitalText.replace(/,/g, '');
    const currentNum = parseFloat(cleanCurrent);
    if (isNaN(currentNum) || currentNum !== initialCapital) {
      setCapitalText(formatCapitalDisplay(initialCapital));
    }
  }, [initialCapital]);

  const handleCapitalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const clean = rawVal.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    const integerPart = parts[0] || '';
    const decimalPart = parts.length > 1 ? parts.slice(1).join('') : null;

    const formattedInt = integerPart ? parseInt(integerPart, 10).toLocaleString('en-US') : '';
    const newDisplay = decimalPart !== null ? `${formattedInt}.${decimalPart}` : formattedInt;

    setCapitalText(newDisplay);

    const parsed = parseFloat(clean);
    if (!isNaN(parsed) && parsed >= 0) {
      onCapitalChange(parsed);
    } else if (clean === '') {
      onCapitalChange(0);
    }
  };

  const handleCapitalBlur = () => {
    const clean = capitalText.replace(/,/g, '');
    const parsed = parseFloat(clean);
    if (isNaN(parsed) || parsed <= 0) {
      setCapitalText('1,000');
      onCapitalChange(1000);
    } else {
      setCapitalText(formatCapitalDisplay(parsed));
    }
  };

  return (
    <div id="strategy-inputs-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-5">
      
      {/* Title & Revert to Recommended Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          Strategy Inputs & Variables
        </h3>
        
        {/* Revert to Recommended Defaults Button */}
        <button
          onClick={onResetToRecommended}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-700/60 px-2.5 py-1 rounded-md transition shadow-sm"
          title="Reset all variable settings back to recommended strategy defaults"
        >
          <RotateCcw className="w-3 h-3 text-emerald-400" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Backtest Range & Recommended Pairs Configuration */}
      <div className="flex flex-col gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          Backtest Period & Asset Pair
        </span>

        {/* Backtest Period Selector */}
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="input-period-select" className="text-slate-300 font-medium">
            Backtest Period
          </label>
          <select
            id="input-period-select"
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value as BacktestPeriod)}
            className="bg-slate-900 border border-emerald-600/50 text-emerald-300 font-bold font-mono text-xs rounded px-2 py-1"
          >
            <option value="1Y">1 Year (2025-2026)</option>
            <option value="3Y">3 Years (2023-2026)</option>
            <option value="5Y">5 Years (2021-2026)</option>
            <option value="8Y">8 Years (2018-2026)</option>
            <option value="10Y">10 Years (2016-2026)</option>
          </select>
        </div>

        {/* Asset Pair Selection (Recommended Only) */}
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="input-asset-select" className="text-slate-300 font-medium">
            Asset Pair
          </label>
          <select
            id="input-asset-select"
            value={selectedAsset}
            onChange={(e) => onAssetChange(e.target.value as AssetSymbol)}
            className="bg-slate-900 border border-slate-700 text-slate-200 font-bold font-mono text-xs rounded px-2 py-1"
          >
            <option value="BTC/USDT">BTC/USDT</option>
            <option value="ETH/USDT">ETH/USDT</option>
            <option value="EUR/USD">EUR/USD</option>
            <option value="XAU/USD">XAU/USD (Gold)</option>
          </select>
        </div>

        {/* Timeframe */}
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="input-tf-select" className="text-slate-300 font-medium">
            Timeframe
          </label>
          <select
            id="input-tf-select"
            value={selectedTimeframe}
            onChange={(e) => onTimeframeChange(e.target.value as Timeframe)}
            className="bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs rounded px-2 py-1"
          >
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1H">1H</option>
            <option value="4H">4H</option>
            <option value="1D">1D</option>
          </select>
        </div>
      </div>

      {/* Pine Script Dynamic Parameters */}
      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Editable Strategy Variables
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
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          Capital & Costs
        </span>

        {/* Initial Capital */}
        <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <label htmlFor="input-capital" className="text-slate-300 font-medium">
            Initial Capital ($)
          </label>
          <input
            id="input-capital"
            type="text"
            inputMode="decimal"
            value={capitalText}
            onChange={handleCapitalChange}
            onBlur={handleCapitalBlur}
            placeholder="1,000"
            className="w-32 bg-slate-900 border border-slate-700 text-emerald-400 font-bold font-mono text-right text-xs rounded px-2 py-1"
          />
        </div>

        {/* Trade Size (%) */}
        <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <label htmlFor="input-trade-size" className="text-slate-300 font-medium">
            Trade Size (% of capital)
          </label>
          <input
            id="input-trade-size"
            type="number"
            min="1"
            max="100"
            step="1"
            value={tradeSizePct}
            onChange={(e) => onTradeSizeChange(Math.max(1, Math.min(100, parseFloat(e.target.value) || 10)))}
            className="w-20 bg-slate-900 border border-slate-700 text-slate-200 font-bold font-mono text-right text-xs rounded px-2 py-1"
          />
        </div>

        {/* Commission (%) */}
        <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <label htmlFor="input-commission" className="text-slate-300 font-medium">
            Commission (%)
          </label>
          <input
            id="input-commission"
            type="number"
            step="0.005"
            value={commissionPct}
            onChange={(e) => onCommissionChange(parseFloat(e.target.value) || 0)}
            className="w-20 bg-slate-900 border border-slate-700 text-slate-200 font-bold font-mono text-right text-xs rounded px-2 py-1"
          />
        </div>

        {/* Slippage (%) */}
        <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <label htmlFor="input-slippage" className="text-slate-300 font-medium">
            Slippage (%)
          </label>
          <input
            id="input-slippage"
            type="number"
            step="0.005"
            value={slippagePct}
            onChange={(e) => onSlippageChange(parseFloat(e.target.value) || 0)}
            className="w-20 bg-slate-900 border border-slate-700 text-slate-200 font-bold font-mono text-right text-xs rounded px-2 py-1"
          />
        </div>

        {/* Compounding Toggle */}
        <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <div className="flex flex-col">
            <label htmlFor="input-compounding" className="text-slate-300 font-medium cursor-pointer">
              Compounding Equity
            </label>
            <span className="text-[10px] text-slate-500">Position size scales with equity</span>
          </div>
          <input
            id="input-compounding"
            type="checkbox"
            checked={isCompounding}
            onChange={(e) => onCompoundingChange(e.target.checked)}
            className="w-4 h-4 accent-emerald-500 rounded bg-slate-800 border-slate-700 cursor-pointer"
          />
        </div>

        {/* Withdrawal per Win (%) */}
        <div className="flex flex-col gap-1.5 text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between">
            <label htmlFor="input-withdraw-pct" className="text-slate-300 font-medium">
              Withdrawal per Win (%)
            </label>
            <span className="font-mono text-emerald-400 font-bold">
              {withdrawPct}%
            </span>
          </div>
          <input
            id="input-withdraw-pct"
            type="range"
            min="0"
            max="100"
            step="5"
            value={withdrawPct}
            onChange={(e) => onWithdrawPctChange(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] text-slate-500">% of winning trade PnL withdrawn to cash</span>
        </div>
      </div>

      {/* Recalculate CTA */}
      <button
        id="btn-recalculate"
        onClick={onRunBacktest}
        disabled={isBacktesting}
        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-lg transition shadow disabled:opacity-50 mt-1"
      >
        <Zap className="w-4 h-4 fill-current" />
        <span>Update & Re-Backtest</span>
      </button>

    </div>
  );
};

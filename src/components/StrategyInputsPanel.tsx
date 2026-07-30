import React from 'react';
import { StrategyInput, AssetSymbol, Timeframe, BacktestPeriod } from '../types';
import { Sliders, DollarSign, Percent, RotateCcw, Zap, Calendar, Award, BookOpen } from 'lucide-react';
import { PRESET_STRATEGIES } from '../data/presetStrategies';

interface StrategyInputsPanelProps {
  inputs: StrategyInput[];
  onInputChange: (id: string, value: any) => void;
  onResetToRecommended: () => void;
  selectedStrategyId?: string;
  onSelectStrategyById?: (id: string) => void;
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
  selectedStrategyId,
  onSelectStrategyById,
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

  const activeStrategy = PRESET_STRATEGIES.find((s) => s.id === selectedStrategyId);
  const recommendedPairs = activeStrategy?.recommendedPairs || [];

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

      {/* Strategy Selector Dropdown Card */}
      {onSelectStrategyById && (
        <div className="strategy-model-card flex flex-col gap-2 bg-slate-950 p-3 rounded-xl border border-emerald-600/40 shadow-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              Strategy Model
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold border border-emerald-500/30">
              {PRESET_STRATEGIES.find((s) => s.id === selectedStrategyId)?.category || 'Strategy'}
            </span>
          </div>

          <select
            id="panel-strategy-selector"
            value={selectedStrategyId || ''}
            onChange={(e) => onSelectStrategyById(e.target.value)}
            className="w-full bg-slate-900 border border-emerald-600/60 text-slate-100 font-semibold text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm cursor-pointer"
          >
            {PRESET_STRATEGIES.map((strat) => (
              <option key={strat.id} value={strat.id}>
                ⭐ {strat.title}
              </option>
            ))}
          </select>

          <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
            {PRESET_STRATEGIES.find((s) => s.id === selectedStrategyId)?.description}
          </p>
        </div>
      )}

      {/* Backtest Range & Recommended Pairs Configuration */}
      <div className="flex flex-col gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          Backtest Period & Asset Pair
        </span>

        {/* Backtest Period Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
          <label htmlFor="input-period-select" className="text-slate-300 font-medium">
            Backtest Period
          </label>
          <select
            id="input-period-select"
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value as BacktestPeriod)}
            className="w-full sm:w-auto max-w-full bg-slate-900 border border-emerald-600/50 text-emerald-300 font-bold font-mono text-xs rounded px-2 py-1.5"
          >
            <option value="1Y">1 Year (2025-2026)</option>
            <option value="3Y">3 Years (2023-2026)</option>
            <option value="5Y">5 Years (2021-2026)</option>
            <option value="8Y">8 Years (2018-2026)</option>
            <option value="10Y">10 Years (2016-2026)</option>
          </select>
        </div>

        {/* Asset Pair Selection with Recommended Star Indicators */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
          <label htmlFor="input-asset-select" className="text-slate-300 font-medium flex flex-wrap items-center gap-1.5">
            <span>Asset Pair</span>
            {recommendedPairs.includes(selectedAsset) && (
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 border border-amber-500/30">
                ⭐ Recommended
              </span>
            )}
          </label>
          <select
            id="input-asset-select"
            value={selectedAsset}
            onChange={(e) => onAssetChange(e.target.value as AssetSymbol)}
            className={`w-full sm:w-auto max-w-full truncate bg-slate-900 border text-slate-200 font-bold font-mono text-xs rounded px-2 py-1.5 focus:outline-none ${
              recommendedPairs.includes(selectedAsset)
                ? 'border-amber-500/60 text-amber-200 ring-1 ring-amber-500/30'
                : 'border-slate-700'
            }`}
          >
            <option value="BTC/USDT">{recommendedPairs.includes('BTC/USDT') ? '⭐ BTC/USDT (Recommended)' : 'BTC/USDT'}</option>
            <option value="ETH/USDT">{recommendedPairs.includes('ETH/USDT') ? '⭐ ETH/USDT (Recommended)' : 'ETH/USDT'}</option>
            <option value="SOL/USDT">{recommendedPairs.includes('SOL/USDT') ? '⭐ SOL/USDT (Recommended)' : 'SOL/USDT'}</option>
            <option value="BNB/USDT">{recommendedPairs.includes('BNB/USDT') ? '⭐ BNB/USDT (Recommended)' : 'BNB/USDT'}</option>
            <option value="EUR/USD">{recommendedPairs.includes('EUR/USD') ? '⭐ EUR/USD (Recommended)' : 'EUR/USD'}</option>
            <option value="GBP/USD">{recommendedPairs.includes('GBP/USD') ? '⭐ GBP/USD (Recommended)' : 'GBP/USD'}</option>
            <option value="XAU/USD">{recommendedPairs.includes('XAU/USD') ? '⭐ XAU/USD (Gold)' : 'XAU/USD (Gold)'}</option>
            <option value="SPY">{recommendedPairs.includes('SPY') ? '⭐ SPY (SPDR S&P 500 ETF TRUST)' : 'SPY (SPDR S&P 500 ETF TRUST)'}</option>
          </select>
        </div>

        {/* Strategy Recommended Pair Quick-Select Badges */}
        {recommendedPairs.length > 0 && (
          <div className="recommended-pairs-box flex flex-col gap-1.5 bg-slate-900/90 p-2.5 rounded-lg border border-amber-500/30 shadow-sm mt-1">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
              ⭐ Recommended Pairs for Model
            </span>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {recommendedPairs.map((pair) => {
                const isSelected = selectedAsset === pair;
                const pairNote = activeStrategy?.pairConfigs?.[pair]?.notes;
                return (
                  <button
                    key={pair}
                    type="button"
                    onClick={() => onAssetChange(pair)}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-mono font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm scale-[1.02]'
                        : 'bg-slate-800 text-amber-200 hover:bg-slate-700 border border-amber-500/20'
                    }`}
                    title={pairNote || `Select ${pair} to auto-load optimal strategy settings`}
                  >
                    <span>⭐ {pair === 'SPY' ? 'SPY (SPDR S&P 500 ETF TRUST)' : pair}</span>
                    {isSelected && <span className="text-[9px] bg-slate-950/40 text-amber-100 px-1 rounded">Active</span>}
                  </button>
                );
              })}
            </div>
            {activeStrategy?.pairConfigs?.[selectedAsset]?.notes && (
              <p className="text-[10px] text-amber-300/90 italic font-mono mt-0.5">
                ⚡ Auto-Applied: {activeStrategy.pairConfigs[selectedAsset]?.notes}
              </p>
            )}
          </div>
        )}

        {/* Timeframe */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
          <label htmlFor="input-tf-select" className="text-slate-300 font-medium">
            Timeframe
          </label>
          <select
            id="input-tf-select"
            value={selectedTimeframe}
            onChange={(e) => onTimeframeChange(e.target.value as Timeframe)}
            className="w-full sm:w-auto max-w-full bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs rounded px-2 py-1.5"
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

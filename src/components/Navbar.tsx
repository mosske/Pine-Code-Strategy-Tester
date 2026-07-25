import React from 'react';
import { 
  TrendingUp, 
  Sparkles, 
  Play, 
  ShieldCheck, 
  Code2, 
  SlidersHorizontal,
  Bot,
  Zap,
  Calendar,
  Award
} from 'lucide-react';
import { AssetSymbol, Timeframe, BacktestPeriod, TradingKitCredits } from '../types';
import { PRESET_STRATEGIES } from '../data/presetStrategies';

interface NavbarProps {
  strategyTitle: string;
  selectedStrategyId: string;
  onSelectStrategyById: (id: string) => void;
  selectedAsset: AssetSymbol;
  selectedTimeframe: Timeframe;
  selectedPeriod: BacktestPeriod;
  onAssetChange: (asset: AssetSymbol) => void;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onPeriodChange: (period: BacktestPeriod) => void;
  onRunBacktest: () => void;
  onOpenAIGenerator: () => void;
  onOpenAudit: () => void;
  onOpenPythonExport: () => void;
  onOpenPresets: () => void;
  isBacktesting: boolean;
  activeTab: 'chart' | 'editor' | 'report';
  setActiveTab: (tab: 'chart' | 'editor' | 'report') => void;
  mcpCredits?: TradingKitCredits | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  strategyTitle,
  selectedStrategyId,
  onSelectStrategyById,
  selectedAsset,
  selectedTimeframe,
  selectedPeriod,
  onAssetChange,
  onTimeframeChange,
  onPeriodChange,
  onRunBacktest,
  onOpenAIGenerator,
  onOpenAudit,
  onOpenPythonExport,
  isBacktesting,
  activeTab,
  setActiveTab,
  mcpCredits,
}) => {
  return (
    <header id="main-header" className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Recommended Strategy Selector */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>

            <div className="flex flex-col min-w-0">
              {/* Strategy Dropdown Label */}
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                <Award className="w-3 h-3 text-emerald-400" />
                <span>Recommended Strategy:</span>
              </div>

              {/* Recommended High Win-Rate Strategy Dropdown */}
              <select
                id="select-strategy-dropdown"
                value={selectedStrategyId}
                onChange={(e) => onSelectStrategyById(e.target.value)}
                className="bg-slate-950 border border-emerald-600/40 text-slate-100 font-semibold text-xs sm:text-sm rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[240px] sm:max-w-[320px] truncate shadow-inner cursor-pointer"
                title="Select a recommended high win-rate strategy to auto-populate default variables"
              >
                {PRESET_STRATEGIES.map((strat) => (
                  <option key={strat.id} value={strat.id}>
                    ⭐ {strat.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Center Tabs */}
          <div className="hidden md:flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              id="tab-chart"
              onClick={() => setActiveTab('chart')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'chart'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Chart & Trades
            </button>
            <button
              id="tab-editor"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'editor'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Pine Script Code
            </button>
            <button
              id="tab-report"
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'report'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Performance Report
            </button>
          </div>

          {/* Right Controls: Asset, Timeframe, Backtest Period & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Recommended Asset Selector ONLY */}
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-mono hidden xl:block">Asset Pair</span>
              <select
                id="select-asset"
                value={selectedAsset}
                onChange={(e) => onAssetChange(e.target.value as AssetSymbol)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
              >
                <option value="BTC/USDT">BTC/USDT</option>
                <option value="ETH/USDT">ETH/USDT</option>
                <option value="EUR/USD">EUR/USD</option>
                <option value="XAU/USD">XAU/USD (Gold)</option>
              </select>
            </div>

            {/* Timeframe Selector */}
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-mono hidden xl:block">Timeframe</span>
              <select
                id="select-timeframe"
                value={selectedTimeframe}
                onChange={(e) => onTimeframeChange(e.target.value as Timeframe)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              >
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1H">1H</option>
                <option value="4H">4H</option>
                <option value="1D">1D</option>
              </select>
            </div>

            {/* Backtest Period Selector (1Y, 3Y, 5Y, 8Y, 10Y) */}
            <div className="flex flex-col">
              <span className="text-[9px] text-emerald-400 font-mono font-bold hidden xl:block flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5 inline" /> Period
              </span>
              <select
                id="select-backtest-period"
                value={selectedPeriod}
                onChange={(e) => onPeriodChange(e.target.value as BacktestPeriod)}
                className="bg-slate-950 border border-emerald-600/50 text-emerald-300 font-bold text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                title="Select Historical Backtest Period (1Y, 3Y, 5Y, 8Y, 10Y)"
              >
                <option value="1Y">1 Year (1Y)</option>
                <option value="3Y">3 Years (3Y)</option>
                <option value="5Y">5 Years (5Y)</option>
                <option value="8Y">8 Years (8Y)</option>
                <option value="10Y">10 Years (10Y)</option>
              </select>
            </div>

            {/* AI Prompt Generator Button */}
            <button
              id="btn-ai-generator"
              onClick={onOpenAIGenerator}
              className="flex items-center gap-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-200 text-xs font-medium px-2.5 py-1.5 rounded-lg transition"
              title="AI Strategy Generator"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span className="hidden lg:inline">AI Builder</span>
            </button>

            {/* Audit Button */}
            <button
              id="btn-audit"
              onClick={onOpenAudit}
              className="hidden lg:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
              title="Audit Pine Script for bugs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Audit
            </button>

            {/* Run Backtest CTA Button */}
            <button
              id="btn-run-backtest"
              onClick={onRunBacktest}
              disabled={isBacktesting}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isBacktesting ? 'animate-spin' : ''}`} />
              <span>{isBacktesting ? 'Testing...' : 'Run Backtest'}</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

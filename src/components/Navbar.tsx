import React from 'react';
import { 
  TrendingUp, 
  Sparkles, 
  Play, 
  ShieldCheck, 
  Code2, 
  Download, 
  Layers, 
  SlidersHorizontal,
  Bot
} from 'lucide-react';
import { AssetSymbol, Timeframe } from '../types';

interface NavbarProps {
  strategyTitle: string;
  selectedAsset: AssetSymbol;
  selectedTimeframe: Timeframe;
  onAssetChange: (asset: AssetSymbol) => void;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onRunBacktest: () => void;
  onOpenAIGenerator: () => void;
  onOpenAudit: () => void;
  onOpenPythonExport: () => void;
  onOpenPresets: () => void;
  isBacktesting: boolean;
  activeTab: 'chart' | 'editor' | 'report';
  setActiveTab: (tab: 'chart' | 'editor' | 'report') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  strategyTitle,
  selectedAsset,
  selectedTimeframe,
  onAssetChange,
  onTimeframeChange,
  onRunBacktest,
  onOpenAIGenerator,
  onOpenAudit,
  onOpenPythonExport,
  onOpenPresets,
  isBacktesting,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header id="main-header" className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Strategy Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                  Pine v5
                </span>
                <h1 className="text-sm sm:text-base font-semibold text-slate-100 truncate">
                  {strategyTitle || 'Pine Script Strategy Studio'}
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block truncate">
                Quant Strategy Workbench & Backtester
              </p>
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

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Asset Selector */}
            <select
              id="select-asset"
              value={selectedAsset}
              onChange={(e) => onAssetChange(e.target.value as AssetSymbol)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            >
              <option value="BTC/USDT">BTC/USDT</option>
              <option value="ETH/USDT">ETH/USDT</option>
              <option value="SPY">SPY (S&P 500)</option>
              <option value="QQQ">QQQ (Nasdaq)</option>
              <option value="NVDA">NVDA</option>
              <option value="TSLA">TSLA</option>
              <option value="EUR/USD">EUR/USD</option>
              <option value="GOLD">GOLD</option>
            </select>

            {/* Timeframe Selector */}
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

            {/* Presets Library Button */}
            <button
              id="btn-presets"
              onClick={onOpenPresets}
              className="hidden lg:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
              title="Strategy Presets"
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Presets
            </button>

            {/* AI Prompt Generator Button */}
            <button
              id="btn-ai-generator"
              onClick={onOpenAIGenerator}
              className="flex items-center gap-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-200 text-xs font-medium px-2.5 py-1.5 rounded-lg transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span className="hidden sm:inline">AI Builder</span>
            </button>

            {/* Audit Button */}
            <button
              id="btn-audit"
              onClick={onOpenAudit}
              className="hidden md:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
              title="Audit Pine Script for bugs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Audit
            </button>

            {/* Python Export Button */}
            <button
              id="btn-python-export"
              onClick={onOpenPythonExport}
              className="hidden xl:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
              title="Export strategy to Python Backtrader"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              Python
            </button>

            {/* Run Backtest CTA Button */}
            <button
              id="btn-run-backtest"
              onClick={onRunBacktest}
              disabled={isBacktesting}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition disabled:opacity-50"
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

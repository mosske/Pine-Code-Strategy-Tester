import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Sparkles, 
  Play, 
  ShieldCheck, 
  Code2, 
  SlidersHorizontal,
  Download,
  Calendar,
  Award,
  ChevronDown,
  Menu,
  X,
  Share2,
  Smartphone,
  Sun,
  Moon,
  Crown,
  Palette,
  RotateCcw
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
  onResetToRecommended?: () => void;
  onOpenAIGenerator: () => void;
  onOpenAudit: () => void;
  onOpenPythonExport: () => void;
  onOpenPresets: () => void;
  isBacktesting: boolean;
  activeTab: 'chart' | 'editor' | 'report';
  setActiveTab: (tab: 'chart' | 'editor' | 'report') => void;
  mcpCredits?: TradingKitCredits | null;
  theme?: 'dark' | 'light' | 'designer';
  onThemeChange?: (theme: 'dark' | 'light' | 'designer') => void;
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
  onResetToRecommended,
  onOpenAIGenerator,
  onOpenAudit,
  onOpenPythonExport,
  onOpenPresets,
  isBacktesting,
  activeTab,
  setActiveTab,
  mcpCredits,
  theme = 'dark',
  onThemeChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showIosPrompt, setShowIosPrompt] = useState<boolean>(false);

  // Listen for PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIos) {
        setShowIosPrompt(true);
      } else {
        alert('To install Pine Studio:\n\n1. Open browser options (⋮ or Share)\n2. Tap "Add to Home screen" or "Install App"');
      }
    }
  };

  return (
    <header id="main-header" className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Main Navbar Bar */}
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Left: App Logo & Title */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>

            <div className="flex flex-col">
              <span className="font-bold text-sm sm:text-base text-slate-100 tracking-tight leading-tight flex items-center gap-1.5">
                PineStudio
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-semibold hidden xs:inline-block">
                  PRO
                </span>
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:block">Strategy Backtester & Optimizer</span>
            </div>
          </div>

          {/* Desktop Strategy Selector */}
          <div className="hidden lg:flex items-center gap-2 min-w-0 max-w-xs xl:max-w-md">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                <Award className="w-3 h-3 text-emerald-400" />
                <span>Recommended Strategy:</span>
              </div>

              <select
                id="select-strategy-dropdown"
                value={selectedStrategyId}
                onChange={(e) => onSelectStrategyById(e.target.value)}
                className="bg-slate-950 border border-emerald-600/40 text-slate-100 font-semibold text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate shadow-inner cursor-pointer"
                title="Select a recommended high win-rate strategy"
              >
                {PRESET_STRATEGIES.map((strat) => (
                  <option key={strat.id} value={strat.id}>
                    ⭐ {strat.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Center View Tabs (Desktop) */}
          <div className="hidden md:flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              id="tab-chart"
              onClick={() => setActiveTab('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'report'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Performance Report
            </button>
          </div>

          {/* Desktop Right Controls */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {/* Asset Selector */}
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-mono">Asset</span>
              <select
                id="select-asset"
                value={selectedAsset}
                onChange={(e) => onAssetChange(e.target.value as AssetSymbol)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
              >
                <option value="BTC/USDT">BTC/USDT</option>
                <option value="ETH/USDT">ETH/USDT</option>
                <option value="EUR/USD">EUR/USD</option>
                <option value="XAU/USD">XAU/USD (Gold)</option>
              </select>
            </div>

            {/* Timeframe Selector */}
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-mono">Timeframe</span>
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

            {/* Backtest Period */}
            <div className="flex flex-col">
              <span className="text-[9px] text-emerald-400 font-mono font-bold flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5 inline" /> Period
              </span>
              <select
                id="select-backtest-period"
                value={selectedPeriod}
                onChange={(e) => onPeriodChange(e.target.value as BacktestPeriod)}
                className="bg-slate-950 border border-emerald-600/50 text-emerald-300 font-bold text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              >
                <option value="1Y">1 Year (1Y)</option>
                <option value="3Y">3 Years (3Y)</option>
                <option value="5Y">5 Years (5Y)</option>
                <option value="8Y">8 Years (8Y)</option>
                <option value="10Y">10 Years (10Y)</option>
              </select>
            </div>

            {/* Reset Defaults Button */}
            <div className="flex flex-col">
              <span className="text-[9px] text-emerald-400 font-mono font-bold flex items-center gap-0.5">
                <RotateCcw className="w-2.5 h-2.5 inline" /> Action
              </span>
              <button
                id="btn-reset-defaults-nav"
                onClick={onResetToRecommended}
                className="bg-slate-950 hover:bg-slate-900 border border-emerald-600/60 hover:border-emerald-500 text-emerald-300 font-bold text-xs rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="Reset all variable settings back to recommended strategy defaults"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reset Defaults</span>
              </button>
            </div>

            {/* Theme Selector */}
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-mono flex items-center gap-0.5">
                {theme === 'designer' ? <Crown className="w-2.5 h-2.5 text-amber-400" /> : theme === 'light' ? <Sun className="w-2.5 h-2.5 text-amber-500" /> : <Moon className="w-2.5 h-2.5 text-indigo-400" />} Theme
              </span>
              <select
                id="select-theme"
                value={theme}
                onChange={(e) => onThemeChange?.(e.target.value as 'dark' | 'light' | 'designer')}
                className="bg-slate-950 border border-slate-800 text-slate-200 font-medium text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                title="Select Theme Mode (Dark, Light, or Luxury Designer Theme)"
              >
                <option value="dark">🌙 Dark Theme</option>
                <option value="light">☀️ Light Theme</option>
                <option value="designer">✨ Designer Theme</option>
              </select>
            </div>

            {/* AI Prompt Generator */}
            <button
              id="btn-ai-generator"
              onClick={onOpenAIGenerator}
              className="flex items-center gap-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-200 text-xs font-medium px-2.5 py-1.5 rounded-lg transition"
              title="AI Strategy Generator"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>AI Builder</span>
            </button>

            {/* PWA Install App Button */}
            {!isInstalled && (
              <button
                id="btn-install-pwa-desktop"
                onClick={handleInstallPWA}
                className="flex items-center gap-1.5 bg-sky-950/80 hover:bg-sky-900 border border-sky-600/60 text-sky-200 text-xs font-medium px-2.5 py-1.5 rounded-lg transition"
                title="Install PineStudio as Desktop / Mobile App"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Install App</span>
              </button>
            )}

            {/* Run Backtest CTA Button */}
            <button
              id="btn-run-backtest"
              onClick={onRunBacktest}
              disabled={isBacktesting}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition disabled:opacity-50 shrink-0"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isBacktesting ? 'animate-spin' : ''}`} />
              <span>{isBacktesting ? 'Testing...' : 'Run Backtest'}</span>
            </button>
          </div>

          {/* Mobile Right Bar Actions (PWA, Run Backtest & Hamburger) */}
          <div className="flex lg:hidden items-center gap-1.5 shrink-0">
            {/* PWA Install Button on Mobile */}
            {!isInstalled && (
              <button
                id="btn-install-pwa-mobile"
                onClick={handleInstallPWA}
                className="flex items-center gap-1 bg-sky-950 border border-sky-700/60 text-sky-300 text-[11px] font-semibold px-2 py-1.5 rounded-lg"
                title="Install App"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden xs:inline">Install</span>
              </button>
            )}

            {/* Run Backtest CTA */}
            <button
              id="btn-run-backtest-mobile"
              onClick={onRunBacktest}
              disabled={isBacktesting}
              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-sm transition"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isBacktesting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isBacktesting ? 'Testing...' : 'Run Backtest'}</span>
            </button>

            {/* Mobile Controls Toggle Drawer */}
            <button
              id="btn-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-btn p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-lg border border-slate-700 transition"
              aria-label="Toggle mobile controls menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Sub-Navbar: Always visible quick settings bar for strategy, period & parameters */}
        <div className="lg:hidden border-t border-slate-800/80 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Mobile Strategy Dropdown */}
          <div className="flex-1 min-w-[200px]">
            <select
              id="select-strategy-dropdown-mobile"
              value={selectedStrategyId}
              onChange={(e) => onSelectStrategyById(e.target.value)}
              className="w-full bg-slate-950 border border-emerald-600/40 text-slate-100 font-semibold text-xs rounded-lg px-2 py-1.5 focus:outline-none truncate"
            >
              {PRESET_STRATEGIES.map((strat) => (
                <option key={strat.id} value={strat.id}>
                  ⭐ {strat.title}
                </option>
              ))}
            </select>
          </div>

          {/* Quick selectors: Asset, Timeframe, Period */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedAsset}
              onChange={(e) => onAssetChange(e.target.value as AssetSymbol)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-1.5 py-1.5 font-mono font-bold"
            >
              <option value="BTC/USDT">BTC</option>
              <option value="ETH/USDT">ETH</option>
              <option value="EUR/USD">EUR</option>
              <option value="XAU/USD">XAU</option>
            </select>

            <select
              value={selectedTimeframe}
              onChange={(e) => onTimeframeChange(e.target.value as Timeframe)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-1.5 py-1.5 font-mono"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1H">1H</option>
              <option value="4H">4H</option>
              <option value="1D">1D</option>
            </select>

            <select
              value={selectedPeriod}
              onChange={(e) => onPeriodChange(e.target.value as BacktestPeriod)}
              className="bg-slate-950 border border-emerald-600/50 text-emerald-300 font-bold text-xs rounded-lg px-1.5 py-1.5 font-mono"
            >
              <option value="1Y">1Y</option>
              <option value="3Y">3Y</option>
              <option value="5Y">5Y</option>
              <option value="8Y">8Y</option>
              <option value="10Y">10Y</option>
            </select>

            <button
              onClick={onResetToRecommended}
              className="bg-slate-950 border border-emerald-600/60 text-emerald-300 font-bold text-xs rounded-lg px-2 py-1.5 flex items-center gap-1 active:scale-95 transition"
              title="Reset Defaults"
            >
              <RotateCcw className="w-3 h-3 text-emerald-400" />
              <span>Reset</span>
            </button>

            <select
              value={theme}
              onChange={(e) => onThemeChange?.(e.target.value as 'dark' | 'light' | 'designer')}
              className="bg-slate-950 border border-slate-800 text-slate-200 font-bold text-xs rounded-lg px-1.5 py-1.5 font-mono"
            >
              <option value="dark">🌙 Dark</option>
              <option value="light">☀️ Light</option>
              <option value="designer">✨ Designer</option>
            </select>
          </div>
        </div>

        {/* Mobile Expanded Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-950 border-t border-slate-800 py-3 px-1 flex flex-col gap-3 animate-in fade-in duration-200">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onOpenAIGenerator();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-purple-950/80 border border-purple-700/60 text-purple-200 text-xs font-semibold p-2.5 rounded-lg"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>AI Strategy Builder</span>
              </button>

              <button
                onClick={() => {
                  onOpenAudit();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold p-2.5 rounded-lg"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Audit Script</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onOpenPresets();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold p-2.5 rounded-lg"
              >
                <Award className="w-4 h-4 text-emerald-400" />
                <span>All Preset Strategies</span>
              </button>

              <button
                onClick={() => {
                  onOpenPythonExport();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold p-2.5 rounded-lg"
              >
                <Code2 className="w-4 h-4 text-blue-400" />
                <span>Export Python Code</span>
              </button>
            </div>

            {!isInstalled && (
              <button
                onClick={handleInstallPWA}
                className="w-full flex items-center justify-center gap-2 bg-sky-950 border border-sky-600/60 text-sky-200 text-xs font-bold p-2.5 rounded-lg"
              >
                <Smartphone className="w-4 h-4 text-sky-400" />
                <span>Install App / Add to Home Screen</span>
              </button>
            )}
          </div>
        )}

      </div>

      {/* iOS Installation Instructions Modal */}
      {showIosPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm">Install PineStudio on iOS</h3>
              </div>
              <button onClick={() => setShowIosPrompt(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>To add PineStudio to your iPhone or iPad home screen:</p>
              <ol className="list-decimal list-inside space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <li className="flex items-center gap-2">
                  <span>Tap the Safari <Share2 className="w-3.5 h-3.5 text-sky-400 inline" /> <strong>Share</strong> button at the bottom of Safari.</span>
                </li>
                <li>Scroll down and select <strong>"Add to Home Screen"</strong>.</li>
                <li>Tap <strong>Add</strong> in the top right corner.</li>
              </ol>
            </div>

            <button
              onClick={() => setShowIosPrompt(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </header>
  );
};


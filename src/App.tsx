import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Zap } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { StrategyChart } from './components/StrategyChart';
import { PineScriptEditor } from './components/PineScriptEditor';
import { BacktestReport } from './components/BacktestReport';
import { StrategyInputsPanel } from './components/StrategyInputsPanel';
import { AIGeneratorModal } from './components/AIGeneratorModal';
import { AIAuditModal } from './components/AIAuditModal';
import { PythonExportModal } from './components/PythonExportModal';
import { PresetsModal } from './components/PresetsModal';
import { ToastContainer, ToastMessage } from './components/Toast';

import { PRESET_STRATEGIES } from './data/presetStrategies';
import { generateCandles, runStrategyBacktest, runMcpBacktest, fetchMcpCredits } from './utils/backtestEngine';
import { AssetSymbol, Timeframe, BacktestPeriod, StrategyInput, BacktestResult, PinePresetStrategy, TradingKitCredits } from './types';

// Safe helper for reading localStorage state
const getStoredValue = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return defaultValue;
    return JSON.parse(saved) as T;
  } catch {
    return defaultValue;
  }
};

export default function App() {
  // Theme State ('dark' | 'light' | 'designer')
  const [theme, setTheme] = useState<'dark' | 'light' | 'designer'>(() => {
    const saved = localStorage.getItem('pinestudio_theme');
    if (saved === 'dark' || saved === 'light' || saved === 'designer') return saved;
    return 'dark';
  });

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((title: string, description?: string, icon: 'check' | 'reset' = 'check') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type: 'success', title, description, icon }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Strategy Selection & Settings State (Persisted in LocalStorage)
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(() => {
    return localStorage.getItem('pinestudio_strategy_id') || PRESET_STRATEGIES[0].id;
  });
  const [strategyTitle, setStrategyTitle] = useState<string>(() => {
    return localStorage.getItem('pinestudio_strategy_title') || PRESET_STRATEGIES[0].title;
  });
  const [pineCode, setPineCode] = useState<string>(() => {
    return localStorage.getItem('pinestudio_pine_code') || PRESET_STRATEGIES[0].pineCode;
  });
  const [inputs, setInputs] = useState<StrategyInput[]>(() => {
    return getStoredValue('pinestudio_inputs', PRESET_STRATEGIES[0].inputs);
  });
  const [selectedAsset, setSelectedAsset] = useState<AssetSymbol>(() => {
    return (localStorage.getItem('pinestudio_selected_asset') as AssetSymbol) || PRESET_STRATEGIES[0].defaultAsset;
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(() => {
    return (localStorage.getItem('pinestudio_selected_timeframe') as Timeframe) || PRESET_STRATEGIES[0].defaultTimeframe;
  });
  const [selectedPeriod, setSelectedPeriod] = useState<BacktestPeriod>(() => {
    return (localStorage.getItem('pinestudio_selected_period') as BacktestPeriod) || PRESET_STRATEGIES[0].defaultPeriod || '1Y';
  });

  // Trading Costs & Account Capital Settings
  const [initialCapital, setInitialCapital] = useState<number>(() => {
    return getStoredValue('pinestudio_initial_capital', 10000);
  });
  const [commissionPct, setCommissionPct] = useState<number>(() => {
    return getStoredValue('pinestudio_commission_pct', 0.075);
  });
  const [slippagePct, setSlippagePct] = useState<number>(() => {
    return getStoredValue('pinestudio_slippage_pct', 0.02);
  });
  const [tradeSizePct, setTradeSizePct] = useState<number>(() => {
    return getStoredValue('pinestudio_trade_size_pct', 20);
  });
  const [isCompounding, setIsCompounding] = useState<boolean>(() => {
    return getStoredValue('pinestudio_is_compounding', false);
  });
  const [withdrawPct, setWithdrawPct] = useState<number>(() => {
    return getStoredValue('pinestudio_withdraw_pct', 0);
  });

  // TradingKit MCP Engine & Credits State
  const [mcpCredits, setMcpCredits] = useState<TradingKitCredits | null>(null);
  const [mcpError, setMcpError] = useState<string | null>(null);

  // UI Tabs & Selected Trade State
  const [activeTab, setActiveTab] = useState<'chart' | 'editor' | 'report'>(() => {
    const saved = localStorage.getItem('pinestudio_active_tab');
    if (saved === 'chart' || saved === 'editor' || saved === 'report') return saved;
    return 'chart';
  });
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [isBacktesting, setIsBacktesting] = useState<boolean>(false);

  // Auto-Save User Settings and Theme to LocalStorage
  useEffect(() => {
    localStorage.setItem('pinestudio_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('pinestudio_strategy_id', selectedStrategyId);
  }, [selectedStrategyId]);

  useEffect(() => {
    localStorage.setItem('pinestudio_strategy_title', strategyTitle);
  }, [strategyTitle]);

  useEffect(() => {
    localStorage.setItem('pinestudio_pine_code', pineCode);
  }, [pineCode]);

  useEffect(() => {
    localStorage.setItem('pinestudio_inputs', JSON.stringify(inputs));
  }, [inputs]);

  useEffect(() => {
    localStorage.setItem('pinestudio_selected_asset', selectedAsset);
  }, [selectedAsset]);

  useEffect(() => {
    localStorage.setItem('pinestudio_selected_timeframe', selectedTimeframe);
  }, [selectedTimeframe]);

  useEffect(() => {
    localStorage.setItem('pinestudio_selected_period', selectedPeriod);
  }, [selectedPeriod]);

  useEffect(() => {
    localStorage.setItem('pinestudio_initial_capital', JSON.stringify(initialCapital));
  }, [initialCapital]);

  useEffect(() => {
    localStorage.setItem('pinestudio_commission_pct', JSON.stringify(commissionPct));
  }, [commissionPct]);

  useEffect(() => {
    localStorage.setItem('pinestudio_slippage_pct', JSON.stringify(slippagePct));
  }, [slippagePct]);

  useEffect(() => {
    localStorage.setItem('pinestudio_trade_size_pct', JSON.stringify(tradeSizePct));
  }, [tradeSizePct]);

  useEffect(() => {
    localStorage.setItem('pinestudio_is_compounding', JSON.stringify(isCompounding));
  }, [isCompounding]);

  useEffect(() => {
    localStorage.setItem('pinestudio_withdraw_pct', JSON.stringify(withdrawPct));
  }, [withdrawPct]);

  useEffect(() => {
    localStorage.setItem('pinestudio_active_tab', activeTab);
  }, [activeTab]);

  // Modals Visibility
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState<boolean>(false);
  const [isAIAuditOpen, setIsAIAuditOpen] = useState<boolean>(false);
  const [isPythonExportOpen, setIsPythonExportOpen] = useState<boolean>(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);

  // Generate Candles dataset (for visual chart fallback & overlay over selected backtest period)
  const candles = useMemo(() => {
    return generateCandles(selectedAsset, selectedTimeframe, selectedPeriod);
  }, [selectedAsset, selectedTimeframe, selectedPeriod]);

  // Initial Backtest Result
  const [backtestResult, setBacktestResult] = useState<BacktestResult>(() => {
    return runStrategyBacktest(candles, inputs, pineCode, initialCapital, commissionPct, slippagePct, tradeSizePct, isCompounding, withdrawPct);
  });

  // Fetch MCP Credits on mount
  useEffect(() => {
    fetchMcpCredits().then((credits) => {
      if (credits) setMcpCredits(credits);
    });
  }, []);

  // Execute Backtest via TradingKit MCP (mcp.trader.dev) with local simulation fallback
  const handleRunBacktest = useCallback(async (showToast = false) => {
    setIsBacktesting(true);
    setMcpError(null);

    try {
      // 1. Try running backtest via TradingKit MCP with backtest period
      const mcpResult = await runMcpBacktest(
        pineCode,
        selectedAsset,
        selectedTimeframe,
        initialCapital,
        commissionPct,
        slippagePct,
        inputs,
        selectedPeriod,
        tradeSizePct,
        isCompounding,
        withdrawPct
      );

      // Add local indicators calculation for price chart overlay
      const localIndicators = runStrategyBacktest(candles, inputs, pineCode, initialCapital, commissionPct, slippagePct, tradeSizePct, isCompounding, withdrawPct).indicators;
      mcpResult.indicators = localIndicators;

      if (mcpResult.totalTrades === 0 || !mcpResult.trades || mcpResult.trades.length === 0) {
        const localRes = runStrategyBacktest(candles, inputs, pineCode, initialCapital, commissionPct, slippagePct, tradeSizePct, isCompounding, withdrawPct);
        setBacktestResult(localRes);
      } else {
        setBacktestResult(mcpResult);
      }

      // Refresh credits after backtest
      fetchMcpCredits().then((cred) => {
        if (cred) setMcpCredits(cred);
      });

      if (showToast) {
        addToast('Backtest complete', `${selectedAsset} (${selectedTimeframe}) backtest updated`, 'check');
      }
    } catch (err: any) {
      console.warn('TradingKit MCP backtest fallback:', err.message);
      setMcpError(err.message || 'TradingKit MCP backtest unavailable; using local simulation.');

      // 2. Fallback to local backtest engine if MCP is unavailable
      const localRes = runStrategyBacktest(candles, inputs, pineCode, initialCapital, commissionPct, slippagePct, tradeSizePct, isCompounding, withdrawPct);
      setBacktestResult(localRes);

      if (showToast) {
        addToast('Backtest complete', `${selectedAsset} (${selectedTimeframe}) simulation updated`, 'check');
      }
    } finally {
      setIsBacktesting(false);
    }
  }, [candles, inputs, pineCode, selectedAsset, selectedTimeframe, selectedPeriod, initialCapital, commissionPct, slippagePct, tradeSizePct, isCompounding, withdrawPct, addToast]);

  // Re-run backtest whenever strategy, asset, timeframe, period, or key account parameters change
  useEffect(() => {
    handleRunBacktest(false);
  }, [selectedStrategyId, pineCode, selectedAsset, selectedTimeframe, selectedPeriod, initialCapital, commissionPct, slippagePct, tradeSizePct, isCompounding, withdrawPct]);

  // Parameter Change Handler (User edits variables for custom testing)
  const handleInputChange = (id: string, value: any) => {
    setInputs((prev) =>
      prev.map((inp) => (inp.id === id ? { ...inp, value } : inp))
    );
  };

  // Helper to apply pair-specific parameter overrides if available
  const applyPairSpecificConfig = (
    strategy: PinePresetStrategy,
    asset: AssetSymbol,
    baseInputs: StrategyInput[]
  ) => {
    const pairConfig = strategy.pairConfigs?.[asset];
    if (pairConfig) {
      if (pairConfig.timeframe) {
        setSelectedTimeframe(pairConfig.timeframe);
      }
      if (pairConfig.period) {
        setSelectedPeriod(pairConfig.period);
      }
      if (pairConfig.inputs) {
        const updatedInputs = baseInputs.map((baseInp) => {
          const overrideVal = pairConfig.inputs?.[baseInp.id];
          return {
            ...baseInp,
            value: overrideVal !== undefined ? overrideVal : baseInp.value,
          };
        });
        setInputs(updatedInputs);
      } else {
        setInputs(baseInputs.map((inp) => ({ ...inp })));
      }
    } else {
      setInputs(baseInputs.map((inp) => ({ ...inp })));
    }
  };

  // Select Preset/Strategy Handler (Auto-populates and resets variables to recommended defaults)
  const handleSelectPreset = (preset: PinePresetStrategy) => {
    setSelectedStrategyId(preset.id);
    setStrategyTitle(preset.title);
    setPineCode(preset.pineCode);
    const targetAsset = preset.defaultAsset;
    setSelectedAsset(targetAsset);

    // Set fallback timeframe and period
    setSelectedTimeframe(preset.defaultTimeframe);
    setSelectedPeriod(preset.defaultPeriod || '1Y');

    // Apply pair-specific parameters if configured
    applyPairSpecificConfig(preset, targetAsset, preset.inputs);
  };

  // Asset Pair Change Handler (Auto-applies strategy settings tuned for that pair)
  const handleAssetChange = (newAsset: AssetSymbol) => {
    setSelectedAsset(newAsset);
    const currentStrat = PRESET_STRATEGIES.find((s) => s.id === selectedStrategyId);
    if (!currentStrat) return;

    const pairConfig = currentStrat.pairConfigs?.[newAsset];
    if (pairConfig) {
      if (pairConfig.timeframe) {
        setSelectedTimeframe(pairConfig.timeframe);
      }
      if (pairConfig.period) {
        setSelectedPeriod(pairConfig.period);
      }
      if (pairConfig.inputs) {
        setInputs(
          currentStrat.inputs.map((baseInp) => {
            const overrideVal = pairConfig.inputs?.[baseInp.id];
            return {
              ...baseInp,
              value: overrideVal !== undefined ? overrideVal : baseInp.value,
            };
          })
        );
      }
      const noteStr = pairConfig.notes ? ` (${pairConfig.notes})` : '';
      addToast(
        'Optimal Pair Parameters Applied',
        `Configured settings for ${newAsset}${noteStr}`,
        'info'
      );
    } else {
      // Revert to strategy base defaults for uncalibrated pair
      setInputs(currentStrat.inputs.map((inp) => ({ ...inp })));
      addToast('Asset Pair Changed', `Switched active pair to ${newAsset}`, 'info');
    }
  };

  // Select Strategy by ID from Top Dropdown
  const handleSelectStrategyById = (id: string) => {
    const found = PRESET_STRATEGIES.find((s) => s.id === id) || PRESET_STRATEGIES[0];
    handleSelectPreset(found);
  };

  // Reset current strategy back to its recommended defaults
  const handleResetToRecommended = () => {
    const found = PRESET_STRATEGIES.find((s) => s.id === selectedStrategyId) || PRESET_STRATEGIES[0];
    handleSelectPreset(found);
    addToast('Reset to Defaults', `Variables restored to recommended defaults`, 'reset');
  };

  // AI Generated Strategy Apply Handler
  const handleApplyAIGeneratedStrategy = (data: {
    title: string;
    description: string;
    pineCode: string;
    inputs?: any[];
  }) => {
    setStrategyTitle(data.title);
    setPineCode(data.pineCode);
    if (data.inputs && Array.isArray(data.inputs) && data.inputs.length > 0) {
      setInputs(
        data.inputs.map((inp, idx) => ({
          id: `inp-${idx}`,
          name: inp.name || `Param ${idx + 1}`,
          type: inp.type || 'int',
          value: parseFloat(inp.defaultValue) || 14,
          min: 1,
          max: 200,
        }))
      );
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      theme === 'designer' 
        ? 'designer-theme bg-[#faf7f2] text-[#1a1412]' 
        : theme === 'light' 
        ? 'light-theme bg-slate-50 text-slate-900' 
        : 'dark-theme bg-slate-950 text-slate-100'
    }`}>
      
      {/* Top Header Navbar with Recommended Strategy Dropdown, Theme & Period Selection */}
      <Navbar
        strategyTitle={strategyTitle}
        selectedStrategyId={selectedStrategyId}
        onSelectStrategyById={handleSelectStrategyById}
        selectedAsset={selectedAsset}
        selectedTimeframe={selectedTimeframe}
        selectedPeriod={selectedPeriod}
        onAssetChange={handleAssetChange}
        onTimeframeChange={setSelectedTimeframe}
        onPeriodChange={setSelectedPeriod}
        onRunBacktest={() => handleRunBacktest(true)}
        onResetToRecommended={handleResetToRecommended}
        onOpenAIGenerator={() => setIsAIGeneratorOpen(true)}
        onOpenAudit={() => setIsAIAuditOpen(true)}
        onOpenPythonExport={() => setIsPythonExportOpen(true)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        isBacktesting={isBacktesting}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mcpCredits={mcpCredits}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden items-center justify-around bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('chart')}
            className={`flex-1 py-2 text-center rounded-lg transition ${activeTab === 'chart' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
          >
            Chart
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex-1 py-2 text-center rounded-lg transition ${activeTab === 'editor' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
          >
            Code
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex-1 py-2 text-center rounded-lg transition ${activeTab === 'report' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
          >
            Analytics
          </button>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Main Visual Display (3 columns on desktop) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {activeTab === 'chart' && (
              <StrategyChart
                candles={candles}
                indicators={backtestResult.indicators}
                trades={backtestResult.trades}
                selectedTradeId={selectedTradeId}
                onSelectTrade={setSelectedTradeId}
                symbol={selectedAsset}
                timeframe={selectedTimeframe}
              />
            )}

            {activeTab === 'editor' && (
              <PineScriptEditor
                pineCode={pineCode}
                onChangePineCode={setPineCode}
                onRunBacktest={handleRunBacktest}
                onOpenAIGenerator={() => setIsAIGeneratorOpen(true)}
                onOpenAudit={() => setIsAIAuditOpen(true)}
                onOpenPythonExport={() => setIsPythonExportOpen(true)}
                isBacktesting={isBacktesting}
              />
            )}

            {activeTab === 'report' && (
              <BacktestReport
                result={backtestResult}
                selectedTradeId={selectedTradeId}
                onSelectTrade={setSelectedTradeId}
              />
            )}

            {/* Performance analytics summary strip under Chart tab */}
            {activeTab === 'chart' && (
              <BacktestReport
                result={backtestResult}
                selectedTradeId={selectedTradeId}
                onSelectTrade={setSelectedTradeId}
              />
            )}

          </div>

          {/* Right Controls Panel with Variable Reset & Backtest Period (1 column on desktop) */}
          <div className="lg:col-span-1">
            <StrategyInputsPanel
              inputs={inputs}
              onInputChange={handleInputChange}
              onResetToRecommended={handleResetToRecommended}
              selectedStrategyId={selectedStrategyId}
              onSelectStrategyById={handleSelectStrategyById}
              initialCapital={initialCapital}
              onCapitalChange={setInitialCapital}
              tradeSizePct={tradeSizePct}
              onTradeSizeChange={setTradeSizePct}
              commissionPct={commissionPct}
              onCommissionChange={setCommissionPct}
              slippagePct={slippagePct}
              onSlippageChange={setSlippagePct}
              isCompounding={isCompounding}
              onCompoundingChange={setIsCompounding}
              withdrawPct={withdrawPct}
              onWithdrawPctChange={setWithdrawPct}
              selectedAsset={selectedAsset}
              onAssetChange={handleAssetChange}
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={setSelectedTimeframe}
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
              onRunBacktest={() => handleRunBacktest(true)}
              isBacktesting={isBacktesting}
            />
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className={`border-t py-6 px-4 transition-colors ${
        theme === 'designer'
          ? 'bg-[#1a1412] border-[#2e231f] text-[#dcd0bc]'
          : theme === 'light' 
          ? 'bg-white border-slate-200 text-slate-600' 
          : 'bg-slate-900 border-slate-800 text-slate-400'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wide">PineStudio Pro</span>
            <span className="opacity-40">•</span>
            <span>Quantitative Strategy Engine</span>
          </div>

          {/* Powered by Shadowflash Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold tracking-tight text-[11px] shadow-sm">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Powered by Shadowflash</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AIGeneratorModal
        isOpen={isAIGeneratorOpen}
        onClose={() => setIsAIGeneratorOpen(false)}
        onApplyGeneratedStrategy={handleApplyAIGeneratedStrategy}
        selectedAsset={selectedAsset}
        selectedTimeframe={selectedTimeframe}
      />

      <AIAuditModal
        isOpen={isAIAuditOpen}
        onClose={() => setIsAIAuditOpen(false)}
        pineCode={pineCode}
      />

      <PythonExportModal
        isOpen={isPythonExportOpen}
        onClose={() => setIsPythonExportOpen(false)}
        pineCode={pineCode}
      />

      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectPreset={handleSelectPreset}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

    </div>
  );
}

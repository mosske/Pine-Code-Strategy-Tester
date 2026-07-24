import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StrategyChart } from './components/StrategyChart';
import { PineScriptEditor } from './components/PineScriptEditor';
import { BacktestReport } from './components/BacktestReport';
import { StrategyInputsPanel } from './components/StrategyInputsPanel';
import { AIGeneratorModal } from './components/AIGeneratorModal';
import { AIAuditModal } from './components/AIAuditModal';
import { PythonExportModal } from './components/PythonExportModal';
import { PresetsModal } from './components/PresetsModal';

import { PRESET_STRATEGIES } from './data/presetStrategies';
import { generateCandles, runStrategyBacktest } from './utils/backtestEngine';
import { AssetSymbol, Timeframe, StrategyInput, BacktestResult, PinePresetStrategy } from './types';

export default function App() {
  // Active Strategy State
  const [strategyTitle, setStrategyTitle] = useState<string>(PRESET_STRATEGIES[0].title);
  const [pineCode, setPineCode] = useState<string>(PRESET_STRATEGIES[0].pineCode);
  const [inputs, setInputs] = useState<StrategyInput[]>(PRESET_STRATEGIES[0].inputs);
  const [selectedAsset, setSelectedAsset] = useState<AssetSymbol>('BTC/USDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1H');

  // Trading Costs & Account Capital
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [commissionPct, setCommissionPct] = useState<number>(0.075);
  const [slippagePct, setSlippagePct] = useState<number>(0.02);

  // UI Tabs & Selected Trade State
  const [activeTab, setActiveTab] = useState<'chart' | 'editor' | 'report'>('chart');
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [isBacktesting, setIsBacktesting] = useState<boolean>(false);

  // Modals Visibility
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState<boolean>(false);
  const [isAIAuditOpen, setIsAIAuditOpen] = useState<boolean>(false);
  const [isPythonExportOpen, setIsPythonExportOpen] = useState<boolean>(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);

  // Generate Candles dataset
  const candles = useMemo(() => {
    return generateCandles(selectedAsset, selectedTimeframe, 300);
  }, [selectedAsset, selectedTimeframe]);

  // Execute Backtest
  const [backtestResult, setBacktestResult] = useState<BacktestResult>(() => {
    return runStrategyBacktest(candles, inputs, pineCode, initialCapital, commissionPct, slippagePct);
  });

  const handleRunBacktest = useCallback(() => {
    setIsBacktesting(true);
    setTimeout(() => {
      const res = runStrategyBacktest(candles, inputs, pineCode, initialCapital, commissionPct, slippagePct);
      setBacktestResult(res);
      setIsBacktesting(false);
    }, 150);
  }, [candles, inputs, pineCode, initialCapital, commissionPct, slippagePct]);

  // Re-run backtest whenever inputs or candles change
  useEffect(() => {
    handleRunBacktest();
  }, [selectedAsset, selectedTimeframe, initialCapital, commissionPct, slippagePct]);

  // Parameter Change Handler
  const handleInputChange = (id: string, value: any) => {
    setInputs((prev) =>
      prev.map((inp) => (inp.id === id ? { ...inp, value } : inp))
    );
  };

  // Select Preset Handler
  const handleSelectPreset = (preset: PinePresetStrategy) => {
    setStrategyTitle(preset.title);
    setPineCode(preset.pineCode);
    setInputs(preset.inputs);
    setSelectedAsset(preset.defaultAsset);
    setSelectedTimeframe(preset.defaultTimeframe);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Top Header Navbar */}
      <Navbar
        strategyTitle={strategyTitle}
        selectedAsset={selectedAsset}
        selectedTimeframe={selectedTimeframe}
        onAssetChange={setSelectedAsset}
        onTimeframeChange={setSelectedTimeframe}
        onRunBacktest={handleRunBacktest}
        onOpenAIGenerator={() => setIsAIGeneratorOpen(true)}
        onOpenAudit={() => setIsAIAuditOpen(true)}
        onOpenPythonExport={() => setIsPythonExportOpen(true)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        isBacktesting={isBacktesting}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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

            {/* Quick summary strip under Chart tab */}
            {activeTab === 'chart' && (
              <BacktestReport
                result={backtestResult}
                selectedTradeId={selectedTradeId}
                onSelectTrade={setSelectedTradeId}
              />
            )}

          </div>

          {/* Right Controls Panel (1 column on desktop) */}
          <div className="lg:col-span-1">
            <StrategyInputsPanel
              inputs={inputs}
              onInputChange={handleInputChange}
              initialCapital={initialCapital}
              onCapitalChange={setInitialCapital}
              commissionPct={commissionPct}
              onCommissionChange={setCommissionPct}
              slippagePct={slippagePct}
              onSlippageChange={setSlippagePct}
              selectedAsset={selectedAsset}
              onAssetChange={setSelectedAsset}
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={setSelectedTimeframe}
              onRunBacktest={handleRunBacktest}
              isBacktesting={isBacktesting}
            />
          </div>

        </div>

      </main>

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

    </div>
  );
}

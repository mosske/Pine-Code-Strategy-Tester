import React, { useState } from 'react';
import { BacktestResult, TradeLogItem } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Award, 
  AlertTriangle, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Layers,
  Activity,
  Banknote
} from 'lucide-react';

interface BacktestReportProps {
  result: BacktestResult;
  selectedTradeId?: string | null;
  onSelectTrade?: (tradeId: string) => void;
}

export const BacktestReport: React.FC<BacktestReportProps> = ({
  result,
  selectedTradeId,
  onSelectTrade,
}) => {
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'WINNERS' | 'LOSERS'>('ALL');

  const filteredTrades = result.trades.filter((t) => {
    if (tradeFilter === 'WINNERS') return t.pnl > 0;
    if (tradeFilter === 'LOSERS') return t.pnl < 0;
    return true;
  });

  const isProfitable = result.netProfit >= 0;

  // Max and min for equity curve line SVG
  const equityValues = result.equityCurve.map((e) => e.equity);
  const benchmarkValues = result.equityCurve.map((e) => e.benchmark);
  const allEqValues = [...equityValues, ...benchmarkValues];

  const minEq = Math.min(...allEqValues) * 0.98;
  const maxEq = Math.max(...allEqValues) * 1.02;

  const svgWidth = 800;
  const svgHeight = 220;

  const getEqY = (val: number) => {
    const range = maxEq - minEq || 1;
    return svgHeight - ((val - minEq) / range) * (svgHeight - 20) - 10;
  };

  // Generate SVG Path for Strategy Equity Curve
  let strategyPathD = '';
  result.equityCurve.forEach((e, idx) => {
    const x = (idx / (result.equityCurve.length - 1 || 1)) * svgWidth;
    const y = getEqY(e.equity);
    if (idx === 0) strategyPathD += `M ${x} ${y}`;
    else strategyPathD += ` L ${x} ${y}`;
  });

  // Generate SVG Path for Buy & Hold Benchmark
  let benchmarkPathD = '';
  result.equityCurve.forEach((e, idx) => {
    const x = (idx / (result.equityCurve.length - 1 || 1)) * svgWidth;
    const y = getEqY(e.benchmark);
    if (idx === 0) benchmarkPathD += `M ${x} ${y}`;
    else benchmarkPathD += ` L ${x} ${y}`;
  });

  return (
    <div id="backtest-report-container" className="flex flex-col gap-6">
      
      {/* TradingKit MCP Execution & Parity Details Banner */}
      {result.isMcpEngine && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 p-4 sm:p-5 rounded-xl shadow-lg flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-100">
                    Executed on TradingKit MCP Cloud Engine
                  </h4>
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                    mcp.trader.dev
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Market: <span className="font-mono text-emerald-300 font-semibold">{result.mcpSymbol || 'BYBIT:BTCUSDT.P'}</span> {result.mcpMarket ? `(${result.mcpMarket})` : ''} • Execution Time: <span className="font-mono text-slate-200">{result.mcpDurationMs ? `${result.mcpDurationMs} ms` : 'Fast'}</span>
                </p>
              </div>
            </div>

            {/* Links or Result ID */}
            {result.mcpResultId && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-mono text-[11px] bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  ID: {result.mcpResultId.slice(0, 12)}...
                </span>
                {result.mcpBrowseUrl && (
                  <a 
                    href={result.mcpBrowseUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1 rounded text-xs transition"
                  >
                    View on Trader.dev ↗
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Parity Notes / User Hints */}
          {result.mcpParityNotes && result.mcpParityNotes.length > 0 && (
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg text-xs font-mono text-slate-300 flex flex-col gap-1 max-h-32 overflow-y-auto">
              <span className="text-emerald-400 font-semibold text-[11px] uppercase tracking-wider">
                TradingView Parity & Engine Match Profile:
              </span>
              {result.mcpParityNotes.map((note, idx) => (
                <div key={`parity-${idx}`} className="whitespace-pre-wrap text-[11px] text-slate-400 leading-relaxed">
                  {note}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        
        {/* Net Profit Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Net Profit</span>
            {isProfitable ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className={`text-xl font-extrabold font-mono ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
            {result.netProfit >= 0 ? `+$${result.netProfit.toLocaleString()}` : `-$${Math.abs(result.netProfit).toLocaleString()}`}
          </div>
          <div className={`text-xs font-mono mt-1 ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
            {result.netProfitPercent >= 0 ? `+${result.netProfitPercent}%` : `${result.netProfitPercent}%`}
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Win Rate</span>
            <Award className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-100">
            {result.winRate}%
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">
            {result.winningTrades}W / {result.losingTrades}L ({result.totalTrades} total)
          </div>
        </div>

        {/* Total Withdrawn Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Withdrawn</span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-400">
            ${(result.totalWithdrawn || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">
            Accumulated payouts
          </div>
        </div>

        {/* Profit Factor Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Profit Factor</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-extrabold font-mono text-purple-300">
            {result.profitFactor}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">
            Gross Profit / Loss ratio
          </div>
        </div>

        {/* Max Drawdown Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Max Drawdown</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-extrabold font-mono text-rose-400">
            -{result.maxDrawdownPercent}%
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">
            -${result.maxDrawdown.toLocaleString()} peak-to-valley
          </div>
        </div>

        {/* Sharpe Ratio Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Sharpe Ratio</span>
            <BarChart3 className={`w-4 h-4 ${result.sharpeRatio <= 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div className={`text-xl font-extrabold font-mono ${result.sharpeRatio <= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {result.sharpeRatio}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">
            Sortino: {result.sortinoRatio}
          </div>
        </div>

        {/* Benchmark Buy & Hold Comparison */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Buy & Hold Return</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold font-mono text-amber-300">
            {result.buyHoldReturnPercent >= 0 ? `+${result.buyHoldReturnPercent}%` : `${result.buyHoldReturnPercent}%`}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">
            Benchmark Asset
          </div>
        </div>

      </div>

      {/* Cumulative Equity Curve Chart vs Buy & Hold Benchmark */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Cumulative Equity Growth vs Buy & Hold Benchmark
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Initial Capital: ${result.initialCapital.toLocaleString()} → Final Equity: ${result.finalEquity.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-emerald-400 rounded-full inline-block"></span>
              <span className="text-emerald-300 font-bold">Strategy ({result.netProfitPercent}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-amber-400/60 rounded-full inline-block"></span>
              <span className="text-amber-300/80">Benchmark ({result.buyHoldReturnPercent}%)</span>
            </div>
          </div>
        </div>

        {/* SVG Equity Line Chart */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
            {/* Gridlines */}
            {[0.25, 0.5, 0.75].map((ratio, idx) => (
              <line
                key={`eq-grid-${idx}`}
                x1="0"
                y1={svgHeight * ratio}
                x2={svgWidth}
                y2={svgHeight * ratio}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}

            {/* Benchmark Path */}
            <path
              d={benchmarkPathD}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.65"
            />

            {/* Strategy Equity Path */}
            <path
              d={strategyPathD}
              fill="none"
              stroke={isProfitable ? '#10b981' : '#f43f5e'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Trade Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Executed Trade History Log ({result.trades.length} trades)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any row to pinpoint trade entry and exit on the price chart
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => setTradeFilter('ALL')}
              className={`px-3 py-1 rounded transition ${tradeFilter === 'ALL' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All ({result.trades.length})
            </button>
            <button
              onClick={() => setTradeFilter('WINNERS')}
              className={`px-3 py-1 rounded transition ${tradeFilter === 'WINNERS' ? 'bg-emerald-950 text-emerald-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Winners ({result.winningTrades})
            </button>
            <button
              onClick={() => setTradeFilter('LOSERS')}
              className={`px-3 py-1 rounded transition ${tradeFilter === 'LOSERS' ? 'bg-rose-950 text-rose-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Losers ({result.losingTrades})
            </button>
          </div>
        </div>

        {/* Table Content - Fixed Height Scrollable Table */}
        <div className="max-h-[460px] overflow-y-auto overflow-x-auto rounded-lg border border-slate-800 relative shadow-inner">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="sticky top-0 z-10 bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px] shadow-sm">
              <tr>
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Entry Time</th>
                <th className="py-3 px-3">Exit Time</th>
                <th className="py-3 px-3 text-right">Entry Price</th>
                <th className="py-3 px-3 text-right">Exit Price</th>
                <th className="py-3 px-3 text-right">PnL ($)</th>
                <th className="py-3 px-3 text-right">PnL (%)</th>
                <th className="py-3 px-3">Exit Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 bg-slate-900/50">
              {filteredTrades.map((t, idx) => {
                const isWin = t.pnl >= 0;
                const isSelected = selectedTradeId === t.id;

                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTrade?.(t.id)}
                    className={`cursor-pointer transition hover:bg-slate-800/80 ${
                      isSelected ? 'bg-emerald-950/60 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${t.type === 'LONG' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{t.entryTime}</td>
                    <td className="py-2.5 px-3 text-slate-300">{t.exitTime}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">${t.entryPrice.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">${t.exitPrice.toLocaleString()}</td>
                    <td className={`py-2.5 px-3 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? `+$${t.pnl.toLocaleString()}` : `-$${Math.abs(t.pnl).toLocaleString()}`}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnlPercent > 0 ? `+${t.pnlPercent}%` : `${t.pnlPercent}%`}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {t.exitReason}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredTrades.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No trades match the active filter criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

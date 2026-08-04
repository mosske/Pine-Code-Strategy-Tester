import React, { useState } from 'react';
import { BacktestResult, TradeLogItem } from '../types';
import { InteractiveEquityProfitCharts } from './InteractiveEquityProfitCharts';
import { TRADINGVIEW_PARITY_INSIGHTS } from '../data/tradingViewParityNotes';
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
  Banknote,
  Wallet,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Lightbulb
} from 'lucide-react';

interface BacktestReportProps {
  result: BacktestResult;
  selectedTradeId?: string | null;
  onSelectTrade?: (tradeId: string) => void;
  hideParityNotes?: boolean;
}

export const BacktestReport: React.FC<BacktestReportProps> = ({
  result,
  selectedTradeId,
  onSelectTrade,
  hideParityNotes = false,
}) => {
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'WINNERS' | 'LOSERS'>('ALL');
  const [showParityNotes, setShowParityNotes] = useState<boolean>(true);

  const filteredTrades = result.trades.filter((t) => {
    if (tradeFilter === 'WINNERS') return t.pnl > 0;
    if (tradeFilter === 'LOSERS') return t.pnl < 0;
    return true;
  });

  const isProfitable = result.netProfit >= 0;

  // Compute maximum consecutive winning and losing streaks from actual trade history
  let maxConsWins = result.maxConsecutiveWins || 0;
  let maxConsLosses = result.maxConsecutiveLosses || 0;

  if (result.trades && result.trades.length > 0) {
    let computedWins = 0;
    let computedLosses = 0;
    let currWins = 0;
    let currLosses = 0;

    result.trades.forEach((t) => {
      if (t.pnl > 0) {
        currWins++;
        currLosses = 0;
        if (currWins > computedWins) computedWins = currWins;
      } else if (t.pnl < 0) {
        currLosses++;
        currWins = 0;
        if (currLosses > computedLosses) computedLosses = currLosses;
      } else {
        currWins = 0;
        currLosses = 0;
      }
    });

    maxConsWins = computedWins;
    maxConsLosses = computedLosses;
  }

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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        
        {/* Total Account Balance Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Account Balance</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-100">
            ${result.finalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono truncate">
            {result.totalWithdrawn > 0
              ? `Trading Account (+$${result.totalWithdrawn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} withdrawn)`
              : `Principal ($${result.initialCapital.toLocaleString()}) + Net PnL`}
          </div>
        </div>

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

      {/* Interactive Time-Marked Equity Growth & Cumulative Profit Charts */}
      <InteractiveEquityProfitCharts result={result} />

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

          {/* Filter Tabs & Streak Stat Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium">
              <button
                onClick={() => setTradeFilter('ALL')}
                className={`px-3 py-1 rounded transition ${tradeFilter === 'ALL' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All ({result.trades.length})
              </button>
              <button
                onClick={() => setTradeFilter('WINNERS')}
                className={`px-3 py-1 rounded transition ${tradeFilter === 'WINNERS' ? 'bg-emerald-950 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Winners ({result.winningTrades})
              </button>
              <button
                onClick={() => setTradeFilter('LOSERS')}
                className={`px-3 py-1 rounded transition ${tradeFilter === 'LOSERS' ? 'bg-rose-950 text-rose-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Losers ({result.losingTrades})
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1.5 bg-slate-950/80 border border-emerald-900/60 rounded-lg text-emerald-400 flex items-center gap-1.5 shadow-sm">
                <span className="text-slate-400 font-sans text-[11px]">Max Consecutive Winners:</span>
                <span className="font-extrabold text-emerald-300">{maxConsWins}</span>
              </span>
              <span className="px-2.5 py-1.5 bg-slate-950/80 border border-rose-900/60 rounded-lg text-rose-400 flex items-center gap-1.5 shadow-sm">
                <span className="text-slate-400 font-sans text-[11px]">Max Consecutive Losers:</span>
                <span className="font-extrabold text-rose-300">{maxConsLosses}</span>
              </span>
            </div>
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

      {/* TradingView Parity & Discrepancy Insight Card */}
      {!hideParityNotes && (
        <div id="tradingview-parity-insights-card" className="bg-slate-900/90 border border-amber-500/30 rounded-xl overflow-hidden shadow-lg">
          <button
            onClick={() => setShowParityNotes(!showParityNotes)}
            className="w-full px-5 py-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 flex items-center justify-between hover:bg-slate-850 transition"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-amber-200">
                  TradingView Strategy Execution Parity & Discrepancy Resolution Guide
                </h3>
                <p className="text-[11px] text-slate-400">
                  Insights on why simple backtest engines diverge from TradingView & how our updated strategies ensure TV parity
                </p>
              </div>
            </div>
            <div className="text-slate-400 hover:text-slate-200 transition">
              {showParityNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showParityNotes && (
            <div className="p-5 border-t border-slate-800/80 bg-slate-950/60 grid grid-cols-1 md:grid-cols-2 gap-4">
              {TRADINGVIEW_PARITY_INSIGHTS.map((item, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-amber-300">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                      <strong className="text-rose-300 font-semibold">Issue: </strong>{item.cause}
                    </p>
                    <p className="text-[11px] text-emerald-300 leading-relaxed">
                      <strong className="text-emerald-400 font-semibold">Solution: </strong>{item.solution}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-850 text-[10px] font-mono text-slate-400">
                    {item.details}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Candle, IndicatorOverlay, TradeLogItem } from '../types';
import { Eye, EyeOff, Maximize2, RefreshCw, ZoomIn, ZoomOut, Info } from 'lucide-react';

interface StrategyChartProps {
  candles: Candle[];
  indicators: IndicatorOverlay[];
  trades: TradeLogItem[];
  selectedTradeId?: string | null;
  onSelectTrade?: (tradeId: string) => void;
  symbol: string;
  timeframe: string;
}

export const StrategyChart: React.FC<StrategyChartProps> = ({
  candles,
  indicators,
  trades,
  selectedTradeId,
  onSelectTrade,
  symbol,
  timeframe,
}) => {
  // Chart view states
  const [visibleCount, setVisibleCount] = useState<number>(100);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showSubchart, setShowSubchart] = useState<boolean>(true);
  const [showIndicators, setShowIndicators] = useState<boolean>(true);
  const [showTradesOnChart, setShowTradesOnChart] = useState<boolean>(true);

  // Slice visible candles to show the latest `visibleCount` candles
  const visibleCandles = useMemo(() => {
    if (candles.length <= visibleCount) return candles;
    return candles.slice(candles.length - visibleCount);
  }, [candles, visibleCount]);

  const startIndex = candles.length - visibleCandles.length;

  // Find min and max price for main chart scaling
  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (visibleCandles.length === 0) return { minPrice: 0, maxPrice: 100, maxVolume: 1000 };
    let minP = Infinity;
    let maxP = -Infinity;
    let maxVol = 0;

    visibleCandles.forEach((c) => {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    // Also include indicator overlay values if present
    if (showIndicators) {
      indicators.forEach((ind) => {
        if (!ind.isSubchart && ind.values) {
          for (let i = startIndex; i < candles.length; i++) {
            const val = ind.values[i];
            if (val !== null && val !== undefined) {
              if (val < minP) minP = val;
              if (val > maxP) maxP = val;
            }
          }
        }
      });
    }

    const padding = (maxP - minP) * 0.08 || 1;
    return {
      minPrice: Math.max(0, minP - padding),
      maxPrice: maxP + padding,
      maxVolume: maxVol || 1000,
    };
  }, [visibleCandles, indicators, showIndicators, startIndex, candles.length]);

  // Dimension constants for SVG layout
  const svgWidth = 1000;
  const mainChartHeight = showSubchart ? 380 : 520;
  const subchartHeight = showSubchart ? 140 : 0;
  const totalSvgHeight = mainChartHeight + subchartHeight + 30;

  const candleSlotWidth = svgWidth / visibleCandles.length;
  const candleBodyWidth = Math.max(1.5, candleSlotWidth * 0.65);

  // Helper coordinate mappers
  const getYCoordinate = (price: number): number => {
    const range = maxPrice - minPrice;
    if (range <= 0) return mainChartHeight / 2;
    return mainChartHeight - ((price - minPrice) / range) * (mainChartHeight - 20) - 10;
  };

  const getSubchartYCoordinate = (value: number, minVal: number = 0, maxVal: number = 100): number => {
    const topY = mainChartHeight + 15;
    const height = subchartHeight - 25;
    const range = maxVal - minVal;
    if (range <= 0) return topY + height / 2;
    return topY + height - ((value - minVal) / range) * height;
  };

  // Extract subchart indicators (e.g. RSI)
  const rsiIndicator = useMemo(() => {
    return indicators.find((ind) => ind.isSubchart || ind.type === 'rsi');
  }, [indicators]);

  // Find trades in visible range
  const visibleTrades = useMemo(() => {
    if (!showTradesOnChart) return [];
    return trades.filter(
      (t) =>
        (t.entryIndex >= startIndex && t.entryIndex < candles.length) ||
        (t.exitIndex >= startIndex && t.exitIndex < candles.length)
    );
  }, [trades, startIndex, candles.length, showTradesOnChart]);

  const activeHoverCandle = hoverIndex !== null ? visibleCandles[hoverIndex] : visibleCandles[visibleCandles.length - 1];

  return (
    <div id="strategy-chart-container" className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
      
      {/* Top Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
        
        {/* Symbol & Active Candle Summary */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-100">
            <span className="text-emerald-400 font-mono text-sm">{symbol}</span>
            <span className="text-slate-500 font-mono">· {timeframe}</span>
          </div>

          {activeHoverCandle && (
            <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] border-l border-slate-800 pl-3">
              <span className="text-slate-400">O: <strong className="text-slate-200">{activeHoverCandle.open}</strong></span>
              <span className="text-slate-400">H: <strong className="text-emerald-400">{activeHoverCandle.high}</strong></span>
              <span className="text-slate-400">L: <strong className="text-rose-400">{activeHoverCandle.low}</strong></span>
              <span className="text-slate-400">C: <strong className={activeHoverCandle.close >= activeHoverCandle.open ? 'text-emerald-400' : 'text-rose-400'}>{activeHoverCandle.close}</strong></span>
              <span className="text-slate-400 hidden md:inline">Vol: <strong className="text-slate-300">{activeHoverCandle.volume.toLocaleString()}</strong></span>
            </div>
          )}
        </div>

        {/* Visibility Toggles & Zoom */}
        <div className="flex items-center gap-2">
          {/* Toggle Trades */}
          <button
            onClick={() => setShowTradesOnChart(!showTradesOnChart)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition ${
              showTradesOnChart
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle Trade Entry/Exit Markers"
          >
            {showTradesOnChart ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>Trades ({trades.length})</span>
          </button>

          {/* Toggle Indicators */}
          <button
            onClick={() => setShowIndicators(!showIndicators)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition ${
              showIndicators
                ? 'bg-blue-950/80 border-blue-700 text-blue-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle Overlay Indicators"
          >
            <span>Indicators</span>
          </button>

          {/* Toggle Subchart */}
          <button
            onClick={() => setShowSubchart(!showSubchart)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition ${
              showSubchart
                ? 'bg-purple-950/80 border-purple-700 text-purple-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle Oscillator Subchart"
          >
            <span>RSI Subchart</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 ml-1">
            <button
              onClick={() => setVisibleCount((prev) => Math.min(candles.length, prev + 30))}
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded"
              title="Zoom Out (Show More Bars)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[10px] font-mono text-slate-400">{visibleCount} bars</span>
            <button
              onClick={() => setVisibleCount((prev) => Math.max(30, prev - 30))}
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded"
              title="Zoom In (Show Fewer Bars)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full overflow-hidden rounded-lg bg-slate-950 border border-slate-800/80 shadow-inner">
        <svg
          viewBox={`0 0 ${svgWidth} ${totalSvgHeight}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="bullishVolGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="bearishVolGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
            const y = mainChartHeight * ratio;
            const priceVal = maxPrice - ratio * (maxPrice - minPrice);
            return (
              <g key={`grid-${idx}`}>
                <line
                  x1="0"
                  y1={y}
                  x2={svgWidth - 60}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={svgWidth - 52}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {priceVal.toFixed(priceVal > 100 ? 1 : 3)}
                </text>
              </g>
            );
          })}

          {/* Volume Bars (rendered behind candles) */}
          {visibleCandles.map((c, idx) => {
            const x = idx * candleSlotWidth + candleSlotWidth / 2;
            const isBullish = c.close >= c.open;
            const volHeight = (c.volume / maxVolume) * (mainChartHeight * 0.22);
            const volY = mainChartHeight - volHeight;

            return (
              <rect
                key={`vol-${idx}`}
                x={x - candleBodyWidth / 2}
                y={volY}
                width={candleBodyWidth}
                height={volHeight}
                fill={isBullish ? 'url(#bullishVolGrad)' : 'url(#bearishVolGrad)'}
              />
            );
          })}

          {/* Candlesticks (Wicks and Bodies) */}
          {visibleCandles.map((c, idx) => {
            const x = idx * candleSlotWidth + candleSlotWidth / 2;
            const openY = getYCoordinate(c.open);
            const closeY = getYCoordinate(c.close);
            const highY = getYCoordinate(c.high);
            const lowY = getYCoordinate(c.low);

            const isBullish = c.close >= c.open;
            const color = isBullish ? '#10b981' : '#ef4444'; // emerald green / rose red
            const bodyY = Math.min(openY, closeY);
            const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

            const isHovered = hoverIndex === idx;

            return (
              <g
                key={`candle-${idx}`}
                onMouseEnter={() => setHoverIndex(idx)}
                className="cursor-crosshair"
              >
                {/* Wick */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={color}
                  strokeWidth={isHovered ? 2 : 1}
                />
                {/* Body */}
                <rect
                  x={x - candleBodyWidth / 2}
                  y={bodyY}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={color}
                  stroke={color}
                  strokeWidth="0.5"
                  rx="0.5"
                  className={isHovered ? 'filter brightness-125' : ''}
                />
              </g>
            );
          })}

          {/* Indicator Overlays (EMAs, Bollinger Bands, SuperTrend) */}
          {showIndicators &&
            indicators.map((ind, indIdx) => {
              if (ind.isSubchart || !ind.values) return null;

              // Build SVG path string for overlay line
              let pathD = '';
              visibleCandles.forEach((_, idx) => {
                const globalIdx = startIndex + idx;
                const val = ind.values[globalIdx];
                if (val !== null && val !== undefined) {
                  const x = idx * candleSlotWidth + candleSlotWidth / 2;
                  const y = getYCoordinate(val);
                  if (pathD === '') {
                    pathD += `M ${x} ${y}`;
                  } else {
                    pathD += ` L ${x} ${y}`;
                  }
                }
              });

              if (!pathD) return null;

              return (
                <path
                  key={`ind-${indIdx}`}
                  d={pathD}
                  fill="none"
                  stroke={ind.color}
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
              );
            })}

          {/* Trade Markers (Green ▲ Long Entry, Red ▼ Exit/Short) */}
          {visibleTrades.map((trade) => {
            const isEntryVisible = trade.entryIndex >= startIndex && trade.entryIndex < candles.length;
            const isExitVisible = trade.exitIndex >= startIndex && trade.exitIndex < candles.length;

            const isSelected = selectedTradeId === trade.id;

            return (
              <g key={`trade-group-${trade.id}`}>
                {/* Long Entry Marker */}
                {isEntryVisible && (
                  (() => {
                    const localIdx = trade.entryIndex - startIndex;
                    const x = localIdx * candleSlotWidth + candleSlotWidth / 2;
                    const candle = visibleCandles[localIdx];
                    if (!candle) return null;
                    const y = getYCoordinate(candle.low) + 14;

                    return (
                      <g
                        className="cursor-pointer transition transform hover:scale-125"
                        onClick={() => onSelectTrade?.(trade.id)}
                      >
                        {/* Green ▲ Triangle */}
                        <polygon
                          points={`${x},${y - 12} ${x - 6},${y} ${x + 6},${y}`}
                          fill="#10b981"
                          stroke="#064e3b"
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={y + 11}
                          fill="#34d399"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          BUY
                        </text>
                      </g>
                    );
                  })()
                )}

                {/* Exit Marker */}
                {isExitVisible && (
                  (() => {
                    const localIdx = trade.exitIndex - startIndex;
                    const x = localIdx * candleSlotWidth + candleSlotWidth / 2;
                    const candle = visibleCandles[localIdx];
                    if (!candle) return null;
                    const y = getYCoordinate(candle.high) - 14;
                    const isWin = trade.pnl >= 0;

                    return (
                      <g
                        className="cursor-pointer transition transform hover:scale-125"
                        onClick={() => onSelectTrade?.(trade.id)}
                      >
                        {/* Red ▼ Triangle */}
                        <polygon
                          points={`${x},${y + 12} ${x - 6},${y} ${x + 6},${y}`}
                          fill={isWin ? '#3b82f6' : '#ef4444'}
                          stroke="#0f172a"
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={y - 4}
                          fill={isWin ? '#60a5fa' : '#f87171'}
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {trade.pnlPercent > 0 ? `+${trade.pnlPercent}%` : `${trade.pnlPercent}%`}
                        </text>
                      </g>
                    );
                  })()
                )}

                {/* Dashed line connecting Entry to Exit for Selected Trade */}
                {isSelected && isEntryVisible && isExitVisible && (
                  (() => {
                    const entryLocalIdx = trade.entryIndex - startIndex;
                    const exitLocalIdx = trade.exitIndex - startIndex;
                    const x1 = entryLocalIdx * candleSlotWidth + candleSlotWidth / 2;
                    const y1 = getYCoordinate(trade.entryPrice);
                    const x2 = exitLocalIdx * candleSlotWidth + candleSlotWidth / 2;
                    const y2 = getYCoordinate(trade.exitPrice);

                    return (
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={trade.pnl >= 0 ? '#10b981' : '#ef4444'}
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                    );
                  })()
                )}
              </g>
            );
          })}

          {/* Crosshair & Tooltip Overlay on Hover */}
          {hoverIndex !== null && visibleCandles[hoverIndex] && (
            <g key="crosshair-overlay">
              {(() => {
                const x = hoverIndex * candleSlotWidth + candleSlotWidth / 2;
                const candle = visibleCandles[hoverIndex];
                const y = getYCoordinate(candle.close);

                return (
                  <>
                    {/* Vertical Line */}
                    <line
                      x1={x}
                      y1="0"
                      x2={x}
                      y2={mainChartHeight}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    {/* Horizontal Line */}
                    <line
                      x1="0"
                      y1={y}
                      x2={svgWidth - 60}
                      y2={y}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    {/* Price Tag Box */}
                    <rect
                      x={svgWidth - 58}
                      y={y - 9}
                      width="54"
                      height="18"
                      fill="#0f172a"
                      stroke="#475569"
                      rx="3"
                    />
                    <text
                      x={svgWidth - 31}
                      y={y + 3}
                      fill="#f8fafc"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {candle.close}
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {/* Subchart Area (RSI Oscillator) */}
          {showSubchart && rsiIndicator && rsiIndicator.values && (
            <g key="subchart-pane">
              {/* Divider Line */}
              <line
                x1="0"
                y1={mainChartHeight + 10}
                x2={svgWidth}
                y2={mainChartHeight + 10}
                stroke="#334155"
                strokeWidth="1"
              />

              {/* Subchart Label */}
              <text
                x="10"
                y={mainChartHeight + 25}
                fill="#a855f7"
                fontSize="11"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                RSI (14) Oscillator
              </text>

              {/* 70 Overbought & 30 Oversold Threshold Lines */}
              <line
                x1="0"
                y1={getSubchartYCoordinate(70)}
                x2={svgWidth - 60}
                y2={getSubchartYCoordinate(70)}
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <text x={svgWidth - 52} y={getSubchartYCoordinate(70) + 3} fill="#ef4444" fontSize="9" fontFamily="monospace">70</text>

              <line
                x1="0"
                y1={getSubchartYCoordinate(30)}
                x2={svgWidth - 60}
                y2={getSubchartYCoordinate(30)}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <text x={svgWidth - 52} y={getSubchartYCoordinate(30) + 3} fill="#10b981" fontSize="9" fontFamily="monospace">30</text>

              {/* RSI Line */}
              {(() => {
                let rsiPath = '';
                visibleCandles.forEach((_, idx) => {
                  const globalIdx = startIndex + idx;
                  const rsiVal = rsiIndicator.values![globalIdx];
                  if (rsiVal !== null && rsiVal !== undefined) {
                    const x = idx * candleSlotWidth + candleSlotWidth / 2;
                    const y = getSubchartYCoordinate(rsiVal);
                    if (rsiPath === '') rsiPath += `M ${x} ${y}`;
                    else rsiPath += ` L ${x} ${y}`;
                  }
                });

                return (
                  <path
                    d={rsiPath}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                );
              })()}
            </g>
          )}

        </svg>
      </div>

      {/* Chart Legend & Indicators Key Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Fast EMA (9)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span>Slow EMA (21)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
            <span>RSI Oscillator</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <span className="text-emerald-400 font-bold">▲ BUY</span>
            <span className="text-slate-500">Long Entry</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-rose-400 font-bold">▼ EXIT</span>
            <span className="text-slate-500">Exit / Take Profit / Stop</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
          <Info className="w-3 h-3 text-slate-400" />
          <span>Click any trade in the log to inspect entry/exit on chart</span>
        </div>
      </div>

    </div>
  );
};

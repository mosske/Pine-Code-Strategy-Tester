import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Candle, IndicatorOverlay, TradeLogItem } from '../types';
import { 
  Eye, 
  EyeOff, 
  ZoomIn, 
  ZoomOut, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  SkipBack, 
  SkipForward, 
  Target, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight,
  Crosshair,
  Sliders
} from 'lucide-react';

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
  const [scrollOffset, setScrollOffset] = useState<number>(0); // 0 = showing newest candles at the right
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showSubchart, setShowSubchart] = useState<boolean>(true);
  const [showIndicators, setShowIndicators] = useState<boolean>(true);
  const [showTradesOnChart, setShowTradesOnChart] = useState<boolean>(true);
  const [showTpSlLines, setShowTpSlLines] = useState<boolean>(true);

  // Drag & Touch panning & pinch zoom state
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartOffsetRef = useRef<number>(0);
  const touchPinchDistRef = useRef<number | null>(null);
  const touchStartVisibleCountRef = useRef<number>(100);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Maximum allowed scroll offset
  const maxScroll = Math.max(0, candles.length - visibleCount);

  // Ensure scrollOffset stays within bounds when candles or visibleCount change
  useEffect(() => {
    setScrollOffset((prev) => Math.min(Math.max(0, prev), Math.max(0, candles.length - visibleCount)));
  }, [candles.length, visibleCount]);

  // Auto-scroll to selected trade when selectedTradeId changes
  useEffect(() => {
    if (selectedTradeId) {
      const trade = trades.find((t) => t.id === selectedTradeId);
      if (trade) {
        const midTradeIndex = Math.floor((trade.entryIndex + trade.exitIndex) / 2);
        const targetOffset = Math.max(0, Math.min(candles.length - visibleCount, candles.length - (midTradeIndex + Math.floor(visibleCount / 2))));
        setScrollOffset(targetOffset);
      }
    }
  }, [selectedTradeId, trades, candles.length, visibleCount]);

  // Calculate visible candles range
  const endIndex = Math.min(candles.length, candles.length - scrollOffset);
  const startIndex = Math.max(0, endIndex - visibleCount);
  const visibleCandles = useMemo(() => {
    return candles.slice(startIndex, endIndex);
  }, [candles, startIndex, endIndex]);

  // Find min and max price for chart scaling
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

    // Also include TP and SL prices of selected trade if present
    if (selectedTradeId) {
      const selectedTrade = trades.find((t) => t.id === selectedTradeId);
      if (selectedTrade) {
        if (selectedTrade.takeProfitPrice) {
          if (selectedTrade.takeProfitPrice < minP) minP = selectedTrade.takeProfitPrice;
          if (selectedTrade.takeProfitPrice > maxP) maxP = selectedTrade.takeProfitPrice;
        }
        if (selectedTrade.stopLossPrice) {
          if (selectedTrade.stopLossPrice < minP) minP = selectedTrade.stopLossPrice;
          if (selectedTrade.stopLossPrice > maxP) maxP = selectedTrade.stopLossPrice;
        }
        if (selectedTrade.entryPrice) {
          if (selectedTrade.entryPrice < minP) minP = selectedTrade.entryPrice;
          if (selectedTrade.entryPrice > maxP) maxP = selectedTrade.entryPrice;
        }
      }
    }

    // Include indicator overlays
    if (showIndicators) {
      indicators.forEach((ind) => {
        if (!ind.isSubchart && ind.values) {
          for (let i = startIndex; i < endIndex; i++) {
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
  }, [visibleCandles, indicators, showIndicators, startIndex, endIndex, selectedTradeId, trades]);

  // Dimensions
  const svgWidth = 1000;
  const mainChartHeight = showSubchart ? 380 : 520;
  const subchartHeight = showSubchart ? 140 : 0;
  const totalSvgHeight = mainChartHeight + subchartHeight + 30;

  const candleSlotWidth = visibleCandles.length > 0 ? svgWidth / visibleCandles.length : 10;
  const candleBodyWidth = Math.max(1.5, candleSlotWidth * 0.65);

  // Coordinate helpers
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

  // Subchart RSI
  const rsiIndicator = useMemo(() => {
    return indicators.find((ind) => ind.isSubchart || ind.type === 'rsi');
  }, [indicators]);

  // Find trades visible in current range
  const visibleTrades = useMemo(() => {
    if (!showTradesOnChart) return [];
    return trades.filter(
      (t) =>
        (t.entryIndex >= startIndex && t.entryIndex < endIndex) ||
        (t.exitIndex >= startIndex && t.exitIndex < endIndex)
    );
  }, [trades, startIndex, endIndex, showTradesOnChart]);

  // Active trade details object
  const selectedTrade = useMemo(() => {
    return trades.find((t) => t.id === selectedTradeId) || null;
  }, [trades, selectedTradeId]);

  // Mouse & Touch Drag Handlers for Smooth Chart Sliding & Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = scrollOffset;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const containerWidth = chartContainerRef.current?.clientWidth || svgRef.current?.clientWidth || 1000;
    
    // Update hoverIndex for tooltip if hovering
    if (chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const candleIndex = Math.floor((mouseX / rect.width) * visibleCandles.length);
      if (candleIndex >= 0 && candleIndex < visibleCandles.length) {
        setHoverIndex(candleIndex);
      }
    }

    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartXRef.current;
    const pixelsPerBar = containerWidth / visibleCount;
    const barsShift = Math.round(deltaX / (pixelsPerBar || 10));
    const newOffset = Math.max(0, Math.min(maxScroll, dragStartOffsetRef.current + barsShift));
    setScrollOffset(newOffset);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch Handlers for Finger Sliding & Pinch Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartXRef.current = e.touches[0].clientX;
      dragStartOffsetRef.current = scrollOffset;
      touchPinchDistRef.current = null;
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchPinchDistRef.current = dist;
      touchStartVisibleCountRef.current = visibleCount;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const currentX = e.touches[0].clientX;
      const deltaX = currentX - dragStartXRef.current;
      const containerWidth = chartContainerRef.current?.clientWidth || svgRef.current?.clientWidth || 1000;
      const pixelsPerBar = containerWidth / visibleCount;
      const barsShift = Math.round(deltaX / (pixelsPerBar || 10));
      const newOffset = Math.max(0, Math.min(maxScroll, dragStartOffsetRef.current + barsShift));
      setScrollOffset(newOffset);

      if (chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        const touchX = currentX - rect.left;
        const candleIndex = Math.floor((touchX / rect.width) * visibleCandles.length);
        if (candleIndex >= 0 && candleIndex < visibleCandles.length) {
          setHoverIndex(candleIndex);
        }
      }
    } else if (e.touches.length === 2 && touchPinchDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scale = touchPinchDistRef.current / currentDist;
      const newVisible = Math.round(touchStartVisibleCountRef.current * scale);
      setVisibleCount(Math.max(20, Math.min(candles.length, newVisible)));
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchPinchDistRef.current = null;
    setHoverIndex(null);
  };

  // Wheel Handler for horizontal scrolling / zooming
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      if (e.deltaY < 0) {
        setVisibleCount((prev) => Math.max(20, prev - 10));
      } else {
        setVisibleCount((prev) => Math.min(candles.length, prev + 10));
      }
    } else {
      // Pan
      const shift = e.deltaX !== 0 ? Math.sign(e.deltaX) * 5 : Math.sign(e.deltaY) * 5;
      setScrollOffset((prev) => Math.max(0, Math.min(maxScroll, prev + shift)));
    }
  };

  const activeHoverCandle = hoverIndex !== null ? visibleCandles[hoverIndex] : visibleCandles[visibleCandles.length - 1];

  const dateSpanText = useMemo(() => {
    if (visibleCandles.length === 0) return '';
    const firstDate = visibleCandles[0].time;
    const lastDate = visibleCandles[visibleCandles.length - 1].time;
    return `${firstDate} → ${lastDate}`;
  }, [visibleCandles]);

  return (
    <div id="strategy-chart-container" className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
      
      {/* Top Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
        
        {/* Symbol & Active Candle Summary */}
        <div className="flex flex-wrap items-center gap-3">
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
              <span className="text-slate-400 hidden lg:inline">Vol: <strong className="text-slate-300">{activeHoverCandle.volume.toLocaleString()}</strong></span>
            </div>
          )}
        </div>

        {/* Trade Selector & Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Jump to Trade Dropdown Selector */}
          {trades.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-emerald-400 font-semibold uppercase hidden sm:inline">Trade:</span>
              <select
                id="select-chart-trade-dropdown"
                value={selectedTradeId || ''}
                onChange={(e) => onSelectTrade?.(e.target.value)}
                className="bg-slate-900 border border-emerald-600/50 text-emerald-300 font-mono text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[180px] truncate"
                title="Select trade to view Entry, Take Profit, and Stop Loss on chart"
              >
                <option value="">All Trades ({trades.length})</option>
                {trades.map((t, idx) => (
                  <option key={t.id} value={t.id}>
                    #{idx + 1} {t.type} {t.pnlPercent >= 0 ? `+${t.pnlPercent}%` : `${t.pnlPercent}%`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle TP & SL Lines */}
          <button
            onClick={() => setShowTpSlLines(!showTpSlLines)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium transition ${
              showTpSlLines
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle Take Profit & Stop Loss target lines on chart"
          >
            <Target className="w-3 h-3 text-emerald-400" />
            <span>TP/SL Targets</span>
          </button>

          {/* Toggle Trades */}
          <button
            onClick={() => setShowTradesOnChart(!showTradesOnChart)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition ${
              showTradesOnChart
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle Trade Markers"
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
            title="Toggle Indicators"
          >
            <span>Indicators</span>
          </button>

          {/* Zoom controls */}
          <div className="chart-zoom-box flex items-center bg-slate-900 border border-slate-800 rounded p-0.5">
            <button
              onClick={() => setVisibleCount((prev) => Math.min(candles.length, prev + 30))}
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[10px] font-mono text-slate-400">{visibleCount}b</span>
            <button
              onClick={() => setVisibleCount((prev) => Math.max(20, prev - 20))}
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      {/* Selected Trade Info Banner */}
      {selectedTrade && (
        <div className="trade-details-box bg-slate-950/80 border border-emerald-600/50 rounded-lg p-2.5 px-3.5 text-xs flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase font-mono ${selectedTrade.type === 'LONG' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
              {selectedTrade.type} POSITION
            </span>
            <span className="font-semibold text-slate-200">
              Entry: <strong className="font-mono text-slate-100">${selectedTrade.entryPrice}</strong> ({selectedTrade.entryTime})
            </span>
            <span className="text-slate-500">→</span>
            <span className="font-semibold text-slate-200">
              Exit: <strong className="font-mono text-slate-100">${selectedTrade.exitPrice}</strong> ({selectedTrade.exitTime})
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono">
            {selectedTrade.takeProfitPrice && (
              <span className="text-emerald-400 text-[11px] font-bold bg-emerald-900/40 border border-emerald-700/50 px-2 py-0.5 rounded">
                TP Target: ${selectedTrade.takeProfitPrice}
              </span>
            )}
            {selectedTrade.stopLossPrice && (
              <span className="text-rose-400 text-[11px] font-bold bg-rose-900/40 border border-rose-700/50 px-2 py-0.5 rounded">
                SL Level: ${selectedTrade.stopLossPrice}
              </span>
            )}
            <span className={`font-bold text-sm ${selectedTrade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {selectedTrade.pnl >= 0 ? `+${selectedTrade.pnlPercent}% ($${selectedTrade.pnl})` : `${selectedTrade.pnlPercent}% ($${selectedTrade.pnl})`}
            </span>
          </div>
        </div>
      )}

      {/* SVG Canvas Area with Drag to Pan, Finger Slide & Wheel/Pinch Zoom */}
      <div 
        ref={chartContainerRef}
        className="relative w-full overflow-hidden rounded-lg bg-slate-950 border border-slate-800/80 shadow-inner cursor-grab active:cursor-grabbing touch-none select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoverIndex(null);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${totalSvgHeight}`}
          className="w-full h-auto select-none"
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
            <pattern id="tpPattern" width="6" height="6" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="6" y2="6" stroke="#10b981" strokeWidth="0.5" opacity="0.2" />
            </pattern>
            <pattern id="slPattern" width="6" height="6" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="6" y2="6" stroke="#ef4444" strokeWidth="0.5" opacity="0.2" />
            </pattern>
          </defs>

          {/* Horizontal Gridlines & Price Scale */}
          {[0.15, 0.35, 0.55, 0.75, 0.9].map((ratio, idx) => {
            const y = mainChartHeight * ratio;
            const priceVal = maxPrice - ratio * (maxPrice - minPrice);
            return (
              <g key={`grid-${idx}`}>
                <line
                  x1="0"
                  y1={y}
                  x2={svgWidth - 65}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={svgWidth - 58}
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

          {/* Take Profit & Stop Loss Visual Target Overlay for Selected or Hovered Trade */}
          {showTpSlLines && selectedTrade && (
            <g key="tpsl-overlay">
              {(() => {
                const entryY = getYCoordinate(selectedTrade.entryPrice);
                const tpY = selectedTrade.takeProfitPrice ? getYCoordinate(selectedTrade.takeProfitPrice) : null;
                const slY = selectedTrade.stopLossPrice ? getYCoordinate(selectedTrade.stopLossPrice) : null;

                const entryLocalIdx = selectedTrade.entryIndex - startIndex;
                const exitLocalIdx = selectedTrade.exitIndex - startIndex;

                const x1 = Math.max(0, entryLocalIdx * candleSlotWidth + candleSlotWidth / 2);
                const x2 = Math.min(svgWidth - 65, (exitLocalIdx >= 0 ? exitLocalIdx : visibleCandles.length) * candleSlotWidth + candleSlotWidth / 2);

                return (
                  <>
                    {/* Take Profit Target Zone & Line */}
                    {tpY !== null && (
                      <g key="tp-line">
                        <rect
                          x={x1}
                          y={Math.min(entryY, tpY)}
                          width={Math.max(40, x2 - x1)}
                          height={Math.abs(entryY - tpY)}
                          fill="#10b9811f"
                          stroke="#10b98133"
                          strokeWidth="1"
                        />
                        <line
                          x1="0"
                          y1={tpY}
                          x2={svgWidth - 65}
                          y2={tpY}
                          stroke="#10b981"
                          strokeWidth="1.75"
                          strokeDasharray="5 3"
                        />
                        <rect
                          x={svgWidth - 110}
                          y={tpY - 10}
                          width="105"
                          height="20"
                          fill="#064e3b"
                          stroke="#10b981"
                          rx="4"
                        />
                        <text
                          x={svgWidth - 58}
                          y={tpY + 3}
                          fill="#34d399"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          TP: ${selectedTrade.takeProfitPrice}
                        </text>
                      </g>
                    )}

                    {/* Stop Loss Risk Zone & Line */}
                    {slY !== null && (
                      <g key="sl-line">
                        <rect
                          x={x1}
                          y={Math.min(entryY, slY)}
                          width={Math.max(40, x2 - x1)}
                          height={Math.abs(entryY - slY)}
                          fill="#ef44441f"
                          stroke="#ef444433"
                          strokeWidth="1"
                        />
                        <line
                          x1="0"
                          y1={slY}
                          x2={svgWidth - 65}
                          y2={slY}
                          stroke="#ef4444"
                          strokeWidth="1.75"
                          strokeDasharray="5 3"
                        />
                        <rect
                          x={svgWidth - 110}
                          y={slY - 10}
                          width="105"
                          height="20"
                          fill="#7f1d1d"
                          stroke="#ef4444"
                          rx="4"
                        />
                        <text
                          x={svgWidth - 58}
                          y={slY + 3}
                          fill="#f87171"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          SL: ${selectedTrade.stopLossPrice}
                        </text>
                      </g>
                    )}

                    {/* Entry Price Line */}
                    <line
                      x1="0"
                      y1={entryY}
                      x2={svgWidth - 65}
                      y2={entryY}
                      stroke="#3b82f6"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <rect
                      x={svgWidth - 110}
                      y={entryY - 10}
                      width="105"
                      height="20"
                      fill="#1e3a8a"
                      stroke="#3b82f6"
                      rx="4"
                    />
                    <text
                      x={svgWidth - 58}
                      y={entryY + 3}
                      fill="#93c5fd"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      ENTRY: ${selectedTrade.entryPrice}
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {/* Volume Bars */}
          {visibleCandles.map((c, idx) => {
            const x = idx * candleSlotWidth + candleSlotWidth / 2;
            const isBullish = c.close >= c.open;
            const volHeight = (c.volume / maxVolume) * (mainChartHeight * 0.2);
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
            const color = isBullish ? '#10b981' : '#ef4444';
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

          {/* Trade Markers & Connectors */}
          {visibleTrades.map((trade) => {
            const isEntryVisible = trade.entryIndex >= startIndex && trade.entryIndex < endIndex;
            const isExitVisible = trade.exitIndex >= startIndex && trade.exitIndex < endIndex;
            const isSelected = selectedTradeId === trade.id;

            return (
              <g key={`trade-group-${trade.id}`}>
                {/* Long/Short Entry Marker */}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTrade?.(trade.id);
                        }}
                      >
                        <polygon
                          points={`${x},${y - 12} ${x - 6},${y} ${x + 6},${y}`}
                          fill={trade.type === 'LONG' ? '#10b981' : '#f59e0b'}
                          stroke="#0f172a"
                          strokeWidth="1.5"
                        />
                        <text
                          x={x}
                          y={y + 11}
                          fill={trade.type === 'LONG' ? '#34d399' : '#fbbf24'}
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {trade.type === 'LONG' ? 'BUY' : 'SELL'}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTrade?.(trade.id);
                        }}
                      >
                        <polygon
                          points={`${x},${y + 12} ${x - 6},${y} ${x + 6},${y}`}
                          fill={isWin ? '#3b82f6' : '#ef4444'}
                          stroke="#0f172a"
                          strokeWidth="1.5"
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

                {/* Connection line between Entry and Exit */}
                {isSelected && isEntryVisible && isExitVisible && (
                  (() => {
                    const entryLocalIdx = trade.entryIndex - startIndex;
                    const exitLocalIdx = trade.exitIndex - startIndex;
                    const x1 = entryLocalIdx * candleSlotWidth + candleSlotWidth / 2;
                    const y1 = getYCoordinate(trade.entryPrice);
                    const x2 = exitLocalIdx * candleSlotWidth + candleSlotWidth / 2;
                    const y2 = getYCoordinate(trade.exitPrice);

                    return (
                      <g key="connection-line">
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={trade.pnl >= 0 ? '#10b981' : '#ef4444'}
                          strokeWidth="2"
                          strokeDasharray="4 4"
                        />
                        <circle cx={x1} cy={y1} r="4" fill="#3b82f6" />
                        <circle cx={x2} cy={y2} r="4" fill={trade.pnl >= 0 ? '#10b981' : '#ef4444'} />
                      </g>
                    );
                  })()
                )}
              </g>
            );
          })}

          {/* Crosshair Overlay on Hover */}
          {hoverIndex !== null && visibleCandles[hoverIndex] && (
            <g key="crosshair-overlay">
              {(() => {
                const x = hoverIndex * candleSlotWidth + candleSlotWidth / 2;
                const candle = visibleCandles[hoverIndex];
                const y = getYCoordinate(candle.close);

                return (
                  <>
                    <line
                      x1={x}
                      y1="0"
                      x2={x}
                      y2={mainChartHeight}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <line
                      x1="0"
                      y1={y}
                      x2={svgWidth - 65}
                      y2={y}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <rect
                      x={svgWidth - 63}
                      y={y - 9}
                      width="58"
                      height="18"
                      fill="#0f172a"
                      stroke="#475569"
                      rx="3"
                    />
                    <text
                      x={svgWidth - 34}
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
              <line
                x1="0"
                y1={mainChartHeight + 10}
                x2={svgWidth}
                y2={mainChartHeight + 10}
                stroke="#334155"
                strokeWidth="1"
              />

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

              <line
                x1="0"
                y1={getSubchartYCoordinate(70)}
                x2={svgWidth - 65}
                y2={getSubchartYCoordinate(70)}
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <text x={svgWidth - 58} y={getSubchartYCoordinate(70) + 3} fill="#ef4444" fontSize="9" fontFamily="monospace">70</text>

              <line
                x1="0"
                y1={getSubchartYCoordinate(30)}
                x2={svgWidth - 65}
                y2={getSubchartYCoordinate(30)}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <text x={svgWidth - 58} y={getSubchartYCoordinate(30) + 3} fill="#10b981" fontSize="9" fontFamily="monospace">30</text>

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

      {/* Interactive Time Navigation & Timeline Scrollbar Bar */}
      <div className="flex flex-col gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
        <div className="flex items-center justify-between gap-3 text-slate-300">
          
          {/* Historical Time Bounds Indicator */}
          <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400">
            <span className="font-bold">{dateSpanText}</span>
          </div>

          {/* Quick Navigation Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScrollOffset(maxScroll)}
              disabled={scrollOffset >= maxScroll}
              className="chart-nav-btn flex items-center gap-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 px-2 py-1 rounded transition"
              title="Jump to Oldest Historical Data"
            >
              <SkipBack className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline text-[11px]">Oldest</span>
            </button>

            <button
              onClick={() => setScrollOffset((prev) => Math.min(maxScroll, prev + 20))}
              disabled={scrollOffset >= maxScroll}
              className="chart-nav-btn p-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 rounded transition"
              title="Scroll Backwards in Time"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setScrollOffset((prev) => Math.max(0, prev - 20))}
              disabled={scrollOffset <= 0}
              className="chart-nav-btn p-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 rounded transition"
              title="Scroll Forwards in Time"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setScrollOffset(0)}
              disabled={scrollOffset <= 0}
              className="chart-nav-btn flex items-center gap-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 px-2 py-1 rounded transition"
              title="Jump to Latest Present Data"
            >
              <span className="hidden sm:inline text-[11px]">Latest</span>
              <SkipForward className="w-3 h-3 text-emerald-400" />
            </button>
          </div>

        </div>

        {/* Horizontal Scroll Range Slider */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-[10px] text-slate-500 font-mono">Past</span>
          <input
            type="range"
            min={0}
            max={maxScroll}
            value={maxScroll - scrollOffset}
            onChange={(e) => setScrollOffset(maxScroll - parseInt(e.target.value))}
            className="w-full accent-emerald-500 bg-slate-800 h-2 rounded cursor-pointer"
            title="Drag timeline scrollbar to navigate back and forth through years"
          />
          <span className="text-[10px] text-slate-500 font-mono">Present</span>
        </div>
      </div>

      {/* Chart Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Fast EMA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span>Slow EMA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
            <span>RSI</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <span className="text-emerald-400 font-bold">▲ BUY</span>
            <span className="text-slate-500">Long</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-bold">▼ SELL</span>
            <span className="text-slate-500">Short</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400 font-bold">● EXIT</span>
            <span className="text-slate-500">Trade Exit</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
          <Info className="w-3 h-3 text-emerald-400" />
          <span>Slide finger / Drag canvas or use slider to scroll • Ctrl+Wheel or pinch to zoom</span>
        </div>
      </div>

    </div>
  );
};

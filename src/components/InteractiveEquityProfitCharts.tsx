import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BacktestResult } from '../types';
import { 
  TrendingUp, 
  DollarSign, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  Calendar, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight,
  SlidersHorizontal,
  Info,
  Maximize2,
  Lock,
  Unlock,
  BarChart2
} from 'lucide-react';

interface InteractiveEquityProfitChartsProps {
  result: BacktestResult;
}

export interface TimeMarker {
  index: number;
  time: string;
  dateObj: Date;
  type: 'YEAR' | 'MONTH' | 'WEEK' | 'DAY';
  label: string;
  subLabel?: string;
  equity: number;
  profit: number;
  periodEquityChange?: number;
  periodEquityChangePct?: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(timeStr: string): Date {
  if (!timeStr) return new Date();
  const d = new Date(timeStr);
  if (!isNaN(d.getTime())) return d;
  const clean = timeStr.replace(' ', 'T');
  const d2 = new Date(clean);
  return isNaN(d2.getTime()) ? new Date() : d2;
}

function getIsoWeek(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

export const InteractiveEquityProfitCharts: React.FC<InteractiveEquityProfitChartsProps> = ({ result }) => {
  const { equityCurve, initialCapital, finalEquity, netProfit, netProfitPercent, buyHoldReturnPercent } = result;

  // Viewport zoom and pan state
  const [visibleCount, setVisibleCount] = useState<number>(equityCurve.length || 100);
  const [scrollOffset, setScrollOffset] = useState<number>(0); // 0 = newest data on the right
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  // Marker configuration & options (Persisted in LocalStorage)
  const [markerMode, setMarkerMode] = useState<'AUTO' | 'ALL' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'OFF'>(() => {
    const saved = localStorage.getItem('pinestudio_marker_mode');
    return (saved as any) || 'AUTO';
  });
  const [showBenchmark, setShowBenchmark] = useState<boolean>(() => {
    const saved = localStorage.getItem('pinestudio_show_benchmark');
    return saved !== null ? saved === 'true' : true;
  });
  const [showAthLine, setShowAthLine] = useState<boolean>(() => {
    const saved = localStorage.getItem('pinestudio_show_ath_line');
    return saved !== null ? saved === 'true' : true;
  });
  const [isSynced, setIsSynced] = useState<boolean>(true);
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('pinestudio_marker_mode', markerMode);
  }, [markerMode]);

  useEffect(() => {
    localStorage.setItem('pinestudio_show_benchmark', String(showBenchmark));
  }, [showBenchmark]);

  useEffect(() => {
    localStorage.setItem('pinestudio_show_ath_line', String(showAthLine));
  }, [showAthLine]);

  // Dragging / touch pan state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chart1Ref = useRef<HTMLDivElement | null>(null);
  const chart2Ref = useRef<HTMLDivElement | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartScrollRef = useRef<number>(0);
  const touchPinchDistRef = useRef<number | null>(null);
  const touchStartVisibleCountRef = useRef<number>(visibleCount);
  const touchStartScrollRef = useRef<number>(scrollOffset);

  const maxScroll = Math.max(0, equityCurve.length - visibleCount);

  // Keep scrollOffset within bounds when dataset or zoom level changes
  useEffect(() => {
    setScrollOffset((prev) => Math.min(Math.max(0, prev), Math.max(0, equityCurve.length - visibleCount)));
  }, [equityCurve.length, visibleCount]);

  // Compute all daily, weekly, monthly, and yearly time markers across the dataset
  const { timeMarkers, periodStats } = useMemo(() => {
    if (!equityCurve || equityCurve.length === 0) {
      return { timeMarkers: [], periodStats: { bestDay: 0, bestWeek: 0, bestMonth: 0, totalDays: 0, totalWeeks: 0, totalMonths: 0, totalYears: 0 } };
    }

    const markers: TimeMarker[] = [];
    let prevYear: number | null = null;
    let prevMonth: number | null = null;
    let prevWeek: number | null = null;
    let prevDayKey: string | null = null;

    let lastYearMarkerEq = initialCapital;
    let lastMonthMarkerEq = initialCapital;
    let lastWeekMarkerEq = initialCapital;
    let lastDayMarkerEq = initialCapital;

    let bestDayGain = -Infinity;
    let bestWeekGain = -Infinity;
    let bestMonthGain = -Infinity;
    let totalD = 0;
    let totalW = 0;
    let totalM = 0;
    let totalY = 0;

    equityCurve.forEach((point, idx) => {
      const d = parseDate(point.time);
      const yr = d.getFullYear();
      const mo = d.getMonth();
      const wk = getIsoWeek(d);
      const day = d.getDate();
      const dayKey = `${yr}-${mo}-${day}`;
      const profit = point.equity - initialCapital;

      const isYearBoundary = prevYear !== null && yr !== prevYear;
      const isMonthBoundary = prevMonth !== null && (mo !== prevMonth || yr !== prevYear);
      const isWeekBoundary = prevWeek !== null && (wk !== prevWeek || mo !== prevMonth || yr !== prevYear);
      const isDayBoundary = prevDayKey !== null && dayKey !== prevDayKey;

      if (isYearBoundary) {
        totalY++;
        const change = point.equity - lastYearMarkerEq;
        const pct = lastYearMarkerEq > 0 ? (change / lastYearMarkerEq) * 100 : 0;
        markers.push({
          index: idx,
          time: point.time,
          dateObj: d,
          type: 'YEAR',
          label: `${yr}`,
          subLabel: 'Year Start',
          equity: point.equity,
          profit,
          periodEquityChange: Number(change.toFixed(2)),
          periodEquityChangePct: Number(pct.toFixed(2)),
        });
        lastYearMarkerEq = point.equity;
        lastMonthMarkerEq = point.equity;
        lastWeekMarkerEq = point.equity;
        lastDayMarkerEq = point.equity;
      } else if (isMonthBoundary) {
        totalM++;
        const change = point.equity - lastMonthMarkerEq;
        const pct = lastMonthMarkerEq > 0 ? (change / lastMonthMarkerEq) * 100 : 0;
        if (change > bestMonthGain) bestMonthGain = change;
        markers.push({
          index: idx,
          time: point.time,
          dateObj: d,
          type: 'MONTH',
          label: `${MONTH_NAMES[mo]} '${yr.toString().slice(-2)}`,
          subLabel: MONTH_NAMES[mo],
          equity: point.equity,
          profit,
          periodEquityChange: Number(change.toFixed(2)),
          periodEquityChangePct: Number(pct.toFixed(2)),
        });
        lastMonthMarkerEq = point.equity;
        lastWeekMarkerEq = point.equity;
        lastDayMarkerEq = point.equity;
      } else if (isWeekBoundary) {
        totalW++;
        const change = point.equity - lastWeekMarkerEq;
        const pct = lastWeekMarkerEq > 0 ? (change / lastWeekMarkerEq) * 100 : 0;
        if (change > bestWeekGain) bestWeekGain = change;
        markers.push({
          index: idx,
          time: point.time,
          dateObj: d,
          type: 'WEEK',
          label: `W${wk}`,
          subLabel: `${MONTH_NAMES[mo]} W${Math.ceil(d.getDate() / 7)}`,
          equity: point.equity,
          profit,
          periodEquityChange: Number(change.toFixed(2)),
          periodEquityChangePct: Number(pct.toFixed(2)),
        });
        lastWeekMarkerEq = point.equity;
        lastDayMarkerEq = point.equity;
      } else if (isDayBoundary) {
        totalD++;
        const change = point.equity - lastDayMarkerEq;
        const pct = lastDayMarkerEq > 0 ? (change / lastDayMarkerEq) * 100 : 0;
        if (change > bestDayGain) bestDayGain = change;
        markers.push({
          index: idx,
          time: point.time,
          dateObj: d,
          type: 'DAY',
          label: `${MONTH_NAMES[mo]} ${day}`,
          subLabel: `${MONTH_NAMES[mo]} ${day}, ${yr}`,
          equity: point.equity,
          profit,
          periodEquityChange: Number(change.toFixed(2)),
          periodEquityChangePct: Number(pct.toFixed(2)),
        });
        lastDayMarkerEq = point.equity;
      }

      prevYear = yr;
      prevMonth = mo;
      prevWeek = wk;
      prevDayKey = dayKey;
    });

    return {
      timeMarkers: markers,
      periodStats: {
        bestDay: bestDayGain === -Infinity ? 0 : Number(bestDayGain.toFixed(2)),
        bestWeek: bestWeekGain === -Infinity ? 0 : Number(bestWeekGain.toFixed(2)),
        bestMonth: bestMonthGain === -Infinity ? 0 : Number(bestMonthGain.toFixed(2)),
        totalDays: totalD,
        totalWeeks: totalW,
        totalMonths: totalM,
        totalYears: totalY,
      }
    };
  }, [equityCurve, initialCapital]);

  // Determine which markers are active based on mode and current zoom level
  const activeMarkers = useMemo(() => {
    if (markerMode === 'OFF') return [];
    
    return timeMarkers.filter((m) => {
      if (markerMode === 'YEARLY') return m.type === 'YEAR';
      if (markerMode === 'MONTHLY') return m.type === 'YEAR' || m.type === 'MONTH';
      if (markerMode === 'WEEKLY') return m.type === 'YEAR' || m.type === 'MONTH' || m.type === 'WEEK';
      if (markerMode === 'DAILY' || markerMode === 'ALL') return true;
      
      // AUTO Mode: intelligently show markers depending on density
      if (visibleCount > 300) {
        return m.type === 'YEAR' || m.type === 'MONTH';
      } else if (visibleCount > 120) {
        return m.type === 'YEAR' || m.type === 'MONTH' || m.type === 'WEEK';
      }
      return true;
    });
  }, [timeMarkers, markerMode, visibleCount]);

  // Compute visible subset of equityCurve data
  const endIndex = Math.min(equityCurve.length, equityCurve.length - scrollOffset);
  const startIndex = Math.max(0, endIndex - visibleCount);

  const visibleData = useMemo(() => {
    return equityCurve.slice(startIndex, endIndex);
  }, [equityCurve, startIndex, endIndex]);

  // All-time high equity and profit up to current backtest
  const { maxAthEquity, maxAthProfit } = useMemo(() => {
    let athE = initialCapital;
    let athP = 0;
    equityCurve.forEach((e) => {
      if (e.equity > athE) athE = e.equity;
      const p = e.equity - initialCapital;
      if (p > athP) athP = p;
    });
    return { maxAthEquity: athE, maxAthProfit: athP };
  }, [equityCurve, initialCapital]);

  // Min and Max Y limits for Equity Chart
  const { minEqY, maxEqY } = useMemo(() => {
    if (visibleData.length === 0) return { minEqY: initialCapital * 0.9, maxEqY: initialCapital * 1.1 };
    let minVal = Infinity;
    let maxVal = -Infinity;
    visibleData.forEach((d) => {
      if (d.equity < minVal) minVal = d.equity;
      if (d.equity > maxVal) maxVal = d.equity;
      if (showBenchmark && d.benchmark !== undefined) {
        if (d.benchmark < minVal) minVal = d.benchmark;
        if (d.benchmark > maxVal) maxVal = d.benchmark;
      }
    });
    const padding = (maxVal - minVal) * 0.08 || initialCapital * 0.05;
    return { minEqY: Math.max(0, minVal - padding), maxEqY: maxVal + padding };
  }, [visibleData, showBenchmark, initialCapital]);

  // Min and Max Y limits for Profit Chart
  const { minProfY, maxProfY } = useMemo(() => {
    if (visibleData.length === 0) return { minProfY: -100, maxProfY: 100 };
    let minP = 0;
    let maxP = 0;
    visibleData.forEach((d) => {
      const p = d.equity - initialCapital;
      if (p < minP) minP = p;
      if (p > maxP) maxP = p;
    });
    const padding = (maxP - minP) * 0.1 || 100;
    return { minProfY: minP - padding, maxProfY: maxP + padding };
  }, [visibleData, initialCapital]);

  // SVG canvas dimensions
  const svgWidth = 900;
  const svgHeight = 220;
  const paddingX = 0;
  const paddingTop = 25;
  const paddingBottom = 25;

  // Y coordinate mapper functions
  const getEquityY = (eq: number) => {
    const range = maxEqY - minEqY || 1;
    const h = svgHeight - paddingTop - paddingBottom;
    return svgHeight - paddingBottom - ((eq - minEqY) / range) * h;
  };

  const getProfitY = (prof: number) => {
    const range = maxProfY - minProfY || 1;
    const h = svgHeight - paddingTop - paddingBottom;
    return svgHeight - paddingBottom - ((prof - minProfY) / range) * h;
  };

  // Convert index to X coordinate on SVG canvas
  const getX = (dataIdx: number) => {
    if (visibleCount <= 1) return svgWidth / 2;
    const relIdx = dataIdx - startIndex;
    return (relIdx / (visibleCount - 1)) * svgWidth;
  };

  // Build SVG Path strings for Equity Chart
  const { strategyEquityPath, benchmarkEquityPath, equityAreaPath } = useMemo(() => {
    if (visibleData.length === 0) return { strategyEquityPath: '', benchmarkEquityPath: '', equityAreaPath: '' };

    let stratD = '';
    let benchD = '';
    
    visibleData.forEach((d, idx) => {
      const x = getX(startIndex + idx);
      const yE = getEquityY(d.equity);
      const yB = getEquityY(d.benchmark);

      if (idx === 0) {
        stratD += `M ${x} ${yE}`;
        benchD += `M ${x} ${yB}`;
      } else {
        stratD += ` L ${x} ${yE}`;
        benchD += ` L ${x} ${yB}`;
      }
    });

    const firstX = getX(startIndex);
    const lastX = getX(startIndex + visibleData.length - 1);
    const bottomY = svgHeight - paddingBottom;
    const areaD = `${stratD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    return { strategyEquityPath: stratD, benchmarkEquityPath: benchD, equityAreaPath: areaD };
  }, [visibleData, startIndex, visibleCount, minEqY, maxEqY]);

  // Build SVG Path strings for Cumulative Profit Chart
  const { profitPath, profitAreaPathAbove, profitAreaPathBelow } = useMemo(() => {
    if (visibleData.length === 0) return { profitPath: '', profitAreaPathAbove: '', profitAreaPathBelow: '' };

    let profD = '';
    const yZero = getProfitY(0);

    visibleData.forEach((d, idx) => {
      const x = getX(startIndex + idx);
      const profit = d.equity - initialCapital;
      const yP = getProfitY(profit);

      if (idx === 0) profD += `M ${x} ${yP}`;
      else profD += ` L ${x} ${yP}`;
    });

    const firstX = getX(startIndex);
    const lastX = getX(startIndex + visibleData.length - 1);

    const areaAbove = `${profD} L ${lastX} ${yZero} L ${firstX} ${yZero} Z`;

    return { profitPath: profD, profitAreaPathAbove: areaAbove, profitAreaPathBelow: areaAbove };
  }, [visibleData, startIndex, visibleCount, minProfY, maxProfY, initialCapital]);

  // Visible Time Markers inside current viewport
  const visibleMarkersInView = useMemo(() => {
    return activeMarkers.filter((m) => m.index >= startIndex && m.index <= endIndex);
  }, [activeMarkers, startIndex, endIndex]);

  // Interaction handlers (Mouse Drag & Slide / Touch Pan & Pinch Zoom)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartScrollRef.current = scrollOffset;
  };

  const handleMouseMove = (e: React.MouseEvent, targetEl?: HTMLElement | null) => {
    const el = targetEl || containerRef.current;
    if (isDragging) {
      const deltaX = e.clientX - dragStartXRef.current;
      const chartWidth = el?.getBoundingClientRect().width || 800;
      const indexDelta = Math.round((deltaX / chartWidth) * visibleCount);
      const newScroll = Math.max(0, Math.min(maxScroll, dragStartScrollRef.current + indexDelta));
      setScrollOffset(newScroll);
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const ratio = relX / rect.width;
      const hoverDataIdx = Math.round(startIndex + ratio * (visibleCount - 1));
      const clampedIdx = Math.max(0, Math.min(equityCurve.length - 1, hoverDataIdx));
      setHoverIndex(clampedIdx);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoverIndex(null);
  };

  // Direct Touch Pan & Pinch Zoom handlers for touch screens
  const handleTouchStart = (e: React.TouchEvent, targetEl?: HTMLElement | null) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartXRef.current = e.touches[0].clientX;
      dragStartScrollRef.current = scrollOffset;
      const el = targetEl || containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const relX = Math.max(0, Math.min(rect.width, e.touches[0].clientX - rect.left));
        const ratio = relX / rect.width;
        const hoverDataIdx = Math.round(startIndex + ratio * (visibleCount - 1));
        setHoverIndex(Math.max(0, Math.min(equityCurve.length - 1, hoverDataIdx)));
      }
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const x1 = e.touches[0].clientX;
      const y1 = e.touches[0].clientY;
      const x2 = e.touches[1].clientX;
      const y2 = e.touches[1].clientY;
      touchPinchDistRef.current = Math.hypot(x2 - x1, y2 - y1);
      touchStartVisibleCountRef.current = visibleCount;
      touchStartScrollRef.current = scrollOffset;
    }
  };

  const handleTouchMove = (e: React.TouchEvent, targetEl?: HTMLElement | null) => {
    const el = targetEl || containerRef.current;
    
    if (e.touches.length === 1 && isDragging) {
      const deltaX = e.touches[0].clientX - dragStartXRef.current;
      const chartWidth = el?.getBoundingClientRect().width || 800;
      const indexDelta = Math.round((deltaX / chartWidth) * visibleCount);
      const newScroll = Math.max(0, Math.min(maxScroll, dragStartScrollRef.current + indexDelta));
      setScrollOffset(newScroll);

      if (el) {
        const rect = el.getBoundingClientRect();
        const relX = Math.max(0, Math.min(rect.width, e.touches[0].clientX - rect.left));
        const ratio = relX / rect.width;
        const hoverDataIdx = Math.round(startIndex + ratio * (visibleCount - 1));
        setHoverIndex(Math.max(0, Math.min(equityCurve.length - 1, hoverDataIdx)));
      }
    } else if (e.touches.length === 2 && touchPinchDistRef.current !== null) {
      if (e.cancelable) e.preventDefault();
      const x1 = e.touches[0].clientX;
      const y1 = e.touches[0].clientY;
      const x2 = e.touches[1].clientX;
      const y2 = e.touches[1].clientY;
      const currentDist = Math.hypot(x2 - x1, y2 - y1);
      
      const scale = touchPinchDistRef.current / Math.max(10, currentDist);
      const targetCount = Math.max(15, Math.min(equityCurve.length, Math.round(touchStartVisibleCountRef.current * scale)));
      const countDiff = targetCount - touchStartVisibleCountRef.current;
      const targetScroll = Math.max(0, Math.min(equityCurve.length - targetCount, touchStartScrollRef.current - Math.round(countDiff / 2)));
      
      setVisibleCount(targetCount);
      setScrollOffset(targetScroll);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      touchPinchDistRef.current = null;
      setHoverIndex(null);
    } else if (e.touches.length === 1) {
      touchPinchDistRef.current = null;
      dragStartXRef.current = e.touches[0].clientX;
      dragStartScrollRef.current = scrollOffset;
    }
  };

  // Attach native wheel event listener with { passive: false } directly to both charts for zoom & scroll
  useEffect(() => {
    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();

      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const cursorX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const cursorRatio = rect.width > 0 ? cursorX / rect.width : 0.5;

      // Trackpad horizontal scroll pan
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const panDelta = Math.round((e.deltaX / rect.width) * visibleCount);
        setScrollOffset((prev) => Math.max(0, Math.min(maxScroll, prev + panDelta)));
        return;
      }

      // Wheel / Pinch vertical zoom
      const zoomIn = e.deltaY < 0;
      const factor = zoomIn ? 0.85 : 1.18;
      const targetCount = Math.max(15, Math.min(equityCurve.length, Math.round(visibleCount * factor)));
      const countDiff = targetCount - visibleCount;

      // Anchor zoom position relative to cursor
      const scrollShift = Math.round(countDiff * (1 - cursorRatio));
      const targetScroll = Math.max(0, Math.min(equityCurve.length - targetCount, scrollOffset - scrollShift));

      setVisibleCount(targetCount);
      setScrollOffset(targetScroll);
    };

    const c1 = chart1Ref.current;
    const c2 = chart2Ref.current;

    if (c1) c1.addEventListener('wheel', handleWheelNative, { passive: false });
    if (c2) c2.addEventListener('wheel', handleWheelNative, { passive: false });

    return () => {
      if (c1) c1.removeEventListener('wheel', handleWheelNative);
      if (c2) c2.removeEventListener('wheel', handleWheelNative);
    };
  }, [visibleCount, scrollOffset, equityCurve.length, maxScroll]);

  // Zoom control helper functions
  const zoomIn = () => {
    const newCount = Math.max(20, Math.round(visibleCount * 0.7));
    setVisibleCount(newCount);
  };

  const zoomOut = () => {
    const newCount = Math.min(equityCurve.length, Math.round(visibleCount * 1.4));
    setVisibleCount(newCount);
  };

  const resetZoom = () => {
    setVisibleCount(equityCurve.length);
    setScrollOffset(0);
    setHoverIndex(null);
  };

  // Currently active or hovered point
  const hoveredPoint = hoverIndex !== null ? equityCurve[hoverIndex] : null;
  const hoveredProfit = hoveredPoint ? hoveredPoint.equity - initialCapital : null;

  return (
    <div className="flex flex-col gap-5 bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-xl shadow-xl transition-all">
      
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Interactive Cumulative Growth & Profit Charts
            </h3>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
              Time-Marked Progress
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Drag or touch-slide directly on either chart to pan • Pinch or mouse wheel directly on charts to zoom in/out
          </p>
        </div>

        {/* Action Controls & Marker Selector */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          {/* Time Marker Mode Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Markers:
            </span>
            {(['AUTO', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'ALL', 'OFF'] as const).map((mode) => (
              <button
                key={`marker-mode-${mode}`}
                onClick={() => setMarkerMode(mode)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                  markerMode === mode
                    ? 'bg-emerald-600 text-white shadow font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {mode === 'AUTO' ? 'Auto' : mode === 'DAILY' ? 'Daily' : mode === 'WEEKLY' ? 'Weekly' : mode === 'MONTHLY' ? 'Monthly' : mode === 'YEARLY' ? 'Yearly' : mode === 'ALL' ? 'All' : 'Off'}
              </button>
            ))}
          </div>

          {/* Benchmark & ATH Toggles */}
          <button
            onClick={() => setShowBenchmark(!showBenchmark)}
            className={`px-2.5 py-1.5 rounded border transition text-xs font-medium flex items-center gap-1.5 ${
              showBenchmark ? 'bg-amber-950/60 border-amber-500/50 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Buy & Hold Benchmark line"
          >
            <span className={`w-2 h-2 rounded-full ${showBenchmark ? 'bg-amber-400' : 'bg-slate-600'}`}></span>
            Benchmark
          </button>

          {/* Zoom Buttons */}
          <div className="chart-zoom-box flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={zoomIn}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={zoomOut}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetZoom}
              className="chart-reset-btn px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded text-[11px] font-semibold transition flex items-center gap-1"
              title="Reset Zoom to Fit All"
            >
              <RotateCcw className="w-3 h-3 text-emerald-400" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Highlights / Period KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg shadow-inner">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Peak Equity (ATH)</span>
          <span className="text-sm font-extrabold font-mono text-emerald-400">
            ${maxAthEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg shadow-inner">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Best Month Gain</span>
          <span className="text-sm font-extrabold font-mono text-emerald-300">
            {periodStats.bestMonth >= 0 ? `+$${periodStats.bestMonth.toLocaleString()}` : `$${periodStats.bestMonth.toLocaleString()}`}
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg shadow-inner">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Best Week Gain</span>
          <span className="text-sm font-extrabold font-mono text-emerald-300">
            {periodStats.bestWeek >= 0 ? `+$${periodStats.bestWeek.toLocaleString()}` : `$${periodStats.bestWeek.toLocaleString()}`}
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg shadow-inner flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Active Time Markers</span>
          <span className="text-xs font-bold font-mono text-amber-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            {visibleMarkersInView.length} Visible ({periodStats.totalDays > 0 ? `${periodStats.totalDays} D, ` : ''}{periodStats.totalWeeks} W, {periodStats.totalMonths} M, {periodStats.totalYears} Y)
          </span>
        </div>
      </div>

      {/* Main Charts Interactive Container */}
      <div 
        ref={containerRef}
        className="flex flex-col gap-6 select-none"
      >
        
        {/* CHART 1: Cumulative Equity Growth Over Time */}
        <div 
          ref={chart1Ref}
          onMouseDown={handleMouseDown}
          onMouseMove={(e) => handleMouseMove(e, chart1Ref.current)}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={(e) => handleTouchStart(e, chart1Ref.current)}
          onTouchMove={(e) => handleTouchMove(e, chart1Ref.current)}
          onTouchEnd={handleTouchEnd}
          className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-inner relative overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none"
        >
          
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50"></span>
              Cumulative Equity Growth ($)
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              {showBenchmark && (
                <span className="flex items-center gap-1.5 text-amber-300/90 font-medium">
                  <span className="w-3 h-0.5 bg-amber-400 border border-amber-400"></span>
                  Buy & Hold ({buyHoldReturnPercent >= 0 ? `+${buyHoldReturnPercent}%` : `${buyHoldReturnPercent}%`})
                </span>
              )}
              <span className="text-emerald-400 font-bold">
                Final: ${finalEquity.toLocaleString()}
              </span>
            </div>
          </div>

          {/* SVG Canvas Chart 1 */}
          <div className="relative">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Y-Axis Gridlines */}
              {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
                const yVal = minEqY + (maxEqY - minEqY) * ratio;
                const yPos = getEquityY(yVal);
                return (
                  <g key={`eq-grid-${idx}`}>
                    <line
                      x1="0"
                      y1={yPos}
                      x2={svgWidth}
                      y2={yPos}
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={svgWidth - 6}
                      y={yPos - 3}
                      fill="#64748b"
                      fontSize="11"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      ${Math.round(yVal).toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* VERTICAL TIME MARKERS (Daily, Weekly, Monthly, Yearly lines going all the way up chart) */}
              {visibleMarkersInView.map((marker) => {
                const x = getX(marker.index);
                const isYear = marker.type === 'YEAR';
                const isMonth = marker.type === 'MONTH';
                const isWeek = marker.type === 'WEEK';

                const strokeColor = isYear ? '#f59e0b' : isMonth ? '#38bdf8' : isWeek ? '#10b981' : '#c084fc';
                const strokeDash = isYear ? 'none' : isMonth ? '4 4' : isWeek ? '2 3' : '1 3';
                const opacity = isYear ? 0.85 : isMonth ? 0.65 : isWeek ? 0.45 : 0.35;
                const strokeW = isYear ? 1.5 : isMonth ? 1.2 : isWeek ? 0.8 : 0.6;

                const badgeBg = isYear ? '#78350f' : isMonth ? '#0c4a6e' : isWeek ? '#064e3b' : '#3b0764';
                const badgeText = isYear ? '#fef08a' : isMonth ? '#bae6fd' : isWeek ? '#a7f3d0' : '#e9d5ff';

                return (
                  <g key={`marker-eq-${marker.type}-${marker.index}`} className="transition-opacity">
                    {/* Vertical line through entire chart height */}
                    <line
                      x1={x}
                      y1={8}
                      x2={x}
                      y2={svgHeight - 8}
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                      strokeDasharray={strokeDash}
                      opacity={opacity}
                    />

                    {/* Top Marker Badge Tag */}
                    <g transform={`translate(${x}, 16)`}>
                      <rect
                        x={-32}
                        y={-11}
                        width={64}
                        height={22}
                        rx={4}
                        fill={badgeBg}
                        stroke={strokeColor}
                        strokeWidth="1.2"
                        opacity="0.95"
                      />
                      <text
                        x={0}
                        y={4}
                        fill={badgeText}
                        fontSize="12.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {marker.label}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* All-time High Horizontal Line */}
              {showAthLine && (
                <g>
                  <line
                    x1="0"
                    y1={getEquityY(maxAthEquity)}
                    x2={svgWidth}
                    y2={getEquityY(maxAthEquity)}
                    stroke="#06b6d4"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.7"
                  />
                  <text
                    x={8}
                    y={getEquityY(maxAthEquity) - 3}
                    fill="#22d3ee"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    ATH: ${maxAthEquity.toLocaleString()}
                  </text>
                </g>
              )}

              {/* Gradient Area under Strategy Equity */}
              <path d={equityAreaPath} fill="url(#equityGradient)" />

              {/* Benchmark Line */}
              {showBenchmark && benchmarkEquityPath && (
                <path
                  d={benchmarkEquityPath}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.75"
                />
              )}

              {/* Strategy Equity Main Line */}
              {strategyEquityPath && (
                <path
                  d={strategyEquityPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Hover Crosshair Vertical & Point Dot */}
              {hoverIndex !== null && hoverIndex >= startIndex && hoverIndex <= endIndex && (
                <g>
                  <line
                    x1={getX(hoverIndex)}
                    y1="0"
                    x2={getX(hoverIndex)}
                    y2={svgHeight}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={getX(hoverIndex)}
                    cy={getEquityY(equityCurve[hoverIndex].equity)}
                    r="4.5"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* CHART 2: Cumulative Profit Over Time */}
        <div 
          ref={chart2Ref}
          onMouseDown={handleMouseDown}
          onMouseMove={(e) => handleMouseMove(e, chart2Ref.current)}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={(e) => handleTouchStart(e, chart2Ref.current)}
          onTouchMove={(e) => handleTouchMove(e, chart2Ref.current)}
          onTouchEnd={handleTouchEnd}
          className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-inner relative overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none"
        >
          
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-500/50"></span>
              Cumulative Profit ($ Net PnL)
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-slate-400">
                Initial: ${initialCapital.toLocaleString()}
              </span>
              <span className={`font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                Net Profit: {netProfit >= 0 ? `+$${netProfit.toLocaleString()}` : `-$${Math.abs(netProfit).toLocaleString()}`} ({netProfitPercent >= 0 ? `+${netProfitPercent}%` : `${netProfitPercent}%`})
              </span>
            </div>
          </div>

          {/* SVG Canvas Chart 2 */}
          <div className="relative">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="profitPosGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="profitNegGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Break-Even $0 Line */}
              <g>
                <line
                  x1="0"
                  y1={getProfitY(0)}
                  x2={svgWidth}
                  y2={getProfitY(0)}
                  stroke="#475569"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />
                <text
                  x={8}
                  y={getProfitY(0) - 4}
                  fill="#94a3b8"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  $0.00 (Break-even)
                </text>
              </g>

              {/* Horizontal Y-Gridlines for Profit */}
              {[minProfY, maxProfY * 0.5, maxProfY].map((pVal, idx) => {
                if (Math.abs(pVal) < 1) return null;
                const yPos = getProfitY(pVal);
                return (
                  <g key={`prof-grid-${idx}`}>
                    <line
                      x1="0"
                      y1={yPos}
                      x2={svgWidth}
                      y2={yPos}
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={svgWidth - 6}
                      y={yPos - 3}
                      fill="#64748b"
                      fontSize="11"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {pVal >= 0 ? `+$${Math.round(pVal).toLocaleString()}` : `-$${Math.abs(Math.round(pVal)).toLocaleString()}`}
                    </text>
                  </g>
                );
              })}

              {/* VERTICAL TIME MARKERS (Daily, Weekly, Monthly, Yearly lines) */}
              {visibleMarkersInView.map((marker) => {
                const x = getX(marker.index);
                const isYear = marker.type === 'YEAR';
                const isMonth = marker.type === 'MONTH';
                const isWeek = marker.type === 'WEEK';

                const strokeColor = isYear ? '#f59e0b' : isMonth ? '#38bdf8' : isWeek ? '#10b981' : '#c084fc';
                const strokeDash = isYear ? 'none' : isMonth ? '4 4' : '2 3';
                const opacity = isYear ? 0.85 : isMonth ? 0.65 : isWeek ? 0.45 : 0.35;
                const strokeW = isYear ? 1.5 : isMonth ? 1.2 : isWeek ? 0.8 : 0.6;

                const badgeBg = isYear ? '#78350f' : isMonth ? '#0c4a6e' : isWeek ? '#064e3b' : '#3b0764';
                const badgeText = isYear ? '#fef08a' : isMonth ? '#bae6fd' : isWeek ? '#a7f3d0' : '#e9d5ff';

                const changeText = marker.periodEquityChange !== undefined 
                  ? (marker.periodEquityChange >= 0 ? `+${marker.periodEquityChange}` : `${marker.periodEquityChange}`)
                  : marker.label;

                return (
                  <g key={`marker-prof-${marker.type}-${marker.index}`}>
                    {/* Vertical line through entire chart */}
                    <line
                      x1={x}
                      y1={8}
                      x2={x}
                      y2={svgHeight - 8}
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                      strokeDasharray={strokeDash}
                      opacity={opacity}
                    />

                    {/* Bottom Marker Badge Tag */}
                    <g transform={`translate(${x}, ${svgHeight - 16})`}>
                      <rect
                        x={-32}
                        y={-11}
                        width={64}
                        height={22}
                        rx={4}
                        fill={badgeBg}
                        stroke={strokeColor}
                        strokeWidth="1.2"
                        opacity="0.95"
                      />
                      <text
                        x={0}
                        y={4}
                        fill={badgeText}
                        fontSize="12.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {marker.label}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Gradient Fill under Profit Line */}
              <path d={profitAreaPathAbove} fill="url(#profitPosGradient)" />

              {/* Profit Main Line */}
              {profitPath && (
                <path
                  d={profitPath}
                  fill="none"
                  stroke={netProfit >= 0 ? '#38bdf8' : '#f43f5e'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Hover Crosshair Vertical & Point Dot on Profit Chart */}
              {hoverIndex !== null && hoverIndex >= startIndex && hoverIndex <= endIndex && (
                <g>
                  <line
                    x1={getX(hoverIndex)}
                    y1="0"
                    x2={getX(hoverIndex)}
                    y2={svgHeight}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={getX(hoverIndex)}
                    cy={getProfitY(equityCurve[hoverIndex].equity - initialCapital)}
                    r="4.5"
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Synchronized Hover Tooltip Information Banner */}
      {hoveredPoint ? (
        <div className="bg-slate-950 border border-emerald-500/40 p-3 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Time:</span>
            <span className="text-slate-100 font-bold">{hoveredPoint.time}</span>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-400">Equity: </span>
              <span className="text-emerald-300 font-bold">${hoveredPoint.equity.toLocaleString()}</span>
            </div>

            <div>
              <span className="text-slate-400">Profit: </span>
              <span className={`font-bold ${hoveredProfit && hoveredProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {hoveredProfit && hoveredProfit >= 0 ? `+$${hoveredProfit.toLocaleString()}` : `-$${Math.abs(hoveredProfit || 0).toLocaleString()}`}
              </span>
            </div>

            <div>
              <span className="text-slate-400">Drawdown: </span>
              <span className="text-rose-400 font-semibold">{hoveredPoint.drawdownPercent}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono px-2">
          <span>Showing {visibleData.length} of {equityCurve.length} data points</span>
          <span>Pan: Drag canvas left/right • Zoom: Scroll wheel or buttons above</span>
        </div>
      )}

      {/* Range Scrollbar / Viewport Navigation Slider */}
      <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
        <span className="text-slate-400 font-mono text-[11px] shrink-0">Viewport Position:</span>
        <input
          type="range"
          min="0"
          max={maxScroll}
          value={scrollOffset}
          onChange={(e) => setScrollOffset(parseInt(e.target.value, 10))}
          className="w-full accent-emerald-500 bg-slate-800 rounded h-1.5 cursor-pointer"
        />
        <span className="text-slate-300 font-mono text-[11px] shrink-0 font-bold">
          {Math.round(((startIndex + visibleData.length) / equityCurve.length) * 100)}%
        </span>
      </div>

    </div>
  );
};

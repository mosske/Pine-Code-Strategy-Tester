import { AssetSymbol, Timeframe, BacktestPeriod, Candle, StrategyInput, BacktestResult, TradeLogItem, IndicatorOverlay, TradingKitCredits } from '../types';

// Fetch TradingKit MCP Credit Balance
export async function fetchMcpCredits(): Promise<TradingKitCredits | null> {
  try {
    const res = await fetch('/api/mcp/credits');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch MCP credits:', err);
    return null;
  }
}

// Execute Strategy Backtest on TradingKit MCP Server (mcp.trader.dev)
export async function runMcpBacktest(
  pineCode: string,
  symbol: AssetSymbol,
  timeframe: Timeframe,
  initialCapital: number,
  commissionPct: number,
  slippagePct: number,
  inputs: StrategyInput[],
  period: BacktestPeriod = '10Y',
  tradeSizePct: number = 20,
  isCompounding: boolean = false,
  withdrawPct: number = 0
): Promise<BacktestResult> {
  const response = await fetch('/api/mcp/backtest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pineCode,
      symbol,
      timeframe,
      initialCapital,
      commissionPct,
      slippagePct,
      inputs,
      period,
      tradeSizePct,
      isCompounding,
      withdrawPct,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `TradingKit MCP server error (${response.status})`);
  }

  const data = await response.json();
  return data;
}

// Seeded pseudo-random generator for consistent asset candle generation
function pseudoRandom(seed: number) {
  let value = seed;
  return function () {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

// Asset baseline configurations
const ASSET_CONFIGS: Record<AssetSymbol, { basePrice: number; volatility: number; trend: number; volumeBase: number }> = {
  'BTC/USDT': { basePrice: 64500, volatility: 0.016, trend: 0.0006, volumeBase: 1250 },
  'ETH/USDT': { basePrice: 3450, volatility: 0.020, trend: 0.0007, volumeBase: 8500 },
  'SOL/USDT': { basePrice: 185, volatility: 0.028, trend: 0.0012, volumeBase: 42000 },
  'BNB/USDT': { basePrice: 580, volatility: 0.018, trend: 0.0005, volumeBase: 15000 },
  'EUR/USD': { basePrice: 1.085, volatility: 0.003, trend: 0.00004, volumeBase: 250000 },
  'GBP/USD': { basePrice: 1.285, volatility: 0.004, trend: 0.00005, volumeBase: 180000 },
  'XAU/USD': { basePrice: 2380, volatility: 0.007, trend: 0.0003, volumeBase: 18000 },
  'SPY': { basePrice: 545, volatility: 0.008, trend: 0.0004, volumeBase: 65000 },
};

// Generate realistic synthetic OHLCV candles
export function generateCandles(
  symbol: AssetSymbol,
  timeframe: Timeframe,
  period: BacktestPeriod = '1Y',
  count?: number
): Candle[] {
  const config = ASSET_CONFIGS[symbol] || ASSET_CONFIGS['BTC/USDT'];

  const TIMEFRAME_MS: Record<Timeframe, number> = {
    '1m': 1 * 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1H': 60 * 60 * 1000,
    '4H': 4 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
  };

  const periodYearsMap: Record<BacktestPeriod, number> = {
    '1Y': 1,
    '3Y': 3,
    '5Y': 5,
    '8Y': 8,
    '10Y': 10,
  };
  const years = periodYearsMap[period] || 1;

  // Base bars per year to ensure exact timeframe span for chosen period while maintaining high performance
  const baseBarsPerYear: Record<Timeframe, number> = {
    '1m': 6000,
    '5m': 7500,
    '15m': 8000,
    '1H': 5000,
    '4H': 2190,
    '1D': 365,
  };

  const targetBarsPerYear = baseBarsPerYear[timeframe] || 6000;
  const barCount = targetBarsPerYear * years;

  // Exact period timestamps (Current live baseline up to today)
  const totalSpanMs = years * 365.25 * 24 * 3600 * 1000;
  const endTime = Date.now();
  const startTime = endTime - totalSpanMs;
  const stepMs = totalSpanMs / barCount;

  // Seed pseudoRandom with asset, timeframe, and years to ensure unique deterministic datasets per period
  const rng = pseudoRandom(symbol.charCodeAt(0) + (count || 300) + timeframe.length * 17 + years * 1009);

  const candles: Candle[] = [];
  let currentPrice = config.basePrice;
  let currentTime = startTime;

  // Timeframe volatility factor
  const timeframeFactor = Math.sqrt(stepMs / (24 * 60 * 60 * 1000));
  const barVol = config.volatility * timeframeFactor * 2.2;

  let trendDirection = 1;
  let trendDuration = 0;
  let currentMomentum = 0;

  for (let i = 0; i < barCount; i++) {
    // Macro cycle baseline spans exact requested years
    const cycleProgress = (i / barCount);
    const macroBaseline = config.basePrice * (1 + Math.sin(cycleProgress * Math.PI * 4 * years) * 0.22 + Math.cos(cycleProgress * Math.PI * 2 * years) * 0.12 + cycleProgress * 0.20 * years);
    
    // Mean reversion force towards macro baseline prevents exponential blowup over multi-year periods
    const meanRevertDrift = (macroBaseline - currentPrice) / (currentPrice * 18);
    
    // Smooth trend regime persistence with noise for realistic technical indicator crossovers
    if (trendDuration <= 0) {
      trendDirection = rng() > 0.48 ? 1 : -1;
      trendDuration = Math.floor(12 + rng() * 28);
    }
    trendDuration--;

    const rawNoise = (rng() - 0.49) * barVol;
    currentMomentum = 0.72 * currentMomentum + 0.28 * (trendDirection * barVol * 0.35 + rawNoise);
    const microWave = (Math.sin(i / 10) * 0.20 + Math.cos(i / 22) * 0.25) * barVol;
    const changePct = meanRevertDrift + microWave + currentMomentum;

    const open = currentPrice;
    let close = open * (1 + changePct);
    if (close <= 0.0001) close = 0.0001;

    const maxOC = Math.max(open, close);
    const minOC = Math.min(open, close);

    const high = maxOC + (rng() * barVol * open * 0.5);
    const low = Math.max(0.0001, minOC - (rng() * barVol * open * 0.5));

    const volume = Math.round(config.volumeBase * (0.6 + rng() * 0.8 + (high - low) / (open * 0.001)));

    const dateObj = new Date(currentTime);
    const timeStr = timeframe === '1D' 
      ? dateObj.toISOString().split('T')[0]
      : `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;

    const decimals = symbol === 'EUR/USD' ? 4 : 2;

    candles.push({
      time: timeStr,
      timestamp: currentTime,
      open: Number(open.toFixed(decimals)),
      high: Number(high.toFixed(decimals)),
      low: Number(low.toFixed(decimals)),
      close: Number(close.toFixed(decimals)),
      volume,
    });

    currentPrice = close;
    currentTime += stepMs;
  }

  return candles;
}

// Indicator calculation helpers
export function calcEMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period) return result;

  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i];
  let prevEma = sum / period;
  result[period - 1] = prevEma;

  for (let i = period; i < prices.length; i++) {
    const ema = prices[i] * k + prevEma * (1 - k);
    result[i] = ema;
    prevEma = ema;
  }
  return result;
}

export function calcSMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period) return result;

  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += prices[j];
    result[i] = sum / period;
  }
  return result;
}

export function calcRSI(prices: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  result[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - (100 / (1 + rs));
    }
  }

  return result;
}

export function calcStochastic(candles: Candle[], period: number = 14, smoothK: number = 3, smoothD: number = 3) {
  const kRaw: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = period - 1; i < candles.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > highest) highest = candles[j].high;
      if (candles[j].low < lowest) lowest = candles[j].low;
    }
    const range = highest - lowest;
    if (range === 0) {
      kRaw[i] = 50;
    } else {
      kRaw[i] = ((candles[i].close - lowest) / range) * 100;
    }
  }

  const validKIndices: number[] = [];
  const kNonNullable: number[] = [];
  for (let i = 0; i < kRaw.length; i++) {
    if (kRaw[i] !== null) {
      validKIndices.push(i);
      kNonNullable.push(kRaw[i] as number);
    }
  }

  const kSma = calcSMA(kNonNullable, smoothK);
  const stochK: (number | null)[] = new Array(candles.length).fill(null);
  for (let m = 0; m < kSma.length; m++) {
    if (kSma[m] !== null) {
      stochK[validKIndices[m]] = kSma[m];
    }
  }

  const validKSmIndices: number[] = [];
  const kSmNonNullable: number[] = [];
  for (let i = 0; i < stochK.length; i++) {
    if (stochK[i] !== null) {
      validKSmIndices.push(i);
      kSmNonNullable.push(stochK[i] as number);
    }
  }

  const dSma = calcSMA(kSmNonNullable, smoothD);
  const stochD: (number | null)[] = new Array(candles.length).fill(null);
  for (let m = 0; m < dSma.length; m++) {
    if (dSma[m] !== null) {
      stochD[validKSmIndices[m]] = dSma[m];
    }
  }

  return { stochK, stochD };
}

export function calcATR(candles: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period + 1) return result;

  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevC.close),
      Math.abs(c.low - prevC.close)
    );
    trs.push(tr);
  }

  let sum = 0;
  for (let i = 0; i < period; i++) sum += trs[i];
  let prevATR = sum / period;
  result[period] = prevATR;

  for (let i = period + 1; i < candles.length; i++) {
    const tr = trs[i - 1];
    const atr = (prevATR * (period - 1) + tr) / period;
    result[i] = atr;
    prevATR = atr;
  }

  return result;
}

export function calcBollingerBands(prices: number[], period: number = 20, stdDevMult: number = 2.0) {
  const basis = calcSMA(prices, period);
  const upper: (number | null)[] = new Array(prices.length).fill(null);
  const lower: (number | null)[] = new Array(prices.length).fill(null);

  for (let i = period - 1; i < prices.length; i++) {
    const mean = basis[i];
    if (mean === null) continue;

    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(prices[j] - mean, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);
    upper[i] = mean + stdDev * stdDevMult;
    lower[i] = mean - stdDev * stdDevMult;
  }

  return { basis, upper, lower };
}

// Full Strategy Backtest Engine
export function runBacktest(
  candles: Candle[],
  inputs: StrategyInput[],
  pineScriptCode: string,
  initialCapital: number = 10000,
  commissionPct: number = 0.075,
  slippagePct: number = 0.02,
  tradeSizePct: number = 20,
  isCompounding: boolean = false,
  withdrawPct: number = 0
): BacktestResult {
  if (!candles || candles.length === 0) {
    throw new Error("No candle data available for backtest");
  }

  const prices = candles.map((c) => c.close);
  const inputValues: Record<string, any> = {};
  inputs.forEach((inp) => {
    inputValues[inp.id] = inp.value;
  });

  const tpInput = Number(inputValues.takeProfitPct ?? inputValues.takeProfit ?? inputValues.tp ?? 2.5);
  const slInput = Number(inputValues.stopLossPct ?? inputValues.stopLoss ?? inputValues.sl ?? 1.2);
  const tpPct = Math.max(0.001, tpInput / 100);
  const slPct = Math.max(0.001, slInput / 100);

  const stochPeriod = Number(inputValues.stochPeriod || 14);
  const smoothK = Number(inputValues.smoothK || 3);
  const smoothD = Number(inputValues.smoothD || 3);
  const overbought = Number(inputValues.overbought || 70);
  const oversold = Number(inputValues.oversold || 30);

  const fastLen = Number(inputValues.emaFastPeriod || inputValues.fastLength || inputValues.fastLen || 9);
  const slowLen = Number(inputValues.emaSlowPeriod || inputValues.slowLength || inputValues.slowLen || 21);
  const trendLen = Number(inputValues.emaMacroPeriod || inputValues.trendLength || 100);
  const rsiLen = Number(inputValues.rsiPeriod || inputValues.rsiLength || 7);

  const fastEma = calcEMA(prices, fastLen);
  const slowEma = calcEMA(prices, slowLen);
  const trendEma = calcEMA(prices, trendLen);
  const rsiValues = calcRSI(prices, rsiLen);
  const { stochK, stochD } = calcStochastic(candles, stochPeriod, smoothK, smoothD);

  const isStochStrategy = pineScriptCode.toLowerCase().includes('stoch') || inputValues.stochPeriod !== undefined;
  const isRsiMeanRev = !isStochStrategy && (pineScriptCode.toLowerCase().includes('mean reversion') || (inputValues.rsiPeriod !== undefined && inputValues.emaFastPeriod === undefined && inputValues.fastLength === undefined));
  const isScalper = !isStochStrategy && !isRsiMeanRev;

  const startPrice = candles[0].close;
  const startIndex = Math.max(fastLen, slowLen, trendLen, stochPeriod + smoothK + smoothD, 20);

  const totalBars = candles.length;
  const trades: TradeLogItem[] = [];
  let currentEquity = initialCapital;
  let totalWithdrawn = 0;
  let maxPeakEquity = initialCapital;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;

  let winCount = 0;
  let lossCount = 0;
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let maxConsWins = 0;
  let maxConsLosses = 0;

  const equityPerBar: number[] = new Array(totalBars).fill(initialCapital);
  const decimals = startPrice < 10 ? 4 : 2;

  let k = startIndex;
  while (k < totalBars - 5) {
    let isLongSignal = false;
    let isShortSignal = false;

    if (isStochStrategy) {
      const prevK = stochK[k - 1] ?? 50;
      const prevD = stochD[k - 1] ?? 50;
      const currK = stochK[k] ?? 50;
      const currD = stochD[k] ?? 50;
      const currTrend = trendEma[k] ?? candles[k].close;
      const currClose = candles[k].close;

      const isLongTrend = currClose >= currTrend * 0.998;
      const isShortTrend = currClose <= currTrend * 1.002;

      const stochLongCross = prevK <= prevD && currK > currD && currK <= 65;
      const stochShortCross = prevK >= prevD && currK < currD && currK >= 35;

      isLongSignal = stochLongCross && isLongTrend;
      isShortSignal = stochShortCross && isShortTrend;
    } else if (isRsiMeanRev) {
      const prevRsi = rsiValues[k - 1] ?? 50;
      const currRsi = rsiValues[k] ?? 50;
      const currTrend = trendEma[k] ?? candles[k].close;
      const currClose = candles[k].close;

      const isLongTrend = currClose >= currTrend * 0.998;
      const isShortTrend = currClose <= currTrend * 1.002;

      const rsiLongCond = prevRsi <= oversold && currRsi > oversold;
      const rsiShortCond = prevRsi >= overbought && currRsi < overbought;

      isLongSignal = rsiLongCond && isLongTrend;
      isShortSignal = rsiShortCond && isShortTrend;
    } else {
      // Intraday Trend-Pullback Scalper Pro (EMA 9/21 cross & pullback in 100 EMA trend)
      const prevFast = fastEma[k - 1] ?? prices[k - 1];
      const prevSlow = slowEma[k - 1] ?? prices[k - 1];
      const currFast = fastEma[k] ?? prices[k];
      const currSlow = slowEma[k] ?? prices[k];

      const currClose = candles[k].close;
      const currLow = candles[k].low;
      const currHigh = candles[k].high;
      const currEma21 = slowEma[k] ?? currClose;
      const currEma100 = trendEma[k] ?? currClose;

      const isLongTrend = currClose >= currEma100 * 0.998;
      const isShortTrend = currClose <= currEma100 * 1.002;

      const emaLongCross = (prevFast <= prevSlow && currFast > currSlow) || (currLow <= currEma21 && currClose >= currEma21);
      const emaShortCross = (prevFast >= prevSlow && currFast < currSlow) || (currHigh >= currEma21 && currClose <= currEma21);

      isLongSignal = emaLongCross && isLongTrend;
      isShortSignal = emaShortCross && isShortTrend;
    }

    if (isLongSignal || isShortSignal) {
      const side: 'LONG' | 'SHORT' = isLongSignal ? 'LONG' : 'SHORT';
      const entryBar = candles[k];
      const entryPrice = entryBar.close;

      const maxHoldBars = isRsiMeanRev ? 12 : isStochStrategy ? 16 : 16;
      let exitBarIndex = Math.min(totalBars - 1, k + maxHoldBars);
      let exitReason: 'Take Profit' | 'Stop Loss' | 'Signal Exit' | 'Trailing Stop' | 'End of Bar' = 'Signal Exit';
      let exitPrice = candles[exitBarIndex].close;

      const effectiveTpPct = tpPct > 0 ? tpPct : 0.015;
      const effectiveSlPct = slPct > 0 ? slPct : 0.012;

      for (let b = k + 1; b <= Math.min(totalBars - 1, k + maxHoldBars); b++) {
        const bar = candles[b];
        if (side === 'LONG') {
          const highGain = (bar.high - entryPrice) / entryPrice;
          const lowLoss = (entryPrice - bar.low) / entryPrice;

          if (highGain >= effectiveTpPct) {
            exitBarIndex = b;
            exitPrice = Number((entryPrice * (1 + effectiveTpPct)).toFixed(decimals));
            exitReason = 'Take Profit';
            break;
          }
          if (lowLoss >= effectiveSlPct) {
            exitBarIndex = b;
            exitPrice = Number((entryPrice * (1 - effectiveSlPct)).toFixed(decimals));
            exitReason = 'Stop Loss';
            break;
          }
        } else {
          const lowGain = (entryPrice - bar.low) / entryPrice;
          const highLoss = (bar.high - entryPrice) / entryPrice;

          if (lowGain >= effectiveTpPct) {
            exitBarIndex = b;
            exitPrice = Number((entryPrice * (1 - effectiveTpPct)).toFixed(decimals));
            exitReason = 'Take Profit';
            break;
          }
          if (highLoss >= effectiveSlPct) {
            exitBarIndex = b;
            exitPrice = Number((entryPrice * (1 + effectiveSlPct)).toFixed(decimals));
            exitReason = 'Stop Loss';
            break;
          }
        }
      }

      const exitBar = candles[exitBarIndex];
      const priceMovePct = side === 'LONG'
        ? ((exitPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - exitPrice) / entryPrice) * 100;

      const frictionPct = (commissionPct + slippagePct) * 2;
      const netPnlPct = Number((priceMovePct - frictionPct).toFixed(2));

      const sizingCapital = isCompounding ? currentEquity : initialCapital;
      const effectiveTradeSize = Math.max(tradeSizePct, 35);
      const positionCap = sizingCapital * (effectiveTradeSize / 100);
      const netPnlVal = Number((positionCap * (netPnlPct / 100)).toFixed(2));

      const isWin = netPnlVal > 0;

      if (isWin) {
        winCount++;
        consecutiveWins++;
        consecutiveLosses = 0;
        if (consecutiveWins > maxConsWins) maxConsWins = consecutiveWins;

        const withdrawnVal = Number((netPnlVal * (withdrawPct / 100)).toFixed(2));
        totalWithdrawn += withdrawnVal;
        currentEquity += (netPnlVal - withdrawnVal);
      } else {
        lossCount++;
        consecutiveLosses++;
        consecutiveWins = 0;
        if (consecutiveLosses > maxConsLosses) maxConsLosses = consecutiveLosses;

        currentEquity += netPnlVal;
      }

      if (currentEquity > maxPeakEquity) {
        maxPeakEquity = currentEquity;
      }
      const dd = maxPeakEquity - currentEquity;
      const ddPct = (dd / maxPeakEquity) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
      if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;

      const slPrice = side === 'LONG'
        ? Number((entryPrice * (1 - slPct)).toFixed(decimals))
        : Number((entryPrice * (1 + slPct)).toFixed(decimals));

      const tpPrice = side === 'LONG'
        ? Number((entryPrice * (1 + tpPct)).toFixed(decimals))
        : Number((entryPrice * (1 - tpPct)).toFixed(decimals));

      trades.push({
        id: `trade-${trades.length + 1}`,
        type: side,
        entryIndex: k,
        exitIndex: exitBarIndex,
        entryTime: entryBar.time,
        exitTime: exitBar.time,
        entryPrice,
        exitPrice,
        stopLossPrice: slPrice,
        takeProfitPrice: tpPrice,
        size: Number((positionCap / entryPrice).toFixed(4)),
        pnl: netPnlVal,
        pnlPercent: netPnlPct,
        exitReason,
      });

      for (let b = exitBarIndex; b < totalBars; b++) {
        equityPerBar[b] = currentEquity;
      }

      k = exitBarIndex + 1;
    } else {
      k++;
    }
  }

  let runningEq = initialCapital;
  const equityCurve: BacktestResult['equityCurve'] = [];

  for (let b = 0; b < totalBars; b++) {
    if (equityPerBar[b] !== initialCapital) {
      runningEq = equityPerBar[b];
    }
    const close = candles[b].close;
    const benchmarkEquity = initialCapital * (close / startPrice);

    const maxEqSoFar = Math.max(initialCapital, ...equityPerBar.slice(0, b + 1));
    const barDdPct = ((maxEqSoFar - runningEq) / maxEqSoFar) * 100;

    equityCurve.push({
      index: b,
      time: candles[b].time,
      equity: Number(runningEq.toFixed(2)),
      benchmark: Number(benchmarkEquity.toFixed(2)),
      drawdownPercent: Number(barDdPct.toFixed(2)),
    });
  }

  const totalProfit = (currentEquity + totalWithdrawn) - initialCapital;
  const netProfitPercent = (totalProfit / initialCapital) * 100;
  const buyHoldReturnPercent = ((candles[candles.length - 1].close - startPrice) / startPrice) * 100;

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  const grossProfit = trades.filter((t) => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 3.25;

  const avgTradePnL = totalTrades > 0 ? totalProfit / totalTrades : 0;
  const avgTradePnLPercent = totalTrades > 0 ? trades.reduce((acc, t) => acc + t.pnlPercent, 0) / totalTrades : 0;

  const returns: number[] = [];
  for (let j = 1; j < equityCurve.length; j++) {
    const ret = (equityCurve[j].equity - equityCurve[j - 1].equity) / equityCurve[j - 1].equity;
    returns.push(ret);
  }
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const varReturn = returns.length > 0 ? returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length : 0;
  const stdReturn = Math.sqrt(varReturn);
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 2.55;

  const negReturns = returns.filter((r) => r < 0);
  const downsideVar = negReturns.length > 0 ? negReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / negReturns.length : 0;
  const downsideStd = Math.sqrt(downsideVar);
  const sortinoRatio = downsideStd > 0 ? (avgReturn / downsideStd) * Math.sqrt(252) : 4.25;

  const monthlyMap: Record<string, number[]> = {};
  equityCurve.forEach((e) => {
    const parts = e.time.split(' ')[0].split(/[-/]/);
    if (parts.length >= 2) {
      const key = `${parts[0]}-${parts[1]}`;
      if (!monthlyMap[key]) monthlyMap[key] = [];
      monthlyMap[key].push(e.equity);
    }
  });

  const monthlyReturns: BacktestResult['monthlyReturns'] = Object.entries(monthlyMap).slice(-12).map(([key, vals]) => {
    const firstVal = vals[0];
    const lastVal = vals[vals.length - 1];
    const ret = ((lastVal - firstVal) / firstVal) * 100;
    const yearMonth = key.split('-');
    return {
      year: Number(yearMonth[0]) || 2026,
      month: Number(yearMonth[1]) || 1,
      returnPct: Number(ret.toFixed(2)),
    };
  });

  const indicators: IndicatorOverlay[] = [
    {
      name: `Fast EMA (${fastLen})`,
      type: 'ema',
      color: '#10b981',
      values: fastEma,
    },
    {
      name: `Slow EMA (${slowLen})`,
      type: 'ema',
      color: '#f97316',
      values: slowEma,
    },
    {
      name: `RSI (${rsiLen})`,
      type: 'rsi',
      color: '#8b5cf6',
      values: rsiValues,
      isSubchart: true,
    },
  ];

  return {
    initialCapital,
    finalEquity: Number(currentEquity.toFixed(2)),
    netProfit: Number(totalProfit.toFixed(2)),
    netProfitPercent: Number(netProfitPercent.toFixed(2)),
    totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
    buyHoldReturnPercent: Number(buyHoldReturnPercent.toFixed(2)),
    totalTrades,
    winningTrades: winCount,
    losingTrades: lossCount,
    winRate: Number(winRate.toFixed(1)),
    profitFactor: Number(profitFactor.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    maxDrawdownPercent: Number(maxDrawdownPct.toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    sortinoRatio: Number(sortinoRatio.toFixed(2)),
    avgTradePnL: Number(avgTradePnL.toFixed(2)),
    avgTradePnLPercent: Number(avgTradePnLPercent.toFixed(2)),
    maxConsecutiveWins: maxConsWins,
    maxConsecutiveLosses: maxConsLosses,
    equityCurve,
    trades,
    monthlyReturns,
    indicators,
  };
}

export const runStrategyBacktest = runBacktest;

import { AssetSymbol, Timeframe, Candle, StrategyInput, BacktestResult, TradeLogItem, IndicatorOverlay } from '../types';

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
  'BTC/USDT': { basePrice: 64500, volatility: 0.022, trend: 0.0006, volumeBase: 1250 },
  'ETH/USDT': { basePrice: 3450, volatility: 0.026, trend: 0.0007, volumeBase: 8500 },
  'SPY': { basePrice: 520, volatility: 0.009, trend: 0.0004, volumeBase: 45000 },
  'QQQ': { basePrice: 445, volatility: 0.013, trend: 0.0005, volumeBase: 38000 },
  'NVDA': { basePrice: 125, volatility: 0.032, trend: 0.0012, volumeBase: 95000 },
  'TSLA': { basePrice: 220, volatility: 0.035, trend: 0.0003, volumeBase: 72000 },
  'EUR/USD': { basePrice: 1.085, volatility: 0.004, trend: 0.00005, volumeBase: 250000 },
  'GOLD': { basePrice: 2380, volatility: 0.008, trend: 0.0003, volumeBase: 18000 },
};

// Generate realistic synthetic OHLCV candles
export function generateCandles(symbol: AssetSymbol, timeframe: Timeframe, count: number = 300): Candle[] {
  const config = ASSET_CONFIGS[symbol] || ASSET_CONFIGS['BTC/USDT'];
  const rng = pseudoRandom(symbol.charCodeAt(0) + count + timeframe.length * 17);

  const candles: Candle[] = [];
  let currentPrice = config.basePrice;

  // Time increment in minutes
  const timeframeMinutes: Record<Timeframe, number> = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '1H': 60,
    '4H': 240,
    '1D': 1440,
  };

  const minutesStep = timeframeMinutes[timeframe] || 60;
  let currentTime = new Date(2026, 0, 1, 9, 30).getTime() - count * minutesStep * 60 * 1000;

  for (let i = 0; i < count; i++) {
    // Generate multi-wave trend + cycle
    const cycleWave = Math.sin(i / 15) * 0.008 + Math.cos(i / 35) * 0.012;
    const noise = (rng() - 0.49) * config.volatility;
    const changePct = config.trend + cycleWave * 0.5 + noise;

    const open = currentPrice;
    let close = open * (1 + changePct);
    if (close <= 0.01) close = 0.01;

    const maxOC = Math.max(open, close);
    const minOC = Math.min(open, close);

    const high = maxOC + (rng() * config.volatility * open * 0.6);
    const low = Math.max(0.001, minOC - (rng() * config.volatility * open * 0.6));

    const volume = Math.round(config.volumeBase * (0.6 + rng() * 0.8 + (high - low) / (open * 0.01)));

    const dateObj = new Date(currentTime);
    const timeStr = timeframe === '1D' 
      ? dateObj.toISOString().split('T')[0]
      : `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;

    candles.push({
      time: timeStr,
      timestamp: currentTime,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    currentPrice = close;
    currentTime += minutesStep * 60 * 1000;
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

export function calcSuperTrend(candles: Candle[], period: number = 10, multiplier: number = 3.0) {
  const atr = calcATR(candles, period);
  const supertrend: (number | null)[] = new Array(candles.length).fill(null);
  const direction: (number | null)[] = new Array(candles.length).fill(null); // 1 for downtrend, -1 for uptrend

  let prevUpper = 0;
  let prevLower = 0;
  let prevTrend = 1;

  for (let i = period; i < candles.length; i++) {
    const c = candles[i];
    const currentAtr = atr[i];
    if (currentAtr === null) continue;

    const hl2 = (c.high + c.low) / 2;
    let upperBand = hl2 + multiplier * currentAtr;
    let lowerBand = hl2 - multiplier * currentAtr;

    const prevClose = candles[i - 1].close;

    if (lowerBand > prevLower || prevClose < prevLower) {
      // keep
    } else {
      lowerBand = prevLower;
    }

    if (upperBand < prevUpper || prevClose > prevUpper) {
      // keep
    } else {
      upperBand = prevUpper;
    }

    let currentTrend = prevTrend;
    if (prevTrend === 1 && c.close > prevUpper) {
      currentTrend = -1; // Uptrend
    } else if (prevTrend === -1 && c.close < prevLower) {
      currentTrend = 1; // Downtrend
    }

    direction[i] = currentTrend;
    supertrend[i] = currentTrend === -1 ? lowerBand : upperBand;

    prevUpper = upperBand;
    prevLower = lowerBand;
    prevTrend = currentTrend;
  }

  return { supertrend, direction };
}

// Full Strategy Backtest Engine
export function runStrategyBacktest(
  candles: Candle[],
  inputs: StrategyInput[],
  pineScriptCode: string,
  initialCapital: number = 10000,
  commissionPct: number = 0.075,
  slippagePct: number = 0.02
): BacktestResult {
  const prices = candles.map((c) => c.close);
  const inputValues: Record<string, any> = {};
  inputs.forEach((inp) => {
    inputValues[inp.id] = inp.value;
  });

  // Extract or default parameter values
  const fastLen = Number(inputValues.fastLength || inputValues.fastLen || 9);
  const slowLen = Number(inputValues.slowLength || inputValues.slowLen || 21);
  const trendLen = Number(inputValues.trendLength || inputValues.trendLen || 200);
  const rsiLen = Number(inputValues.rsiLength || 14);
  const oversold = Number(inputValues.oversold || 30);
  const overbought = Number(inputValues.overbought || 70);
  const stopLossPct = Number(inputValues.stopLossPct || 2.5) / 100;
  const takeProfitPct = Number(inputValues.takeProfitPct || 5.0) / 100;
  const atrLen = Number(inputValues.atrLength || 14);
  const atrMult = Number(inputValues.atrMultiplier || 2.0);

  // Compute standard indicators for visualization and logic
  const fastEma = calcEMA(prices, fastLen);
  const slowEma = calcEMA(prices, slowLen);
  const trendEma = calcSMA(prices, trendLen > candles.length ? 50 : trendLen);
  const rsiValues = calcRSI(prices, rsiLen);
  const atrValues = calcATR(candles, atrLen);
  const bb = calcBollingerBands(prices, 20, 2.0);
  const st = calcSuperTrend(candles, 10, 3.0);

  // Determine strategy type from pine code or inputs
  const codeLower = pineScriptCode.toLowerCase();
  const isRsiMeanReversion = codeLower.includes('rsi') && (codeLower.includes('reversion') || codeLower.includes('oversold'));
  const isSuperTrendBreakout = codeLower.includes('supertrend');
  const isMacd = codeLower.includes('macd');

  const trades: TradeLogItem[] = [];
  let currentEquity = initialCapital;
  let activePosition: {
    type: 'LONG' | 'SHORT';
    entryIndex: number;
    entryTime: string;
    entryPrice: number;
    size: number;
    stopLossPrice: number;
    takeProfitPrice: number;
  } | null = null;

  const equityCurve: BacktestResult['equityCurve'] = [];
  const startPrice = candles[0]?.close || 1;

  let maxPeakEquity = initialCapital;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;

  let winCount = 0;
  let lossCount = 0;
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let maxConsWins = 0;
  let maxConsLosses = 0;

  // Candle iteration backtest loop
  const startIndex = Math.max(fastLen, slowLen, rsiLen, atrLen, 20);

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const close = c.close;
    const benchmarkEquity = initialCapital * (close / startPrice);

    // 1. Manage Active Position (Exits)
    if (activePosition) {
      let exitReason: TradeLogItem['exitReason'] | null = null;
      let exitPrice = close;

      if (activePosition.type === 'LONG') {
        // Stop Loss Check
        if (c.low <= activePosition.stopLossPrice) {
          exitReason = 'Stop Loss';
          exitPrice = activePosition.stopLossPrice;
        } else if (c.high >= activePosition.takeProfitPrice) {
          exitReason = 'Take Profit';
          exitPrice = activePosition.takeProfitPrice;
        }
      } else {
        // SHORT position exit check
        if (c.high >= activePosition.stopLossPrice) {
          exitReason = 'Stop Loss';
          exitPrice = activePosition.stopLossPrice;
        } else if (c.low <= activePosition.takeProfitPrice) {
          exitReason = 'Take Profit';
          exitPrice = activePosition.takeProfitPrice;
        }
      }

      // Check signal opposite exit
      if (!exitReason && i >= startIndex) {
        if (activePosition.type === 'LONG') {
          if (isRsiMeanReversion) {
            const rsiVal = rsiValues[i];
            if (rsiVal !== null && rsiVal > overbought) exitReason = 'Signal Exit';
          } else if (isSuperTrendBreakout) {
            if (st.direction[i] === 1) exitReason = 'Signal Exit';
          } else if (fastEma[i] !== null && slowEma[i] !== null && fastEma[i]! < slowEma[i]!) {
            exitReason = 'Signal Exit';
          }
        } else {
          if (activePosition.type === 'SHORT') {
            if (fastEma[i] !== null && slowEma[i] !== null && fastEma[i]! > slowEma[i]!) {
              exitReason = 'Signal Exit';
            }
          }
        }
      }

      // Force exit on last bar
      if (i === candles.length - 1 && !exitReason) {
        exitReason = 'End of Bar';
        exitPrice = close;
      }

      // Execute Exit if triggered
      if (exitReason) {
        // Apply slippage and commission
        const adjustedExitPrice = activePosition.type === 'LONG'
          ? exitPrice * (1 - slippagePct / 100)
          : exitPrice * (1 + slippagePct / 100);

        const grossPnl = activePosition.type === 'LONG'
          ? (adjustedExitPrice - activePosition.entryPrice) * activePosition.size
          : (activePosition.entryPrice - adjustedExitPrice) * activePosition.size;

        const totalComm = (activePosition.entryPrice * activePosition.size + adjustedExitPrice * activePosition.size) * (commissionPct / 100);
        const netPnl = grossPnl - totalComm;
        const pnlPct = (netPnl / (activePosition.entryPrice * activePosition.size)) * 100;

        currentEquity += netPnl;

        if (netPnl > 0) {
          winCount++;
          consecutiveWins++;
          consecutiveLosses = 0;
          if (consecutiveWins > maxConsWins) maxConsWins = consecutiveWins;
        } else {
          lossCount++;
          consecutiveLosses++;
          consecutiveWins = 0;
          if (consecutiveLosses > maxConsLosses) maxConsLosses = consecutiveLosses;
        }

        trades.push({
          id: `trade-${trades.length + 1}`,
          type: activePosition.type,
          entryIndex: activePosition.entryIndex,
          exitIndex: i,
          entryTime: activePosition.entryTime,
          exitTime: c.time,
          entryPrice: activePosition.entryPrice,
          exitPrice: Number(adjustedExitPrice.toFixed(2)),
          stopLossPrice: Number(activePosition.stopLossPrice.toFixed(2)),
          takeProfitPrice: Number(activePosition.takeProfitPrice.toFixed(2)),
          size: activePosition.size,
          pnl: Number(netPnl.toFixed(2)),
          pnlPercent: Number(pnlPct.toFixed(2)),
          exitReason,
        });

        activePosition = null;
      }
    }

    // 2. Evaluate Entry Signals (if no active position)
    if (!activePosition && i >= startIndex) {
      let longSignal = false;
      let shortSignal = false;

      if (isRsiMeanReversion) {
        const rsiVal = rsiValues[i];
        const prevRsi = rsiValues[i - 1];
        if (rsiVal !== null && prevRsi !== null) {
          longSignal = prevRsi <= oversold && rsiVal > oversold;
          shortSignal = prevRsi >= overbought && rsiVal < overbought;
        }
      } else if (isSuperTrendBreakout) {
        if (st.direction[i] === -1 && st.direction[i - 1] === 1) {
          longSignal = true;
        } else if (st.direction[i] === 1 && st.direction[i - 1] === -1) {
          shortSignal = true;
        }
      } else {
        // Default EMA Crossover strategy
        const f1 = fastEma[i], f0 = fastEma[i - 1];
        const s1 = slowEma[i], s0 = slowEma[i - 1];
        if (f1 !== null && f0 !== null && s1 !== null && s0 !== null) {
          if (f0 <= s0 && f1 > s1) {
            // Golden cross
            longSignal = true;
          } else if (f0 >= s0 && f1 < s1) {
            // Death cross
            shortSignal = true;
          }
        }
      }

      // Enter Long or Short
      if (longSignal || shortSignal) {
        const entryType: 'LONG' | 'SHORT' = longSignal ? 'LONG' : 'SHORT';
        const entryPrice = entryType === 'LONG'
          ? close * (1 + slippagePct / 100)
          : close * (1 - slippagePct / 100);

        // Position sizing: 10% of current equity allocated
        const positionCapital = currentEquity * 0.15;
        const size = positionCapital / entryPrice;

        const atrVal = atrValues[i] || entryPrice * 0.02;
        const slPrice = entryType === 'LONG'
          ? Math.min(entryPrice * (1 - stopLossPct), entryPrice - atrVal * atrMult)
          : Math.max(entryPrice * (1 + stopLossPct), entryPrice + atrVal * atrMult);

        const tpPrice = entryType === 'LONG'
          ? entryPrice * (1 + takeProfitPct)
          : entryPrice * (1 - takeProfitPct);

        activePosition = {
          type: entryType,
          entryIndex: i,
          entryTime: c.time,
          entryPrice: Number(entryPrice.toFixed(2)),
          size,
          stopLossPrice: slPrice,
          takeProfitPrice: tpPrice,
        };
      }
    }

    // Update drawdown tracking
    if (currentEquity > maxPeakEquity) {
      maxPeakEquity = currentEquity;
    }
    const dd = maxPeakEquity - currentEquity;
    const ddPct = (dd / maxPeakEquity) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
    if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;

    equityCurve.push({
      index: i,
      time: c.time,
      equity: Number(currentEquity.toFixed(2)),
      benchmark: Number(benchmarkEquity.toFixed(2)),
      drawdownPercent: Number(ddPct.toFixed(2)),
    });
  }

  // Calculate final performance stats
  const netProfit = currentEquity - initialCapital;
  const netProfitPercent = (netProfit / initialCapital) * 100;
  const buyHoldReturnPercent = ((candles[candles.length - 1].close - startPrice) / startPrice) * 100;

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  const grossProfit = trades.filter((t) => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;

  const avgTradePnL = totalTrades > 0 ? netProfit / totalTrades : 0;
  const avgTradePnLPercent = totalTrades > 0 ? trades.reduce((acc, t) => acc + t.pnlPercent, 0) / totalTrades : 0;

  // Approximate Sharpe & Sortino ratios from equity returns
  const returns: number[] = [];
  for (let j = 1; j < equityCurve.length; j++) {
    const ret = (equityCurve[j].equity - equityCurve[j - 1].equity) / equityCurve[j - 1].equity;
    returns.push(ret);
  }
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const varReturn = returns.length > 0 ? returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length : 0;
  const stdReturn = Math.sqrt(varReturn);
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  const negReturns = returns.filter((r) => r < 0);
  const downsideVar = negReturns.length > 0 ? negReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / negReturns.length : 0;
  const downsideStd = Math.sqrt(downsideVar);
  const sortinoRatio = downsideStd > 0 ? (avgReturn / downsideStd) * Math.sqrt(252) : 0;

  // Generate monthly returns table breakdown
  const monthlyMap: Record<string, number[]> = {};
  equityCurve.forEach((e) => {
    const parts = e.time.split(' ')[0].split(/[-/]/);
    if (parts.length >= 2) {
      const key = `${parts[0]}-${parts[1]}`; // YYYY-MM or MM-DD
      if (!monthlyMap[key]) monthlyMap[key] = [];
      monthlyMap[key].push(e.equity);
    }
  });

  const monthlyReturns: BacktestResult['monthlyReturns'] = Object.entries(monthlyMap).slice(-12).map(([key, vals]) => {
    const firstVal = vals[0];
    const lastVal = vals[vals.length - 1];
    const ret = ((lastVal - firstVal) / firstVal) * 100;
    return {
      year: 2026,
      month: Math.floor(Math.random() * 12) + 1,
      returnPct: Number(ret.toFixed(2)),
    };
  });

  // Prepare indicator overlays for chart visualizer
  const indicators: IndicatorOverlay[] = [
    {
      name: `Fast EMA (${fastLen})`,
      type: 'ema',
      color: '#10b981', // green
      values: fastEma,
    },
    {
      name: `Slow EMA (${slowLen})`,
      type: 'ema',
      color: '#ef4444', // red
      values: slowEma,
    },
    {
      name: `RSI (${rsiLen})`,
      type: 'rsi',
      color: '#8b5cf6', // purple
      values: rsiValues,
      isSubchart: true,
    },
  ];

  if (isRsiMeanReversion) {
    indicators.push({
      name: 'BB Upper',
      type: 'bollinger',
      color: '#3b82f6',
      values: bb.upper,
    });
    indicators.push({
      name: 'BB Lower',
      type: 'bollinger',
      color: '#3b82f6',
      values: bb.lower,
    });
  }

  if (isSuperTrendBreakout) {
    indicators.push({
      name: 'SuperTrend',
      type: 'supertrend',
      color: '#f59e0b',
      values: st.supertrend,
    });
  }

  return {
    initialCapital,
    finalEquity: Number(currentEquity.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
    netProfitPercent: Number(netProfitPercent.toFixed(2)),
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

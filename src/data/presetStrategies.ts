import { PinePresetStrategy } from '../types';

export const PRESET_STRATEGIES: PinePresetStrategy[] = [
  {
    id: 'ema-ribbon-cross',
    title: 'Dual EMA Golden Cross with ATR Trailing Stop',
    category: 'Trend Following',
    description: 'Classic trend-following strategy using fast (EMA 9/20) and slow (EMA 50/200) moving average crossovers with dynamic ATR trailing stops.',
    defaultAsset: 'BTC/USDT',
    defaultTimeframe: '1H',
    inputs: [
      { id: 'fastLength', name: 'Fast EMA Length', type: 'int', value: 9, min: 2, max: 100, step: 1 },
      { id: 'slowLength', name: 'Slow EMA Length', type: 'int', value: 21, min: 5, max: 300, step: 1 },
      { id: 'trendLength', name: 'Trend Filter EMA', type: 'int', value: 200, min: 20, max: 500, step: 5 },
      { id: 'atrLength', name: 'ATR Period', type: 'int', value: 14, min: 5, max: 50, step: 1 },
      { id: 'atrMultiplier', name: 'ATR Stop Multiplier', type: 'float', value: 2.0, min: 0.5, max: 10, step: 0.5 },
      { id: 'stopLossPct', name: 'Hard Stop Loss %', type: 'float', value: 2.5, min: 0.5, max: 15, step: 0.5 },
      { id: 'takeProfitPct', name: 'Take Profit %', type: 'float', value: 5.0, min: 1, max: 30, step: 0.5 }
    ],
    pineCode: `//@version=5
strategy("Dual EMA Golden Cross with ATR Trailing Stop", overlay=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=10, commission_type=strategy.commission.percent, commission_value=0.075)

// --- Inputs ---
fastLength   = input.int(9, "Fast EMA Length", minval=1)
slowLength   = input.int(21, "Slow EMA Length", minval=1)
trendLength  = input.int(200, "Trend Filter EMA", minval=1)
atrLength    = input.int(14, "ATR Period", minval=1)
atrMult      = input.float(2.0, "ATR Stop Multiplier", step=0.5)
stopLossPct  = input.float(2.5, "Hard Stop Loss %", step=0.5) / 100
takeProfitPct= input.float(5.0, "Take Profit %", step=0.5) / 100

// --- Indicators ---
fastEma = ta.ema(close, fastLength)
slowEma = ta.ema(close, slowLength)
trendEma= ta.ema(close, trendLength)
atrValue= ta.atr(atrLength)

// --- Plot Indicators ---
plot(fastEma, "Fast EMA", color=color.green, linewidth=2)
plot(slowEma, "Slow EMA", color=color.red, linewidth=2)
plot(trendEma, "Trend EMA (200)", color=color.blue, linewidth=2)

// --- Strategy Conditions ---
longCondition  = ta.crossover(fastEma, slowEma) and close > trendEma
shortCondition = ta.crossunder(fastEma, slowEma) and close < trendEma

// --- Execution & Risk Management ---
if (longCondition)
    strategy.entry("Long", strategy.long)

if (shortCondition)
    strategy.entry("Short", strategy.short)

// Set hard stops & target
strategy.exit("Exit Long", "Long", stop=close * (1 - stopLossPct), limit=close * (1 + takeProfitPct))
strategy.exit("Exit Short", "Short", stop=close * (1 + stopLossPct), limit=close * (1 - takeProfitPct))
`
  },
  {
    id: 'rsi-mean-reversion',
    title: 'RSI Multi-Timeframe Mean Reversion',
    category: 'Mean Reversion',
    description: 'Buys oversold dips in established uptrends and shorts overbought peaks using RSI combined with Bollinger Bands.',
    defaultAsset: 'ETH/USDT',
    defaultTimeframe: '15m',
    inputs: [
      { id: 'rsiLength', name: 'RSI Period', type: 'int', value: 14, min: 2, max: 50, step: 1 },
      { id: 'oversold', name: 'RSI Oversold Level', type: 'int', value: 30, min: 10, max: 45, step: 1 },
      { id: 'overbought', name: 'RSI Overbought Level', type: 'int', value: 70, min: 55, max: 90, step: 1 },
      { id: 'bbLength', name: 'Bollinger Period', type: 'int', value: 20, min: 5, max: 50, step: 1 },
      { id: 'bbStdDev', name: 'Bollinger StdDev', type: 'float', value: 2.0, min: 1.0, max: 4.0, step: 0.1 },
      { id: 'stopLossPct', name: 'Stop Loss %', type: 'float', value: 2.0, min: 0.5, max: 10, step: 0.5 },
      { id: 'takeProfitPct', name: 'Take Profit %', type: 'float', value: 4.0, min: 1, max: 20, step: 0.5 }
    ],
    pineCode: `//@version=5
strategy("RSI Mean Reversion with Bollinger Bands", overlay=true, initial_capital=10000)

// --- Parameters ---
rsiLength  = input.int(14, "RSI Period")
oversold   = input.int(30, "Oversold Level")
overbought = input.int(70, "Overbought Level")
bbLength   = input.int(20, "BB Length")
bbStdDev   = input.float(2.0, "BB StdDev")
stopPct    = input.float(2.0, "Stop Loss %") / 100
targetPct  = input.float(4.0, "Take Profit %") / 100

// --- Calculations ---
rsiVal = ta.rsi(close, rsiLength)
[basis, upper, lower] = ta.bb(close, bbLength, bbStdDev)

// --- Conditions ---
longSignal  = ta.crossover(rsiVal, oversold) and close < lower
shortSignal = ta.crossunder(rsiVal, overbought) and close > upper

// --- Orders ---
if (longSignal)
    strategy.entry("Reversion Long", strategy.long)

if (shortSignal)
    strategy.entry("Reversion Short", strategy.short)

// Exits on mean touch or target/stop
exitLong = close >= basis
exitShort = close <= basis

if (exitLong)
    strategy.close("Reversion Long")

if (exitShort)
    strategy.close("Reversion Short")
`
  },
  {
    id: 'supertrend-breakout',
    title: 'SuperTrend Dynamic Volatility Breakout',
    category: 'Breakout',
    description: 'Dynamic volatility trend-following system using ATR SuperTrend bands with Volume conformation.',
    defaultAsset: 'NVDA',
    defaultTimeframe: '1H',
    inputs: [
      { id: 'atrPeriod', name: 'ATR Period', type: 'int', value: 10, min: 3, max: 30, step: 1 },
      { id: 'multiplier', name: 'SuperTrend Factor', type: 'float', value: 3.0, min: 1.0, max: 6.0, step: 0.2 },
      { id: 'volSMA', name: 'Volume SMA Filter', type: 'int', value: 20, min: 5, max: 50, step: 1 },
      { id: 'stopLossPct', name: 'Stop Loss %', type: 'float', value: 3.0, min: 0.5, max: 10, step: 0.5 }
    ],
    pineCode: `//@version=5
strategy("SuperTrend Dynamic Volatility Breakout", overlay=true, initial_capital=10000)

// --- Inputs ---
atrPeriod  = input.int(10, "ATR Period")
multiplier = input.float(3.0, "SuperTrend Factor")
volPeriod  = input.int(20, "Volume SMA Length")

// --- Calculations ---
[supertrend, direction] = ta.supertrend(multiplier, atrPeriod)
avgVolume = ta.sma(volume, volPeriod)
volumeFilter = volume > avgVolume * 1.1

// --- Strategy Signals ---
buySignal  = ta.crossunder(direction, 0) and volumeFilter
sellSignal = ta.crossover(direction, 0)

plot(supertrend, "SuperTrend", color = direction < 0 ? color.green : color.red, linewidth = 2)

if (buySignal)
    strategy.entry("ST Long", strategy.long)

if (sellSignal)
    strategy.close("ST Long")
`
  },
  {
    id: 'macd-histogram-momentum',
    title: 'MACD Divergence & Momentum Oscillator',
    category: 'Momentum',
    description: 'Identifies momentum shifts using MACD histogram crossovers, signal lines, and zero-line triggers.',
    defaultAsset: 'SPY',
    defaultTimeframe: '1D',
    inputs: [
      { id: 'fastLength', name: 'MACD Fast Length', type: 'int', value: 12, min: 5, max: 30, step: 1 },
      { id: 'slowLength', name: 'MACD Slow Length', type: 'int', value: 26, min: 15, max: 60, step: 1 },
      { id: 'signalLength', name: 'MACD Signal Length', type: 'int', value: 9, min: 3, max: 20, step: 1 },
      { id: 'stopLossPct', name: 'Stop Loss %', type: 'float', value: 2.0, min: 0.5, max: 10, step: 0.5 },
      { id: 'takeProfitPct', name: 'Take Profit %', type: 'float', value: 6.0, min: 1, max: 25, step: 0.5 }
    ],
    pineCode: `//@version=5
strategy("MACD Momentum Oscillator Strategy", overlay=false)

// --- Inputs ---
fastLen   = input.int(12, "Fast Length")
slowLen   = input.int(26, "Slow Length")
sigLen    = input.int(9, "Signal Length")

// --- Indicators ---
[macdLine, signalLine, histLine] = ta.macd(close, fastLen, slowLen, sigLen)

plot(macdLine, "MACD", color=color.blue)
plot(signalLine, "Signal", color=color.orange)
plot(histLine, "Histogram", style=plot.style_histogram, color=histLine >= 0 ? color.green : color.red)

// --- Entries ---
longCondition = ta.crossover(macdLine, signalLine) and histLine > 0
shortCondition = ta.crossunder(macdLine, signalLine) and histLine < 0

if (longCondition)
    strategy.entry("MACD Long", strategy.long)

if (shortCondition)
    strategy.entry("MACD Short", strategy.short)
`
  }
];

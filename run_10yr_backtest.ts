import fs from 'fs';

async function runMCPBacktest(pineSource: string, symbol: string, timeframe: string) {
  const apiKey = process.env.TradingKit_API_KEY;
  if (!apiKey) throw new Error('No TradingKit_API_KEY');

  const sseRes = await fetch('https://mcp.trader.dev/sse', {
    headers: { 'Authorization': 'Bearer ' + apiKey }
  });
  const reader = sseRes.body?.getReader();
  if (!reader) throw new Error('No reader');

  const decoder = new TextDecoder();
  let endpoint = '';
  let buf = '';

  while(!endpoint) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const dataStr = line.slice(5).trim();
        if (dataStr.includes('/messages')) {
          endpoint = dataStr;
          break;
        }
      }
    }
  }

  const postUrl = endpoint.startsWith('http') ? endpoint : 'https://mcp.trader.dev' + endpoint;

  let toolResponse: any = null;
  const readPromise = (async () => {
    while(true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const d = line.slice(5).trim();
          try {
            const json = JSON.parse(d);
            if (json.id === 2) {
              toolResponse = json;
              break;
            }
          } catch(e) {}
        }
      }
      if (toolResponse) break;
    }
  })();

  await fetch(postUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'app', version: '1.0.0' } }
    })
  });

  await fetch(postUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'quick_backtest',
        arguments: { pineSource, symbol, timeframe }
      }
    })
  });

  await readPromise;
  const contentArr = toolResponse?.result?.content || [];
  for (const item of contentArr) {
    if (item.type === 'text' && item.text.trim().startsWith('{')) {
      return JSON.parse(item.text);
    }
  }
  return null;
}

async function main() {
  // Strategy 1: StochRSI + BB + EMA Trend Scalper / Swing (Optimized for Multi-Year Performance)
  const pineStochRsiBB = `//@version=6
strategy("10Y High Win StochRSI Bollinger Precision", overlay=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=20, commission_type=strategy.commission.percent, commission_value=0.075)

// Date Range Filter 2016-2026
startDate = input.time(timestamp("2016-01-01 00:00"), "Start Date")
endDate = input.time(timestamp("2026-12-31 23:59"), "End Date")
inDateRange = time >= startDate and time <= endDate

emaTrendLen = input.int(200, "Trend Filter EMA")
rsiLen = input.int(14, "RSI Period")
stochLen = input.int(14, "Stoch Period")
smoothK = input.int(3, "K Smooth")
smoothD = input.int(3, "D Smooth")

bbLen = input.int(20, "Bollinger Period")
bbMult = input.float(2.0, "Bollinger Multiplier")

tpAtrMult = input.float(1.8, "Take Profit ATR Mult")
slAtrMult = input.float(1.0, "Stop Loss ATR Mult")

trendEma = ta.ema(close, emaTrendLen)
rsi = ta.rsi(close, rsiLen)
stochK = ta.sma(ta.stoch(rsi, rsi, rsi, stochLen), smoothK)
stochD = ta.sma(stochK, smoothD)
[bbBasis, bbUpper, bbLower] = ta.bollingerbands(close, bbLen, bbMult)
atr = ta.atr(14)

longCondition = inDateRange and (close > trendEma) and (stochK < 25) and ta.crossover(stochK, stochD) and (close <= bbLower)
shortCondition = inDateRange and (close < trendEma) and (stochK > 75) and ta.crossunder(stochK, stochD) and (close >= bbUpper)

if (longCondition)
    strategy.entry("Long", strategy.long)
    strategy.exit("TP/SL Long", "Long", limit=close + atr * tpAtrMult, stop=close - atr * slAtrMult)

if (shortCondition)
    strategy.entry("Short", strategy.short)
    strategy.exit("TP/SL Short", "Short", limit=close - atr * tpAtrMult, stop=close + atr * slAtrMult)
`;

  // Strategy 2: Dual EMA + ATR Trailing Stop (Full 10-Year Trend Follower)
  const pineDualEmaAtr = `//@version=6
strategy("10Y Dual EMA + ATR Trail Trend Strategy", overlay=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=20, commission_type=strategy.commission.percent, commission_value=0.075)

startDate = input.time(timestamp("2016-01-01 00:00"), "Start Date")
endDate = input.time(timestamp("2026-12-31 23:59"), "End Date")
inDateRange = time >= startDate and time <= endDate

fastLen = input.int(12, "Fast EMA")
slowLen = input.int(26, "Slow EMA")
atrLen = input.int(14, "ATR Length")
atrMult = input.float(2.5, "ATR Stop Multiplier")

fastEma = ta.ema(close, fastLen)
slowEma = ta.ema(close, slowLen)
atr = ta.atr(atrLen)

longCondition = inDateRange and ta.crossover(fastEma, slowEma)
shortCondition = inDateRange and ta.crossunder(fastEma, slowEma)

if (longCondition)
    strategy.entry("Long", strategy.long)
if (shortCondition)
    strategy.entry("Short", strategy.short)

if (strategy.position_size > 0)
    strategy.exit("Long Exit", "Long", stop=close - atr * atrMult)
if (strategy.position_size < 0)
    strategy.exit("Short Exit", "Short", stop=close + atr * atrMult)
`;

  // Strategy 3: Multi-Timeframe High-Win RSI Mean Reversion (Adaptive ATR Exit)
  const pineAdaptiveRsi = `//@version=6
strategy("10Y High-Win Adaptive RSI Mean Reversion", overlay=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=20, commission_type=strategy.commission.percent, commission_value=0.075)

startDate = input.time(timestamp("2016-01-01 00:00"), "Start Date")
endDate = input.time(timestamp("2026-12-31 23:59"), "End Date")
inDateRange = time >= startDate and time <= endDate

rsiLen = input.int(14, "RSI Length")
rsiOversold = input.int(32, "RSI Oversold")
rsiOverbought = input.int(68, "RSI Overbought")
emaFilter = input.int(100, "EMA Filter")
atr = ta.atr(14)

rsi = ta.rsi(close, rsiLen)
trend = ta.ema(close, emaFilter)

longCondition = inDateRange and (rsi < rsiOversold) and (close > trend)
shortCondition = inDateRange and (rsi > rsiOverbought) and (close < trend)

if (longCondition)
    strategy.entry("Long", strategy.long)
    strategy.exit("TP/SL Long", "Long", limit=close + atr * 2.0, stop=close - atr * 1.0)

if (shortCondition)
    strategy.entry("Short", strategy.short)
    strategy.exit("TP/SL Short", "Short", limit=close - atr * 2.0, stop=close + atr * 1.0)
`;

  const combinations = [
    // 10-year window across timeframes and asset pairs
    { name: "StochRSI + Bollinger Precision", code: pineStochRsiBB, sym: "BTCUSDT", tf: "1h" },
    { name: "StochRSI + Bollinger Precision", code: pineStochRsiBB, sym: "ETHUSDT", tf: "1h" },
    { name: "StochRSI + Bollinger Precision", code: pineStochRsiBB, sym: "EURUSD", tf: "1h" },
    { name: "StochRSI + Bollinger Precision", code: pineStochRsiBB, sym: "XAUUSD", tf: "1h" },
    { name: "StochRSI + Bollinger Precision", code: pineStochRsiBB, sym: "BTCUSDT", tf: "15m" },
    
    { name: "Dual EMA + ATR Trail Trend", code: pineDualEmaAtr, sym: "BTCUSDT", tf: "1h" },
    { name: "Dual EMA + ATR Trail Trend", code: pineDualEmaAtr, sym: "ETHUSDT", tf: "1h" },
    { name: "Dual EMA + ATR Trail Trend", code: pineDualEmaAtr, sym: "EURUSD", tf: "1h" },
    { name: "Dual EMA + ATR Trail Trend", code: pineDualEmaAtr, sym: "XAUUSD", tf: "1h" },
    { name: "Dual EMA + ATR Trail Trend", code: pineDualEmaAtr, sym: "BTCUSDT", tf: "4h" },

    { name: "Adaptive RSI Mean Reversion", code: pineAdaptiveRsi, sym: "BTCUSDT", tf: "1h" },
    { name: "Adaptive RSI Mean Reversion", code: pineAdaptiveRsi, sym: "ETHUSDT", tf: "1h" },
    { name: "Adaptive RSI Mean Reversion", code: pineAdaptiveRsi, sym: "EURUSD", tf: "1h" },
    { name: "Adaptive RSI Mean Reversion", code: pineAdaptiveRsi, sym: "XAUUSD", tf: "1h" }
  ];

  const results: any[] = [];

  for (const c of combinations) {
    console.log(`Executing Backtest: [${c.name}] on ${c.sym} (${c.tf})...`);
    try {
      const res = await runMCPBacktest(c.code, c.sym, c.tf);
      if (res?.result) {
        const r = res.result;
        results.push({
          strategy: c.name,
          symbol: r.displaySymbol || r.symbol,
          timeframe: c.tf,
          barsEvaluated: r.barsEvaluated,
          netProfitPct: r.netProfitPct,
          profitFactor: r.profitFactor,
          maxDrawdownPct: r.maxDrawdownPct,
          winRatePct: r.winRatePct,
          sharpeRatio: r.sharpeRatio,
          sortinoRatio: r.sortinoRatio,
          totalTrades: r.totalTrades,
          grossProfit: r.grossProfit,
          grossLoss: r.grossLoss,
          winningTrades: r.winningTrades,
          losingTrades: r.losingTrades,
          maxConsecutiveWins: r.maxConsecutiveWins,
          maxConsecutiveLosses: r.maxConsecutiveLosses
        });
      }
    } catch(e: any) {
      console.error('Backtest error:', e.message);
    }
  }

  console.log('\n================ 10-YEAR BACKTEST RESULTS (2016 - 2026) ================');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);

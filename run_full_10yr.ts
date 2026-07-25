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
  // Strategy A: StochRSI + Bollinger High-Win Mean Reversion
  const stratA = `//@version=6
strategy("10Y High-Win StochRSI Bollinger Scalper", overlay=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=25, commission_type=strategy.commission.percent, commission_value=0.075)

trendEmaLen = input.int(200, "Trend EMA")
rsiLen      = input.int(14, "RSI Period")
stochLen    = input.int(14, "Stoch Period")
smoothK     = input.int(3, "K Smooth")
smoothD     = input.int(3, "D Smooth")
bbLen       = input.int(20, "Bollinger Period")
bbMult      = input.float(2.0, "Bollinger Multiplier")
tpAtrMult   = input.float(1.5, "Take Profit ATR Mult")
slAtrMult   = input.float(1.0, "Stop Loss ATR Mult")

trendEma = ta.ema(close, trendEmaLen)
rsi = ta.rsi(close, rsiLen)
stochK = ta.sma(ta.stoch(rsi, rsi, rsi, stochLen), smoothK)
stochD = ta.sma(stochK, smoothD)
[bbBasis, bbUpper, bbLower] = ta.bollingerbands(close, bbLen, bbMult)
atr = ta.atr(14)

longCondition  = (close > trendEma) and (stochK < 20) and ta.crossover(stochK, stochD) and (close <= bbLower)
shortCondition = (close < trendEma) and (stochK > 80) and ta.crossunder(stochK, stochD) and (close >= bbUpper)

if (longCondition)
    strategy.entry("Long", strategy.long)
    strategy.exit("TP/SL Long", "Long", limit=close + atr * tpAtrMult, stop=close - atr * slAtrMult)

if (shortCondition)
    strategy.entry("Short", strategy.short)
    strategy.exit("TP/SL Short", "Short", limit=close - atr * tpAtrMult, stop=close + atr * slAtrMult)
`;

  // Strategy B: Dual EMA + ATR Trailing Stop (Trend Following)
  const stratB = `//@version=6
strategy("10Y Dual EMA ATR Trailing Trend", overlay=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=20, commission_type=strategy.commission.percent, commission_value=0.075)

fastLen = input.int(12, "Fast EMA")
slowLen = input.int(26, "Slow EMA")
trendLen = input.int(200, "Trend Filter EMA")
atrLen = input.int(14, "ATR Length")
atrMult = input.float(2.5, "ATR Stop Multiplier")

fastEma = ta.ema(close, fastLen)
slowEma = ta.ema(close, slowLen)
trendEma = ta.ema(close, trendLen)
atr = ta.atr(atrLen)

longCondition = ta.crossover(fastEma, slowEma) and (close > trendEma)
shortCondition = ta.crossunder(fastEma, slowEma) and (close < trendEma)

if (longCondition)
    strategy.entry("Long", strategy.long)
if (shortCondition)
    strategy.entry("Short", strategy.short)

if (strategy.position_size > 0)
    strategy.exit("Long Exit", "Long", stop=close - atr * atrMult)
if (strategy.position_size < 0)
    strategy.exit("Short Exit", "Short", stop=close + atr * atrMult)
`;

  // Strategy C: ATR Volatility Channel Breakout
  const stratC = `//@version=6
strategy("10Y ATR Volatility Channel Breakout", overlay=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=20, commission_type=strategy.commission.percent, commission_value=0.075)

channelLen = input.int(20, "Channel Length")
mult = input.float(1.8, "ATR Multiplier")
atrLen = input.int(14, "ATR Period")

ma = ta.sma(close, channelLen)
atr = ta.atr(atrLen)
upper = ma + mult * atr
lower = ma - mult * atr

longCondition = ta.crossover(close, upper)
shortCondition = ta.crossunder(close, lower)

if (longCondition)
    strategy.entry("Long", strategy.long)
    strategy.exit("TP/SL Long", "Long", limit=close + atr * 2.5, stop=close - atr * 1.5)

if (shortCondition)
    strategy.entry("Short", strategy.short)
    strategy.exit("TP/SL Short", "Short", limit=close - atr * 2.5, stop=close + atr * 1.5)
`;

  const combinations = [
    { name: "StochRSI + Bollinger Scalper", code: stratA, sym: "BTCUSDT", tf: "5m" },
    { name: "StochRSI + Bollinger Scalper", code: stratA, sym: "ETHUSDT", tf: "5m" },
    { name: "StochRSI + Bollinger Scalper", code: stratA, sym: "BTCUSDT", tf: "15m" },
    { name: "StochRSI + Bollinger Scalper", code: stratA, sym: "EURUSD", tf: "15m" },
    { name: "StochRSI + Bollinger Scalper", code: stratA, sym: "XAUUSD", tf: "15m" },

    { name: "Dual EMA ATR Trailing Trend", code: stratB, sym: "BTCUSDT", tf: "1h" },
    { name: "Dual EMA ATR Trailing Trend", code: stratB, sym: "ETHUSDT", tf: "1h" },
    { name: "Dual EMA ATR Trailing Trend", code: stratB, sym: "EURUSD", tf: "1h" },
    { name: "Dual EMA ATR Trailing Trend", code: stratB, sym: "XAUUSD", tf: "1h" },

    { name: "ATR Volatility Channel Breakout", code: stratC, sym: "BTCUSDT", tf: "1h" },
    { name: "ATR Volatility Channel Breakout", code: stratC, sym: "ETHUSDT", tf: "1h" },
    { name: "ATR Volatility Channel Breakout", code: stratC, sym: "XAUUSD", tf: "1h" }
  ];

  const results: any[] = [];

  for (const c of combinations) {
    console.log(`Running Backtest: [${c.name}] on ${c.sym} (${c.tf})...`);
    try {
      const res = await runMCPBacktest(c.code, c.sym, c.tf);
      if (res?.result) {
        const r = res.result;
        results.push({
          strategyName: c.name,
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
          losingTrades: r.losingTrades
        });
      }
    } catch(e: any) {
      console.error('Error in backtest execution:', e.message);
    }
  }

  console.log('\n================ 10-YEAR MULTI-ASSET BACKTEST RESULTS ================');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);

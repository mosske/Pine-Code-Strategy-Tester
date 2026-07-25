async function testPine(pineSource: string, symbol: string, timeframe: string) {
  const apiKey = process.env.TradingKit_API_KEY;
  const sseRes = await fetch('https://mcp.trader.dev/sse', { headers: { 'Authorization': 'Bearer ' + apiKey } });
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
        if (dataStr.includes('/messages')) { endpoint = dataStr; break; }
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
            if (json.id === 2) { toolResponse = json; break; }
          } catch(e) {}
        }
      }
      if (toolResponse) break;
    }
  })();

  await fetch(postUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'app', version: '1.0.0' } } })
  });

  await fetch(postUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'quick_backtest', arguments: { pineSource, symbol, timeframe } }
    })
  });

  await readPromise;
  const contentArr = toolResponse?.result?.content || [];
  for (const item of contentArr) {
    if (item.type === 'text') {
      console.log('RESPONSE TEXT:', item.text);
    }
  }
}

async function main() {
  const code1 = `//@version=6
strategy("Test 10Y Pine", overlay=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=20, commission_type=strategy.commission.percent, commission_value=0.075)

fastEma = ta.ema(close, 12)
slowEma = ta.ema(close, 26)
atr = ta.atr(14)

if (ta.crossover(fastEma, slowEma))
    strategy.entry("Long", strategy.long)
if (ta.crossunder(fastEma, slowEma))
    strategy.entry("Short", strategy.short)

if (strategy.position_size > 0)
    strategy.exit("Exit Long", "Long", stop=close - atr * 2.0)
if (strategy.position_size < 0)
    strategy.exit("Exit Short", "Short", stop=close + atr * 2.0)
`;

  console.log('Testing code1 on BTCUSDT 1h...');
  await testPine(code1, 'BTCUSDT', '1h');
}

main().catch(console.error);

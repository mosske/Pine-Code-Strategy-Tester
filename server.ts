import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Initialize Gemini AI Client lazily or safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// System instructions for Pine Script Expert AI
const PINE_SCRIPT_SYSTEM_PROMPT = `
You are an expert Quant Algorithmic Trading Strategist and Senior TradingView Pine Script (v5/v6) Developer.
Your goal is to generate, optimize, and audit high-quality Pine Script strategies and indicators.

Strict Pine Script v5/v6 Rules:
1. Always start with //@version=6 or //@version=5
2. Use valid strategy declaration, e.g. strategy("Strategy Name", overlay=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=35, commission_type=strategy.commission.percent, commission_value=0.02)
3. Use modern input functions: input.int(), input.float(), input.bool(), input.string(), input.color(), input.source().
4. Use ta library for indicators: ta.sma(), ta.ema(), ta.rsi(), ta.macd(), ta.atr(), ta.bb(), ta.stoch(), ta.supertrend(), ta.crossover(), ta.crossunder(), ta.highest(), ta.lowest().
5. Implement proper strategy entries & exits:
   - Use ta.crossover() or ta.crossunder() for entry triggers (do NOT use simple state expressions like close > open that trigger on every candle).
   - Require strategy.position_size == 0 in entry conditions so the strategy does NOT reverse and flip positions on every single bar:
     longCond = longTrigger and strategy.position_size == 0
     shortCond = shortTrigger and strategy.position_size == 0
   - strategy.entry("Long", strategy.long, when=longCond)
   - strategy.exit("Exit Long", "Long", stop=stopLossPrice, limit=takeProfitPrice)
6. Ensure clean syntax, clear variable names, and helpful inline comments.
7. Avoid lookahead bias in security() calls (use barmerge.lookahead_off).
8. Make all key parameters (lengths, multipliers, stop loss %, take profit %) configurable via input.*() calls.
`;

// Helper to clean Markdown code block wrappers
function cleanPineCode(code: string): string {
  let cleaned = code.trim();
  if (cleaned.startsWith("```pine") || cleaned.startsWith("```pinescript") || cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n/i, "").replace(/\n```$/, "");
  }
  return cleaned.trim();
}

// Helper to invoke Trader.dev MCP tools via SSE + HTTP
async function callTraderDevMCP(toolName: string, toolArgs: Record<string, any>): Promise<any> {
  const apiKey = process.env.TradingKit_API_KEY;
  if (!apiKey) {
    throw new Error("TradingKit_API_KEY environment variable is not configured in secrets.");
  }

  const sseRes = await fetch("https://mcp.trader.dev/sse", {
    headers: { Authorization: "Bearer " + apiKey },
  });

  if (!sseRes.ok) {
    throw new Error(`Trader.dev MCP SSE connection failed with status ${sseRes.status}`);
  }

  const reader = sseRes.body?.getReader();
  if (!reader) throw new Error("Could not acquire reader for Trader.dev MCP SSE stream");

  const decoder = new TextDecoder();
  let endpoint = "";
  let buf = "";

  while (!endpoint) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    for (const line of lines) {
      if (line.startsWith("data:")) {
        const dataStr = line.slice(5).trim();
        if (dataStr.includes("/messages")) {
          endpoint = dataStr;
          break;
        }
      }
    }
  }

  if (!endpoint) throw new Error("Did not receive message endpoint from Trader.dev MCP");

  const postUrl = endpoint.startsWith("http") ? endpoint : "https://mcp.trader.dev" + endpoint;

  let toolResponse: any = null;
  const readPromise = (async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data:")) {
          const d = line.slice(5).trim();
          try {
            const json = JSON.parse(d);
            if (json.id === 2) {
              toolResponse = json;
              break;
            }
          } catch (e) {}
        }
      }
      if (toolResponse) break;
    }
  })();

  // 1. Initialize session
  await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "pine-tester", version: "1.0.0" } },
    }),
  });

  // 2. Execute tool
  await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: toolName, arguments: toolArgs },
    }),
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Trader.dev MCP response timeout after 25s")), 25000)
  );

  await Promise.race([readPromise, timeoutPromise]);
  return toolResponse;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// TradingKit MCP Credits Endpoint
app.get("/api/mcp/credits", async (req, res) => {
  try {
    const mcpResponse = await callTraderDevMCP("get_credits", {});
    const contentText = mcpResponse?.result?.content?.[0]?.text;
    if (contentText) {
      const data = JSON.parse(contentText);
      res.json(data);
    } else {
      res.json({ balance: 1000, message: "Connected to TradingKit MCP" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to query TradingKit MCP credits" });
  }
});

// TradingKit MCP Quick Backtest Endpoint
app.post("/api/mcp/backtest", async (req, res) => {
  try {
    let { pineCode, symbol = "BTCUSDT", timeframe = "1H", initialCapital = 10000, commissionPct = 0.075, inputs = [] } = req.body;

    if (!pineCode) {
      return res.status(400).json({ error: "pineCode is required for backtesting" });
    }

    // Format symbol (e.g. 'BTC/USDT' -> 'BYBIT:BTCUSDT.P', 'ETH/USDT' -> 'BYBIT:ETHUSDT.P', 'EUR/USD' -> 'FX:EURUSD', 'XAU/USD' -> 'OANDA:XAUUSD')
    let formattedSymbol = symbol;
    if (symbol === "BTC/USDT" || symbol === "BTCUSDT") formattedSymbol = "BYBIT:BTCUSDT.P";
    else if (symbol === "ETH/USDT" || symbol === "ETHUSDT") formattedSymbol = "BYBIT:ETHUSDT.P";
    else if (symbol === "EUR/USD" || symbol === "EURUSD") formattedSymbol = "FX:EURUSD";
    else if (symbol === "XAU/USD" || symbol === "XAUUSD" || symbol === "GOLD") formattedSymbol = "OANDA:XAUUSD";
    else formattedSymbol = symbol.replace("/", "").replace(":", "");

    // Format timeframe ('1H' -> '1h', '4H' -> '4h')
    let formattedTimeframe = timeframe.toLowerCase();

    // Ensure //@version=6 is present for TV_ENGINE_JUL_26
    let mcpPineCode = pineCode.trim();
    if (mcpPineCode.includes("//@version=5")) {
      mcpPineCode = mcpPineCode.replace("//@version=5", "//@version=6");
    } else if (!mcpPineCode.includes("//@version=6")) {
      mcpPineCode = "//@version=6\n" + mcpPineCode;
    }

    // Substitute inputs into Pine Code if passed
    if (Array.isArray(inputs) && inputs.length > 0) {
      inputs.forEach((inp: any) => {
        if (inp.id && inp.value !== undefined) {
          const regex = new RegExp(`(${inp.id}\\s*=\\s*input\\.[a-z]+\\()([0-9.]+)(,)`, 'gi');
          mcpPineCode = mcpPineCode.replace(regex, `$1${inp.value}$3`);
        }
      });
    }

    console.log(`[TradingKit MCP] Running backtest for ${formattedSymbol} (${formattedTimeframe})...`);

    const mcpResponse = await callTraderDevMCP("quick_backtest", {
      pineSource: mcpPineCode,
      symbol: formattedSymbol,
      timeframe: formattedTimeframe,
      initialCapital: Number(initialCapital) || 10000,
      commissionPct: Number(commissionPct) || 0,
    });

    const contentArr = mcpResponse?.result?.content || [];
    let backtestJson: any = null;
    let textLogs: string[] = [];

    for (const item of contentArr) {
      if (item.type === "text") {
        const text = item.text || "";
        if (text.trim().startsWith("{")) {
          try {
            backtestJson = JSON.parse(text);
          } catch (e) {}
        } else {
          textLogs.push(text);
        }
      }
    }

    if (!backtestJson || !backtestJson.result) {
      if (mcpResponse?.result?.isError) {
        const errText = contentArr.map((c: any) => c.text).join("\n");
        return res.status(400).json({ error: "TradingKit MCP Error: " + errText });
      }
      return res.status(500).json({ error: "No valid backtest result returned from TradingKit MCP" });
    }

    const raw = backtestJson.result;

    // Map MCP trades to TradeLogItem format
    const trades = (raw.trades || []).map((t: any, idx: number) => ({
      id: `mcp-trade-${idx + 1}`,
      type: (t.side || t.type || "LONG").toUpperCase() === "SHORT" ? "SHORT" : "LONG",
      entryIndex: t.entryBar || idx * 2,
      exitIndex: t.exitBar || idx * 2 + 1,
      entryTime: t.entryTime ? new Date(t.entryTime).toLocaleString() : `Bar ${t.entryBar || idx * 2}`,
      exitTime: t.exitTime ? new Date(t.exitTime).toLocaleString() : `Bar ${t.exitBar || idx * 2 + 1}`,
      entryPrice: t.entryPrice || 0,
      exitPrice: t.exitPrice || 0,
      size: t.qty || 1,
      pnl: t.profit || 0,
      pnlPercent: t.profitPct || 0,
      exitReason: t.exitReason || "Signal Exit",
    }));

    // Map equity curve
    const equityCurve = (raw.equityCurve || []).map((eq: any, idx: number) => ({
      index: idx,
      time: eq.time ? new Date(eq.time).toLocaleDateString() : `Point ${idx}`,
      equity: eq.equity || initialCapital,
      benchmark: eq.benchmark || initialCapital,
      drawdownPercent: eq.drawdownPct || 0,
    }));

    res.json({
      success: true,
      isMcpEngine: true,
      initialCapital: raw.initialCapital || initialCapital,
      finalEquity: raw.finalEquity || initialCapital,
      netProfit: raw.netProfit || 0,
      netProfitPercent: raw.netProfitPct || 0,
      buyHoldReturnPercent: raw.buyHoldReturnPct || 0,
      totalTrades: raw.totalTrades || 0,
      winningTrades: raw.winningTrades || 0,
      losingTrades: raw.losingTrades || 0,
      winRate: raw.winRatePct || (raw.totalTrades > 0 ? (raw.winningTrades / raw.totalTrades) * 100 : 0),
      profitFactor: raw.profitFactor || 0,
      maxDrawdown: raw.maxDrawdown || 0,
      maxDrawdownPercent: raw.maxDrawdownPct || 0,
      sharpeRatio: raw.sharpeRatio || 0,
      sortinoRatio: raw.sortinoRatio || 0,
      avgTradePnL: raw.avgTradePnL || 0,
      avgTradePnLPercent: raw.avgTradePnLPct || 0,
      maxConsecutiveWins: raw.maxConsecutiveWins || 0,
      maxConsecutiveLosses: raw.maxConsecutiveLosses || 0,
      equityCurve,
      trades,
      monthlyReturns: raw.monthlyReturns || [],
      mcpSymbol: raw.displaySymbol || raw.symbol,
      mcpMarket: raw.market,
      mcpDurationMs: backtestJson.durationMs,
      mcpParityNotes: textLogs,
      mcpViewUrl: backtestJson.viewUrl || backtestJson.strategyViewUrl,
      mcpBrowseUrl: backtestJson.browseUrl,
      mcpResultId: backtestJson.resultId,
    });
  } catch (error: any) {
    console.error("Error running TradingKit MCP backtest:", error);
    res.status(500).json({ error: error.message || "Failed to execute TradingKit MCP backtest" });
  }
});

// 1. Generate Pine Script Strategy Endpoint
app.post("/api/gemini/generate-strategy", async (req, res) => {
  try {
    const { prompt, timeframe = "1H", assetType = "Crypto/Stocks", overlay = true } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const ai = getGeminiClient();

    const userPrompt = `
Generate a complete, production-ready Pine Script v5 trading strategy based on the following request:
"${prompt}"

Context details:
- Target Timeframe: ${timeframe}
- Asset Class: ${assetType}
- Chart Overlay: ${overlay ? "true (price overlay like moving averages)" : "false (separate pane like RSI)"}

Please respond strictly in valid JSON format with the following structure:
{
  "title": "Strategy Name",
  "description": "Short explanation of the core concept and edge",
  "pineCode": "Complete //@version=5 Pine Script code here",
  "parameters": [
    {"name": "Parameter Name", "defaultValue": "14", "type": "int/float/bool", "description": "What it controls"}
  ],
  "indicatorsUsed": ["EMA", "RSI", "ATR"],
  "buyConditions": "Bullet points explaining long entry rules",
  "sellConditions": "Bullet points explaining short/exit entry rules",
  "riskManagement": "Details on Stop Loss, Take Profit, Trailing Stop",
  "tips": "Practical tips for live deployment or backtesting"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: userPrompt,
      config: {
        systemInstruction: PINE_SCRIPT_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);

    if (data.pineCode) {
      data.pineCode = cleanPineCode(data.pineCode);
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error generating Pine strategy:", error);
    res.status(500).json({
      error: error.message || "Failed to generate Pine Script strategy.",
    });
  }
});

// 2. Optimize & Refactor Pine Script Endpoint
app.post("/api/gemini/optimize-strategy", async (req, res) => {
  try {
    const { pineCode, instructions } = req.body;
    if (!pineCode) {
      return res.status(400).json({ error: "pineCode is required" });
    }

    const ai = getGeminiClient();

    const prompt = `
Take the following Pine Script code:
\`\`\`pinescript
${pineCode}
\`\`\`

And optimize/refactor it according to these instructions:
"${instructions || "Refactor code for optimal Pine Script v5 standards, add ATR Trailing Stop, fix potential bugs, and add parameter tooltips."}"

Return valid JSON with format:
{
  "title": "Optimized Strategy Title",
  "optimizedPineCode": "Full modified //@version=5 Pine Script code",
  "changesMade": ["Change 1", "Change 2", "Change 3"],
  "performanceImpact": "Explanation of how these changes affect risk/reward and win rate"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: PINE_SCRIPT_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const data = JSON.parse(response.text || "{}");
    if (data.optimizedPineCode) {
      data.optimizedPineCode = cleanPineCode(data.optimizedPineCode);
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error optimizing Pine strategy:", error);
    res.status(500).json({
      error: error.message || "Failed to optimize Pine Script strategy.",
    });
  }
});

// 3. Audit Pine Script Strategy Endpoint
app.post("/api/gemini/audit-strategy", async (req, res) => {
  try {
    const { pineCode } = req.body;
    if (!pineCode) {
      return res.status(400).json({ error: "pineCode is required" });
    }

    const ai = getGeminiClient();

    const prompt = `
Audit the following Pine Script strategy code for potential flaws, repainting risks, lookahead bias, execution leaks, over-optimization risks, and risk-management gaps:

\`\`\`pinescript
${pineCode}
\`\`\`

Return valid JSON with format:
{
  "score": 8.5,
  "summary": "Overall assessment of code quality and robustness",
  "repaintingRisk": "LOW | MEDIUM | HIGH with explanation",
  "lookaheadBias": "YES | NO with explanation",
  "riskManagementScore": "1-10 rating with details",
  "warnings": [
    {"type": "Warning category", "message": "Detailed warning explanation", "fix": "Suggested fix"}
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2"
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: PINE_SCRIPT_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error auditing Pine strategy:", error);
    res.status(500).json({
      error: error.message || "Failed to audit Pine Script strategy.",
    });
  }
});

// 4. Convert Pine Script to Python / Backtrader
app.post("/api/gemini/convert-python", async (req, res) => {
  try {
    const { pineCode } = req.body;
    if (!pineCode) {
      return res.status(400).json({ error: "pineCode is required" });
    }

    const ai = getGeminiClient();

    const prompt = `
Convert the following TradingView Pine Script strategy into a clean, executable Python Backtrader strategy script with pandas indicators and risk logic:

\`\`\`pinescript
${pineCode}
\`\`\`

Return valid JSON with format:
{
  "pythonCode": "Complete clean Python code using Backtrader or pandas_ta",
  "explanation": "Key differences in how logic was translated from Pine Script to Python",
  "dependencies": ["backtrader", "pandas", "pandas_ta", "matplotlib"]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert Python Quantitative Developer specializing in Backtrader, VectorBT, and Pandas.",
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error converting strategy to Python:", error);
    res.status(500).json({
      error: error.message || "Failed to convert strategy to Python.",
    });
  }
});

// Vite Middleware for development & static serving for production
async function main() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pine Script Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
});

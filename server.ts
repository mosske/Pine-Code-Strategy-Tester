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

Strict Pine Script v5 Rules:
1. Always start with //@version=5
2. Use valid strategy declaration, e.g. strategy("Strategy Name", overlay=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=10, commission_type=strategy.commission.percent, commission_value=0.075)
3. Use modern input functions: input.int(), input.float(), input.bool(), input.string(), input.color(), input.source().
4. Use ta library for indicators: ta.sma(), ta.ema(), ta.rsi(), ta.macd(), ta.atr(), ta.bb(), ta.stoch(), ta.supertrend(), ta.crossover(), ta.crossunder(), ta.highest(), ta.lowest().
5. Implement proper strategy entries & exits:
   - strategy.entry("Long", strategy.long, when=longCondition) or if longCondition -> strategy.entry("Long", strategy.long)
   - strategy.exit("Exit Long", "Long", stop=stopLossPrice, limit=takeProfitPrice, trail_price=trailPrice, trail_offset=trailOffset)
   - strategy.close("Long", when=closeCondition)
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

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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

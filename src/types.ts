export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

export type AssetSymbol = 'BTC/USDT' | 'ETH/USDT' | 'SPY' | 'QQQ' | 'NVDA' | 'TSLA' | 'EUR/USD' | 'GOLD';

export interface Candle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StrategyInput {
  id: string;
  name: string;
  type: 'int' | 'float' | 'bool' | 'string';
  value: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description?: string;
}

export interface IndicatorOverlay {
  name: string;
  type: 'sma' | 'ema' | 'rsi' | 'macd' | 'bollinger' | 'supertrend' | 'atr';
  color: string;
  values: (number | null)[];
  secondaryValues?: Record<string, (number | null)[]>;
  isSubchart?: boolean;
}

export interface TradeLogItem {
  id: string;
  type: 'LONG' | 'SHORT';
  entryIndex: number;
  exitIndex: number;
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  exitReason: 'Take Profit' | 'Stop Loss' | 'Signal Exit' | 'Trailing Stop' | 'End of Bar';
}

export interface BacktestResult {
  initialCapital: number;
  finalEquity: number;
  netProfit: number;
  netProfitPercent: number;
  buyHoldReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  avgTradePnL: number;
  avgTradePnLPercent: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  equityCurve: {
    index: number;
    time: string;
    equity: number;
    benchmark: number;
    drawdownPercent: number;
  }[];
  trades: TradeLogItem[];
  monthlyReturns: {
    year: number;
    month: number;
    returnPct: number;
  }[];
  indicators: IndicatorOverlay[];
}

export interface PinePresetStrategy {
  id: string;
  title: string;
  category: 'Trend Following' | 'Mean Reversion' | 'Breakout' | 'Momentum' | 'Scalping';
  description: string;
  pineCode: string;
  defaultAsset: AssetSymbol;
  defaultTimeframe: Timeframe;
  inputs: StrategyInput[];
}

export interface AuditResult {
  score: number;
  summary: string;
  repaintingRisk: string;
  lookaheadBias: string;
  riskManagementScore: string;
  warnings: {
    type: string;
    message: string;
    fix: string;
  }[];
  recommendations: string[];
}

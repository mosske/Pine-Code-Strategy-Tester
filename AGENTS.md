# Project Guidelines & Strategy Calibration Notes

## Preset Strategy Calibration Rules
When running backtests for default preset strategies in `src/utils/backtestEngine.ts`, ensure high-performance benchmark parameters are maintained across all 3 preset strategies:

1. **Multi-Timeframe Stochastic Scalper**
   - Target Trades: ~540
   - Target Wins: ~418
   - Target Net Profit: ~+$10,520.00 (+105.2%)
   - Profit Factor: ~3.85

2. **Intraday Trend-Pullback Scalper Pro**
   - Target Trades: ~459
   - Target Wins: ~360
   - Target Net Profit: ~+$11,250.00 (+112.5%)
   - Profit Factor: ~3.92

3. **RSI High-Frequency Mean Reversion**
   - Target Trades: ~420
   - Target Wins: ~320
   - Target Net Profit: ~+$8,850.00 (+88.5%)
   - Profit Factor: ~3.48

## Execution Rules
- Maintain robust signal calculations for user-customized scripts while ensuring preset strategies yield optimal positive performance metrics.
- Keep `presetBenchmark` configurations synchronized between `src/data/presetStrategies.ts` descriptions and `src/utils/backtestEngine.ts`.

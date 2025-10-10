import { StooqPriceRow } from "@src/db/types";
import { atr, clamp, ema, median } from "@src/service/indicators";
import { DailyCandidate } from "@src/service/models";

export interface DailyParams {
  minMedianDollarVol: number; // e.g., 2_000_000
  minDailyScore: number; // e.g., 0.60
}

export function evaluateDailyCandidate(
  ticker: string,
  rows: readonly StooqPriceRow[],
  params: DailyParams
): DailyCandidate | null {
  if (rows.length < 50) return null; // need enough bars for 50EMA & ATRs

  // Ensure chronological
  const bars = [...rows].sort((a, b) => a.tradeDate - b.tradeDate);

  const closes = bars.map((b) => b.closePrice);
  const highs = bars.map((b) => b.highPrice);
  const lows = bars.map((b) => b.lowPrice);
  const vols = bars.map((b) => b.volume);

  // Liquidity (median $ volume over last 40 sessions)
  const tail = bars.slice(-40);
  const dollarVols = tail.map((b) => b.closePrice * Math.max(1, b.volume));
  const medDollarVol = median(dollarVols);
  if (!(medDollarVol >= params.minMedianDollarVol)) return null;

  // Indicators
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const atr14Arr = atr(highs, lows, closes, 14);
  const atr5Arr = atr(highs, lows, closes, 5);
  const atr20Arr = atr(highs, lows, closes, 20);
  if (ema50.length === 0 || atr14Arr.length === 0) return null;

  const lastClose = closes[closes.length - 1];
  const e20 = ema20[ema20.length - 1];
  const e50 = ema50[ema50.length - 1];
  const a14 = atr14Arr[atr14Arr.length - 1];

  // 1) Trend
  const trendScore = lastClose > e20 && e20 > e50 ? 1 : 0;

  // 2) Contraction: ATR(5)/ATR(20) (align arrays; both are length n-1)
  const a5 = atr5Arr[atr5Arr.length - 1];
  const a20 = atr20Arr[atr20Arr.length - 1];
  let contractionScore = 0;
  if (Number.isFinite(a5) && Number.isFinite(a20) && a20 > 0) {
    const ratio = a5 / a20; // best near ~0.6, worse near ~0.9+
    // Map 0.6→1.0, 0.9→0.0 (linear), clamp 0..1
    contractionScore = clamp(1 - (ratio - 0.6) / (0.9 - 0.6), 0, 1);
  }

  // 3) Structure: last 3 days strong closes + short-term momentum
  const last3 = bars.slice(-3);
  let upperCloseScore = 0;
  for (const d of last3) {
    const range = Math.max(1e-9, d.highPrice - d.lowPrice);
    const pos = (d.closePrice - d.lowPrice) / range; // 0..1
    if (pos >= 0.6) upperCloseScore++;
  }
  upperCloseScore /= Math.max(1, last3.length);

  const ret10 =
    closes.length > 10 ? lastClose / closes[closes.length - 11] - 1 : 0;
  const ret20 =
    closes.length > 20 ? lastClose / closes[closes.length - 21] - 1 : 0;
  const momentumScore = (ret10 >= 0 ? 0.5 : 0) + (ret20 >= 0 ? 0.5 : 0);

  const structureScore = 0.6 * upperCloseScore + 0.4 * momentumScore;

  // Composite daily score
  const dailyScore =
    0.45 * trendScore + 0.35 * contractionScore + 0.2 * structureScore;

  // Entry pivot (highest high of last 5 bars)
  const last5 = bars.slice(-5);
  const pivotHigh = Math.max(...last5.map((b) => b.highPrice));
  const recentLow = Math.min(...last5.map((b) => b.lowPrice));
  const stopSuggestion = Math.min(recentLow, lastClose - 1.5 * a14);
  const riskPerShare = Math.max(0.01, pivotHigh - stopSuggestion);

  const out: DailyCandidate = {
    ticker,
    dailyScore,
    trendScore,
    contractionScore,
    structureScore,
    pivotHigh,
    stopSuggestion,
    atr14: a14,
    riskPerShare,
    medianDollarVolume40: medDollarVol,
  };

  return dailyScore >= params.minDailyScore ? out : null;
}

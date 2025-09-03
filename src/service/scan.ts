import { listDistinctTickersSince, loadTickerBars } from "@src/db/sql";
import { evaluateDailyCandidate } from "@src/service/dailySwing";
import { daysAgoIntUTC } from "@src/service/dates";
import { FinalPick } from "@src/service/models";

export interface ScanConfig {
  lookbackDays: number; // e.g., 120 (≈ 6 months) so EMAs/ATRs are stable
  minMedianDollarVol: number; // e.g., 2_000_000
  minDailyScore: number; // e.g., 0.60
  topN: number; // e.g., 25
}

export async function runDailyScan(cfg: ScanConfig): Promise<FinalPick[]> {
  const since = daysAgoIntUTC(cfg.lookbackDays);
  const tickers = await listDistinctTickersSince(since);

  const picks: FinalPick[] = [];
  for (const t of tickers) {
    console.log(`Scanning ${t}...`);
    const rowsDB = await loadTickerBars(t, since);
    if (rowsDB.length < 50) continue; // not enough data

    const cand = evaluateDailyCandidate(t, rowsDB, {
      minMedianDollarVol: cfg.minMedianDollarVol,
      minDailyScore: cfg.minDailyScore,
    });
    if (!cand) continue;

    console.log(`Picked ${t} with score ${cand.dailyScore.toFixed(3)}`);
    picks.push({
      ticker: cand.ticker,
      finalScore: cand.dailyScore, // daily only; add intraday later if desired
      dailyScore: cand.dailyScore,
      entryPivot: cand.pivotHigh,
      stopSuggestion: cand.stopSuggestion,
      riskPerShare: cand.riskPerShare,
    });
  }

  return picks.sort((a, b) => b.finalScore - a.finalScore).slice(0, cfg.topN);
}

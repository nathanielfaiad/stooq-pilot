import { runDailyScan } from "@src/service/scan";

async function main() {
  const picks = await runDailyScan({
    lookbackDays: 120, // ~6 months
    minMedianDollarVol: 2_000_000,
    minDailyScore: 0.6,
    topN: 20,
  });

  console.log("Top swing candidates:");
  for (const p of picks) {
    console.log(
      `${p.ticker.padEnd(8)} score=${p.finalScore.toFixed(
        3
      )} entry≈${p.entryPivot.toFixed(2)} stop≈${p.stopSuggestion.toFixed(
        2
      )} risk/share≈${p.riskPerShare.toFixed(2)}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

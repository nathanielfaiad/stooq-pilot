import {
  getRecentPricesBeforeDate,
  getTickerBySymbol,
  getTickerPrices,
  getTickers,
} from "../db/sql";
import { addDaysInt, IntDate, todayIntUTC } from "./dates";
import { atr as atrCalc, ema, highest, rsi, sma } from "./indicators";
import { PresetName, Signal, SwingConfig } from "./models";

export const defaultConfigs: Record<PresetName, Partial<SwingConfig>> = {
  manual: {},
  debug: {
    // Very loose settings to surface potential signals for debugging
    rsiMin: 0,
    rsiMax: 100,
    relVolMin: 0,
    atrMult: 3,
    maxStretchPct: 200,
    nearPct50: 200,
    entryMode: "any",
    requirePriceAbove50: false,
    requireTrendAligned: false,
    requireEntryGate: false,
    allowRepeatEntries: true,
    cooldownBars: 0,
    useMTFConfirm: false,
    useBaseTightness: false,
    useCandleQuality: false,
    useGapGuard: false,
  },
  aggressive: {
    rsiMin: 40,
    rsiMax: 65,
    relVolMin: 1.3,
    atrMult: 1.5,
    maxStretchPct: 15,
    nearPct50: 10,
    entryMode: "breakout",
    cooldownBars: 3,
  },
  balanced: {
    rsiMin: 43,
    rsiMax: 62,
    relVolMin: 1.5,
    atrMult: 1.5,
    maxStretchPct: 12,
    nearPct50: 8,
    entryMode: "breakout",
    cooldownBars: 4,
  },
  conservative: {
    rsiMin: 45,
    rsiMax: 60,
    relVolMin: 1.8,
    atrMult: 1.5,
    maxStretchPct: 10,
    nearPct50: 6,
    entryMode: "pullback",
    cooldownBars: 5,
  },
};

function mergeConfig(
  preset: PresetName,
  overrides?: Partial<SwingConfig>
): SwingConfig {
  const base: SwingConfig = {
    preset,
    rsiMin: 45,
    rsiMax: 60,
    relVolMin: 1.8,
    atrMult: 1.5,
    maxStretchPct: 10,
    nearPct50: 8,
    entryMode: "pullback",
    requireMacdAbove0: true,
    requirePriceAbove50: true,
    requireTrendAligned: true,
    requireEntryGate: true,
    allowRepeatEntries: false,
    cooldownBars: 5,
    useMTFConfirm: true,
    useBaseTightness: true,
    useCandleQuality: true,
    useGapGuard: true,
    bbLen: 20,
    bbMult: 2,
  };
  const p = defaultConfigs[preset] ?? {};
  return { ...base, ...p, ...overrides };
}

export async function analyzeSwing(
  ticker: string,
  from: IntDate,
  to: IntDate = todayIntUTC(),
  preset: PresetName = "balanced",
  overrides?: Partial<SwingConfig>
): Promise<Signal[]> {
  const cfg = mergeConfig(preset, overrides);
  const t = await getTickerBySymbol(ticker);
  if (!t) return [];

  const tickerId = t.id;
  // Fetch up to 500 most recent prices before or on `to`.
  const rows = await getRecentPricesBeforeDate(tickerId, to);
  if (!rows || rows.length === 0) return [];

  // Convert to ordered arrays (assume rows sorted by tradeDate desc).
  const closes: number[] = rows.map((r) => r.closePrice).reverse();
  const highs: number[] = rows.map((r) => r.highPrice).reverse();
  const lows: number[] = rows.map((r) => r.lowPrice).reverse();
  const opens: number[] = rows.map((r) => r.openPrice).reverse();
  const vols: number[] = rows.map((r) => r.volume).reverse();

  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const ema20 = ema(closes, 20);
  const rsiSeries = rsi(closes, 14);
  const atrSeries = atrCalc(highs, lows, closes, 14);
  const highest20 = highest(highs, 20);
  const volSma20 = sma(vols, 20);
  // Now indicator arrays are in scope wherever needed

  const signals: Signal[] = [];

  for (let i = 1; i < rows.length; i++) {
    // ensure we have enough data for indicators
    if (
      isNaN(sma50[i]) ||
      isNaN(sma200[i]) ||
      isNaN(rsiSeries[i]) ||
      isNaN(atrSeries[i]) ||
      isNaN(highest20[i])
    )
      continue;

    const close = closes[i];
    const high = highs[i];
    const low = lows[i];
    const atr = atrSeries[i - 1] ?? atrSeries[i] ?? 0; // align lengths

    const priceAbove50 = close > sma50[i];
    const trendAligned = sma50[i] > sma200[i];
    const rsiOk = rsiSeries[i] >= cfg.rsiMin && rsiSeries[i] <= cfg.rsiMax;

    const relVol = vols[i] / (volSma20[i] || 1);
    const relVolOk = relVol >= cfg.relVolMin;

    const pctAbove50 = (close / sma50[i] - 1) * 100.0;
    const stretchOk = pctAbove50 <= cfg.maxStretchPct;

    const priceFilterPass = !cfg.requirePriceAbove50 || priceAbove50;
    const trendFilterPass = !cfg.requireTrendAligned || trendAligned;
    const dailyAll =
      priceFilterPass && trendFilterPass && rsiOk && relVolOk && stretchOk;

    const isBreakout = close > (highest20[i - 1] ?? highest20[i]);
    const nearSma50 = Math.abs(pctAbove50) <= cfg.nearPct50;
    const reclaimEma20 =
      close > (ema20[i] ?? close) &&
      (closes[i - 1] ?? close) <= (ema20[i - 1] ?? close);
    const isPullbackReclaim =
      nearSma50 && reclaimEma20 && rsiSeries[i] > rsiSeries[i - 1];

    const entryGateRaw =
      cfg.entryMode === "breakout"
        ? isBreakout
        : cfg.entryMode === "pullback"
        ? isPullbackReclaim
        : isBreakout || isPullbackReclaim;
    const entryGatePass = !cfg.requireEntryGate || entryGateRaw;

    const entryPass = dailyAll && entryGatePass;

    let prevEntryPass = false;
    if (!cfg.allowRepeatEntries && i - 1 >= 0) {
      const prevClose = closes[i - 1];
      const prevPriceAbove50 = prevClose > sma50[i - 1];
      const prevTrendAligned = sma50[i - 1] > sma200[i - 1];
      const prevRsiOk =
        rsiSeries[i - 1] >= cfg.rsiMin && rsiSeries[i - 1] <= cfg.rsiMax;
      const prevRelVol = vols[i - 1] / (volSma20[i - 1] || 1);
      const prevRelVolOk = prevRelVol >= cfg.relVolMin;
      const prevPctAbove50 = (prevClose / sma50[i - 1] - 1) * 100.0;
      const prevStretchOk = prevPctAbove50 <= cfg.maxStretchPct;
      const prevPricePass = !cfg.requirePriceAbove50 || prevPriceAbove50;
      const prevTrendPass = !cfg.requireTrendAligned || prevTrendAligned;
      const prevDailyAll =
        prevPricePass &&
        prevTrendPass &&
        prevRsiOk &&
        prevRelVolOk &&
        prevStretchOk;

      const prevIsBreakout = prevClose > (highest20[i - 2] ?? highest20[i - 1]);
      const prevNearSma50 = Math.abs(prevPctAbove50) <= cfg.nearPct50;
      const prevReclaimEma20 =
        i >= 2 &&
        prevClose > (ema20[i - 1] ?? prevClose) &&
        (closes[i - 2] ?? prevClose) <= (ema20[i - 2] ?? prevClose);
      const prevIsPullbackReclaim =
        i >= 2 &&
        prevNearSma50 &&
        prevReclaimEma20 &&
        rsiSeries[i - 1] > rsiSeries[i - 2];

      const prevEntryGateRaw =
        cfg.entryMode === "breakout"
          ? prevIsBreakout
          : cfg.entryMode === "pullback"
          ? prevIsPullbackReclaim
          : prevIsBreakout || prevIsPullbackReclaim;
      const prevEntryGatePass = !cfg.requireEntryGate || prevEntryGateRaw;

      prevEntryPass = prevDailyAll && prevEntryGatePass;
    }

    const firstPass = entryPass && (cfg.allowRepeatEntries || !prevEntryPass);

    if (firstPass) {
      const entryPx = close;
      const swingLen = 10;
      const swingLow = Math.min(
        ...lows.slice(Math.max(0, i - swingLen + 1), i + 1)
      );
      const stopATR = entryPx - cfg.atrMult * atr;
      const stopSwing = swingLow * (1 - 0.2 / 100.0);
      const stop = Math.min(stopATR, stopSwing);
      const riskR = Math.max(entryPx - stop, Number.EPSILON);
      const t1R = entryPx + 1.0 * riskR;
      const t15R = entryPx + 1.5 * riskR;
      const t2R = entryPx + 2.0 * riskR;

      const swingHighRef = Math.max(
        ...highs.slice(Math.max(0, i - swingLen + 1), i + 1)
      );
      const rrToSwing = (swingHighRef - entryPx) / riskR;

      signals.push({
        date: rows[i].tradeDate,
        entryPx,
        stop,
        targets: [t1R, t15R, t2R],
        rrToSwing,
        meta: {
          rsi: rsiSeries[i],
          relVol,
          pctAbove50,
          entryMode: cfg.entryMode,
        },
      });
    }
  }

  return signals;
}

export async function evaluateTickerForDate(
  ticker: string,
  forDate: IntDate,
  preset: PresetName = "balanced",
  overrides?: Partial<SwingConfig>
): Promise<{
  passed: boolean;
  reasons: string[];
  signal?: Signal;
}> {
  const cfg = mergeConfig(preset, overrides);
  const t = await getTickerBySymbol(ticker);
  if (!t) return { passed: false, reasons: ["ticker not found"] };
  const tickerId = t.id;
  // Calculate date for 500 days before or equal to forDate
  const dateLimit = forDate;
  // Fetch up to 500 most recent prices before or on forDate
  const rows = await getTickerPrices(tickerId, 0, forDate);
  if (!rows || rows.length === 0)
    return { passed: false, reasons: ["no price data"] };

  const closes: number[] = rows.map(
    (r: { closePrice: number }) => r.closePrice
  );
  const highs: number[] = rows.map((r: { highPrice: number }) => r.highPrice);
  const lows: number[] = rows.map((r: { lowPrice: number }) => r.lowPrice);
  const vols: number[] = rows.map((r: { volume: number }) => r.volume);

  // Debug: log price bar count
  // logJson({ ticker, forDate, priceBarCount: rows.length });

  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const ema20 = ema(closes, 20);
  const rsiSeries = rsi(closes, 14);
  const atrSeries = atrCalc(highs, lows, closes, 14);
  const highest20 = highest(highs, 20);
  const volSma20 = sma(vols, 20);

  const idx: number = (rows as { tradeDate: number }[]).findIndex(
    (r) => r.tradeDate === forDate
  );

  // Debug: log indicator values for target date
  // logJson({
  //   ticker,
  //   forDate,
  //   idx,
  //   closesLen: closes.length,
  //   highsLen: highs.length,
  //   lowsLen: lows.length,
  //   sma50: sma50[idx],
  //   sma200: sma200[idx],
  //   rsi: rsiSeries[idx],
  //   atr: atrSeries[idx],
  //   highest20: highest20[idx],
  //   volSma20: volSma20[idx],
  //   closes: closes.slice(Math.max(0, idx - 5), idx + 1),
  // });
  // if (idx < 0) {
  //   console.warn(`forDate ${forDate} not found in data for ${ticker}`);
  // }
  if (atrSeries.length > 0) {
    const sampleIdx = Math.min(idx, atrSeries.length - 1);
  }

  const reasons: string[] = [];

  if (
    isNaN(sma50[idx]) ||
    isNaN(sma200[idx]) ||
    isNaN(rsiSeries[idx]) ||
    isNaN(atrSeries[idx]) ||
    isNaN(highest20[idx])
  ) {
    // logError("Insufficient indicator history", {
    //   ticker,
    //   forDate,
    //   idx,
    //   sma50: sma50[idx],
    //   sma200: sma200[idx],
    //   rsi: rsiSeries[idx],
    //   atr: atrSeries[idx],
    //   highest20: highest20[idx],
    // });
    return { passed: false, reasons: ["insufficient indicator history"] };
  }

  const close = closes[idx];
  const atr = atrSeries[idx - 1] ?? atrSeries[idx] ?? 0;

  const priceAbove50 = close > sma50[idx];
  const priceFilterPass = !cfg.requirePriceAbove50 || priceAbove50;
  if (!priceFilterPass && cfg.requirePriceAbove50)
    reasons.push("price not above SMA50");

  const trendAligned = sma50[idx] > sma200[idx];
  const trendFilterPass = !cfg.requireTrendAligned || trendAligned;
  if (!trendFilterPass && cfg.requireTrendAligned)
    reasons.push("SMA50 not above SMA200 (trend not aligned)");

  const rsiOk = rsiSeries[idx] >= cfg.rsiMin && rsiSeries[idx] <= cfg.rsiMax;
  if (!rsiOk)
    reasons.push(
      `rsi ${rsiSeries[idx].toFixed(1)} outside ${cfg.rsiMin}-${cfg.rsiMax}`
    );

  const relVol = vols[idx] / (volSma20[idx] || 1);
  const relVolOk = relVol >= cfg.relVolMin;
  if (!relVolOk) reasons.push(`relVol ${relVol.toFixed(2)} < ${cfg.relVolMin}`);

  const pctAbove50 = (close / sma50[idx] - 1) * 100.0;
  const stretchOk = pctAbove50 <= cfg.maxStretchPct;
  if (!stretchOk)
    reasons.push(`pctAbove50 ${pctAbove50.toFixed(2)} > ${cfg.maxStretchPct}`);

  const isBreakout = close > (highest20[idx - 1] ?? highest20[idx]);
  const nearSma50 = Math.abs(pctAbove50) <= cfg.nearPct50;
  const reclaimEma20 =
    close > (ema20[idx] ?? close) &&
    (closes[idx - 1] ?? close) <= (ema20[idx - 1] ?? close);
  const isPullbackReclaim =
    nearSma50 && reclaimEma20 && rsiSeries[idx] > rsiSeries[idx - 1];

  const entryGateRaw =
    cfg.entryMode === "breakout"
      ? isBreakout
      : cfg.entryMode === "pullback"
      ? isPullbackReclaim
      : isBreakout || isPullbackReclaim;
  const entryGatePass = !cfg.requireEntryGate || entryGateRaw;
  if (!entryGatePass && cfg.requireEntryGate)
    reasons.push(
      `entry gate failed (breakout:${isBreakout}, pullback:${isPullbackReclaim})`
    );

  const dailyAll =
    priceFilterPass && trendFilterPass && rsiOk && relVolOk && stretchOk;
  if (!dailyAll) reasons.push("core daily filters not all true");

  // check firstPass (no previous entry)
  let prevEntryPass = false;
  if (!cfg.allowRepeatEntries && idx - 1 >= 0) {
    const prevClose = closes[idx - 1];
    const prevPriceAbove50 = prevClose > sma50[idx - 1];
    const prevTrendAligned = sma50[idx - 1] > sma200[idx - 1];
    const prevRsiOk =
      rsiSeries[idx - 1] >= cfg.rsiMin && rsiSeries[idx - 1] <= cfg.rsiMax;
    const prevRelVol = vols[idx - 1] / (volSma20[idx - 1] || 1);
    const prevRelVolOk = prevRelVol >= cfg.relVolMin;
    const prevPctAbove50 = (prevClose / sma50[idx - 1] - 1) * 100.0;
    const prevStretchOk = prevPctAbove50 <= cfg.maxStretchPct;
    const prevIsBreakout =
      prevClose > (highest20[idx - 2] ?? highest20[idx - 1]);
    const prevNearSma50 = Math.abs(prevPctAbove50) <= cfg.nearPct50;
    const prevReclaimEma20 =
      idx >= 2 &&
      prevClose > (ema20[idx - 1] ?? prevClose) &&
      (closes[idx - 2] ?? prevClose) <= (ema20[idx - 2] ?? prevClose);
    const prevIsPullbackReclaim =
      idx >= 2 &&
      prevNearSma50 &&
      prevReclaimEma20 &&
      rsiSeries[idx - 1] > rsiSeries[idx - 2];
    const prevEntryGateRaw =
      cfg.entryMode === "breakout"
        ? prevIsBreakout
        : cfg.entryMode === "pullback"
        ? prevIsPullbackReclaim
        : prevIsBreakout || prevIsPullbackReclaim;
    const prevEntryGatePass = !cfg.requireEntryGate || prevEntryGateRaw;
    const prevPricePass = !cfg.requirePriceAbove50 || prevPriceAbove50;
    const prevTrendPass = !cfg.requireTrendAligned || prevTrendAligned;
    const prevDailyAll =
      prevPricePass &&
      prevTrendPass &&
      prevRsiOk &&
      prevRelVolOk &&
      prevStretchOk;
    prevEntryPass = prevDailyAll && prevEntryGatePass;
  }

  const entryPass = dailyAll && entryGatePass;
  const firstPass = entryPass && (cfg.allowRepeatEntries || !prevEntryPass);

  if (!firstPass) {
    if (!entryPass)
      reasons.push(
        "entryPass false (either core filters or entry gate failed)"
      );
    if (prevEntryPass) reasons.push("not first pass: previous bar also passed");
    return { passed: false, reasons };
  }

  // build signal object for this date
  const entryPx = close;
  const swingLen = 10;
  const swingLow = Math.min(
    ...lows.slice(Math.max(0, idx - swingLen + 1), idx + 1)
  );
  const stopATR = entryPx - cfg.atrMult * atr;
  const stopSwing = swingLow * (1 - 0.2 / 100.0);
  const stop = Math.min(stopATR, stopSwing);
  const riskR = Math.max(entryPx - stop, Number.EPSILON);
  const t1R = entryPx + 1.0 * riskR;
  const t15R = entryPx + 1.5 * riskR;
  const t2R = entryPx + 2.0 * riskR;
  const swingHighRef = Math.max(
    ...highs.slice(Math.max(0, idx - swingLen + 1), idx + 1)
  );
  const rrToSwing = (swingHighRef - entryPx) / riskR;

  const signal: Signal = {
    date: rows[idx].tradeDate,
    entryPx,
    stop,
    targets: [t1R, t15R, t2R],
    rrToSwing,
    meta: {
      rsi: rsiSeries[idx],
      relVol,
      pctAbove50,
      entryMode: cfg.entryMode,
    },
  };

  return { passed: true, reasons: [], signal };
}

export async function scanTickersForDate(
  forDate: IntDate,
  preset: PresetName = "balanced",
  overrides?: Partial<SwingConfig>,
  debug = false
): Promise<any[]> {
  // We need enough history for indicators (SMA200 etc). Use ~500 days lookback.
  const from = addDaysInt(forDate, -500);
  const tickers = await getTickers();
  const results: Array<any> = [];

  // Add a statistics object for failure reasons.
  const failureReasonCounts: Record<string, number> = {};

  for (const t of tickers) {
    try {
      const evalRes = await evaluateTickerForDate(
        t.ticker,
        forDate,
        preset,
        overrides
      );
      if (evalRes.passed) {
        // if passed, include signal details
        results.push({
          id: t.id,
          symbol: t.ticker,
          passed: true,
          signals: [evalRes.signal],
          nextEntryDate: addDaysInt(forDate, 1),
        });
      } else if (debug) {
        results.push({
          id: t.id,
          symbol: t.ticker,
          passed: false,
          reasons: evalRes.reasons,
        });
      }
    } catch (err) {
      // ignore individual ticker errors but log
      // eslint-disable-next-line no-console
      // logError(`Error scanning ${t.ticker}:`, err);
      if (debug) {
        results.push({
          id: t.id,
          symbol: t.ticker,
          passed: false,
          reasons: [String(err)],
        });
      }
    }
  }

  // Output the summary of failure reasons.
  // logJson({ FailureReasonsSummary: failureReasonCounts });

  return results;
}

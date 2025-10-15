import {
  getRecentPricesBeforeDate,
  getTickerBySymbol,
  getTickerPrices,
  getTickers,
} from "../db/sql";
import { addDaysInt, IntDate, todayIntUTC } from "./dates";
import { atr as atrCalc, ema } from "./indicators";

type PresetName =
  | "manual"
  | "aggressive"
  | "balanced"
  | "conservative"
  | "debug";

export interface SwingConfig {
  preset: PresetName;
  // core filters
  rsiMin: number;
  rsiMax: number;
  relVolMin: number;
  atrMult: number;
  maxStretchPct: number;
  nearPct50: number;
  entryMode: "breakout" | "pullback";
  requireMacdAbove0: boolean;
  cooldownBars: number;
  useMTFConfirm: boolean; // placeholder (not implemented)
  useBaseTightness: boolean; // placeholder
  useCandleQuality: boolean; // placeholder
  useGapGuard: boolean; // placeholder
  // tightness params
  bbLen: number;
  bbMult: number;
}

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
    entryMode: "breakout",
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

export interface PriceBar {
  tradeDate: IntDate;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  volume: number;
}

export interface Signal {
  date: IntDate;
  entryPx: number;
  stop: number;
  targets: number[];
  rrToSwing?: number | null;
  meta?: Record<string, any>;
}

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

// Simple helpers for indicators we will need here (RSI, SMA, MACD simplified)
function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : NaN);
  }
  return out;
}

function rsi(values: number[], period = 14): number[] {
  const out: number[] = [];
  let gain = 0;
  let loss = 0;
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      out.push(NaN);
      continue;
    }
    const change = values[i] - values[i - 1];
    gain = Math.max(0, change);
    loss = Math.max(0, -change);
    if (i < period) {
      // accumulate until enough
      out.push(NaN);
      continue;
    }
    // naive simple moving average of gains/losses for speed (not Wilder)
    let avgGain = 0;
    let avgLoss = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = values[j] - values[j - 1];
      avgGain += Math.max(0, d);
      avgLoss += Math.max(0, -d);
    }
    avgGain /= period;
    avgLoss /= period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    out.push(100 - 100 / (1 + rs));
  }
  return out;
}

function highest(values: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(NaN);
      continue;
    }
    let m = -Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (values[j] > m) m = values[j];
    }
    out.push(m);
  }
  return out;
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

    const volSma20 = sma(vols, 20);
    const relVol = vols[i] / (volSma20[i] || 1);
    const relVolOk = relVol >= cfg.relVolMin;

    const pctAbove50 = (close / sma50[i] - 1) * 100.0;
    const stretchOk = pctAbove50 <= cfg.maxStretchPct;

    const dailyAll =
      priceAbove50 && trendAligned && rsiOk && relVolOk && stretchOk;

    const isBreakout = close > (highest20[i - 1] ?? highest20[i]);
    const nearSma50 = Math.abs(pctAbove50) <= cfg.nearPct50;
    const reclaimEma20 =
      close > (ema20[i] ?? close) &&
      (closes[i - 1] ?? close) <= (ema20[i - 1] ?? close);
    const isPullbackReclaim =
      nearSma50 && reclaimEma20 && rsiSeries[i] > rsiSeries[i - 1];

    const entryGate =
      cfg.entryMode === "breakout" ? isBreakout : isPullbackReclaim;

    const entryPass = dailyAll && entryGate;
    const firstPass =
      entryPass &&
      !(
        dailyAll &&
        (cfg.entryMode === "breakout"
          ? closes[i - 1] > (highest20[i - 2] ?? highest20[i - 1])
          : false)
      );

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

  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const ema20 = ema(closes, 20);
  const rsiSeries = rsi(closes, 14);
  const atrSeries = atrCalc(highs, lows, closes, 14);
  const highest20 = highest(highs, 20);

  // Debug: log data range and index
  //   console.log(
  //     `Price data for ${ticker} from ${rows[0]?.tradeDate} to ${
  //       rows[rows.length - 1]?.tradeDate
  //     }`
  //   );
  const idx: number = (rows as { tradeDate: number }[]).findIndex(
    (r) => r.tradeDate === forDate
  );
  //   console.log(`forDate: ${forDate}, index in data: ${idx}`);
  if (idx < 0) {
    console.warn(`forDate ${forDate} not found in data for ${ticker}`);
  }
  //   console.log(`atrSeries length: ${atrSeries.length}`);
  if (atrSeries.length > 0) {
    const sampleIdx = Math.min(idx, atrSeries.length - 1);
    // console.log(`atrSeries[${sampleIdx}]: ${atrSeries[sampleIdx]}`);
  }
  //   console.log(`sma50 at 342: `, sma50[342], "value at 343: ", sma50[343]);
  //   console.log(`sma200 at 342: `, sma200[342], "value at 343: ", sma200[343]);
  //   console.log(
  //     `rsiSeries at 342: `,
  //     rsiSeries[342],
  //     "value at 343: ",
  //     rsiSeries[343]
  //   );
  //   console.log(
  //     `highest20 at 342: `,
  //     highest20[342],
  //     "value at 343: ",
  //     highest20[343]
  //   );

  const reasons: string[] = [];

  if (
    isNaN(sma50[idx]) ||
    isNaN(sma200[idx]) ||
    isNaN(rsiSeries[idx]) ||
    isNaN(atrSeries[idx]) ||
    isNaN(highest20[idx])
  ) {
    // console.info(`Indicators at index ${idx} for ${ticker} have NaN values:`);
    // console.info(`  sma50: ${sma50[idx]}`);
    // console.info(`  sma200: ${sma200[idx]}`);
    // console.info(`  rsiSeries: ${rsiSeries[idx]}`);
    // console.info(`  atrSeries: ${atrSeries[idx]}`);
    // console.info(`  highest20: ${highest20[idx]}`);
    return { passed: false, reasons: ["insufficient indicator history"] };
  }

  const close = closes[idx];
  const atr = atrSeries[idx - 1] ?? atrSeries[idx] ?? 0;

  const priceAbove50 = close > sma50[idx];
  if (!priceAbove50) reasons.push("price not above SMA50");

  const trendAligned = sma50[idx] > sma200[idx];
  if (!trendAligned) reasons.push("SMA50 not above SMA200 (trend not aligned)");

  const rsiOk = rsiSeries[idx] >= cfg.rsiMin && rsiSeries[idx] <= cfg.rsiMax;
  if (!rsiOk)
    reasons.push(
      `rsi ${rsiSeries[idx].toFixed(1)} outside ${cfg.rsiMin}-${cfg.rsiMax}`
    );

  const volSma20 = sma(vols, 20);
  const relVol = vols[idx] / (volSma20[idx] || 1);
  if (!(relVol >= cfg.relVolMin))
    reasons.push(`relVol ${relVol.toFixed(2)} < ${cfg.relVolMin}`);

  const pctAbove50 = (close / sma50[idx] - 1) * 100.0;
  if (!(pctAbove50 <= cfg.maxStretchPct))
    reasons.push(`pctAbove50 ${pctAbove50.toFixed(2)} > ${cfg.maxStretchPct}`);

  const isBreakout = close > (highest20[idx - 1] ?? highest20[idx]);
  const nearSma50 = Math.abs(pctAbove50) <= cfg.nearPct50;
  const reclaimEma20 =
    close > (ema20[idx] ?? close) &&
    (closes[idx - 1] ?? close) <= (ema20[idx - 1] ?? close);
  const isPullbackReclaim =
    nearSma50 && reclaimEma20 && rsiSeries[idx] > rsiSeries[idx - 1];

  const entryGate =
    cfg.entryMode === "breakout" ? isBreakout : isPullbackReclaim;
  if (!entryGate)
    reasons.push(
      `entry gate failed (breakout:${isBreakout}, pullback:${isPullbackReclaim})`
    );

  const dailyAll =
    priceAbove50 &&
    trendAligned &&
    rsiOk &&
    relVol >= cfg.relVolMin &&
    pctAbove50 <= cfg.maxStretchPct;
  if (!dailyAll) reasons.push("core daily filters not all true");

  // check firstPass (no previous entry)
  let prevEntryPass = false;
  if (idx - 1 >= 0) {
    const prevClose = closes[idx - 1];
    const prevPriceAbove50 = prevClose > sma50[idx - 1];
    const prevTrendAligned = sma50[idx - 1] > sma200[idx - 1];
    const prevRsiOk =
      rsiSeries[idx - 1] >= cfg.rsiMin && rsiSeries[idx - 1] <= cfg.rsiMax;
    const prevRelVol = vols[idx - 1] / (volSma20[idx - 1] || 1);
    const prevPctAbove50 = (prevClose / sma50[idx - 1] - 1) * 100.0;
    const prevIsBreakout =
      prevClose > (highest20[idx - 2] ?? highest20[idx - 1]);
    const prevIsPullbackReclaim =
      Math.abs(prevPctAbove50) <= cfg.nearPct50 &&
      prevClose > (ema20[idx - 1] ?? prevClose);
    const prevEntryGate =
      cfg.entryMode === "breakout" ? prevIsBreakout : prevIsPullbackReclaim;
    prevEntryPass =
      prevPriceAbove50 &&
      prevTrendAligned &&
      prevRsiOk &&
      prevRelVol >= cfg.relVolMin &&
      prevPctAbove50 <= cfg.maxStretchPct &&
      prevEntryGate;
  }

  const entryPass = dailyAll && entryGate;
  const firstPass = entryPass && !prevEntryPass;

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
    // console.log(`Evaluating ${t.ticker} for ${forDate}`);
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
      console.error(`Error scanning ${t.ticker}:`, err);
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
  console.log("Failure Reasons Summary:", failureReasonCounts);

  return results;
}

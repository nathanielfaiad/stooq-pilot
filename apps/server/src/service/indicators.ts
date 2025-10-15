export function ema(values: readonly number[], period: number): number[] {
  if (values.length === 0) return [];
  const alpha = 2 / (period + 1);
  const out = new Array<number>(values.length);
  out[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    out[i] = alpha * values[i] + (1 - alpha) * out[i - 1];
  }
  return out;
}

// Enhance the `atr` function to initialize with the first TR value and handle small arrays.
export function atr(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
  period: number
): number[] {
  if (highs.length !== lows.length || lows.length !== closes.length) return [];
  if (highs.length < 2) return [];

  const tr: number[] = [];
  // Initialize TR with first value
  let prevTR = 0;
  for (let i = 1; i < highs.length; i++) {
    const curH = highs[i],
      curL = lows[i],
      prevC = closes[i - 1];
    const trVal = Math.max(
      curH - curL,
      Math.abs(curH - prevC),
      Math.abs(curL - prevC)
    );
    tr.push(trVal);
    if (i === 1) {
      prevTR = trVal; // set initial TR
    }
  }
  const atrs = ema(tr, period);
  // Pad the ATR array to match input length with initial value
  const result: number[] = Array(highs.length).fill(0);
  result[0] = 0; // no ATR for first index
  for (let i = 1; i < highs.length; i++) {
    result[i] = atrs[i - 1] ?? 0;
  }
  return result;
}

export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const clampedP = Math.min(1, Math.max(0, p));
  const idx = clampedP * (sorted.length - 1);
  const i = Math.floor(idx);
  const frac = idx - i;
  if (i >= sorted.length - 1) return sorted[sorted.length - 1];
  return sorted[i] + (sorted[i + 1] - sorted[i]) * frac;
}

export function median(xs: readonly number[]): number {
  if (xs.length === 0) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  return percentile(s, 0.5);
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

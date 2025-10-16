export type PresetName =
  | "manual"
  | "aggressive"
  | "balanced"
  | "conservative"
  | "debug";

export interface SwingConfig {
  preset: PresetName;
  rsiMin: number;
  rsiMax: number;
  relVolMin: number;
  atrMult: number;
  maxStretchPct: number;
  nearPct50: number;
  entryMode: "breakout" | "pullback" | "any";
  requireMacdAbove0: boolean;
  requirePriceAbove50: boolean;
  requireTrendAligned: boolean;
  requireEntryGate: boolean;
  allowRepeatEntries: boolean;
  cooldownBars: number;
  useMTFConfirm: boolean;
  useBaseTightness: boolean;
  useCandleQuality: boolean;
  useGapGuard: boolean;
  bbLen: number;
  bbMult: number;
}

export interface PriceBar {
  tradeDate: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  volume: number;
}

export interface Signal {
  date: number;
  entryPx: number;
  stop: number;
  targets: number[];
  rrToSwing?: number | null;
  meta?: Record<string, any>;
}
export interface DailyCandidate {
  ticker: string;
  dailyScore: number;
  trendScore: number;
  contractionScore: number;
  structureScore: number;
  pivotHigh: number;
  stopSuggestion: number;
  atr14: number;
  riskPerShare: number;
  medianDollarVolume40: number;
}

export interface FinalPick {
  ticker: string;
  finalScore: number;
  dailyScore: number;
  entryPivot: number;
  stopSuggestion: number;
  riskPerShare: number;
}

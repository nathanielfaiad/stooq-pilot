// export interface StooqRow {
//   ticker: string;
//   tradeDate: number; // yyyymmdd
//   openPrice: number;
//   highPrice: number;
//   lowPrice: number;
//   closePrice: number;
//   volume: number;
// }

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
  finalScore: number; // here == dailyScore (unless you add intraday)
  dailyScore: number;
  entryPivot: number;
  stopSuggestion: number;
  riskPerShare: number;
}

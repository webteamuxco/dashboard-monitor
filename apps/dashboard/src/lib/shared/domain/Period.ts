export type PeriodInterval = "1m" | "5m" | "15m" | "1h" | "1d";

export interface Period {
  from: string;
  to: string;
  interval: PeriodInterval;
}

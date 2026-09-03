export interface TimeSeriesPoint {
  timestamp: string;
  count: number;
}

export interface TimeSeries {
  points: TimeSeriesPoint[];
  // The adapter stopped reading before it had covered the whole window, so the
  // counts are a floor, not a total. Never hide this from the UI: a silently
  // truncated error rate reads as an improvement.
  truncated: boolean;
}

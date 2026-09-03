export interface ErrorRatePoint {
  bucketEpoch: number;
  label: string;
  count: number;
}

export interface ErrorRateSeries {
  points: ErrorRatePoint[];
  // The provider could not be read over the whole window — the chart shows a
  // floor. Surfaced in the panel rather than swallowed.
  truncated: boolean;
}

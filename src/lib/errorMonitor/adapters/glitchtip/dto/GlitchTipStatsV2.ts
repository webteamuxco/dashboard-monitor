export interface GlitchTipStatsV2Group {
  by: Record<string, string | number>;
  totals: Record<string, number>;
  series: Record<string, number[]>;
}

export interface GlitchTipStatsV2Dto {
  start: string;
  end: string;
  intervals: string[];
  groups: GlitchTipStatsV2Group[];
}

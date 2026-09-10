/**
 * What a KPI card displays, whichever monitor family backs it: one count, over
 * the selected window for an `interval` KPI and a total for any other type.
 * Keeping the shape uniform is what lets the browser ignore the family
 * entirely — it reads `DashboardKpi.type` to pick a card, never a provider or a
 * strategy. `windowMinutes` echoes what was measured, so `null` is what tells a
 * card the figure is not scoped to the window the header shows.
 */
export interface KpiMeasure {
  value: number;
  windowMinutes: number | null;
}

export interface DashboardKpiFilters { 
    panelSlug?: string | null;
 }

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

export function parseKpiFilters(params: URLSearchParams): Parsed<DashboardKpiFilters> {
    const panelSlug = params.get("panelSlug")?.trim();

    return {
        ok: true,
        value: {
            panelSlug,
        },
  };

}
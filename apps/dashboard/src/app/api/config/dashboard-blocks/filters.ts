export interface DashboardBlocksFilters {
    panelSlug?: string | null;
 }

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

export function parseblockFilters(params: URLSearchParams): Parsed<DashboardBlocksFilters> {
    const panelSlug = params.get("panelSlug")?.trim();

    return {
        ok: true,
        value: {
            panelSlug,
        },
  };

}
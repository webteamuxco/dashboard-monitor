import "server-only";
import { cache } from "react";
import { StrapiClientFactory } from "./StrapiClientFactory";
import { ToolWiring } from "./ToolWiring";

export const DASHBOARD_KPI = "dashboard-kpi";
export const DASHBOARD_BLOCK = "dashboard-block";

export type DashboardElementKind =
    | typeof DASHBOARD_KPI
    | typeof DASHBOARD_BLOCK;

const loaders: Record<
    DashboardElementKind,
    (documentId: string) => Promise<ToolWiring | null>
> = {
    [DASHBOARD_KPI]: (documentId) =>
        new StrapiClientFactory().create().getKpiWiring(documentId),
    [DASHBOARD_BLOCK]: (documentId) =>
        new StrapiClientFactory().create().getBlockWiring(documentId),
};

/**
 * The single Strapi read behind a data route: the element kind says which
 * collection the documentId belongs to, and the resulting wiring is what the
 * monitor layer resolves a factory from.
 *
 * Both arguments are primitives on purpose — React's `cache()` keys on argument
 * identity, so the per-request dedup only holds for a value the caller can
 * repeat, which the returned wiring object is not.
 */
export const loadToolWiring = cache(
    async (
        kind: DashboardElementKind,
        documentId: string,
    ): Promise<ToolWiring> => {
        const wiring = await loaders[kind](documentId);

        if (!wiring) {
            throw new Error(`Strapi ${kind} "${documentId}" not found.`);
        }

        return wiring;
    },
);

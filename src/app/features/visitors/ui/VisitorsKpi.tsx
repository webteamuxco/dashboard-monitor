import { VisitorsKpiCard } from "./VisitorsKpiCard"

type VisitorKpiProps = {
    documentId: string,
    intervalMs: number,
}

export function VisitorsKpi({ documentId, intervalMs }: VisitorKpiProps) {

    return (
        <>
            <VisitorsKpiCard
                documentId={documentId}
                intervalMs={intervalMs}
                variant="new"
            />
            <VisitorsKpiCard
                documentId={documentId}
                intervalMs={intervalMs}
                variant="returning"
            />
        </>
    )
}
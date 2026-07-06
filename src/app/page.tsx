import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { IssuesPanel } from "./features/issues/ui/IssuesPanel";
import { issuesDataAccess } from "./features/issues/data-access/IssuesDataAccess";
import { issuesKeys } from "./features/issues/queryKeys";
import { ReservationsPanel } from "./features/reservations/ui/ReservationsPanel";
import { reservationsDataAccess } from "./features/reservations/data-access/ReservationsDataAccess";
import { reservationsKeys } from "./features/reservations/queryKeys";
import { ErrorRatePanel } from "./features/errorRate/ui/ErrorRatePanel";
import { errorRateDataAccess } from "./features/errorRate/data-access/ErrorRateDataAccess";
import { errorRateKeys } from "./features/errorRate/queryKeys";
import { VisitorsPanel } from "./features/visitors/ui/VisitorsPanel";
import { visitorsTimelineDataAccess } from "./features/visitors/data-access/VisitorsTimelineDataAccess";
import { visitorsKeys } from "./features/visitors/queryKeys";
import { DashboardHeader } from "./features/dashboard/ui/DashboardHeader";
import { IssuesKpiRow } from "./features/dashboard/ui/IssuesKpiRow";
import { resolveDefaultEnvironment } from "./features/dashboard/state/environments";

export const dynamic = "force-dynamic";

const DEFAULT_REFRESH_INTERVAL_MS = 30_000;
const DEFAULT_LIMIT = 20;
const DEFAULT_RESERVATIONS_WINDOW = 30;

function getRefreshIntervalMs(): number {
  const raw = process.env.DASHBOARD_REFRESH_INTERVAL_MS;
  if (!raw) return DEFAULT_REFRESH_INTERVAL_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REFRESH_INTERVAL_MS;
}

function getReservationsWindowMinutes(): number {
  const raw = process.env.NEXT_PUBLIC_DASHBOARD_RESERVATIONS_WINDOW_MINUTES;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_RESERVATIONS_WINDOW;
}

export default async function Home() {
  const projectId = process.env.DASHBOARD_DEFAULT_PROJECT_ID;
  const intervalMs = getRefreshIntervalMs();
  const reservationsWindow = getReservationsWindowMinutes();
  const environment = resolveDefaultEnvironment();

  if (!projectId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-8 text-foreground">
        <p>
          Configurez <code className="font-mono text-primary">DASHBOARD_DEFAULT_PROJECT_ID</code>{" "}
          dans <code className="font-mono text-primary">.env.local</code>.
        </p>
      </main>
    );
  }

  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: issuesKeys.recent(projectId, DEFAULT_LIMIT, environment),
      queryFn: () =>
        issuesDataAccess.getRecentUnresolved(projectId, DEFAULT_LIMIT, environment),
    }),
    queryClient.prefetchQuery({
      queryKey: reservationsKeys.series(projectId, reservationsWindow),
      queryFn: () => reservationsDataAccess.getSeries(projectId, reservationsWindow),
    }),
    queryClient.prefetchQuery({
      queryKey: errorRateKeys.series(projectId, environment),
      queryFn: () => errorRateDataAccess.getSeries(projectId, environment),
    }),
    queryClient.prefetchQuery({
      queryKey: visitorsKeys.timeline(projectId, reservationsWindow),
      queryFn: () => visitorsTimelineDataAccess.getSeries(projectId, reservationsWindow),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex h-screen flex-col overflow-hidden">
        <DashboardHeader projectId={projectId} limit={DEFAULT_LIMIT} intervalMs={intervalMs} />
        <main className="flex flex-1 min-h-0 flex-col gap-3 p-4">
          <IssuesKpiRow projectId={projectId} limit={DEFAULT_LIMIT} intervalMs={intervalMs} />

          <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
            <div className="flex min-h-0 flex-col gap-3">
              <div className="min-h-0 flex-1">
                <IssuesPanel projectId={projectId} limit={DEFAULT_LIMIT} intervalMs={intervalMs} />
              </div>
              {/* <div className="min-h-0 flex-1">
                <VisitorsPanel projectId={projectId} intervalMs={intervalMs} />
              </div> */}
            </div>
            <div className="flex min-h-0 flex-col gap-3">
              <div className="min-h-0 flex-1">
                <ErrorRatePanel projectId={projectId} intervalMs={intervalMs} />
              </div>
              <div className="min-h-0 flex-1">
                <ReservationsPanel projectId={projectId} intervalMs={intervalMs} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </HydrationBoundary>
  );
}

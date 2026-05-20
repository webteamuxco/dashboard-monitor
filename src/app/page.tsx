import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { BarChart3, Users } from "lucide-react";
import { IssuesPanel } from "./features/issues/ui/IssuesPanel";
import { issuesDataAccess } from "./features/issues/data-access/IssuesDataAccess";
import { issuesKeys } from "./features/issues/queryKeys";
import { ReservationsPanel } from "./features/reservations/ui/ReservationsPanel";
import { reservationsDataAccess } from "./features/reservations/data-access/ReservationsDataAccess";
import { reservationsKeys } from "./features/reservations/queryKeys";
import { DashboardHeader } from "./features/dashboard/ui/DashboardHeader";
import { IssuesKpiRow } from "./features/dashboard/ui/IssuesKpiRow";
import { PlaceholderChartPanel } from "./features/dashboard/ui/PlaceholderChartPanel";

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
      queryKey: issuesKeys.recent(projectId, DEFAULT_LIMIT),
      queryFn: () => issuesDataAccess.getRecentUnresolved(projectId, DEFAULT_LIMIT),
    }),
    queryClient.prefetchQuery({
      queryKey: reservationsKeys.series(projectId, reservationsWindow),
      queryFn: () => reservationsDataAccess.getSeries(projectId, reservationsWindow),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardHeader projectId={projectId} limit={DEFAULT_LIMIT} intervalMs={intervalMs} />
      <main className="flex flex-1 flex-col gap-3 p-4">
        <IssuesKpiRow projectId={projectId} limit={DEFAULT_LIMIT} intervalMs={intervalMs} />

        <div className="grid grid-cols-2 gap-3">
          <IssuesPanel projectId={projectId} limit={DEFAULT_LIMIT} intervalMs={intervalMs} />
          <PlaceholderChartPanel
            title="Taux d'erreurs"
            icon={BarChart3}
            hint="erreurs / min · 30 pts"
            height={280}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ReservationsPanel projectId={projectId} intervalMs={intervalMs} height={200} />
          <PlaceholderChartPanel
            title="Visiteurs en temps réel"
            icon={Users}
            hint="sessions actives"
            height={200}
          />
        </div>
      </main>
    </HydrationBoundary>
  );
}

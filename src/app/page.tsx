import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { issuesDataAccess } from "./features/issues/data-access/IssuesDataAccess";
import { issuesKeys } from "./features/issues/queryKeys";
import { reservationsDataAccess } from "./features/reservations/data-access/ReservationsDataAccess";
import { reservationsKeys } from "./features/reservations/queryKeys";
import { errorRateDataAccess } from "./features/errorRate/data-access/ErrorRateDataAccess";
import { errorRateKeys } from "./features/errorRate/queryKeys";
import { visitorsTimelineDataAccess } from "./features/visitors/data-access/VisitorsTimelineDataAccess";
import { visitorsKeys } from "./features/visitors/queryKeys";
import { configDataAccess } from "./features/config/data-access/ConfigDataAccess";
import { configKeys } from "./features/config/queryKeys";
import { DashboardContent } from "./features/dashboard/ui/DashboardContent";
import { resolveDefaultEnvironment } from "./features/dashboard/state/environments";
import { presetsFromTimeInterval } from "./features/dashboard/state/windowPresets";

export const dynamic = "force-dynamic";

const DEFAULT_REFRESH_INTERVAL_MS = 30_000;
const DEFAULT_LIMIT = 20;
const DEFAULT_RESERVATIONS_WINDOW = 30;

function getReservationsWindowMinutes(): number {
  const raw = process.env.NEXT_PUBLIC_DASHBOARD_RESERVATIONS_WINDOW_MINUTES;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_RESERVATIONS_WINDOW;
}

function ConfigMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-8 text-foreground">
      <p>{children}</p>
    </main>
  );
}

export default async function Home() {
  const fallbackRefreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS;
  const reservationsWindow = getReservationsWindowMinutes();
  const environment = resolveDefaultEnvironment();

  const projects = await configDataAccess.getProjectsList();

  if (projects.length === 0) {
    return (
      <ConfigMessage>
        No project is configured in Strapi. Publish a project to display the
        dashboard.
      </ConfigMessage>
    );
  }

  const initialDocumentId = projects[0].documentId;
  const initialConfig = await configDataAccess.getProjectConfig(initialDocumentId);
  const { presets: initialWindowPresets, initialWindowMinutes } =
    presetsFromTimeInterval(initialConfig?.timeInterval);
  const glitchtip = initialConfig?.toolConfigurations.find(
    (configuration) => configuration.kind === "glitchtip",
  );

  if (!glitchtip) {
    return (
      <ConfigMessage>
        Project “{projects[0].title}” has no GlitchTip configuration.
      </ConfigMessage>
    );
  }

  const initialProjectId = glitchtip.projectId;

  const queryClient = new QueryClient();
  queryClient.setQueryData(configKeys.projects(), projects);
  queryClient.setQueryData(configKeys.project(initialDocumentId), initialConfig);

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: issuesKeys.recent(initialDocumentId, DEFAULT_LIMIT, environment),
      queryFn: () =>
        issuesDataAccess.getRecentUnresolved(initialDocumentId, DEFAULT_LIMIT, environment),
    }),
    queryClient.prefetchQuery({
      queryKey: reservationsKeys.series(initialDocumentId, reservationsWindow),
      queryFn: () => reservationsDataAccess.getSeries(initialDocumentId, reservationsWindow),
    }),
    queryClient.prefetchQuery({
      queryKey: errorRateKeys.series(initialDocumentId, environment),
      queryFn: () => errorRateDataAccess.getSeries(initialDocumentId, environment),
    }),
    queryClient.prefetchQuery({
      queryKey: visitorsKeys.timeline(initialDocumentId, reservationsWindow),
      queryFn: () => visitorsTimelineDataAccess.getSeries(initialDocumentId, reservationsWindow),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent
        initialDocumentId={initialDocumentId}
        initialProjectId={initialProjectId}
        initialWindowPresets={initialWindowPresets}
        initialWindowMinutes={initialWindowMinutes}
        limit={DEFAULT_LIMIT}
        fallbackRefreshIntervalMs={fallbackRefreshIntervalMs}
      />
    </HydrationBoundary>
  );
}

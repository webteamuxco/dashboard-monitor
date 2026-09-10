import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { configDataAccess } from "./features/config/data-access/ConfigDataAccess";
import { configKeys } from "./features/config/queryKeys";
import { DashboardContent } from "./features/dashboard/ui/DashboardContent";
import { presetsFromTimeInterval } from "./features/dashboard/state/windowPresets";
import {
  SHOW_DEV_PANEL_QUERY_PARAM,
  readDevelopmentPanelParam,
} from "./features/utils/queryFilters";

export const dynamic = "force-dynamic";

const DEFAULT_REFRESH_INTERVAL_MS = 30_000;
const DEFAULT_LIMIT = 20;

function ConfigMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-8 text-foreground">
      <p>{children}</p>
    </main>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const fallbackRefreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS;

  const projects = await configDataAccess.getProjectsList();

  if (projects.length === 0) {
    return (
      <ConfigMessage>
        No project is configured in Strapi. Publish a project to display the
        dashboard.
      </ConfigMessage>
    );
  }

  const showDevelopmentPanel = readDevelopmentPanelParam(
    (await searchParams)[SHOW_DEV_PANEL_QUERY_PARAM],
  );

  const initialDocumentId = projects[0].documentId;
  const [initialConfig, panels] = await Promise.all([
    configDataAccess.getProjectConfig(initialDocumentId),
    configDataAccess.getProjectPanels(initialDocumentId, showDevelopmentPanel),
  ]);

  const { presets: initialWindowPresets, initialWindowMinutes } =
    presetsFromTimeInterval(initialConfig?.timeInterval);

  const queryClient = new QueryClient();
  queryClient.setQueryData(configKeys.projects(), projects);
  queryClient.setQueryData(configKeys.project(initialDocumentId), initialConfig);
  queryClient.setQueryData(configKeys.pannels(initialDocumentId, showDevelopmentPanel), panels);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent
        initialDocumentId={initialDocumentId}
        initialWindowPresets={initialWindowPresets}
        initialWindowMinutes={initialWindowMinutes}
        limit={DEFAULT_LIMIT}
        fallbackRefreshIntervalMs={fallbackRefreshIntervalMs}
      />
    </HydrationBoundary>
  );
}

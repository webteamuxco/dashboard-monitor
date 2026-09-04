import { NextRequest, NextResponse } from "next/server";
import { configDataAccess } from "@/app/features/config/data-access/ConfigDataAccess";
import {
  SHOW_DEV_PANEL_QUERY_PARAM,
  readDevelopmentPanelParam,
} from "@/app/features/utils/queryFilters";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  const showDevelopmentPanel = readDevelopmentPanelParam(
    request.nextUrl.searchParams.get(SHOW_DEV_PANEL_QUERY_PARAM) ?? undefined,
  );

  if (!projectId) {
    return NextResponse.json(
      { error: "Path param 'projectId' is required." },
      { status: 400 },
    );
  }

  try {
    const data = await configDataAccess.getProjectPanels(
      projectId,
      showDevelopmentPanel,
    );
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
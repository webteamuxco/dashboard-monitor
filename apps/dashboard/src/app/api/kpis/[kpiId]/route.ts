import { NextRequest, NextResponse } from "next/server";
import { kpisDataAccess } from "@/app/features/kpis/data-access/KpisDataAccess";
import { DASHBOARD_KPI } from "@/lib/config/domain/loadToolWiring";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kpiId: string }> },
) {
  const { kpiId } = await params;
  if (!kpiId) {
    return NextResponse.json(
      { error: "Path param 'kpiId' is required." },
      { status: 400 },
    );
  }

  // Absent means the KPI is not windowed (its Strapi `type` is not `interval`)
  // and the measure is a total. No default: one would silently turn every
  // total into a 30-minute count.
  const raw = request.nextUrl.searchParams.get("windowMinutes");
  const windowMinutes = raw === null ? null : Number(raw);
  if (
    windowMinutes !== null &&
    (!Number.isInteger(windowMinutes) || windowMinutes <= 0)
  ) {
    return NextResponse.json(
      { error: "Query param 'windowMinutes' must be a positive integer." },
      { status: 400 },
    );
  }

  const environment = request.nextUrl.searchParams.get("environment");

  try {
    const data = await kpisDataAccess.getMeasure(
      DASHBOARD_KPI,
      kpiId,
      windowMinutes,
      environment,
    );
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

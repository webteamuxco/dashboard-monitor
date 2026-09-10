import { NextRequest, NextResponse } from "next/server";
import { errorRateDataAccess } from "@/app/features/errorRate/data-access/ErrorRateDataAccess";
import { DASHBOARD_KPI } from "@/lib/config/domain/loadToolWiring";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const documentId = request.nextUrl.searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json(
      { error: "Query param 'documentId' is required." },
      { status: 400 },
    );
  }

  const environment = request.nextUrl.searchParams.get("environment");

  try {
    const data = await errorRateDataAccess.getSeries(DASHBOARD_KPI, documentId, environment);
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

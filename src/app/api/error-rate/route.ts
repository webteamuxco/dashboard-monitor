import { NextRequest, NextResponse } from "next/server";
import { errorRateDataAccess } from "@/app/features/errorRate/data-access/ErrorRateDataAccess";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "Query param 'projectId' is required." },
      { status: 400 },
    );
  }

  const environment = request.nextUrl.searchParams.get("environment");

  try {
    const data = await errorRateDataAccess.getSeries(projectId, environment);
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

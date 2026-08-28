import { NextRequest, NextResponse } from "next/server";
import { visitorsTimelineDataAccess } from "@/app/features/visitors/data-access/VisitorsTimelineDataAccess";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const documentId = request.nextUrl.searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json(
      { error: "Query param 'documentId' is required." },
      { status: 400 },
    );
  }

  const raw = request.nextUrl.searchParams.get("windowMinutes");
  const windowMinutes = raw ? Number(raw) : 30;
  if (!Number.isInteger(windowMinutes) || windowMinutes <= 0) {
    return NextResponse.json(
      { error: "Query param 'windowMinutes' must be a positive integer." },
      { status: 400 },
    );
  }

  try {
    const data = await visitorsTimelineDataAccess.getSeries(documentId, windowMinutes);
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

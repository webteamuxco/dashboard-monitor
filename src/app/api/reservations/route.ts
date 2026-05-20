import { NextRequest, NextResponse } from "next/server";
import { reservationsDataAccess } from "@/app/features/reservations/data-access/ReservationsDataAccess";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "Query param 'projectId' is required." },
      { status: 400 },
    );
  }

  const raw = request.nextUrl.searchParams.get("windowMinutes");
  const windowMinutes = raw ? Number(raw) : 30;
  if (!Number.isInteger(windowMinutes) || windowMinutes <= 0 || windowMinutes > 360) {
    return NextResponse.json(
      { error: "Query param 'windowMinutes' must be an integer between 1 and 360." },
      { status: 400 },
    );
  }

  try {
    const data = await reservationsDataAccess.getSeries(projectId, windowMinutes);
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

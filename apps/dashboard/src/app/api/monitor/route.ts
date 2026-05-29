import { NextResponse } from "next/server";
import { monitorDataAccess } from "@/app/features/monitor/data-access/MonitorDataAccess";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await monitorDataAccess.list();
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

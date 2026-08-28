import { NextResponse } from "next/server";
import { configDataAccess } from "@/app/features/config/data-access/ConfigDataAccess";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await configDataAccess.getProjectsList();
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

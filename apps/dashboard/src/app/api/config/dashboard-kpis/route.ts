import { NextRequest, NextResponse } from "next/server";
import { configDataAccess } from "@/app/features/config/data-access/ConfigDataAccess";
import { parseKpiFilters } from "./filters";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
) {

  const filters = parseKpiFilters(request.nextUrl.searchParams)

  if (!filters.ok) {
    return NextResponse.json({ error: filters.error }, { status: 400 });
  }

  try {
    const data = await configDataAccess.getDashboardKpis(
      filters.value,
    );

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
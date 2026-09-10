import { NextRequest, NextResponse } from "next/server";
import { blocksDataAccess } from "@/app/features/blocks/data-access/BlocksDataAccess";
import { DASHBOARD_BLOCK } from "@/lib/config/domain/loadToolWiring";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ blockId: string }> },
) {

  const { blockId } = await params;
  if (!blockId) {
    return NextResponse.json(
      { error: "Path param 'blockId' is required." },
      { status: 400 },
    );
  }

  const rawWindow = request.nextUrl.searchParams.get("windowMinutes");
  const windowMinutes = rawWindow === null ? null : Number(rawWindow);
  if (
    windowMinutes !== null &&
    (!Number.isInteger(windowMinutes) || windowMinutes <= 0)
  ) {
    return NextResponse.json(
      { error: "Query param 'windowMinutes' must be a positive integer." },
      { status: 400 },
    );
  }

  const rawLimit = request.nextUrl.searchParams.get("limit");
  const limit = rawLimit === null ? null : Number(rawLimit);
  if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) {
    return NextResponse.json(
      { error: "Query param 'limit' must be a positive integer." },
      { status: 400 },
    );
  }

  const environment = request.nextUrl.searchParams.get("environment");
  const tag = request.nextUrl.searchParams.get("tag");

  try {

    const data = await blocksDataAccess.getMeasure(
      DASHBOARD_BLOCK,
      blockId,
      windowMinutes,
      environment,
      limit,
      tag,
    );
    return NextResponse.json({ data });
    
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

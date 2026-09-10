import { NextRequest, NextResponse } from "next/server";
import { issuesDataAccess } from "@/app/features/issues/data-access/IssuesDataAccess";
import { DASHBOARD_BLOCK } from "@/lib/config/domain/loadToolWiring";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ blockId: string; issueId: string }> },
) {

  const { blockId, issueId } = await params;
  
  if (!blockId || !issueId) {
    return NextResponse.json(
      { error: "Path params 'blockId' and 'issueId' are required." },
      { status: 400 },
    );
  }

  try {

    const data = await issuesDataAccess.getDetail(
      DASHBOARD_BLOCK,
      blockId,
      issueId,
    );
    return NextResponse.json({ data });

  } catch (err) {

    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

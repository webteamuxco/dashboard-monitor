import { NextRequest, NextResponse } from "next/server";
import { issuesDataAccess } from "@/app/features/issues/data-access/IssuesDataAccess";
import { DASHBOARD_BLOCK } from "@/lib/config/domain/loadToolWiring";
import { StatusDTO } from "@/app/features/issues/domain/statusDto";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ blockId: string; issueId: string }> },
): Promise<NextResponse> {

  const { blockId, issueId } = await params;
  
  if (!blockId || !issueId) {
    return NextResponse.json(
      { error: "Path params 'blockId' and 'issueId' are required." },
      { status: 400 },
    );
  }

  let dto: StatusDTO;

  try {
    dto = (await request.json()) as StatusDTO;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof dto.status !== "string" || dto.status.trim() === "") {
    return NextResponse.json(
      { error: "Body field 'status' is required." },
      { status: 400 },
    );
  }

  try {

    const data = await issuesDataAccess.updateStatus(
      DASHBOARD_BLOCK,
      blockId,
      issueId,
      dto,
    );
    
    return NextResponse.json({ data });

  } catch (err) {

    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

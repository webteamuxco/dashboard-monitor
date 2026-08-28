import { NextRequest, NextResponse } from "next/server";
import { issuesDataAccess } from "@/app/features/issues/data-access/IssuesDataAccess";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const documentId = request.nextUrl.searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json(
      { error: "Query param 'documentId' is required." },
      { status: 400 },
    );
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 20;
  if (!Number.isFinite(limit) || limit <= 0 || limit > 200) {
    return NextResponse.json(
      { error: "Query param 'limit' must be a number between 1 and 200." },
      { status: 400 },
    );
  }

  const environment = request.nextUrl.searchParams.get("environment");

  try {
    const data = await issuesDataAccess.getRecent(documentId, limit, environment);
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

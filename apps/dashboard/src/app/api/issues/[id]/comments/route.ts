import { NextRequest, NextResponse } from "next/server";
import { issuesDataAccess } from "@/app/features/issues/data-access/IssuesDataAccess";
import type { CommentDTO } from "@/app/features/issues/domain/commentsDto";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "Path param 'id' is required." },
      { status: 400 },
    );
  }

  const documentId = request.nextUrl.searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json(
      { error: "Query param 'documentId' is required." },
      { status: 400 },
    );
  }

  let dto: CommentDTO;
  try {
    dto = (await request.json()) as CommentDTO;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof dto.content !== "string" || dto.content.trim() === "") {
    return NextResponse.json(
      { error: "Body field 'content' is required." },
      { status: 400 },
    );
  }

  try {
    const data = await issuesDataAccess.postComment(documentId, id, dto);
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

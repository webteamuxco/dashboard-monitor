import { NextResponse } from "next/server";
import { configDataAccess } from "@/app/features/config/data-access/ConfigDataAccess";

export const dynamic = "force-dynamic";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
    console.log("balbal")
  const { projectId } = await params;

  if (!projectId) {
    return NextResponse.json(
      { error: "Path param 'projectId' is required." },
      { status: 400 },
    );
  }

  try {
    const data = await configDataAccess.getProjectStrategies(projectId);
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
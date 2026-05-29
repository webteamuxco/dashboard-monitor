import { NextResponse } from "next/server";
import { monitorDataAccess } from "@/app/features/monitor/data-access/MonitorDataAccess";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const data = await monitorDataAccess.bySlug(slug);
    if (!data) {
      return NextResponse.json(
        { error: `Monitor with slug '${slug}' not found.` },
        { status: 404 },
      );
    }
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

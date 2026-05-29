import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { eventBus } from "@/lib/realtime/eventBus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MONITOR_MODEL = "monitor";
const SECRET_HEADER = "x-webhook-secret";

type StrapiWebhookPayload = {
  event: string;
  model?: string;
  entry?: { id?: number; documentId?: string };
};

// Strapi's admin "Trigger" button sends a test payload with only `event` set
// (no `model`, no `entry`). Accept that shape; the model filter below makes it
// a silent no-op.
function isStrapiWebhookPayload(value: unknown): value is StrapiWebhookPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.event === "string";
}

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.STRAPI_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "Server misconfigured: STRAPI_WEBHOOK_SECRET is not set." },
      { status: 500 },
    );
  }

  const provided = request.headers.get(SECRET_HEADER);
  if (!provided || !secretsMatch(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isStrapiWebhookPayload(payload)) {
    return NextResponse.json(
      { error: "Unexpected webhook payload shape." },
      { status: 400 },
    );
  }

  if (payload.model !== MONITOR_MODEL) {
    return new NextResponse(null, { status: 204 });
  }

  eventBus.emit("monitor:changed", {
    event: payload.event,
    documentId: payload.entry?.documentId,
  });

  return new NextResponse(null, { status: 204 });
}

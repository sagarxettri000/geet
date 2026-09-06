import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { recommendationEventsBatchSchema } from "@/lib/recommend-validation";
import { recordEvent } from "@/services/recommend";

export async function POST(req: Request) {
  let userId: string;
  try {
    const user = await requireUser();
    userId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = Array.isArray(body) ? body : [body];
  const parsed = recommendationEventsBatchSchema.safeParse(events);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    for (const event of parsed.data) {
      const { eventType, trackId, itemId, sessionId, position, duration, source, device } = event;
      await recordEvent(userId, {
        eventType,
        trackId: trackId ?? itemId,
        sessionId,
        position,
        duration,
        source,
        device,
      });
    }
  } catch {
    return NextResponse.json({ error: "Failed to record events" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, count: parsed.data.length });
}
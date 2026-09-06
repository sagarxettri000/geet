import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { getRankedFeed } from "@/services/recommend";

export async function GET(req: Request) {
  let userId: string;
  try {
    const user = await requireUser();
    userId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "24", 10) || 24, 1), 50);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);
  const sessionId = searchParams.get("sessionId") ?? undefined;

  try {
    const feed = await getRankedFeed(userId, limit, offset);
    return NextResponse.json({ ...feed, sessionId });
  } catch {
    return NextResponse.json({ error: "Failed to build recommendations" }, { status: 502 });
  }
}
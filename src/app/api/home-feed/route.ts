import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getHomeFeedPage } from "@/services/home-feed";
import { FEED } from "@/services/recommend/weights";

export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(
    FEED.maxLimit,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "30", 10) || 30)
  );
  const cursor = (url.searchParams.get("cursor") ?? undefined)?.slice(0, 4096);
  const debug =
    url.searchParams.get("debug") === "1" && session?.user?.role === "admin";

  try {
    const page = await getHomeFeedPage(userId, { limit, cursor, debug });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: "Failed to build home feed" }, { status: 500 });
  }
}
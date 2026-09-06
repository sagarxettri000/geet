import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { searchCatalog } from "@/services/music";
import { searchYouTubeMusic } from "@/lib/youtube/data-api";
import { recordEvent } from "@/services/recommend";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) return NextResponse.json({ error: "Missing ?q=" }, { status: 400 });
  if (q.length > 100) return NextResponse.json({ error: "Query too long" }, { status: 400 });

  const session = await auth().catch(() => null);
  const userId = session?.user?.id as string | undefined;

  const catalog = await searchCatalog(q, userId);

  let youtube: Awaited<ReturnType<typeof searchYouTubeMusic>> | undefined;
  if (process.env.YOUTUBE_API_KEY) {
    try {
      youtube = await searchYouTubeMusic(q);
    } catch {
      // ignore YouTube errors, return catalog only
    }
  }

  if (userId) {
    // fire-and-forget, don't block response
    db.searchHistory.create({ data: { userId, query: q } }).catch(() => {});
    recordEvent(userId, { eventType: "search", source: "search" }).catch(() => {});
  }

  return NextResponse.json({ ...catalog, ...(youtube ? { youtube } : {}) });
}

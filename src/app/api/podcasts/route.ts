import { NextResponse } from "next/server";
import { searchYouTubePodcasts } from "@/lib/youtube/data-api";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (!q) return NextResponse.json({ error: "Missing ?q=" }, { status: 400 });
  if (q.length > 100) return NextResponse.json({ error: "Query too long" }, { status: 400 });

  try {
    const hits = await searchYouTubePodcasts(q, 100);
    return NextResponse.json({ query: q, hits });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Search failed" }, { status: 502 });
  }
}
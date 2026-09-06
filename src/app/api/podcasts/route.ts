import { NextResponse } from "next/server";
import {
  searchYouTubePodcasts,
  trendingYouTubePodcasts,
  DataApiError,
} from "@/lib/youtube/data-api";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const region = (url.searchParams.get("region") ?? process.env.YOUTUBE_REGION ?? "IN")
    .toUpperCase()
    .slice(0, 2);

  // No query → show the trending podcasts rail (like the home page wall).
  if (!q) {
    try {
      const hits = await trendingYouTubePodcasts(region, 30);
      return NextResponse.json({ mode: "trending", region, hits });
    } catch (err) {
      if (err instanceof DataApiError) {
        return NextResponse.json({ mode: "trending", region, hits: [], reason: err.kind });
      }
      return NextResponse.json({ mode: "trending", region, hits: [], reason: "server" });
    }
  }

  if (q.length > 100) return NextResponse.json({ error: "Query too long" }, { status: 400 });

  try {
    const hits = await searchYouTubePodcasts(q, 100);
    return NextResponse.json({ mode: "search", query: q, hits });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Search failed" }, { status: 502 });
  }
}
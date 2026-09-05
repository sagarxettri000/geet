import { NextResponse } from "next/server";
import { trendingYouTubeMusic, DataApiError } from "@/lib/youtube/data-api";

// Live YouTube Music chart (most popular music videos, region-based).
// Returns [] when no API key is configured — the UI then gracefully hides the section.
export async function GET(req: Request) {
  const region = (new URL(req.url).searchParams.get("region") ?? process.env.YOUTUBE_REGION ?? "IN")
    .toUpperCase()
    .slice(0, 2);

  try {
    const hits = await trendingYouTubeMusic(region, 14);
    return NextResponse.json({ region, hits });
  } catch (err) {
    if (err instanceof DataApiError) {
      return NextResponse.json({ region, hits: [], reason: err.kind });
    }
    return NextResponse.json({ region, hits: [] });
  }
}
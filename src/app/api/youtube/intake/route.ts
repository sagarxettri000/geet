import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { parseYouTubeInput } from "@/lib/youtube/video";
import { fetchOEmbed } from "@/lib/youtube/oembed";
import { getOrCreateTrackFromVideo } from "@/services/catalog";
import { trackToDTO } from "@/services/music";

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = (body?.input ?? body?.url ?? "") as string;
  const videoId = parseYouTubeInput(input ?? "");
  if (!videoId) return NextResponse.json({ error: "Invalid YouTube URL or video ID" }, { status: 400 });

  let meta;
  try {
    meta = await fetchOEmbed(videoId);
  } catch (e: any) {
    const msg = e?.message ?? "Could not fetch video details";
    const status = e?.kind === "not-found" ? 404 : 502;
    return NextResponse.json({ error: msg }, { status });
  }

  void user; // auth required but not otherwise used

  const { track, created } = await getOrCreateTrackFromVideo({
    videoId,
    title: meta.title,
    artist: meta.authorName,
    thumbnailUrl: meta.thumbnailUrl,
    durationSec: null,
  });

  return NextResponse.json({ track: trackToDTO(track as any), created }, { status: created ? 201 : 200 });
}

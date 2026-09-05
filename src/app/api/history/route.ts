import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { historySchema } from "@/lib/validation";
import { trackToDTO } from "@/services/music";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [recentlyPlayed, listeningHistory] = await Promise.all([
    db.recentlyPlayed.findMany({
      where: { userId: user.id },
      include: { track: { include: { sources: true } } },
      orderBy: { playedAt: "desc" },
      take: 30,
    }),
    db.listeningHistory.findMany({
      where: { userId: user.id },
      include: { track: { include: { sources: true } } },
      orderBy: { playedAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    recentlyPlayed: recentlyPlayed.map((r) => ({
      id: r.id,
      track: trackToDTO(r.track as any),
      playedAt: r.playedAt.toISOString(),
    })),
    listeningHistory: listeningHistory.map((r) => ({
      id: r.id,
      track: trackToDTO(r.track as any),
      playedAt: r.playedAt.toISOString(),
      progressSec: r.progressSec,
      completion: r.completion,
      source: r.source,
      durationSec: r.durationSec,
    })),
  });
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = historySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { trackId, progressSec, completion, source } = parsed.data;

  const track = await db.track.findUnique({ where: { id: trackId }, select: { id: true, durationSec: true } });
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });

  const [history] = await Promise.all([
    db.listeningHistory.create({
      data: {
        userId: user.id,
        trackId,
        progressSec: progressSec ?? null,
        completion: completion ?? null,
        source: source ?? null,
        durationSec: track.durationSec,
      },
    }),
    db.recentlyPlayed.create({
      data: { userId: user.id, trackId },
    }),
  ]);

  // keep RecentlyPlayed bounded (optional cleanup of oldest > 100)
  const count = await db.recentlyPlayed.count({ where: { userId: user.id } });
  if (count > 100) {
    const oldest = await db.recentlyPlayed.findMany({ where: { userId: user.id }, orderBy: { playedAt: "asc" }, take: count - 100 });
    await db.recentlyPlayed.deleteMany({ where: { id: { in: oldest.map((o) => o.id) } } });
  }

  return NextResponse.json({ ok: true, id: history.id }, { status: 201 });
}

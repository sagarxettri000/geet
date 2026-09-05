import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { trackToDTO } from "@/services/music";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlist = await db.playlist.findFirst({ where: { id, deletedAt: null } });
  if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  if (playlist.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const trackId = body?.trackId as string | undefined;
  if (!trackId) return NextResponse.json({ error: "Missing trackId" }, { status: 400 });

  const track = await db.track.findUnique({ where: { id: trackId } });
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });

  const existing = await db.playlistTrack.findUnique({ where: { playlistId_trackId: { playlistId: id, trackId } } });
  if (existing) return NextResponse.json({ error: "Track already in playlist" }, { status: 409 });

  const maxPos = await db.playlistTrack.findFirst({ where: { playlistId: id }, orderBy: { position: "desc" }, select: { position: true } });
  const position = (maxPos?.position ?? -1) + 1;

  await db.playlistTrack.create({ data: { playlistId: id, trackId, position } });

  const updated = await db.playlist.findUnique({
    where: { id },
    include: { tracks: { include: { track: { include: { sources: true } } }, orderBy: { position: "asc" } } },
  });

  const tracks = updated!.tracks.map((pt) => ({
    playlistTrackId: pt.id,
    position: pt.position,
    addedAt: pt.addedAt.toISOString(),
    track: trackToDTO(pt.track as any),
  }));

  return NextResponse.json({ ok: true, tracks }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlist = await db.playlist.findFirst({ where: { id, deletedAt: null } });
  if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  if (playlist.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const trackId = searchParams.get("trackId");
  if (!trackId) return NextResponse.json({ error: "Missing ?trackId=" }, { status: 400 });

  await db.playlistTrack.deleteMany({ where: { playlistId: id, trackId } });

  // re-normalize positions
  const remaining = await db.playlistTrack.findMany({ where: { playlistId: id }, orderBy: { position: "asc" } });
  await Promise.all(remaining.map((pt, i) => db.playlistTrack.update({ where: { id: pt.id }, data: { position: i } })));

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlist = await db.playlist.findFirst({ where: { id, deletedAt: null } });
  if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  if (playlist.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderedIds: string[] = body?.orderedIds;
  if (!Array.isArray(orderedIds)) return NextResponse.json({ error: "Missing orderedIds" }, { status: 400 });

  const existing = await db.playlistTrack.findMany({ where: { playlistId: id } });
  const existingIds = new Set(existing.map((pt) => pt.trackId));
  if (orderedIds.length !== existing.length || !orderedIds.every((tid) => existingIds.has(tid))) {
    return NextResponse.json({ error: "orderedIds must match playlist tracks" }, { status: 400 });
  }

  await db.$transaction(
    orderedIds.map((trackId, index) =>
      db.playlistTrack.update({ where: { playlistId_trackId: { playlistId: id, trackId } }, data: { position: index } })
    )
  );

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { playlistUpdateSchema } from "@/lib/validation";
import { playlistToDTO, trackToDTO } from "@/services/music";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id as string | undefined;
  const { id } = await params;

  const playlist = await db.playlist.findFirst({
    where: { id, deletedAt: null },
    include: {
      _count: { select: { tracks: true } },
      user: { select: { name: true, image: true } },
      tracks: { include: { track: { include: { sources: true } } }, orderBy: { position: "asc" } },
    },
  });

  if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  if (!playlist.isPublic && playlist.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const liked = userId ? await db.likedPlaylist.findUnique({ where: { userId_playlistId: { userId, playlistId: playlist.id } } }) : null;

  const dto = playlistToDTO(playlist, { liked: !!liked });
  const tracks = playlist.tracks.map((pt) => ({
    playlistTrackId: pt.id,
    position: pt.position,
    addedAt: pt.addedAt.toISOString(),
    track: trackToDTO(pt.track as any),
  }));

  return NextResponse.json({ playlist: dto, tracks });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.playlist.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  if (existing.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = playlistUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.playlist.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.isPublic !== undefined ? { isPublic: parsed.data.isPublic } : {}),
      ...(parsed.data.coverUrl !== undefined ? { coverUrl: parsed.data.coverUrl } : {}),
    },
    include: { _count: { select: { tracks: true } }, user: { select: { name: true, image: true } } },
  });

  return NextResponse.json({ playlist: playlistToDTO(updated) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.playlist.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  if (existing.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.playlist.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

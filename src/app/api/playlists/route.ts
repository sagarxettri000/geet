import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { playlistCreateSchema } from "@/lib/validation";
import { playlistToDTO } from "@/services/music";

export async function GET() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id as string | undefined;

  const where = userId
    ? { deletedAt: null, OR: [{ userId }, { isPublic: true }] }
    : { deletedAt: null, isPublic: true };

  const playlists = await db.playlist.findMany({
    where: where as any,
    include: { _count: { select: { tracks: true } }, user: { select: { name: true, image: true } } },
    orderBy: { updatedAt: "desc" },
  });

  let likedSet = new Set<string>();
  if (userId) {
    const likes = await db.likedPlaylist.findMany({ where: { userId }, select: { playlistId: true } });
    likedSet = new Set(likes.map((l) => l.playlistId));
  }

  return NextResponse.json({ playlists: playlists.map((p) => playlistToDTO(p, { liked: likedSet.has(p.id) })) });
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

  const parsed = playlistCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const playlist = await db.playlist.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      isPublic: parsed.data.isPublic ?? true,
      coverUrl: parsed.data.coverUrl ?? null,
    },
    include: { _count: { select: { tracks: true } }, user: { select: { name: true, image: true } } },
  });

  return NextResponse.json({ playlist: playlistToDTO(playlist) }, { status: 201 });
}

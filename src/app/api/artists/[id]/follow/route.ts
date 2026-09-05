import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const artistId = (await params).id;
  const artist = await db.artist.findUnique({ where: { id: artistId }, select: { id: true } });
  if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

  await db.followedArtist.upsert({
    where: { userId_artistId: { userId: user.id, artistId } },
    create: { userId: user.id, artistId },
    update: {},
  });

  return NextResponse.json({ following: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const artistId = (await params).id;
  await db.followedArtist.deleteMany({ where: { userId: user.id, artistId } });
  return NextResponse.json({ following: false });
}

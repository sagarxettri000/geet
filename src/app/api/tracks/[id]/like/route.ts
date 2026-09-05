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
  const trackId = (await params).id;
  const exists = await db.likedTrack.findUnique({ where: { userId_trackId: { userId: user.id, trackId } } });
  if (exists) {
    await db.likedTrack.delete({ where: { userId_trackId: { userId: user.id, trackId } } });
    return NextResponse.json({ liked: false });
  }
  // verify track exists
  const track = await db.track.findUnique({ where: { id: trackId }, select: { id: true } });
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });
  await db.likedTrack.create({ data: { userId: user.id, trackId } });
  return NextResponse.json({ liked: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const trackId = (await params).id;
  await db.likedTrack.deleteMany({ where: { userId: user.id, trackId } });
  return NextResponse.json({ liked: false });
}

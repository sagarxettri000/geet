import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { trackToDTO } from "@/services/music";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");
  if (!idsParam) return NextResponse.json({ error: "Missing ?ids=" }, { status: 400 });

  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);
  if (ids.length === 0) return NextResponse.json({ tracks: [] });

  const session = await auth().catch(() => null);
  const userId = session?.user?.id as string | undefined;

  const tracks = await db.track.findMany({
    where: { id: { in: ids } },
    include: {
      sources: true,
      likedBy: userId ? { where: { userId } } : false,
    },
  });

  // preserve input order
  const map = new Map(tracks.map((t) => [t.id, t]));
  const ordered = ids.map((id) => map.get(id)).filter(Boolean) as typeof tracks;

  const dtos = ordered.map((t: any) =>
    trackToDTO(t, { liked: (t.likedBy ?? []).length > 0 })
  );

  return NextResponse.json({ tracks: dtos });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getWallPage } from "@/services/wall";

export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(96, Math.max(1, parseInt(url.searchParams.get("limit") ?? "48", 10) || 48));
  const variant = (url.searchParams.get("variant") ?? "default").slice(0, 64);

  try {
    const page = await getWallPage(userId, offset, limit, variant);
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: "Failed to build wall" }, { status: 500 });
  }
}
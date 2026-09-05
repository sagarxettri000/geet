import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildHomeFeed } from "@/services/home";

export async function GET() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feed = await buildHomeFeed(userId);
  return NextResponse.json(feed);
}

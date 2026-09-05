import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const prefSchema = z.object({
  theme: z.enum(["dark", "light"]).optional(),
  volume: z.number().min(0).max(100).optional(),
  muted: z.boolean().optional(),
  repeatMode: z.enum(["off", "all", "one"]).optional(),
  shuffle: z.boolean().optional(),
});

export async function GET() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let pref = await db.userPreference.findUnique({ where: { userId } });
  if (!pref) {
    pref = await db.userPreference.create({ data: { userId } });
  }
  return NextResponse.json({ preference: pref });
}

export async function PATCH(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = prefSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const pref = await db.userPreference.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });
  return NextResponse.json({ preference: pref });
}

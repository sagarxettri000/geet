import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  displayName: z.string().trim().max(40).nullable().optional(),
  bio: z.string().trim().max(280).nullable().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { displayName, bio } = parsed.data;
  await db.profile.upsert({
    where: { userId },
    create: { userId, displayName: displayName ?? undefined, bio: bio ?? undefined },
    update: { ...(displayName !== undefined ? { displayName } : {}), ...(bio !== undefined ? { bio } : {}) },
  });
  if (displayName !== undefined && displayName) {
    await db.user.update({ where: { id: userId }, data: { name: displayName } }).catch(() => {});
  }
  const user = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
  return NextResponse.json({ ok: true, profile: user?.profile, user });
}

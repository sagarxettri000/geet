import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    const status = msg === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id }, select: { bannedAt: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updated = await db.user.update({
    where: { id },
    data: { bannedAt: user.bannedAt ? null : new Date() },
    select: { id: true, bannedAt: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  let admin: { id: string };
  try {
    admin = await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    const status = msg === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, bannedAt: true, role: true },
  });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (target.id === admin.id) {
    return NextResponse.json({ error: "You cannot ban your own account" }, { status: 400 });
  }
  if (target.role === "admin") {
    return NextResponse.json({ error: "You cannot ban another admin" }, { status: 403 });
  }

  const updated = await db.user.update({
    where: { id },
    data: { bannedAt: target.bannedAt ? null : new Date() },
    select: { id: true, bannedAt: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}

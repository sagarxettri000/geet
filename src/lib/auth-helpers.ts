import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function requireUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Unauthorized");

  // Re-validate against the DB so bans/role changes take effect mid-session,
  // not only at next login.
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, image: true, role: true, bannedAt: true },
  });
  if (!user) throw new Error("Unauthorized");
  if (user.bannedAt) throw new Error("Forbidden");

  return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}
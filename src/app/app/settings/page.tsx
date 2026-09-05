import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SettingsClient } from "./SettingsClient";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  let pref = await db.userPreference.findUnique({ where: { userId } });
  if (!pref) pref = await db.userPreference.create({ data: { userId } });

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold">Settings</h1>
      <SettingsClient
        initial={{
          theme: pref.theme,
          volume: pref.volume,
          muted: pref.muted,
          repeatMode: pref.repeatMode,
          shuffle: pref.shuffle,
        }}
      />
    </div>
  );
}

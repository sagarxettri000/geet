"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BanButton({
  userId,
  banned,
}: {
  userId: string;
  banned: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Action failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
        banned
          ? "bg-[rgb(var(--primary-soft))] text-primary hover:bg-primary hover:text-primary-foreground"
          : "bg-surface text-muted hover:bg-danger hover:text-white border border-border"
      }`}
    >
      {loading ? "..." : banned ? "Unban" : "Ban"}
    </button>
  );
}

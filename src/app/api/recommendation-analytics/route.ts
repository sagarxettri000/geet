import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getRecommendationAnalytics } from "@/services/recommend";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const analytics = await getRecommendationAnalytics();
    return NextResponse.json(analytics);
  } catch {
    return NextResponse.json({ error: "Failed to compute analytics" }, { status: 502 });
  }
}
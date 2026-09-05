import { db } from "@/lib/db";
import type { Track } from "@prisma/client";

function normalizeArtist(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ - topic$/i, "");
}

export async function artistForName(name: string) {
  const clean = normalizeArtist(name);
  if (!clean) throw new Error("Artist name is required");

  const existing = await db.artist.findFirst({
    where: { normalizedName: clean },
  });
  if (existing) return existing;

  const color = await db.$queryRawUnsafe<{ seed: number }[]>(
    "SELECT ABS(random()) % 10 AS seed"
  );
  const seed = color[0]?.seed ?? 0;
  const palette = [
    "#f97316", "#ef4444", "#f59e0b", "#84cc16", "#10b981",
    "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#ec4899",
  ];

  return db.artist.create({
    data: {
      name: clean,
      normalizedName: clean,
      imageUrl: null,
      thumbnailColor: palette[seed % palette.length],
      verified: false,
      bio: null,
      followers: 0,
      monthlyListeners: 0,
    },
  });
}

/**
 * Looks up a track by its YouTube source; creates artist + track + source when
 * missing (the paste-a-link intake path). Returns the full track WITH sources.
 */
export async function getOrCreateTrackFromVideo(input: {
  videoId: string;
  title: string;
  artist: string;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
}): Promise<{ track: Track & { sources: Array<{ provider: string; providerVideoId: string; thumbnailUrl: string | null }> }; created: boolean }> {
  const existing = await db.track.findFirst({
    where: {
      sources: { some: { provider: "youtube", providerVideoId: input.videoId } },
    },
    include: {
      sources: {
        where: { provider: "youtube", providerVideoId: input.videoId },
      },
    },
  });

  if (existing && existing.sources.length > 0) {
    return { track: existing as any, created: false };
  }

  const artist = await artistForName(input.artist);

  const track = await db.track.create({
    data: {
      title: input.title.trim(),
      artistName: artist.name,
      artistId: artist.id,
      durationSec: input.durationSec ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      thumbnailColor: artist.thumbnailColor,
      popularity: 0,
      sources: {
        create: {
          provider: "youtube",
          providerVideoId: input.videoId,
          thumbnailUrl: input.thumbnailUrl ?? null,
        },
      },
    },
    include: {
      sources: true,
    },
  });

  return { track: track as any, created: true };
}
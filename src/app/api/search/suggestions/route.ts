import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trackToDTO, artistToDTO, genreToDTO } from "@/services/music";

// Suggested searches for the empty search state. Every suggestion is guaranteed
// to return results because it comes from the catalog itself.
export async function GET() {
  const [tracks, artists, genres] = await Promise.all([
    db.track.findMany({
      include: { sources: true },
      orderBy: { popularity: "desc" },
      take: 8,
    }),
    db.artist.findMany({
      orderBy: [{ monthlyListeners: "desc" }, { followers: "desc" }],
      take: 10,
    }),
    db.genre.findMany(),
  ]);

  return NextResponse.json({
    tracks: tracks.map((t) => trackToDTO(t)),
    artists: artists.map((a) => artistToDTO(a)),
    genres: genres.map((g) => genreToDTO(g)),
  });
}
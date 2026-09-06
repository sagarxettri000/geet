import { db } from "@/lib/db";
import { EVENT_WEIGHTS } from "@/services/recommend/weights";

export interface TrackEventInput {
  eventType: string;
  trackId?: string;
  sessionId?: string;
  position?: number;
  duration?: number;
  source?: string;
  device?: string;
}

export async function recordEvent(userId: string, input: TrackEventInput) {
  const { eventType, trackId, sessionId, position, duration, source, device } = input;

  await db.userEvent.create({
    data: {
      userId,
      sessionId: sessionId ?? null,
      eventType,
      trackId: trackId ?? null,
      value: EVENT_WEIGHTS[eventType] ?? null,
      position: position ?? null,
      duration: duration ?? null,
      source: source ?? null,
      device: device ?? null,
    },
  });

  if (eventType === "play_start" && trackId) {
    const track = await db.track.findUnique({
      where: { id: trackId },
      select: { id: true, durationSec: true },
    });
    if (track) {
      await db.listeningHistory.create({
        data: {
          userId,
          trackId,
          progressSec: position ?? null,
          completion: null,
          source: source ?? null,
          durationSec: track.durationSec,
        },
      });
      await db.recentlyPlayed.upsert({
        where: { id: `${userId}:${trackId}` },
        create: { id: `${userId}:${trackId}`, userId, trackId },
        update: { playedAt: new Date() },
      });
      const count = await db.recentlyPlayed.count({ where: { userId } });
      if (count > 300) {
        const oldest = await db.recentlyPlayed.findMany({ where: { userId }, orderBy: { playedAt: "asc" }, take: count - 300 });
        await db.recentlyPlayed.deleteMany({ where: { id: { in: oldest.map((o) => o.id) } } });
      }
    }
  }

  if (eventType === "complete" || eventType === "rewatch") {
    await db.listeningHistory
      .updateMany({
        where: { userId, trackId: trackId ?? "" },
        data: { completion: 100, progressSec: duration ?? null },
      })
      .catch(() => {});
  }

  if (["hide", "not_interested", "dislike"].includes(eventType) && trackId) {
    const negFeedback = {
      userId,
      trackId,
      feedbackType: eventType,
      createdAt: new Date(),
    };
    const track = await db.track.findUnique({ where: { id: trackId }, select: { artistId: true, genreId: true } });
    await db.recommendationFeedback.create({
      data: {
        ...negFeedback,
        artistId: track?.artistId ?? null,
        genreId: track?.genreId ?? null,
      },
    });
  }
}
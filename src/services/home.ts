import { buildRecommendationFeed } from "@/services/recommend";

export async function buildHomeFeed(userId: string) {
  const feed = await buildRecommendationFeed(userId, { includeLikedAtEnd: true });
  return {
    sections: feed.sections.map((s) => ({
      key: s.key,
      title: s.title,
      subtitle: s.subtitle,
      items: s.items,
    })),
  };
}
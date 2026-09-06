import { auth } from "@/auth";
import { getHomeFeedPage } from "@/services/home-feed";
import HomeClient from "./_components/HomeClient";

export default async function HomePage() {
  const session = await auth();
  const userId = session!.user.id;
  const first = await getHomeFeedPage(userId, { limit: 60 });
  return (
    <>
      <h1 className="sr-only">Home</h1>
      <HomeClient
        initialItems={first.items}
        initialCursor={first.nextCursor}
        initialHasMore={first.hasMore}
      />
    </>
  );
}
import { auth } from "@/auth";
import { getWallPage } from "@/services/wall";
import HomeClient from "./_components/HomeClient";

export default async function HomePage() {
  const session = await auth();
  const userId = session!.user.id;
  const first = await getWallPage(userId, 0, 60);
  return (
    <HomeClient
      initialItems={first.items}
      initialNextOffset={first.nextOffset}
      initialHasMore={first.hasMore}
    />
  );
}
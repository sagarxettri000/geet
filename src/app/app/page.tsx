import { auth } from "@/auth";
import { getWallPage } from "@/services/wall";
import HomeClient from "./_components/HomeClient";

export default async function HomePage() {
  const session = await auth();
  const userId = session!.user.id;
  const variant = new Date().getTime().toString();
  const first = await getWallPage(userId, 0, 60, variant);
  return (
    <HomeClient
      initialItems={first.items}
      initialNextOffset={first.nextOffset}
      initialHasMore={first.hasMore}
      variant={variant}
    />
  );
}
import { auth } from "@/auth";
import { buildHomeFeed } from "@/services/home";
import HomeClient from "./_components/HomeClient";

export default async function HomePage() {
  const session = await auth();
  const userId = session!.user.id;
  const { hero, sections } = await buildHomeFeed(userId);
  return <HomeClient hero={hero as never} sections={sections as never} />;
}

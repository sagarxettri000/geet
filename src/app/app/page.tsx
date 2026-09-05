import { auth } from "@/auth";
import { buildHomeFeed } from "@/services/home";
import HomeClient from "./_components/HomeClient";

export default async function HomePage() {
  const session = await auth();
  const userId = session!.user.id;
  const { sections } = await buildHomeFeed(userId);
  return <HomeClient sections={sections as never} />;
}

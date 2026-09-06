import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { AppProviders } from "@/components/providers/app-providers";
import { CookieBanner } from "@/components/legal/CookieBanner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GEET — Where great music finds you",
    template: "%s — GEET",
  },
  description:
    "GEET is a free streaming service that plays official YouTube videos in a custom player. Search any song, build playlists, and get a personal feed.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  manifest: "/manifest.json",
  openGraph: {
    title: "GEET — Where great music finds you",
    description: "Free music streaming that plays official YouTube videos in a custom player.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-float"
        >
          Skip to content
        </a>
        <AppProviders session={session}>{children}</AppProviders>
        <CookieBanner />
      </body>
    </html>
  );
}

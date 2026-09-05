import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com https://www.youtube-nocookie.com https://www.google.com https://www.gstatic.com",
            "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com",
            "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://*.ytimg.com https://*.youtube.com",
            "media-src 'self' blob: https://*.youtube.com https://*.ytimg.com",
            "connect-src 'self' https://www.youtube.com https://s.ytimg.com https://www.google.com https://*.youtube.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "worker-src 'self' blob:",
          ].join("; "),
        },
      ],
    },
  ],
};

export default nextConfig;
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/reels/new", "/reels/*/edit", "/categories"],
    },
    sitemap: "https://trovely.vercel.app/sitemap.xml",
  };
}

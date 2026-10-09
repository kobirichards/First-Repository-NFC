import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or per-person pages. Profiles (/p/) are allowed here but carry noindex unless the owner opts in.
      disallow: ["/dashboard", "/admin", "/api/", "/c/", "/activate/", "/cart", "/checkout/", "/dev/", "/media/", "/card/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}

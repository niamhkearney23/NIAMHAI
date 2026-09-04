import type { MetadataRoute } from "next";
import { guides } from "@/lib/guides";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/guides", "/prompts", "/lab", "/start-here", "/about"].map(
    (path) => ({
      url: `${site.url}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })
  );

  const guideRoutes = guides.map((guide) => ({
    url: `${site.url}/guides/${guide.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...guideRoutes];
}

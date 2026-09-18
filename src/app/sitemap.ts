import type { MetadataRoute } from "next";
import { guides } from "@/lib/guides";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const home = {
    url: site.url,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 1,
  };

  const guideRoutes = guides.map((guide) => ({
    url: `${site.url}/guides/${guide.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [home, ...guideRoutes];
}

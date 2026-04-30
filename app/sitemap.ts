import type { MetadataRoute } from "next"

const BASE_URL = "https://vaultly-sepia.vercel.app"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url:             BASE_URL,
      lastModified:    new Date("2026-04-30"),
      changeFrequency: "monthly",
      priority:        1,
    },
    {
      url:             `${BASE_URL}/privacy`,
      lastModified:    new Date("2026-04-30"),
      changeFrequency: "yearly",
      priority:        0.3,
    },
    {
      url:             `${BASE_URL}/terms`,
      lastModified:    new Date("2026-04-30"),
      changeFrequency: "yearly",
      priority:        0.3,
    },
  ]
}

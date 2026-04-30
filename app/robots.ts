import type { MetadataRoute } from "next"

// Production URL — update if the domain changes
const BASE_URL = "https://vaultly-sepia.vercel.app"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Only public-facing, indexable pages
        allow: ["/", "/privacy", "/terms"],
        // Auth pages, app pages, and API routes — none of these should be indexed
        disallow: [
          "/login",
          "/register",
          "/dashboard",
          "/journal",
          "/coach",
          "/habits",
          "/settings",
          "/onboarding",
          "/therapist",
          "/oops",
          "/account-deleted",
          "/api/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}

import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "Vaultly",
    short_name:       "Vaultly",
    description:      "Your private, AI-powered journal. AES-256 encrypted, beautifully designed.",
    start_url:        "/dashboard",
    display:          "standalone",
    orientation:      "portrait",
    background_color: "#0f0f1a",
    theme_color:      "#7c6ef2",
    // next/og-generated icons served by app/icon.tsx and app/apple-icon.tsx.
    // next.js automatically links these — the entries here cover PWA install prompts.
    icons: [
      {
        src:     "/apple-icon.png",
        sizes:   "180x180",
        type:    "image/png",
      },
      {
        src:     "/icon.png",
        sizes:   "512x512",
        type:    "image/png",
      },
      {
        src:     "/icon.png",
        sizes:   "512x512",
        type:    "image/png",
        // "maskable" allows Android to safely crop the icon into a circle/squircle
        purpose: "maskable",
      },
    ],
  }
}

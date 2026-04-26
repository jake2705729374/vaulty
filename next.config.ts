import type { NextConfig } from "next"

const isProd = process.env.NODE_ENV === "production"

// ── Content Security Policy ───────────────────────────────────────────────────
//
// Notes on the necessary relaxations:
//
//  script-src 'unsafe-inline'
//    Next.js injects a small inline bootstrap script for module loading and the
//    app has a blocking inline theme script (layout.tsx) to prevent flash-of-
//    unstyled-theme. Both require 'unsafe-inline'.  A nonce-based strict CSP
//    can replace this in a future iteration using Next.js middleware.
//
//  style-src 'unsafe-inline'
//    Tailwind CSS and the runtime theme system write CSS custom properties via
//    inline styles; 'unsafe-inline' is required.
//
//  img-src data: blob:
//    data: — base64-encoded images embedded in entries
//    blob: — object URLs created for media attachments
//
//  media-src blob:
//    Video/audio object URLs created from Blob data.
//
//  font-src 'self'
//    next/font/google self-hosts all fonts at build time — no external requests.
//
//  connect-src 'self'
//    Every API call from the client goes to Next.js API routes on the same
//    origin.  External services (Anthropic, Resend, Upstash, Supabase) are only
//    called server-side and never from the browser.
//
const cspDirectives = [
  "default-src 'self'",
  // 'unsafe-eval' is required by React/Turbopack in dev for call-stack reconstruction.
  // It is intentionally excluded in production — React never uses eval() there.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "frame-ancestors 'none'",    // stronger than X-Frame-Options
  "object-src 'none'",         // block Flash / plugins
  "base-uri 'self'",           // prevent <base> tag injection
  "form-action 'self'",        // forms may only submit to same origin
].join("; ")

// ── Headers list ─────────────────────────────────────────────────────────────
const securityHeaders = [
  // Prevent browsers from guessing MIME types (protects against content sniffing attacks)
  {
    key:   "X-Content-Type-Options",
    value: "nosniff",
  },
  // Clickjacking protection — redundant with CSP frame-ancestors but included
  // for older browsers that don't honour CSP
  {
    key:   "X-Frame-Options",
    value: "DENY",
  },
  // Control how much referrer info is sent cross-origin
  {
    key:   "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Disable browser features the app doesn't use
  {
    key:   "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "browsing-topics=()",
    ].join(", "),
  },
  // Allow DNS prefetching for minor performance improvement
  {
    key:   "X-DNS-Prefetch-Control",
    value: "on",
  },
  // Content Security Policy
  {
    key:   "Content-Security-Policy",
    value: cspDirectives,
  },
  // HSTS — only in production (adding in dev over HTTP causes browser lockout)
  // max-age = 2 years; preload-list eligible
  ...(isProd
    ? [
        {
          key:   "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
]

// ── Next.js config ────────────────────────────────────────────────────────────
const nextConfig: NextConfig = {
  // Don't advertise the framework version
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Apply security headers to every route
        source:  "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig

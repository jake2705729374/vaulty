/**
 * lib/rate-limit.ts
 *
 * Upstash Redis-backed sliding-window rate limiting for auth routes.
 *
 * Configure via .env:
 *   UPSTASH_REDIS_REST_URL    From Upstash console → Redis database → REST URL
 *   UPSTASH_REDIS_REST_TOKEN  From Upstash console → Redis database → REST Token
 *
 * If those vars are absent (local dev), every call returns null (passthrough).
 * No Redis connection is opened until the first rate-limited request.
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis }     from "@upstash/redis"
import { NextResponse } from "next/server"

// ── Per-route limits ──────────────────────────────────────────────────────────
type Window = `${number} ${"s" | "m" | "h" | "d"}`

export type RateLimitKey =
  | "login"     // credential sign-in attempts
  | "register"  // new account creation
  | "verify"    // OTP code submission
  | "resend"    // resend verification code
  | "password"  // forgot-password + reset-password

const LIMITS: Record<RateLimitKey, { requests: number; window: Window }> = {
  login:    { requests: 10, window: "15 m" },  // 10 attempts / 15 min / IP
  register: { requests:  5, window:  "1 h" },  //  5 sign-ups  /  1 hr  / IP
  verify:   { requests: 15, window: "15 m" },  // 15 guesses   / 15 min / IP
  resend:   { requests:  5, window:  "1 h" },  //  5 resends   /  1 hr  / IP
  password: { requests:  5, window:  "1 h" },  //  5 resets    /  1 hr  / IP
}

// ── Lazy singletons ───────────────────────────────────────────────────────────
let _redis:   Redis | null = null
const _cache = new Map<RateLimitKey, Ratelimit>()

function getRedis(): Redis | null {
  if (_redis) return _redis
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  _redis = new Redis({ url, token })
  return _redis
}

function getLimiter(key: RateLimitKey): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  if (!_cache.has(key)) {
    const { requests, window } = LIMITS[key]
    _cache.set(key, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      prefix:  `vaultly:rl:${key}`,
    }))
  }
  return _cache.get(key)!
}

// ── IP extraction ─────────────────────────────────────────────────────────────
export function getClientIp(req: { headers: Headers | { get(name: string): string | null } }): string {
  const h = req.headers as Headers
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip")?.trim() ??
    "unknown"
  )
}

// ── Main helper ───────────────────────────────────────────────────────────────
/**
 * Call at the top of any API route handler.
 * Returns a 429 NextResponse if the limit is exceeded, or null to continue.
 *
 * @example
 * const limited = await rateLimit(req, "register")
 * if (limited) return limited
 */
export async function rateLimit(
  req: { headers: Headers | { get(name: string): string | null } },
  key: RateLimitKey,
): Promise<NextResponse | null> {
  const limiter = getLimiter(key)
  if (!limiter) return null   // Upstash not configured — passthrough (dev mode)

  const ip = getClientIp(req)
  const { success, remaining, reset } = await limiter.limit(ip)

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)
    return NextResponse.json(
      { error: "Too many requests — please wait a moment and try again." },
      {
        status: 429,
        headers: {
          "Retry-After":           String(retryAfter),
          "X-RateLimit-Limit":     String(LIMITS[key].requests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset":     String(reset),
        },
      },
    )
  }

  return null
}

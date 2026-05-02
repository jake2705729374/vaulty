/**
 * lib/analytics.ts
 *
 * Thin, type-safe wrapper around Vercel Analytics' `track()`.
 *
 * Why a wrapper?
 *   • One place to add/rename events without hunting every call-site.
 *   • TypeScript enforces valid event names and property shapes.
 *   • Silently no-ops in SSR / Node environment — safe to import anywhere.
 *
 * Dashboard: vercel.com → project → Analytics tab.
 *
 * Usage:
 *   import { track } from "@/lib/analytics"
 *   track("coach_message_sent", { source: "panel" })
 */

import { track as vaTrack } from "@vercel/analytics"

// ── Event catalogue ───────────────────────────────────────────────────────────

export type AnalyticsEvent =

  // ── Onboarding ────────────────────────────────────────────────────────────
  /** User advances past a step (forward only). */
  | { name: "onboarding_step_viewed";   props: { step: number } }
  /** User completes the whole onboarding flow and lands on /dashboard. */
  | { name: "onboarding_completed";     props: { goals_count: number; has_coach_profile: boolean; habits_count: number } }

  // ── Journal ───────────────────────────────────────────────────────────────
  /** Entry auto-saved (new or existing). */
  | { name: "entry_saved";              props: { type: "new" | "existing"; word_count: number } }

  // ── Coach panel (inside the journal editor) ───────────────────────────────
  /** User opens the coach split-pane on desktop or the Coach tab on mobile. */
  | { name: "coach_panel_opened";       props: { device: "desktop" | "mobile" } }
  /** User sends a message to the coach inside the editor. */
  | { name: "coach_message_sent";       props: { source: "panel"; mode: "coach" | "refine"; has_entry_context: boolean; has_recent_entries: boolean } }
  /** User clicks "Add to entry" under a coach response. */
  | { name: "coach_insert_to_entry";    props: Record<string, never> }

  // ── Standalone coach page (/coach) ────────────────────────────────────────
  /** User sends a message in the standalone /coach page. */
  | { name: "standalone_coach_message"; props: Record<string, never> }

  // ── Media ─────────────────────────────────────────────────────────────────
  /** A photo or video was successfully uploaded to Supabase Storage. */
  | { name: "media_uploaded";           props: { media_type: "image" | "video" } }

  // ── Settings ─────────────────────────────────────────────────────────────
  /** User toggles a journaling goal chip. */
  | { name: "settings_goal_toggled";         props: { goal: string; enabled: boolean } }
  /** User changes the app colour theme. */
  | { name: "settings_theme_changed";        props: { theme: string } }
  /** User enables or disables "AI sees my journal entries" privacy toggle. */
  | { name: "settings_ai_entries_toggled";   props: { enabled: boolean } }
  /** User changes the coach communication style. */
  | { name: "settings_coach_style_changed";  props: { style: string } }

// ── Helper types ─────────────────────────────────────────────────────────────

type EventName  = AnalyticsEvent["name"]
type EventProps<N extends EventName> = Extract<AnalyticsEvent, { name: N }>["props"]

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fire a typed analytics event.
 *
 * No-ops gracefully when:
 *   • Running on the server (no window)
 *   • Vercel Analytics is not injected (local dev without env vars)
 *   • Any unexpected error (never throws)
 */
export function track<N extends EventName>(
  name: N,
  ...args: keyof EventProps<N> extends never
    ? [props?: Record<string, never>]
    : [props: EventProps<N>]
): void {
  try {
    vaTrack(name, args[0] as Record<string, string | number | boolean>)
  } catch {
    // Silently swallow — analytics must never break the app
  }
}

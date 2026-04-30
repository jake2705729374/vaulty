"use client"

/**
 * app/(pages)/privacy/page.tsx — Privacy Policy
 *
 * Matches the landing-page design system exactly:
 *   • #0A0A0F background, Sora headings, Inter body
 *   • LandingNav + LandingFooter
 *   • Framer-motion entrance animations
 *   • Gradient orb background
 *
 * Last updated: April 30, 2026
 */

import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import LandingNav    from "@/components/landing/LandingNav"
import LandingFooter from "@/components/landing/LandingFooter"

// ── Shared animation variants ─────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
}
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }

// ── Section anchor IDs ────────────────────────────────────────────────────────
const sections = [
  { id: "introduction",      label: "Introduction" },
  { id: "what-we-collect",   label: "What We Collect" },
  { id: "encryption",        label: "Encryption & Security" },
  { id: "ai-disclosure",     label: "AI Features & Anthropic" },
  { id: "third-parties",     label: "Third-Party Services" },
  { id: "retention",         label: "Data Retention" },
  { id: "your-rights",       label: "Your Rights" },
  { id: "cookies",           label: "Cookies" },
  { id: "children",          label: "Children's Privacy" },
  { id: "changes",           label: "Changes to This Policy" },
  { id: "contact",           label: "Contact" },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ n, id, children }: { n: string; id: string; children: React.ReactNode }) {
  return (
    <div id={id} className="flex items-start gap-4 mb-5 pt-12 scroll-mt-28">
      <span
        className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-inter"
        style={{ background: "rgba(37,99,235,0.12)", color: "#2563EB", border: "1px solid rgba(37,99,235,0.25)" }}
      >
        {n}
      </span>
      <h2
        className="text-xl font-bold font-sora tracking-tight"
        style={{ color: "#F0F0F0" }}
      >
        {children}
      </h2>
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed mb-4 font-inter" style={{ color: "#8B8BA7" }}>
      {children}
    </p>
  )
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="space-y-2 mb-4 pl-1">
      {children}
    </ul>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm font-inter" style={{ color: "#8B8BA7" }}>
      <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: "#2563EB" }} />
      <span>{children}</span>
    </li>
  )
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: "#D4D4F0", fontWeight: 600 }}>{children}</strong>
}

function Callout({ variant, children }: { variant: "warning" | "info"; children: React.ReactNode }) {
  const isWarn = variant === "warning"
  return (
    <div
      className="rounded-xl p-4 mb-6 flex gap-3"
      style={{
        background: isWarn ? "rgba(239,68,68,0.07)" : "rgba(37,99,235,0.07)",
        border:     isWarn ? "1px solid rgba(239,68,68,0.22)" : "1px solid rgba(37,99,235,0.22)",
      }}
    >
      <span className="text-base mt-0.5 flex-shrink-0">{isWarn ? "⚠️" : "ℹ️"}</span>
      <div className="text-sm font-inter leading-relaxed" style={{ color: isWarn ? "#FCA5A5" : "#93B4FF" }}>
        {children}
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="text-left text-xs font-semibold font-inter px-4 py-3 uppercase tracking-wide"
      style={{ color: "#555570", background: "rgba(255,255,255,0.02)" }}
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      className="px-4 py-3 text-sm font-inter align-top"
      style={{ color: "#8B8BA7", borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      {children}
    </td>
  )
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="transition-colors duration-150"
      style={{ color: "#2563EB" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#60A5FA")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#2563EB")}
    >
      {children}
    </a>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
  return (
    <div style={{ background: "#0A0A0F", minHeight: "100vh" }}>
      <LandingNav />

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">

        {/* Gradient orb */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[640px] h-[480px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0.06) 50%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
        </div>

        <motion.div
          className="relative z-10 max-w-3xl mx-auto text-center"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="mb-5 flex justify-center">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold font-inter"
              style={{
                background: "rgba(37,99,235,0.10)",
                border: "1px solid rgba(37,99,235,0.28)",
                color: "#93B4FF",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2563EB" }} />
              Last updated: April 30, 2026
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-bold font-sora tracking-tight mb-4"
            style={{ color: "#F0F0F0" }}
          >
            Privacy Policy
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base font-inter leading-relaxed max-w-xl mx-auto"
            style={{ color: "#8B8BA7" }}
          >
            Vaultly was built with privacy as a core value — your journal entries
            are encrypted before they leave your device. This policy explains exactly
            what we collect, how it's protected, and your rights.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Jump links ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="max-w-3xl mx-auto px-4 mb-8"
      >
        <div
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-xs font-semibold font-inter uppercase tracking-widest mb-4" style={{ color: "#555570" }}>
            Contents
          </p>
          <div className="flex flex-wrap gap-2">
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-all duration-150"
                style={{
                  background: "rgba(37,99,235,0.08)",
                  color: "#8B8BA7",
                  border: "1px solid rgba(37,99,235,0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(37,99,235,0.15)"
                  e.currentTarget.style.color = "#93B4FF"
                  e.currentTarget.style.borderColor = "rgba(37,99,235,0.35)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(37,99,235,0.08)"
                  e.currentTarget.style.color = "#8B8BA7"
                  e.currentTarget.style.borderColor = "rgba(37,99,235,0.15)"
                }}
              >
                <span style={{ color: "#2563EB", fontWeight: 700 }}>{i + 1}.</span>
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Document body ── */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.6 }}
        className="max-w-3xl mx-auto px-4 pb-24"
      >
        {/* Divider */}
        <div className="h-px mb-2" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />

        {/* 1 — Introduction */}
        <SectionHeading n="1" id="introduction">Introduction</SectionHeading>
        <P>
          Vaultly ("we," "us," or "our") operates the Vaultly private journaling application.
          This Privacy Policy explains what information we collect, how we use it, and the rights
          you have over your data.
        </P>
        <P>
          Vaultly is built by an independent developer. We collect the minimum amount of data
          necessary to provide the service, and we will never sell your personal information.
        </P>

        {/* 2 — What we collect */}
        <SectionHeading n="2" id="what-we-collect">What We Collect</SectionHeading>
        <P><Strong>Account information</Strong></P>
        <Ul>
          <Li>Email address — required to create an account and send you service emails</Li>
          <Li>Password — stored only as a bcrypt hash; we never have access to your raw password</Li>
          <Li>Display name — optional, used in the splash screen and AI prompts</Li>
        </Ul>

        <P><Strong>Journal content (always encrypted)</Strong></P>
        <Ul>
          <Li>
            Your journal entries are encrypted with AES-256-GCM <em>in your browser</em> before
            transmission. The server stores only ciphertext — we cannot read your entries.
          </Li>
          <Li>Entry titles, creation timestamps, and mood logs associated with entries</Li>
          <Li>Attached media (images/audio), stored encrypted in our database</Li>
        </Ul>

        <P><Strong>App preferences and context</Strong></P>
        <Ul>
          <Li>Theme preferences, display settings, journaling goals and frequency</Li>
          <Li>Habit names and daily check-in logs</Li>
          <Li>
            AI Coach profile — people you&apos;ve listed, life phase, and situations
            (stored as plaintext in the database; not encrypted)
          </Li>
          <Li>Weekly digest preferences</Li>
        </Ul>

        <P><Strong>Technical and session data</Strong></P>
        <Ul>
          <Li>Session tokens for authentication (expire after 30 days or on logout)</Li>
          <Li>IP address and HTTP request metadata in standard server logs (retained for 30 days)</Li>
          <Li>Error reports sent to Sentry when the app encounters an unexpected error — request bodies and authentication headers are scrubbed before transmission</Li>
        </Ul>

        {/* 3 — Encryption */}
        <SectionHeading n="3" id="encryption">Encryption &amp; Security</SectionHeading>
        <P>
          Vaultly uses a two-layer envelope encryption scheme:
        </P>
        <Ul>
          <Li>
            A random 256-bit <Strong>Master Encryption Key (MEK)</Strong> is generated for
            your account in your browser
          </Li>
          <Li>
            The MEK is encrypted with a <Strong>Key Encryption Key (KEK)</Strong> derived from
            your password using PBKDF2 (100,000 iterations, SHA-256). Only the encrypted MEK
            is stored on the server.
          </Li>
          <Li>
            Each journal entry is encrypted with AES-256-GCM using the MEK, in your browser,
            before being sent to our servers
          </Li>
        </Ul>

        <Callout variant="warning">
          <strong>Your password is the root of your encryption key.</strong> If you forget
          your master password, we cannot recover your journal entries. A password reset lets
          you access the app again, but previously written entries remain encrypted and
          inaccessible without the original password. Keep your password safe.
        </Callout>

        {/* 4 — AI Disclosure */}
        <SectionHeading n="4" id="ai-disclosure">AI Features &amp; Anthropic</SectionHeading>

        <Callout variant="warning">
          <strong>Important: when you use AI features, journal content is sent to Anthropic.</strong>{" "}
          The encryption that protects your entries from us does not protect them from Anthropic
          when you actively use the AI Coach or AI Therapist — the client decrypts the content
          and sends plaintext to the Anthropic API to generate a response.
        </Callout>

        <P>Specifically, the following is sent to Anthropic when AI features are active:</P>
        <Ul>
          <Li>The current journal entry you are writing (live text, when the Coach panel is open)</Li>
          <Li>
            Up to your 10 most recent journal entries (only when you have enabled
            &quot;AI sees my journal entries&quot; in Settings → Coach Profile)
          </Li>
          <Li>Your display name, Coach Profile context (people, life phase, situations)</Li>
          <Li>Messages in the AI Coach or AI Therapist conversation</Li>
        </Ul>

        <P>
          This data is processed by Anthropic, Inc. and is subject to their{" "}
          <ExternalLink href="https://www.anthropic.com/privacy">Privacy Policy</ExternalLink>.
          Anthropic states it does not train its models on API user data by default.
        </P>
        <P>
          <Strong>To opt out entirely:</Strong> simply do not use the AI Coach or AI Therapist
          features. You can also disable &quot;AI sees my journal entries&quot; in Settings to
          prevent recent entries from being included in AI context even when you do use the chat.
        </P>

        {/* 5 — Third parties */}
        <SectionHeading n="5" id="third-parties">Third-Party Services</SectionHeading>
        <P>We use the following third-party services to operate Vaultly:</P>

        <div
          className="rounded-xl overflow-hidden mb-6"
          style={{ border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <table className="w-full text-left">
            <thead>
              <tr>
                <Th>Service</Th>
                <Th>Purpose</Th>
                <Th>Privacy Policy</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Supabase",   "Database hosting (PostgreSQL)",             "supabase.com/privacy"],
                ["Vercel",     "Application hosting and CDN",               "vercel.com/legal/privacy-policy"],
                ["Anthropic",  "AI (Claude) for Coach / Therapist features","anthropic.com/privacy"],
                ["Resend",     "Transactional email delivery",              "resend.com/legal/privacy-policy"],
                ["Upstash",    "Rate limiting (Redis)",                     "upstash.com/trust/privacy.pdf"],
                ["Sentry",     "Error monitoring and crash reporting",      "sentry.io/privacy"],
              ].map(([svc, purpose, link]) => (
                <tr key={svc}>
                  <Td><Strong>{svc}</Strong></Td>
                  <Td>{purpose}</Td>
                  <Td>
                    <ExternalLink href={`https://${link}`}>{link}</ExternalLink>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 6 — Retention */}
        <SectionHeading n="6" id="retention">Data Retention</SectionHeading>
        <Ul>
          <Li>Account data and journal entries — retained until you delete your account</Li>
          <Li>Individual entries — deleted immediately when you delete them in the app</Li>
          <Li>Session tokens — expire after 30 days or immediately on logout</Li>
          <Li>Server access logs — automatically purged after 30 days</Li>
          <Li>Email delivery logs — retained by Resend per their policy</Li>
          <Li>Error reports — retained by Sentry per their policy (default 90 days)</Li>
        </Ul>
        <P>
          When you delete your account, all data — entries, habits, mood logs, AI coach sessions,
          memories, and preferences — is permanently and irreversibly deleted from our database
          in a single transaction.
        </P>

        {/* 7 — Your rights */}
        <SectionHeading n="7" id="your-rights">Your Rights</SectionHeading>
        <Ul>
          <Li>
            <Strong>Access</Strong> — all your journal entries are accessible within the app at
            any time
          </Li>
          <Li>
            <Strong>Portability</Strong> — use Settings → Export to download your decrypted
            entries as a structured file
          </Li>
          <Li>
            <Strong>Deletion</Strong> — use Settings → Delete Account to permanently delete
            all your data. Individual entries can be deleted from the journal list.
          </Li>
          <Li>
            <Strong>Correction</Strong> — update your display name and preferences in Settings
            at any time
          </Li>
        </Ul>
        <P>
          If you are located in the EU or EEA, you additionally have the right to lodge a
          complaint with your local data protection supervisory authority.
        </P>

        {/* 8 — Cookies */}
        <SectionHeading n="8" id="cookies">Cookies</SectionHeading>
        <P>
          Vaultly uses only essential session cookies required for authentication. We do not use
          advertising cookies, third-party tracking cookies, analytics cookies, or tracking pixels.
          There is nothing to opt out of — we simply don&apos;t track you.
        </P>

        {/* 9 — Children */}
        <SectionHeading n="9" id="children">Children&apos;s Privacy</SectionHeading>
        <P>
          Vaultly is not directed at children under 13 years of age. We do not knowingly collect
          personal information from anyone under 13. If you believe we have inadvertently collected
          such information, please contact us immediately and we will delete it.
        </P>

        {/* 10 — Changes */}
        <SectionHeading n="10" id="changes">Changes to This Policy</SectionHeading>
        <P>
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes by email and by posting a notice prominently in the app. The &quot;last
          updated&quot; date at the top of this page will always reflect the most recent revision.
          Continued use of Vaultly after changes are posted constitutes your acceptance of the
          revised policy.
        </P>

        {/* 11 — Contact */}
        <SectionHeading n="11" id="contact">Contact</SectionHeading>
        <P>
          If you have questions about this Privacy Policy or want to exercise your data rights,
          reach us at{" "}
          <ExternalLink href="mailto:privacy@vaultly.app">privacy@vaultly.app</ExternalLink>.
          We aim to respond to all privacy requests within 30 days.
        </P>

        {/* ── Divider ── */}
        <div className="h-px my-12" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />

        {/* ── Bottom CTA ── */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.15)" }}
        >
          <p className="text-sm font-inter mb-1" style={{ color: "#555570" }}>Read our other legal documents</p>
          <h3 className="text-lg font-bold font-sora mb-6" style={{ color: "#F0F0F0" }}>
            Ready to start writing?
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/terms"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold font-inter transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0F0" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.10)"
                e.currentTarget.style.transform = "translateY(-1px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)"
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              Terms of Service →
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold font-inter transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                color: "#fff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)"
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,99,235,0.4)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              Start writing for free →
            </Link>
          </div>
        </div>
      </motion.main>

      <LandingFooter />
    </div>
  )
}
